"use strict";
/**
 * Swagger/OpenAPI Documentation Setup
 * Provides API documentation at /docs endpoint
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSwagger = registerSwagger;
const swagger_1 = __importDefault(require("@fastify/swagger"));
const swagger_ui_1 = __importDefault(require("@fastify/swagger-ui"));
const config_1 = require("../config");
async function registerSwagger(server) {
    // Register Swagger
    await server.register(swagger_1.default, {
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
- Pro (Personal/Family): 500 requests/minute
- Teams: 5000 requests/minute
- Enterprise: Unlimited

## Base URL

**Production**: \`https://api.safe-node.app\`
**Development**: \`http://localhost:4000\`
        `,
                version: '1.0.0',
                contact: {
                    name: 'SafeNode Support',
                    email: 'support@safe-node.app',
                    url: 'https://safe-node.app/support'
                },
                license: {
                    name: 'MIT',
                    url: 'https://opensource.org/licenses/MIT'
                }
            },
            servers: [
                {
                    url: config_1.config.nodeEnv === 'production'
                        ? 'https://api.safe-node.app'
                        : 'http://localhost:4000',
                    description: config_1.config.nodeEnv === 'production' ? 'Production server' : 'Development server'
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
                                enum: ['free', 'pro', 'enterprise']
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
                            passwordUpdatedAt: { type: 'integer', format: 'int64' },
                            createdAt: { type: 'integer', format: 'int64' },
                            updatedAt: { type: 'integer', format: 'int64' }
                        }
                    },
                    Device: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            deviceId: { type: 'string' },
                            name: { type: 'string' },
                            platform: { type: 'string', enum: ['web', 'desktop', 'mobile'] },
                            lastSeen: { type: 'string', format: 'date-time' },
                            registeredAt: { type: 'string', format: 'date-time' },
                            isActive: { type: 'boolean' }
                        }
                    },
                    Team: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
                            slug: { type: 'string' },
                            description: { type: 'string' },
                            createdAt: { type: 'string', format: 'date-time' },
                            updatedAt: { type: 'string', format: 'date-time' }
                        }
                    },
                    TeamMember: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            teamId: { type: 'string' },
                            userId: { type: 'string' },
                            role: { type: 'string', enum: ['owner', 'admin', 'manager', 'member', 'viewer'] },
                            joinedAt: { type: 'string', format: 'date-time' }
                        }
                    },
                    AuditLog: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            userId: { type: 'string' },
                            action: { type: 'string' },
                            resourceType: { type: 'string' },
                            resourceId: { type: 'string' },
                            metadata: { type: 'object' },
                            ipAddress: { type: 'string' },
                            userAgent: { type: 'string' },
                            createdAt: { type: 'string', format: 'date-time' }
                        }
                    },
                    Subscription: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            userId: { type: 'string' },
                            stripeSubscriptionId: { type: 'string' },
                            stripePriceId: { type: 'string' },
                            status: { type: 'string', enum: ['active', 'cancelled', 'past_due', 'trialing'] },
                            currentPeriodStart: { type: 'string', format: 'date-time' },
                            currentPeriodEnd: { type: 'string', format: 'date-time' },
                            cancelAtPeriodEnd: { type: 'boolean' }
                        }
                    },
                    PaginatedResponse: {
                        type: 'object',
                        properties: {
                            data: { type: 'array', items: { type: 'object' } },
                            pagination: {
                                type: 'object',
                                properties: {
                                    page: { type: 'integer', description: 'Current page number (1-indexed)' },
                                    limit: { type: 'integer', description: 'Number of items per page' },
                                    total: { type: 'integer', description: 'Total number of items' },
                                    totalPages: { type: 'integer', description: 'Total number of pages' },
                                    hasNext: { type: 'boolean', description: 'Whether there is a next page' },
                                    hasPrev: { type: 'boolean', description: 'Whether there is a previous page' }
                                },
                                required: ['page', 'limit', 'total', 'totalPages', 'hasNext', 'hasPrev']
                            }
                        },
                        required: ['data', 'pagination']
                    },
                    PaginationQuery: {
                        type: 'object',
                        properties: {
                            page: {
                                type: 'string',
                                description: 'Page number (default: 1)',
                                example: '1'
                            },
                            limit: {
                                type: 'string',
                                description: 'Items per page (default: 20, max: 100)',
                                example: '20'
                            },
                            sort: {
                                type: 'string',
                                description: 'Sort field and direction (format: field:asc or field:desc)',
                                example: 'createdAt:desc'
                            }
                        }
                    },
                    CursorPaginationQuery: {
                        type: 'object',
                        properties: {
                            cursor: {
                                type: 'string',
                                description: 'Cursor for pagination (base64-encoded)',
                                example: 'eyJpZCI6IjEyMyJ9'
                            },
                            limit: {
                                type: 'string',
                                description: 'Items per page (default: 20, max: 100)',
                                example: '20'
                            },
                            direction: {
                                type: 'string',
                                enum: ['forward', 'backward'],
                                description: 'Pagination direction (default: forward)',
                                example: 'forward'
                            }
                        }
                    },
                    SyncStatus: {
                        type: 'object',
                        properties: {
                            serverVersion: { type: 'integer' },
                            localVersion: { type: 'integer' },
                            needsSync: { type: 'boolean' },
                            hasConflicts: { type: 'boolean' },
                            lastSyncedAt: { type: 'string', format: 'date-time' }
                        }
                    },
                    ConflictData: {
                        type: 'object',
                        properties: {
                            entryId: { type: 'string' },
                            conflictType: { type: 'string', enum: ['both_modified', 'deleted_locally', 'deleted_server'] },
                            localEntry: { $ref: '#/components/schemas/VaultEntry' },
                            serverEntry: { $ref: '#/components/schemas/VaultEntry' }
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
    });
    // Register Swagger UI
    await server.register(swagger_ui_1.default, {
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
            return swaggerObject;
        },
        transformSpecificationClone: true
    });
    // Note: /docs/json is automatically provided by @fastify/swagger-ui
    // No need to manually register it
}
