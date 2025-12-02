import swaggerJsdoc from 'swagger-jsdoc';
import { env } from '@/config/env';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Nexora AED Platform API',
      version: '1.0.0',
      description: 'Production-grade backend API for the Nexora Autonomous Entity Defense platform',
      contact: {
        name: 'Nexora API Support',
        email: 'api-support@nexora.com',
        url: 'https://docs.nexora.com'
      },
      license: {
        name: 'Proprietary',
        url: 'https://nexora.com/license'
      }
    },
    servers: [
      {
        url: `http://localhost:${env.PORT || 8080}`,
        description: 'Development server'
      },
      {
        url: 'https://api.nexora.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT access token for authentication'
        },
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for service authentication'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            },
            message: {
              type: 'string',
              description: 'Detailed error description'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Error timestamp'
            }
          },
          required: ['error', 'timestamp']
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'User unique identifier'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            firstName: {
              type: 'string',
              description: 'User first name'
            },
            lastName: {
              type: 'string',
              description: 'User last name'
            },
            role: {
              type: 'string',
              enum: ['admin', 'analyst', 'viewer', 'auditor'],
              description: 'User role'
            },
            organizationId: {
              type: 'string',
              format: 'uuid',
              description: 'Organization identifier'
            },
            mfaEnabled: {
              type: 'boolean',
              description: 'Multi-factor authentication status'
            },
            lastLoginAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last login timestamp'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp'
            }
          },
          required: ['id', 'email', 'firstName', 'lastName', 'role', 'organizationId']
        },
        Organization: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Organization unique identifier'
            },
            name: {
              type: 'string',
              description: 'Organization name'
            },
            domain: {
              type: 'string',
              description: 'Organization domain'
            },
            settings: {
              type: 'object',
              description: 'Organization settings'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Organization creation timestamp'
            }
          },
          required: ['id', 'name']
        },
        RegisterRequest: {
          type: 'object',
          properties: {
            organizationName: {
              type: 'string',
              minLength: 2,
              maxLength: 100,
              description: 'Organization name'
            },
            adminEmail: {
              type: 'string',
              format: 'email',
              description: 'Admin user email'
            },
            adminPassword: {
              type: 'string',
              minLength: 8,
              description: 'Admin user password (min 8 characters, must include uppercase, lowercase, number, special character)'
            },
            adminFirstName: {
              type: 'string',
              minLength: 1,
              maxLength: 50,
              description: 'Admin user first name'
            },
            adminLastName: {
              type: 'string',
              minLength: 1,
              maxLength: 50,
              description: 'Admin user last name'
            }
          },
          required: ['organizationName', 'adminEmail', 'adminPassword', 'adminFirstName', 'adminLastName']
        },
        LoginRequest: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            password: {
              type: 'string',
              description: 'User password'
            },
            mfaCode: {
              type: 'string',
              pattern: '^[0-9]{6}$',
              description: 'Six-digit MFA code (required if MFA is enabled)'
            }
          },
          required: ['email', 'password']
        },
        AuthResponse: {
          type: 'object',
          properties: {
            accessToken: {
              type: 'string',
              description: 'JWT access token (15 minutes expiry)'
            },
            refreshToken: {
              type: 'string',
              description: 'JWT refresh token (7 days expiry)'
            },
            user: {
              $ref: '#/components/schemas/User'
            },
            organization: {
              $ref: '#/components/schemas/Organization'
            }
          },
          required: ['accessToken', 'refreshToken', 'user']
        },
        RefreshTokenRequest: {
          type: 'object',
          properties: {
            refreshToken: {
              type: 'string',
              description: 'Valid refresh token'
            }
          },
          required: ['refreshToken']
        },
        MfaSetupResponse: {
          type: 'object',
          properties: {
            secret: {
              type: 'string',
              description: 'Base32 encoded secret for TOTP setup'
            },
            qrCode: {
              type: 'string',
              description: 'Base64 encoded QR code image'
            },
            backupCodes: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Backup codes for account recovery'
            }
          },
          required: ['secret', 'qrCode', 'backupCodes']
        },
        MfaVerifyRequest: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              pattern: '^[0-9]{6}$',
              description: 'Six-digit TOTP code'
            }
          },
          required: ['code']
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'unhealthy'],
              description: 'Service health status'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Health check timestamp'
            },
            version: {
              type: 'string',
              description: 'API version'
            },
            environment: {
              type: 'string',
              description: 'Environment name'
            }
          },
          required: ['status', 'timestamp']
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization'
      },
      {
        name: 'Users',
        description: 'User management operations'
      },
      {
        name: 'Organizations',
        description: 'Organization management'
      },
      {
        name: 'Identities',
        description: 'Identity management and monitoring'
      },
      {
        name: 'Threats',
        description: 'Threat detection and management'
      },
      {
        name: 'Remediation',
        description: 'Automated remediation actions'
      },
      {
        name: 'Compliance',
        description: 'Compliance reporting and audit'
      },
      {
        name: 'Intelligence',
        description: 'Threat intelligence feeds'
      },
      {
        name: 'System',
        description: 'System health and monitoring'
      }
    ]
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './src/server.ts'
  ]
};

export const specs = swaggerJsdoc(options);

// Route documentation
export const authRoutesDocs = `
/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register new organization and admin user
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Organization and admin user created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/AuthResponse'
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                     organizationId:
 *                       type: string
 *                       format: uuid
 *                     userId:
 *                       type: string
 *                       format: uuid
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Organization or user already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: User login
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials or MFA required
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Error'
 *                 - type: object
 *                   properties:
 *                     mfaRequired:
 *                       type: boolean
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenRequest'
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       401:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: User logout
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/v1/auth/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 organization:
 *                   $ref: '#/components/schemas/Organization'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/v1/auth/mfa/setup:
 *   post:
 *     summary: Setup multi-factor authentication
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: MFA setup initiated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MfaSetupResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/v1/auth/mfa/verify:
 *   post:
 *     summary: Verify and enable MFA
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MfaVerifyRequest'
 *     responses:
 *       200:
 *         description: MFA enabled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 mfaEnabled:
 *                   type: boolean
 *       400:
 *         description: Invalid MFA code
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/v1/auth/mfa/disable:
 *   post:
 *     summary: Disable multi-factor authentication
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: MFA disabled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 mfaEnabled:
 *                   type: boolean
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
`;

export const systemRoutesDocs = `
/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [System]
 *     security: []
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 */

/**
 * @swagger
 * /metrics:
 *   get:
 *     summary: Prometheus metrics endpoint
 *     tags: [System]
 *     security: []
 *     responses:
 *       200:
 *         description: Prometheus metrics in text format
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 */

/**
 * @swagger
 * /api/docs:
 *   get:
 *     summary: API documentation
 *     tags: [System]
 *     security: []
 *     responses:
 *       200:
 *         description: API documentation and endpoints
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 version:
 *                   type: string
 *                 documentation:
 *                   type: string
 *                 endpoints:
 *                   type: object
 */
`;
