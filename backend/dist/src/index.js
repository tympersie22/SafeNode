"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const crypto_1 = require("crypto");
const argon2_1 = __importDefault(require("argon2"));
const util_1 = require("util");
const node_fetch_1 = __importDefault(require("node-fetch"));
const server = (0, fastify_1.default)({ logger: true });
// Will be generated at startup to allow immediate unlock with password "demo-password"
let demoSaltB64 = '';
let demoBlob = {
    iv: '',
    encryptedVault: '',
    version: Date.now()
};
const demoPasskeys = [];
const base64Url = (buffer) => {
    const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};
let currentSaltB64 = null;
function arrayBufferToBase64(buffer) {
    return Buffer.from(new Uint8Array(buffer)).toString('base64');
}
async function generateDemoVault() {
    const password = 'demo-password';
    const encoder = new util_1.TextEncoder();
    // Sample vault content
    const sampleVault = {
        entries: [
            {
                id: '1',
                name: 'SafeNode Demo',
                username: 'demo@safenode.app',
                password: 'hunter2',
                url: 'https://safenode.app',
                notes: 'This is a demo entry generated on backend startup.',
                tags: ['work', 'priority'],
                category: 'Login',
                totpSecret: 'JBSWY3DPEHPK3PXP' // base32 demo ("Hello!" in RFC test vectors)
            },
            {
                id: '2',
                name: 'Acme Corp',
                username: 'user@acme.test',
                password: 'S3cureP@ss',
                url: 'https://portal.acme.test',
                notes: 'Staging environment login',
                tags: ['staging'],
                category: 'Login'
            },
            {
                id: '3',
                name: 'Bank Account',
                username: '****1234',
                password: 'n/a',
                url: 'https://bank.example',
                notes: 'Use card on file',
                tags: ['finance'],
                category: 'Secure Note'
            }
        ]
    };
    const plaintext = encoder.encode(JSON.stringify(sampleVault));
    // Generate salt (32 bytes) and IV (12 bytes for AES-GCM)
    const salt = new Uint8Array((0, crypto_1.randomBytes)(32));
    const iv = new Uint8Array((0, crypto_1.randomBytes)(12));
    // Derive key via PBKDF2 SHA-256 100k iterations, AES-GCM-256
    try {
        // Derive a 32-byte key using Argon2id compatible with frontend
        const rawKey = await argon2_1.default.hash(password, {
            type: argon2_1.default.argon2id,
            salt: Buffer.from(salt),
            timeCost: 3,
            memoryCost: 64 * 1024, // KiB
            parallelism: 1,
            hashLength: 32,
            raw: true
        });
        const aesKey = await crypto_1.webcrypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['encrypt']);
        const ciphertext = await crypto_1.webcrypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, plaintext);
        demoSaltB64 = arrayBufferToBase64(salt.buffer);
        currentSaltB64 = demoSaltB64;
        demoBlob = {
            iv: arrayBufferToBase64(iv.buffer),
            encryptedVault: arrayBufferToBase64(ciphertext),
            version: Date.now()
        };
    }
    catch (err) {
        console.error('Error generating demo vault:', err);
        throw err;
    }
}
server.get('/api/user/salt', async (req, reply) => {
    try {
        const salt = currentSaltB64 ?? demoSaltB64;
        if (!salt) {
            return reply.code(404).send({ error: 'salt_not_found', message: 'Salt not available' });
        }
        return { salt };
    }
    catch (error) {
        req.log.error(error);
        return reply.code(500).send({ error: error?.message || 'server_error', message: 'Failed to fetch salt' });
    }
});
server.get('/api/vault/latest', async (req, reply) => {
    try {
        const query = req.query;
        const since = query?.since ? Number(query.since) : undefined;
        // Validate since parameter if provided
        if (query?.since !== undefined) {
            if (Number.isNaN(since) || since < 0) {
                return reply.code(400).send({ error: 'invalid_since_parameter', message: 'since must be a valid positive number' });
            }
        }
        // Check if vault exists
        if (!demoBlob.encryptedVault || !demoBlob.iv) {
            return { exists: false };
        }
        // If since is provided and vault is up to date
        if (since !== undefined && !Number.isNaN(since) && demoBlob.version && since >= demoBlob.version) {
            return { upToDate: true, version: demoBlob.version };
        }
        // Return vault data
        return demoBlob;
    }
    catch (error) {
        req.log.error(error);
        return reply.code(500).send({ error: error?.message || 'server_error', message: 'Failed to fetch vault' });
    }
});
// Accept latest vault blob and optional salt for persistence (demo only)
server.post('/api/vault', async (req, reply) => {
    try {
        const body = req.body;
        const { encryptedVault, iv, salt } = body || {};
        // Validate required fields
        if (!encryptedVault || typeof encryptedVault !== 'string') {
            return reply.code(400).send({ error: 'invalid_payload', message: 'encryptedVault is required and must be a string' });
        }
        if (!iv || typeof iv !== 'string') {
            return reply.code(400).send({ error: 'invalid_payload', message: 'iv is required and must be a string' });
        }
        // Validate vault is not empty
        if (encryptedVault.trim().length === 0 || iv.trim().length === 0) {
            return reply.code(400).send({ error: 'invalid_payload', message: 'Vault data cannot be empty' });
        }
        const nextVersion = typeof body?.version === 'number' && body.version > 0 ? body.version : Date.now();
        demoBlob = { encryptedVault, iv, version: nextVersion };
        if (typeof salt === 'string' && salt.length > 0) {
            currentSaltB64 = salt;
        }
        return { ok: true, version: demoBlob.version };
    }
    catch (error) {
        req.log.error(error);
        return reply.code(500).send({ error: error?.message || 'server_error', message: 'Failed to save vault' });
    }
});
// Alias for /api/vault/save (some frontend code might use this)
server.post('/api/vault/save', async (req, reply) => {
    try {
        const body = req.body;
        const { encryptedVault, iv, salt } = body || {};
        // Validate required fields
        if (!encryptedVault || typeof encryptedVault !== 'string') {
            return reply.code(400).send({ error: 'invalid_payload', message: 'encryptedVault is required and must be a string' });
        }
        if (!iv || typeof iv !== 'string') {
            return reply.code(400).send({ error: 'invalid_payload', message: 'iv is required and must be a string' });
        }
        // Validate vault is not empty
        if (encryptedVault.trim().length === 0 || iv.trim().length === 0) {
            return reply.code(400).send({ error: 'invalid_payload', message: 'Vault data cannot be empty' });
        }
        const nextVersion = typeof body?.version === 'number' && body.version > 0 ? body.version : Date.now();
        demoBlob = { encryptedVault, iv, version: nextVersion };
        if (typeof salt === 'string' && salt.length > 0) {
            currentSaltB64 = salt;
        }
        return { ok: true, version: demoBlob.version };
    }
    catch (error) {
        req.log.error(error);
        return reply.code(500).send({ error: error?.message || 'server_error', message: 'Failed to save vault' });
    }
});
// CRUD Operations for individual vault entries
// Note: These endpoints work with the full encrypted vault blob
// The frontend handles encryption/decryption locally
// Create new entry (requires full vault re-encryption on frontend)
server.post('/api/vault/entry', async (req, reply) => {
    try {
        const body = req.body;
        const { encryptedVault, iv, version } = body || {};
        if (typeof encryptedVault !== 'string' || typeof iv !== 'string') {
            return reply.code(400).send({ error: 'invalid_payload', message: 'encryptedVault and iv are required and must be strings' });
        }
        // Update the demo vault with new encrypted data
        demoBlob = {
            encryptedVault,
            iv,
            version: typeof version === 'number' ? version : Date.now()
        };
        return {
            ok: true,
            version: demoBlob.version,
            message: 'Entry created successfully'
        };
    }
    catch (error) {
        req.log.error(error);
        return reply.code(500).send({ error: error?.message || 'server_error', message: 'Failed to create vault entry' });
    }
});
// Update existing entry (requires full vault re-encryption on frontend)
server.put('/api/vault/entry/:id', async (req, reply) => {
    try {
        const { id } = req.params;
        const body = req.body;
        const { encryptedVault, iv, version } = body || {};
        if (!id || typeof encryptedVault !== 'string' || typeof iv !== 'string') {
            return reply.code(400).send({ error: 'invalid_payload', message: 'ID, encryptedVault, and iv are required' });
        }
        // Update the demo vault with new encrypted data
        demoBlob = {
            encryptedVault,
            iv,
            version: typeof version === 'number' ? version : Date.now()
        };
        return {
            ok: true,
            version: demoBlob.version,
            message: `Entry ${id} updated successfully`
        };
    }
    catch (error) {
        req.log.error(error);
        return reply.code(500).send({ error: error?.message || 'server_error', message: 'Failed to update vault entry' });
    }
});
// Delete entry (requires full vault re-encryption on frontend)
server.delete('/api/vault/entry/:id', async (req, reply) => {
    try {
        const { id } = req.params;
        const body = req.body;
        const { encryptedVault, iv, version } = body || {};
        if (!id || typeof encryptedVault !== 'string' || typeof iv !== 'string') {
            return reply.code(400).send({ error: 'invalid_payload', message: 'ID, encryptedVault, and iv are required' });
        }
        // Update the demo vault with new encrypted data
        demoBlob = {
            encryptedVault,
            iv,
            version: typeof version === 'number' ? version : Date.now()
        };
        return {
            ok: true,
            version: demoBlob.version,
            message: `Entry ${id} deleted successfully`
        };
    }
    catch (error) {
        req.log.error(error);
        return reply.code(500).send({ error: error?.message || 'server_error', message: 'Failed to delete vault entry' });
    }
});
// Passkey / WebAuthn demo endpoints
server.post('/api/passkeys/register/options', async (req, reply) => {
    try {
        const challenge = (0, crypto_1.randomBytes)(32);
        const rpId = req.hostname || 'localhost';
        return reply.send({
            challenge: base64Url(challenge),
            rp: {
                id: rpId,
                name: 'SafeNode'
            },
            user: {
                id: base64Url(Buffer.from('demo-user')),
                name: 'demo@safenode.app',
                displayName: 'SafeNode Demo'
            },
            pubKeyCredParams: [
                { type: 'public-key', alg: -7 },
                { type: 'public-key', alg: -257 }
            ],
            timeout: 60_000,
            attestation: 'none',
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'preferred'
            }
        });
    }
    catch (error) {
        req.log.error(error);
        return reply.code(500).send({ error: error?.message || 'server_error', message: 'Failed to generate passkey registration options' });
    }
});
server.post('/api/passkeys/register/verify', async (req, reply) => {
    try {
        const body = req.body;
        const credential = body?.credential;
        if (!credential?.id || !credential?.publicKey) {
            return reply.code(400).send({ error: 'invalid_payload', message: 'Credential ID and public key are required' });
        }
        const stored = {
            id: credential.id,
            rawId: credential.rawId,
            transports: credential.transports || [],
            signCount: credential.signCount || 0,
            friendlyName: body?.friendlyName || credential.friendlyName || 'Passkey',
            createdAt: Date.now()
        };
        const idx = demoPasskeys.findIndex(p => p.id === stored.id);
        if (idx >= 0) {
            demoPasskeys[idx] = stored;
        }
        else {
            demoPasskeys.push(stored);
        }
        return { ok: true, passkey: stored };
    }
    catch (error) {
        req.log.error(error);
        return reply.code(500).send({ error: error?.message || 'server_error', message: 'Failed to verify passkey registration' });
    }
});
server.get('/api/passkeys', async (_req, reply) => {
    try {
        return reply.send({ passkeys: demoPasskeys });
    }
    catch (error) {
        _req.log.error(error);
        return reply.code(500).send({ error: error?.message || 'server_error', message: 'Failed to fetch passkeys' });
    }
});
server.delete('/api/passkeys/:id', async (req, reply) => {
    try {
        const { id } = req.params;
        if (!id) {
            return reply.code(400).send({ error: 'invalid_id', message: 'Passkey ID is required' });
        }
        const before = demoPasskeys.length;
        for (let i = demoPasskeys.length - 1; i >= 0; i--) {
            if (demoPasskeys[i].id === id) {
                demoPasskeys.splice(i, 1);
            }
        }
        if (demoPasskeys.length === before) {
            return reply.code(404).send({ error: 'not_found', message: 'Passkey not found' });
        }
        return { ok: true };
    }
    catch (error) {
        req.log.error(error);
        return reply.code(500).send({ error: error?.message || 'server_error', message: 'Failed to delete passkey' });
    }
});
server.post('/api/passkeys/authenticate/options', async (req, reply) => {
    try {
        const challenge = (0, crypto_1.randomBytes)(32);
        const allowCredentials = demoPasskeys.map(pk => ({
            id: pk.id,
            type: 'public-key',
            transports: pk.transports || []
        }));
        return reply.send({
            challenge: base64Url(challenge),
            timeout: 60_000,
            rpId: req.hostname || 'localhost',
            allowCredentials,
            userVerification: 'preferred'
        });
    }
    catch (error) {
        req.log.error(error);
        return reply.code(500).send({ error: error?.message || 'server_error', message: 'Failed to generate passkey authentication options' });
    }
});
server.post('/api/passkeys/authenticate/verify', async (req, reply) => {
    try {
        const body = req.body;
        const credentialId = body?.credential?.id;
        if (!credentialId) {
            return reply.code(400).send({ error: 'invalid_payload', message: 'Credential ID is required' });
        }
        const exists = demoPasskeys.some(pk => pk.id === credentialId);
        if (!exists) {
            return reply.code(404).send({ error: 'passkey_not_found', message: 'Passkey not found' });
        }
        return { ok: true };
    }
    catch (error) {
        req.log.error(error);
        return reply.code(500).send({ error: error?.message || 'server_error', message: 'Failed to verify passkey authentication' });
    }
});
// Breach monitoring via HIBP k-anonymity (range API)
// Ref: https://haveibeenpwned.com/API/v3#SearchingPwnedPasswordsByRange
server.get('/api/breach/range/:prefix', async (req, reply) => {
    try {
        const { prefix } = req.params;
        // Validate: exactly 5 hex chars
        if (!prefix || !/^([0-9A-Fa-f]{5})$/.test(prefix)) {
            return reply.code(400).send({ error: 'invalid_prefix', message: 'Prefix must be exactly 5 hexadecimal characters' });
        }
        const url = `https://api.pwnedpasswords.com/range/${prefix.toUpperCase()}`;
        let res;
        try {
            res = await (0, node_fetch_1.default)(url, {
                headers: {
                    // Per HIBP guidelines
                    'Add-Padding': 'true',
                    'User-Agent': 'SafeNode/0.1 (https://safenode.app)'
                }
            });
        }
        catch (fetchError) {
            req.log.error({ error: fetchError }, 'HIBP fetch error');
            return reply.code(502).send({
                error: 'hibp_connection_error',
                message: 'Failed to connect to HaveIBeenPwned API',
                details: fetchError?.message
            });
        }
        if (!res.ok) {
            req.log.warn(`HIBP returned status ${res.status} for prefix ${prefix}`);
            return reply.code(502).send({
                error: 'hibp_upstream_error',
                status: res.status,
                message: 'HaveIBeenPwned API returned an error'
            });
        }
        let text;
        try {
            text = await res.text();
        }
        catch (textError) {
            req.log.error({ error: textError }, 'HIBP text read error');
            return reply.code(502).send({
                error: 'hibp_response_error',
                message: 'Failed to read response from HaveIBeenPwned API',
                details: textError?.message
            });
        }
        // Return raw text (suffix:count per line)
        reply.header('Content-Type', 'text/plain; charset=utf-8');
        return reply.send(text);
    }
    catch (error) {
        req.log.error({ error }, 'Breach range endpoint error');
        return reply.code(500).send({
            error: error?.message || 'server_error',
            message: 'An unexpected error occurred while checking password breach'
        });
    }
});
// Master Key Rotation endpoint
// Team Vaults & Organizations endpoints
const organizations = new Map();
const teamVaults = new Map();
function getPermissionsForRole(role) {
    switch (role) {
        case 'owner':
        case 'admin':
            return {
                canCreate: true,
                canEdit: true,
                canDelete: true,
                canShare: true,
                canViewAuditLogs: true
            };
        case 'member':
            return {
                canCreate: true,
                canEdit: true,
                canDelete: false,
                canShare: false,
                canViewAuditLogs: false
            };
        case 'viewer':
            return {
                canCreate: false,
                canEdit: false,
                canDelete: false,
                canShare: false,
                canViewAuditLogs: false
            };
        default:
            return {
                canCreate: false,
                canEdit: false,
                canDelete: false,
                canShare: false,
                canViewAuditLogs: false
            };
    }
}
// Organizations
server.post('/api/organizations', async (request, reply) => {
    try {
        const { name, domain, plan, createdBy } = request.body;
        const org = {
            id: `org-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name,
            domain,
            plan: plan || 'team',
            createdAt: Date.now(),
            createdBy,
            settings: {
                ssoEnabled: false,
                requireMFA: false
            },
            limits: {
                maxMembers: plan === 'free' ? 5 : plan === 'team' ? 50 : 1000,
                maxVaults: plan === 'free' ? 3 : plan === 'team' ? 20 : -1,
                maxStorage: plan === 'free' ? 100 * 1024 * 1024 : plan === 'team' ? 10 * 1024 * 1024 * 1024 : -1
            }
        };
        organizations.set(org.id, org);
        return org;
    }
    catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: error?.message || 'server_error', message: 'Failed to create organization' });
    }
});
server.get('/api/organizations', async (request, reply) => {
    try {
        return Array.from(organizations.values());
    }
    catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: error?.message || 'server_error', message: 'Failed to fetch organizations' });
    }
});
server.get('/api/organizations/:id', async (request, reply) => {
    try {
        const { id } = request.params;
        const org = organizations.get(id);
        if (!org) {
            return reply.code(404).send({ error: 'not_found', message: 'Organization not found' });
        }
        return org;
    }
    catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: error?.message || 'server_error', message: 'Failed to fetch organization' });
    }
});
// Team Vaults
server.post('/api/team-vaults', async (request, reply) => {
    try {
        const { name, organizationId, createdBy, description } = request.body;
        const org = organizations.get(organizationId);
        if (!org) {
            return reply.code(404).send({ error: 'not_found', message: 'Organization not found' });
        }
        const existingVaults = Array.from(teamVaults.values()).filter((t) => t.organizationId === organizationId);
        if (org.limits.maxVaults !== -1 && existingVaults.length >= org.limits.maxVaults) {
            return reply.code(400).send({ error: 'limit_exceeded', message: `Organization has reached the maximum number of vaults (${org.limits.maxVaults})` });
        }
        const team = {
            id: `team-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name,
            description,
            organizationId,
            organizationName: org.name,
            createdAt: Date.now(),
            createdBy,
            members: [
                {
                    id: createdBy,
                    email: createdBy,
                    name: 'Owner',
                    role: 'owner',
                    invitedAt: Date.now(),
                    joinedAt: Date.now(),
                    status: 'active',
                    permissions: {
                        canCreate: true,
                        canEdit: true,
                        canDelete: true,
                        canShare: true,
                        canViewAuditLogs: true
                    }
                }
            ],
            vaultId: `team-vault-${Date.now()}`,
            settings: {
                requireMFA: org.settings.requireMFA,
                autoLock: 30,
                allowExternalSharing: false,
                auditLogRetention: 90
            },
            metadata: {
                entryCount: 0,
                lastSync: Date.now(),
                storageUsed: 0
            }
        };
        teamVaults.set(team.id, team);
        return team;
    }
    catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: error?.message || 'server_error', message: 'Failed to create team vault' });
    }
});
server.get('/api/team-vaults', async (request, reply) => {
    try {
        const { organizationId } = request.query;
        if (organizationId) {
            return Array.from(teamVaults.values()).filter((t) => t.organizationId === organizationId);
        }
        return Array.from(teamVaults.values());
    }
    catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: error?.message || 'server_error', message: 'Failed to fetch team vaults' });
    }
});
server.get('/api/team-vaults/:id', async (request, reply) => {
    try {
        const { id } = request.params;
        const team = teamVaults.get(id);
        if (!team) {
            return reply.code(404).send({ error: 'not_found', message: 'Team vault not found' });
        }
        return team;
    }
    catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: error?.message || 'server_error', message: 'Failed to fetch team vault' });
    }
});
server.post('/api/team-vaults/:id/members', async (request, reply) => {
    try {
        const { id } = request.params;
        const { email, name, role, invitedBy } = request.body;
        const team = teamVaults.get(id);
        if (!team) {
            return reply.code(404).send({ error: 'not_found', message: 'Team vault not found' });
        }
        const existing = team.members.find((m) => m.email === email);
        if (existing) {
            return reply.code(400).send({ error: 'duplicate', message: 'Member already exists in this team' });
        }
        const org = organizations.get(team.organizationId);
        if (org && org.limits.maxMembers !== -1 && team.members.length >= org.limits.maxMembers) {
            return reply.code(400).send({ error: 'limit_exceeded', message: `Team has reached the maximum number of members (${org.limits.maxMembers})` });
        }
        const member = {
            id: `member-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            email,
            name,
            role: role || 'member',
            invitedAt: Date.now(),
            status: 'pending',
            permissions: getPermissionsForRole(role || 'member')
        };
        team.members.push(member);
        teamVaults.set(id, team);
        return member;
    }
    catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: error?.message || 'server_error', message: 'Failed to add team member' });
    }
});
server.put('/api/team-vaults/:id/members/:memberId', async (request, reply) => {
    try {
        const { id, memberId } = request.params;
        const { role } = request.body;
        const team = teamVaults.get(id);
        if (!team) {
            return reply.code(404).send({ error: 'not_found', message: 'Team vault not found' });
        }
        const member = team.members.find((m) => m.id === memberId);
        if (!member) {
            return reply.code(404).send({ error: 'not_found', message: 'Member not found' });
        }
        if (member.role === 'owner' && role !== 'owner') {
            const ownerCount = team.members.filter((m) => m.role === 'owner').length;
            if (ownerCount === 1) {
                return reply.code(400).send({ error: 'invalid_operation', message: 'Cannot remove the last owner' });
            }
        }
        member.role = role;
        member.permissions = getPermissionsForRole(role);
        teamVaults.set(id, team);
        return member;
    }
    catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: error?.message || 'server_error', message: 'Failed to update team member' });
    }
});
server.delete('/api/team-vaults/:id/members/:memberId', async (request, reply) => {
    try {
        const { id, memberId } = request.params;
        const team = teamVaults.get(id);
        if (!team) {
            return reply.code(404).send({ error: 'not_found', message: 'Team vault not found' });
        }
        const member = team.members.find((m) => m.id === memberId);
        if (!member) {
            return reply.code(404).send({ error: 'not_found', message: 'Member not found' });
        }
        if (member.role === 'owner') {
            const ownerCount = team.members.filter((m) => m.role === 'owner').length;
            if (ownerCount === 1) {
                return reply.code(400).send({ error: 'invalid_operation', message: 'Cannot remove the last owner' });
            }
        }
        team.members = team.members.filter((m) => m.id !== memberId);
        teamVaults.set(id, team);
        return { success: true };
    }
    catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: error?.message || 'server_error', message: 'Failed to remove team member' });
    }
});
// Biometric Authentication endpoints (WebAuthn)
const biometricCredentials = new Map();
server.post('/api/biometric/register/options', async (request, reply) => {
    try {
        const { userId, userName, displayName } = request.body;
        const challenge = crypto_1.webcrypto.getRandomValues(new Uint8Array(32));
        const challengeB64 = Buffer.from(challenge).toString('base64url');
        return {
            challenge: challengeB64,
            rp: {
                name: 'SafeNode',
                id: 'localhost' // In production, use your domain
            },
            user: {
                id: Buffer.from(userId || 'demo-user').toString('base64url'),
                name: userName || 'demo@safenode.app',
                displayName: displayName || userName || 'SafeNode Demo'
            },
            pubKeyCredParams: [
                { alg: -7, type: 'public-key' }, // ES256
                { alg: -257, type: 'public-key' } // RS256
            ],
            authenticatorSelection: {
                authenticatorAttachment: 'platform',
                userVerification: 'required',
                requireResidentKey: false
            },
            timeout: 60000,
            attestation: 'none'
        };
    }
    catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: error?.message || 'server_error', message: 'Failed to generate biometric registration options' });
    }
});
server.post('/api/biometric/register/verify', async (request, reply) => {
    try {
        const { credentialId, rawId, clientDataJSON, attestationObject, transports } = request.body;
        if (!credentialId) {
            return reply.code(400).send({ error: 'invalid_payload', message: 'Credential ID is required' });
        }
        // In a real implementation, you would:
        // 1. Verify the attestation object
        // 2. Store the credential ID and public key
        // 3. Associate it with the user
        const credential = {
            id: credentialId,
            rawId,
            transports: transports || [],
            createdAt: Date.now()
        };
        biometricCredentials.set(credentialId, credential);
        return { success: true, credentialId };
    }
    catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: error?.message || 'server_error', message: 'Failed to verify biometric registration' });
    }
});
server.post('/api/biometric/authenticate/options', async (request, reply) => {
    try {
        const { prompt } = request.body;
        // Get all registered credentials for the user
        const credentials = Array.from(biometricCredentials.values()).map(cred => ({
            id: cred.id,
            type: 'public-key',
            transports: cred.transports
        }));
        const challenge = crypto_1.webcrypto.getRandomValues(new Uint8Array(32));
        const challengeB64 = Buffer.from(challenge).toString('base64url');
        return {
            challenge: challengeB64,
            rpId: 'localhost', // In production, use your domain
            allowCredentials: credentials,
            timeout: 60000,
            userVerification: 'required'
        };
    }
    catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: error?.message || 'server_error', message: 'Failed to generate biometric authentication options' });
    }
});
server.post('/api/biometric/authenticate/verify', async (request, reply) => {
    try {
        const { credentialId, rawId, clientDataJSON, authenticatorData, signature, userHandle } = request.body;
        if (!credentialId) {
            return reply.code(400).send({ error: 'invalid_payload', message: 'Credential ID is required' });
        }
        // In a real implementation, you would:
        // 1. Verify the signature using the stored public key
        // 2. Verify the challenge
        // 3. Check the authenticator data
        const credential = biometricCredentials.get(credentialId);
        if (!credential) {
            return reply.code(401).send({ success: false, error: 'credential_not_found', message: 'Credential not found' });
        }
        // For demo purposes, we'll just verify the credential exists
        return { success: true, credentialId };
    }
    catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: error?.message || 'server_error', message: 'Failed to verify biometric authentication' });
    }
});
server.post('/api/vault/rotate-key', async (req, reply) => {
    try {
        const body = req.body;
        const { currentPassword, newPassword } = body || {};
        if (!currentPassword || !newPassword) {
            return reply.code(400).send({ error: 'missing_passwords', message: 'Both current and new passwords are required' });
        }
        // Validate current password (in real app, this would verify against stored hash)
        if (currentPassword !== 'demo-password') {
            return reply.code(401).send({ error: 'invalid_current_password', message: 'Current password is incorrect' });
        }
        // Validate new password strength
        if (newPassword.length < 8) {
            return reply.code(400).send({ error: 'password_too_short', message: 'New password must be at least 8 characters long' });
        }
        if (currentPassword === newPassword) {
            return reply.code(400).send({ error: 'same_password', message: 'New password must be different from current password' });
        }
        // Generate new salt for the new password
        const newSalt = crypto_1.webcrypto.getRandomValues(new Uint8Array(32));
        const newSaltB64 = Buffer.from(newSalt).toString('base64');
        // Derive new key with new password and salt
        const newKeyRaw = await argon2_1.default.hash(newPassword, {
            type: argon2_1.default.argon2id,
            salt: Buffer.from(newSalt),
            timeCost: 3,
            memoryCost: 64 * 1024,
            parallelism: 1,
            hashLength: 32,
            raw: true
        });
        const aesKey = await crypto_1.webcrypto.subtle.importKey('raw', newKeyRaw, { name: 'AES-GCM' }, false, ['encrypt']);
        // Re-encrypt the existing vault data with new key
        const vaultData = {
            entries: [
                {
                    id: 'demo-1',
                    name: 'GitHub',
                    username: 'demo@example.com',
                    password: 'demo-password-123',
                    url: 'https://github.com',
                    notes: 'Demo GitHub account',
                    tags: ['work', 'development'],
                    category: 'Development',
                    totpSecret: 'JBSWY3DPEHPK3PXP'
                },
                {
                    id: 'demo-2',
                    name: 'Gmail',
                    username: 'demo@gmail.com',
                    password: 'demo-gmail-pass',
                    url: 'https://gmail.com',
                    notes: 'Personal email account',
                    tags: ['personal', 'email'],
                    category: 'Email'
                },
                {
                    id: 'demo-3',
                    name: 'Banking App',
                    username: 'demo_user',
                    password: 'secure-banking-password',
                    url: 'https://bank.example.com',
                    notes: 'Online banking credentials',
                    tags: ['finance', 'banking'],
                    category: 'Finance',
                    totpSecret: 'MFRGG2LTOVZGKLQ'
                }
            ]
        };
        const vaultJson = JSON.stringify(vaultData);
        const iv = crypto_1.webcrypto.getRandomValues(new Uint8Array(12));
        const encryptedBuffer = await crypto_1.webcrypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, new util_1.TextEncoder().encode(vaultJson));
        // Update demo blob with new encrypted data and salt
        demoBlob = {
            encryptedVault: Buffer.from(new Uint8Array(encryptedBuffer)).toString('base64'),
            iv: Buffer.from(iv).toString('base64'),
            version: Date.now()
        };
        // Update demo salt
        demoSaltB64 = newSaltB64;
        return {
            ok: true,
            message: 'Master key rotated successfully',
            version: demoBlob.version
        };
    }
    catch (error) {
        req.log.error(error);
        return reply.code(500).send({ error: error?.message || 'key_rotation_failed', message: 'Failed to rotate master key' });
    }
});
const start = async () => {
    try {
        // CORS for local dev; restrict in production
        await server.register(cors_1.default, {
            origin: [/^http:\/\/localhost:\d+$/],
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
        });
        // Basic security headers
        server.addHook('onSend', async (req, reply, payload) => {
            reply.header('X-Content-Type-Options', 'nosniff');
            reply.header('Referrer-Policy', 'no-referrer');
            reply.header('X-Frame-Options', 'DENY');
            reply.header('Permissions-Policy', 'camera=(), microphone=()');
            return payload;
        });
        await generateDemoVault();
        await server.listen({ port: 4000, host: '0.0.0.0' });
        console.log('Server listening on 4000');
    }
    catch (e) {
        server.log.error(e);
        process.exit(1);
    }
};
start();
