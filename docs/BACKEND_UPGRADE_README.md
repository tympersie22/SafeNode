# SafeNode Backend Upgrade Guide

This document describes the advanced backend upgrades implemented for SafeNode.

## Overview

The backend has been upgraded with:
- **Zod validation** for all vault payloads
- **Multiple storage adapters** (File, Prisma, MongoDB)
- **JWT authentication** middleware
- **Encryption at rest** support
- **Rate limiting** and production security middleware
- **Improved breach checking** with caching
- **Graceful shutdown** and error handling

## Installation

Install all new dependencies:

```bash
cd backend
npm install
```

### New Dependencies

- `zod` - Schema validation
- `jsonwebtoken` - JWT authentication
- `dotenv` - Environment variable management
- `@fastify/helmet` - Security headers
- `@fastify/compress` - Response compression
- `@fastify/rate-limit` - Rate limiting
- `mongodb` - MongoDB driver (optional, if using MongoDB adapter)
- `prisma` & `@prisma/client` - Prisma ORM (optional, if using Prisma adapter)
- `pino-pretty` - Pretty logging for development

## Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Update `.env` with your configuration:
```env
PORT=4000
NODE_ENV=development
DB_ADAPTER=file
JWT_SECRET=your_jwt_secret_change_in_production
ENCRYPTION_KEY=
```

### Generating Secrets

**JWT_SECRET** (required for authentication):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**ENCRYPTION_KEY** (optional, recommended for production):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Storage Adapters

### File Adapter (Default)

In-memory storage, data lost on restart. Suitable for development.

```env
DB_ADAPTER=file
```

### Prisma Adapter (SQL Database)

Supports PostgreSQL, MySQL, and SQLite.

1. Set environment variables:
```env
DB_ADAPTER=prisma
DATABASE_URL=postgresql://user:password@localhost:5432/safenode?schema=public
```

2. Initialize Prisma:
```bash
npx prisma init
```

3. Update `prisma/schema.prisma` with the schema from `src/adapters/prismaAdapter.ts`

4. Run migrations:
```bash
npx prisma migrate dev
npx prisma generate
```

### MongoDB Adapter

1. Set environment variables:
```env
DB_ADAPTER=mongo
MONGO_URI=mongodb://localhost:27017/safenode
```

2. Start MongoDB (if not already running):
```bash
docker run -d -p 27017:27017 mongo
```

## Authentication

JWT authentication is available but **disabled by default** for backward compatibility.

To enable JWT authentication:

1. Uncomment `preHandler: requireAuth` in `src/app.ts` for protected routes
2. Use the `/api/auth/login` endpoint to get a JWT token
3. Include the token in requests: `Authorization: Bearer <token>`

### Auth Endpoints

- `POST /api/auth/login` - Login and get JWT token
- `POST /api/auth/register` - Register new user (demo)
- `POST /api/auth/verify` - Verify JWT token

## Encryption at Rest

If `ENCRYPTION_KEY` is set, vault data will be encrypted before storage.

**Important**: 
- Encryption keys must be rotated periodically
- If you lose the key, encrypted data cannot be recovered
- Store keys securely (use a secrets manager in production)

## Rate Limiting

Default: 100 requests per 15 minutes per IP.

Configure via environment variables:
```env
RATE_LIMIT_WINDOW_MINUTES=15
RATE_LIMIT_MAX=100
```

## Breach Checking

The breach check endpoint (`/api/breach/range/:prefix`) now includes:
- In-memory LRU cache (5-minute TTL)
- Improved error handling
- Automatic retry logic

Cache stats available at `/api/breach/cache/stats`.

## File Structure

```
backend/src/
├── adapters/          # Storage adapters
│   ├── fileAdapter.ts
│   ├── prismaAdapter.ts
│   ├── mongoAdapter.ts
│   └── index.ts
├── config.ts          # Configuration management
├── controllers/       # Route controllers
│   ├── vaultController.ts
│   └── breachController.ts
├── middleware/        # Middleware
│   └── auth.ts
├── routes/           # Route definitions
│   └── auth.ts
├── utils/            # Utilities
│   └── encryption.ts
├── validation/       # Zod schemas
│   └── vaultSchema.ts
├── app.ts            # Fastify app setup
└── index.ts          # Entry point (legacy, to be migrated)
```

## Migration Notes

The new structure is designed to work alongside the existing `index.ts` for backward compatibility. To fully migrate:

1. Update `index.ts` to use the new `createApp()` function
2. Migrate legacy routes to controllers
3. Enable JWT authentication
4. Switch to Prisma or MongoDB adapter

## Security Best Practices

1. **Never commit `.env` files** - Use `.env.example` as a template
2. **Rotate secrets regularly** - Change JWT_SECRET and ENCRYPTION_KEY periodically
3. **Use strong secrets** - At least 32 bytes, base64-encoded
4. **Enable encryption in production** - Set ENCRYPTION_KEY
5. **Restrict CORS** - Update CORS_ORIGIN for production
6. **Enable rate limiting** - Adjust limits based on your needs
7. **Use HTTPS** - Always use TLS in production
8. **Monitor logs** - Watch for suspicious activity

## Troubleshooting

### "Cannot find module 'zod'"
Run `npm install` to install dependencies.

### "Database connection failed"
- Check that your database is running
- Verify connection strings in `.env`
- For Prisma: Run `npx prisma generate`

### "JWT_SECRET is required"
Set `JWT_SECRET` in `.env` or disable JWT auth by keeping routes unprotected.

### "Failed to encrypt/decrypt"
- Verify `ENCRYPTION_KEY` is a valid 32-byte base64 string
- Ensure the same key is used for encryption and decryption

## Next Steps

1. Install dependencies: `npm install`
2. Configure `.env` file
3. Test with file adapter (default)
4. Optionally migrate to Prisma or MongoDB
5. Enable JWT authentication when ready
6. Set up encryption for production

