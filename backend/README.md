# Nexora AED Platform - Backend API

Production-grade backend API for the Nexora Autonomous Entity Defense platform built with Node.js, TypeScript, and Express.js.

## 🚀 Features

- **Multi-tenant Architecture** - Complete tenant isolation with Row Level Security (RLS)
- **JWT Authentication** - Access and refresh tokens with MFA support
- **Rate Limiting** - Redis-based rate limiting with configurable limits
- **Real-time WebSockets** - Live threat feeds and notifications
- **Comprehensive Validation** - Zod-based request validation
- **Audit Logging** - Complete audit trail for compliance
- **Security Headers** - Production-grade security with Helmet
- **API Documentation** - OpenAPI 3.0 compatible endpoints

## 🛠️ Tech Stack

- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Express.js with security middleware
- **Database**: PostgreSQL with Prisma ORM
- **Cache/Queue**: Redis with BullMQ
- **Authentication**: JWT with bcrypt password hashing
- **Validation**: Zod schemas
- **Logging**: Winston with Loki integration
- **WebSockets**: Socket.io for real-time communication

## 📋 Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- npm or yarn

## 🔧 Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Set up the database**:
   ```bash
   npm run db:generate
   npm run db:push
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

## 📁 Project Structure

```
src/
├── config/           # Configuration (env, database, redis)
├── middleware/       # Express middleware
├── routes/           # API route definitions
├── controllers/      # Request handlers
├── services/         # Business logic services
├── validators/       # Zod validation schemas
├── utils/            # Helper utilities
└── server.ts         # Application entry point
```

## 🔐 Environment Variables

Key environment variables (see `.env.example` for complete list):

```bash
# Server
NODE_ENV=development
PORT=8080

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/nexora_db"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-super-secret-jwt-key"
JWT_REFRESH_SECRET="your-super-secret-refresh-key"

# CORS
FRONTEND_URL="http://localhost:3000"
```

## 📚 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register organization and admin user
- `POST /api/v1/auth/login` - User login with optional MFA
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout user
- `GET /api/v1/auth/profile` - Get user profile

### MFA (Multi-Factor Authentication)
- `POST /api/v1/auth/mfa/setup` - Setup TOTP MFA
- `POST /api/v1/auth/mfa/verify` - Verify and enable MFA
- `POST /api/v1/auth/mfa/disable` - Disable MFA

### Health & Documentation
- `GET /health` - Health check endpoint
- `GET /api/docs` - API documentation

## 🔒 Security Features

- **Zero Trust Architecture** - Deny-by-default security policies
- **Multi-tenant Isolation** - Complete data separation between organizations
- **Rate Limiting** - Configurable rate limits per endpoint and organization
- **CSRF Protection** - Cross-site request forgery protection
- **Security Headers** - Comprehensive security headers via Helmet
- **Input Validation** - Strict input validation with Zod
- **Audit Logging** - Complete audit trail for all actions

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 📊 Monitoring & Observability

- **Structured Logging** - JSON-formatted logs with Winston
- **Health Checks** - Built-in health check endpoints
- **Metrics** - Prometheus-compatible metrics (TODO)
- **Tracing** - OpenTelemetry integration (TODO)

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

### Docker
```bash
docker build -t nexora-backend .
docker run -p 8080:8080 nexora-backend
```

## 🔧 Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

## 📝 API Documentation

Once the server is running, visit:
- Health Check: `http://localhost:8080/health`
- API Documentation: `http://localhost:8080/api/docs`

## 🤝 Contributing

1. Follow the existing code style and patterns
2. Add tests for new features
3. Update documentation as needed
4. Ensure all security requirements are met

## 📄 License

This project is proprietary software. All rights reserved.
