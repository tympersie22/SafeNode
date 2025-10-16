import { webcrypto } from 'crypto'
import fetch from 'node-fetch'
import { argon2id } from 'hash-wasm'

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const buf = Buffer.from(base64, 'base64')
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
}

async function deriveKey(password: string, salt: ArrayBuffer): Promise<CryptoKey> {
  const hashHex = await argon2id({
    password,
    salt: new Uint8Array(salt),
    iterations: 3,
    memorySize: 64 * 1024,
    parallelism: 1,
    hashLength: 32,
    outputType: 'hex'
  })
  const raw = Buffer.from(hashHex, 'hex')
  return await webcrypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['decrypt'])
}

async function main() {
  const baseUrl = 'http://localhost:4000'
  const password = 'demo-password'

  const saltRes = await fetch(`${baseUrl}/api/user/salt`)
  const { salt } = await saltRes.json() as { salt: string }

  const vaultRes = await fetch(`${baseUrl}/api/vault/latest`)
  const { encryptedVault, iv } = await vaultRes.json() as { encryptedVault: string, iv: string }

  const key = await deriveKey(password, base64ToArrayBuffer(salt))
  const ct = base64ToArrayBuffer(encryptedVault)
  const ivBuf = base64ToArrayBuffer(iv)

  const pt = await webcrypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBuf }, key, ct)
  const json = Buffer.from(pt).toString('utf8')
  console.log('Decrypted OK. First 120 chars:', json.slice(0,120))
}

main().catch(e => {
  console.error('Test failed:', e)
  process.exit(1)
})
