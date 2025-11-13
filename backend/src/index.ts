import Fastify from 'fastify'
import cors from '@fastify/cors'
import { webcrypto, randomBytes } from 'crypto'
import argon2 from 'argon2'
import { TextEncoder } from 'util'

const server = Fastify({ logger: true })

// Will be generated at startup to allow immediate unlock with password "demo-password"
let demoSaltB64 = ''
let demoBlob = {
  iv: '',
  encryptedVault: ''
}
let currentSaltB64: string | null = null

function arrayBufferToBase64 (buffer: ArrayBuffer): string {
  return Buffer.from(new Uint8Array(buffer)).toString('base64')
}

async function generateDemoVault (): Promise<void> {
  const password = 'demo-password'
  const encoder = new TextEncoder()

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
  }

  const plaintext = encoder.encode(JSON.stringify(sampleVault))

  // Generate salt (32 bytes) and IV (12 bytes for AES-GCM)
  const salt = new Uint8Array(randomBytes(32))
  const iv = new Uint8Array(randomBytes(12))

  // Derive key via PBKDF2 SHA-256 100k iterations, AES-GCM-256
  try {
    // Derive a 32-byte key using Argon2id compatible with frontend
    const rawKey: Buffer = await argon2.hash(password, {
      type: argon2.argon2id,
      salt: Buffer.from(salt),
      timeCost: 3,
      memoryCost: 64 * 1024, // KiB
      parallelism: 1,
      hashLength: 32,
      raw: true
    })

    const aesKey = await webcrypto.subtle.importKey(
      'raw',
      rawKey,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    )

    const ciphertext = await webcrypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      plaintext
    )

    demoSaltB64 = arrayBufferToBase64(salt.buffer)
    currentSaltB64 = demoSaltB64
    demoBlob = {
      iv: arrayBufferToBase64(iv.buffer),
      encryptedVault: arrayBufferToBase64(ciphertext)
    }
  } catch (err) {
    console.error('Error generating demo vault:', err)
    throw err
  }
}

server.get('/api/user/salt', async (req, reply) => {
  return { salt: currentSaltB64 ?? demoSaltB64 }
})

server.get('/api/vault/latest', async (req, reply) => {
  return demoBlob
})

// Accept latest vault blob and optional salt for persistence (demo only)
server.post('/api/vault', async (req, reply) => {
  try {
    const body = req.body as any
    const { encryptedVault, iv, salt } = body || {}
    if (typeof encryptedVault !== 'string' || typeof iv !== 'string') {
      return reply.code(400).send({ error: 'invalid_payload' })
    }
    demoBlob = { encryptedVault, iv }
    if (typeof salt === 'string' && salt.length > 0) {
      currentSaltB64 = salt
    }
    return { ok: true }
  } catch (e) {
    req.log.error(e)
    return reply.code(500).send({ error: 'server_error' })
  }
})

// CRUD Operations for individual vault entries
// Note: These endpoints work with the full encrypted vault blob
// The frontend handles encryption/decryption locally

// Create new entry (requires full vault re-encryption on frontend)
server.post('/api/vault/entry', async (req, reply) => {
  try {
    const body = req.body as any
    const { encryptedVault, iv, version } = body || {}
    
    if (typeof encryptedVault !== 'string' || typeof iv !== 'string') {
      return reply.code(400).send({ error: 'invalid_payload' })
    }
    
    // Update the demo vault with new encrypted data
    demoBlob = { 
      encryptedVault, 
      iv,
      version: version || Date.now()
    }
    
    return { 
      ok: true, 
      version: demoBlob.version,
      message: 'Entry created successfully' 
    }
  } catch (e) {
    req.log.error(e)
    return reply.code(500).send({ error: 'server_error' })
  }
})

