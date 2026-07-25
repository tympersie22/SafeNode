# Encrypted File Attachments — design

Fast-follow feature to back the storage tiers (Free 100MB · Personal 1GB ·
Family 5GB · Teams 10GB). Lets a user attach encrypted files/documents to a
vault item (passport scan, recovery codes, license keys, a will, tax docs).

Non-negotiable: stays **zero-knowledge**. The server never sees plaintext files
or the keys that decrypt them — same trust boundary as the vault itself.

## Trust model

- Files are encrypted **client-side** (browser / Tauri / Capacitor) before they
  ever leave the device, exactly like vault entries today (AES-256-GCM).
- The server stores only ciphertext + non-sensitive metadata (size, content
  type is optional/encrypted, timestamps, the owning item id).
- Encryption key: derive a per-file key, wrap it with the vault key, and store
  the wrapped key in the vault item's encrypted payload — so the file key lives
  inside the already-encrypted vault, never on the server in the clear. (Reuse
  the existing `wrapVaultKeyWithPasskeyPrf` / vault-key crypto primitives.)

## Storage backend — Cloudflare R2

Natural fit: the frontend is already on Cloudflare. R2 has no egress fees and an
S3-compatible API.

- One bucket, objects keyed `userId/fileId` (opaque; ciphertext only).
- The backend never proxies file bytes — it issues **short-lived presigned
  URLs** (S3 `PutObject` / `GetObject`) so uploads/downloads go browser↔R2
  directly. The API only handles auth, quota, and metadata.

## Data model (Prisma)

```prisma
model FileAttachment {
  id            String   @id @default(cuid())
  userId        String   @map("user_id")
  vaultItemId   String?  @map("vault_item_id")   // logical link to a vault entry (client-side id)
  teamVaultId   String?  @map("team_vault_id")   // if attached to a team vault
  objectKey     String   @unique @map("object_key") // R2 key: userId/fileId
  sizeBytes     BigInt   @map("size_bytes")       // ciphertext size, for quota
  encryptedMeta String   @map("encrypted_meta")   // client-encrypted { filename, contentType }
  iv            String
  status        String   @default("pending")      // pending -> committed (set after upload confirmed)
  createdAt     DateTime @default(now()) @map("created_at")
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("file_attachments")
}
```

Note `encryptedMeta` — even the filename/content-type are encrypted so the
server learns nothing. `status` handles the two-phase upload (reserve → confirm)
so abandoned uploads don't consume quota permanently (sweep `pending` rows).

## Upload flow

1. Client picks a file, generates a per-file key, encrypts the bytes
   (AES-256-GCM) and the metadata; computes ciphertext size.
2. `POST /api/files/reserve` `{ sizeBytes, encryptedMeta, iv, vaultItemId }`
   → server runs the **quota check** (below); if OK, creates a `pending`
   `FileAttachment` and returns a presigned R2 `PutObject` URL.
3. Client `PUT`s the ciphertext straight to R2 via the presigned URL.
4. `POST /api/files/:id/commit` → server verifies the object exists in R2
   (HeadObject, size matches) and flips `status` to `committed`.
5. Client stores the wrapped per-file key + `fileId` inside the vault item's
   encrypted payload and saves the vault.

## Download flow

1. `GET /api/files/:id/url` → server checks ownership, returns a short-lived
   presigned `GetObject` URL.
2. Client downloads ciphertext from R2, unwraps the per-file key from the vault
   item, decrypts locally.

## Delete flow

`DELETE /api/files/:id` → delete the R2 object + the row (quota frees up). Also
delete on vault-item deletion (cascade at the app layer).

## Quota enforcement — reuses the metering we just added

`checkSubscriptionLimits(userId, 'storage')` already sums encrypted **vault**
bytes. Extend it to also add `SUM(FileAttachment.sizeBytes WHERE status =
'committed')` for the user (and owned team vaults). Then in
`POST /api/files/reserve`:

```ts
const { current, limit } = await checkSubscriptionLimits(userId, 'storage') // MB
const projectedMB = current + Math.ceil(sizeBytes / (1024 * 1024))
if (limit !== -1 && projectedMB > limit) {
  return reply.code(413).send({ error: 'storage_limit_exceeded', current, limit })
}
```

Per-plan caps already exist in `PLAN_LIMITS.storageMB`. Add a per-file cap too
(e.g. 25MB free / 100MB paid) to keep single uploads sane.

## API surface

- `POST /api/files/reserve` — quota check + presigned PUT URL + `pending` row
- `POST /api/files/:id/commit` — verify upload, mark `committed`
- `GET  /api/files/:id/url` — presigned GET URL
- `DELETE /api/files/:id` — remove object + row
- `GET  /api/files?vaultItemId=` — list attachments (metadata only)

All behind `requireAuth` + `requireRegisteredDevice`, same as vault routes.

## Config

- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`
- `FILE_MAX_BYTES_FREE`, `FILE_MAX_BYTES_PAID` (per-file caps)
- Presigned URL TTL (e.g. 300s)

## Client work

- Web: `File` API + WebCrypto (already used for the vault).
- Mobile (Capacitor): file picker plugin + the same crypto.
- Desktop (Tauri): file dialog is intentionally locked down today — decide
  whether attachments are web/mobile-only initially.

## Rollout steps

1. Add `FileAttachment` model + `prisma db push`.
2. R2 bucket + presign helper in the backend.
3. `/api/files/*` routes + extend the storage metering.
4. Client encrypt/upload/download + attach-to-item UI.
5. Flip the pricing bullet from "5GB encrypted files (soon)" to live, and set
   `FILE_*` / `R2_*` env in production.

## Abuse / safety notes

- Enforce per-file and per-account caps server-side at `reserve` (never trust
  the client's `sizeBytes` alone — re-check against R2 HeadObject at commit).
- Sweep `pending` attachments older than N minutes (cron) to reclaim reserved
  quota from abandoned uploads.
- Rate-limit `reserve` under the existing per-user limiter.
- Never log presigned URLs (they grant temporary object access).
