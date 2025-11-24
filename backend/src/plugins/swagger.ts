/**
 * Swagger/OpenAPI Documentation Setup
 * Provides API documentation at /docs endpoint
 */

import { FastifyInstance } from 'fastify'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { config } from '../config'

export async function registerSwagger(server: FastifyInstance): Promise<void> {
  // Register Swagger
  await server.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'SafeNode API',
        description: `
# SafeNode API Documentation

SafeNode is a zero-knowledge password manager with full SaaS infrastructure.

## Features
- Zero-knowledge encryption (AES-256-GCM + Argon2id)
- User authentication and authorization
- Vault management and sync
- Team vaults with RBAC
- Subscription management (Stripe)
- SSO integration (OAuth2)
- Audit logging
- Device management

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

## Rate Limiting

Rate limits vary by subscription tier:
- Free: 100 requests/minute
- Individual: 500 requests/minute
- Family: 1000 requests/minute
- Teams: 5000 requests/minute
- Business: 10000 requests/minute
- Enterprise: Unlimited

## Base URL

**Production**: \`https://api.safenode.app\`
**Development**: \`http://localhost:4000\`
        `,
        version: '1.0.0',
        contact: {
          name: 'SafeNode Support',
          email: 'support@safenode.app',
          url: 'https://safenode.app/support'
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT'
        }
      },
      servers: [
        {
          url: config.nodeEnv === 'production'
            ? 'https://api.safenode.app'
            : 'http://localhost:4000',
          description: config.nodeEnv === 'production' ? 'Production server' : 'Development server'
        }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT token obtained from /api/auth/login'
          }
        },
        schemas: {
          Error: {
            type: 'object',
            properties: {
              error: {
                type: 'string',
                description: 'Error code'
              },
              message: {
                type: 'string',
                description: 'Human-readable error message'
              },
              details: {
                type: 'object',
                description: 'Additional error details'
              }
            },
            required: ['error', 'message']
          },
          User: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string', format: 'email' },
              displayName: { type: 'string' },
              emailVerified: { type: 'boolean' },
              subscriptionTier: {
                type: 'string',
                enum: ['free', 'individual', 'family', 'teams', 'business', 'enterprise']
              },
              subscriptionStatus: {
                type: 'string',
                enum: ['active', 'cancelled', 'past_due']
              },
              createdAt: { type: 'integer', format: 'int64' },
              updatedAt: { type: 'integer', format: 'int64' }
            }
          },
          VaultEntry: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              username: { type: 'string' },
              password: { type: 'string' },
              url: { type: 'string', format: 'uri' },
              notes: { type: 'string' },
              tags: { type: 'array', items: { type: 'string' } },
              category: { type: 'string' },
              passwordUpdatedAt: { type: 'integer', format: 'int64' }
            }
          }
        }
      },
      tags: [
        { name: 'Authentication', description: 'User authentication and registration' },
        { name: 'Vault', description: 'Vault operations and sync' },
        { name: 'Billing', description: 'Subscription and billing management' },
        { name: 'Teams', description: 'Team vaults and collaboration' },
        { name: 'Devices', description: 'Device management' },
        { name: 'Audit', description: 'Audit logs and activity tracking' },
        { name: 'SSO', description: 'Single Sign-On integration' },
        { name: 'Health', description: 'Health checks and monitoring' }
      ]
    }
  })

  // Register Swagger UI
  await server.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      tryItOutEnabled: true
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
    transformSpecification: (swaggerObject, request, reply) => {
      return swaggerObject
    },
    transformSpecificationClone: true
  })

  // Add endpoint to serve OpenAPI spec as JSON
  server.get('/docs/json', async (request, reply) => {
    return server.swagger()
  })
}