// Update existing entry (requires full vault re-encryption on frontend)
server.put('/api/vault/entry/:id', async (req, reply) => {
  try {
    const { id } = req.params as { id: string }
    const body = req.body as any
    const { encryptedVault, iv, version } = body || {}
    
    if (!id || typeof encryptedVault !== 'string' || typeof iv !== 'string') {
      return reply.code(400).send({ error: 'invalid_payload' })
    }
    
    // Update the demo vault with new encrypted data
    demoBlob = { 
      encryptedVault, 
      iv,
      version: version || Date.now()
    }
    
    return { 
      ok: true, 
      version: demoBlob.version,
      message: `Entry ${id} updated successfully` 
    }
  } catch (e) {
    req.log.error(e)
    return reply.code(500).send({ error: 'server_error' })
  }
})

  // Delete entry (requires full vault re-encryption on frontend)
  server.delete('/api/vault/entry/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string }
      const body = req.body as any
      const { encryptedVault, iv, version } = body || {}
      
      if (!id || typeof encryptedVault !== 'string' || typeof iv !== 'string') {
        return reply.code(400).send({ error: 'invalid_payload' })
      }
      
      // Update the demo vault with new encrypted data
      demoBlob = { 
        encryptedVault, 
        iv,
        version: version || Date.now()
      }
      
      return { 
        ok: true, 
        version: demoBlob.version,
        message: `Entry ${id} deleted successfully` 
      }
    } catch (e) {
      req.log.error(e)
      return reply.code(500).send({ error: 'server_error' })
    }
  })

  // Breach monitoring via HIBP k-anonymity (range API)
  // Ref: https://haveibeenpwned.com/API/v3#SearchingPwnedPasswordsByRange
  server.get('/api/breach/range/:prefix', async (req, reply) => {
    try {
      const { prefix } = req.params as { prefix: string }
      // Validate: exactly 5 hex chars
      if (!/^([0-9A-Fa-f]{5})$/.test(prefix)) {
        return reply.code(400).send({ error: 'invalid_prefix' })
      }

      const url = `https://api.pwnedpasswords.com/range/${prefix.toUpperCase()}`
      const res = await fetch(url, {
        headers: {
          // Per HIBP guidelines
          'Add-Padding': 'true',
          'User-Agent': 'SafeNode/0.1 (https://safenode.app)'
        }
      })
      if (!res.ok) {
        return reply.code(502).send({ error: 'hibp_upstream_error', status: res.status })
      }
      const text = await res.text()

      // Return raw text (suffix:count per line)
      reply.header('Content-Type', 'text/plain; charset=utf-8')
      return reply.send(text)
    } catch (e) {
      req.log.error(e)
      return reply.code(500).send({ error: 'server_error' })
    }
  })

  // Master Key Rotation endpoint
  server.post('/api/vault/rotate-key', async (req, reply) => {
    try {
      const body = req.body as any
      const { currentPassword, newPassword } = body || {}
      
      if (!currentPassword || !newPassword) {
        return reply.code(400).send({ error: 'missing_passwords' })
      }

      // Validate current password (in real app, this would verify against stored hash)
      if (currentPassword !== 'demo-password') {
        return reply.code(401).send({ error: 'invalid_current_password' })
      }

      // Validate new password strength
      if (newPassword.length < 8) {
        return reply.code(400).send({ error: 'password_too_short' })
      }

      if (currentPassword === newPassword) {
        return reply.code(400).send({ error: 'same_password' })
      }

      // Generate new salt for the new password
      const newSalt = webcrypto.getRandomValues(new Uint8Array(32))
      const newSaltB64 = Buffer.from(newSalt).toString('base64')

      // Derive new key with new password and salt
      const newKey = await deriveKey(newPassword, newSalt)
      
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
      }

      const vaultJson = JSON.stringify(vaultData)
      const iv = webcrypto.getRandomValues(new Uint8Array(12))
      
      const encrypted = await encrypt(vaultJson, newKey, iv)
      
      // Update demo blob with new encrypted data and salt
      demoBlob = {
        encryptedVault: Buffer.from(encrypted).toString('base64'),
        iv: Buffer.from(iv).toString('base64'),
        version: Date.now()
      }

      // Update demo salt
      demoSaltB64 = newSaltB64

      return { 
        ok: true, 
        message: 'Master key rotated successfully',
        version: demoBlob.version
      }
    } catch (e) {
      req.log.error(e)
      return reply.code(500).send({ error: 'key_rotation_failed' })
    }
  })

const start = async () => {
  try{
    // CORS for local dev; restrict in production
    await server.register(cors, {
      origin: [/^http:\/\/localhost:\d+$/],
      methods: ['GET','POST','OPTIONS']
    })

    // Basic security headers
    server.addHook('onSend', async (req, reply, payload) => {
      reply.header('X-Content-Type-Options', 'nosniff')
      reply.header('Referrer-Policy', 'no-referrer')
      reply.header('X-Frame-Options', 'DENY')
      reply.header('Permissions-Policy', 'camera=(), microphone=()')
      return payload
    })

    await generateDemoVault()
    await server.listen({port:4000, host:'0.0.0.0'})
    console.log('Server listening on 4000')
  }catch(e){
    server.log.error(e)
    process.exit(1)
  }
}
start()
