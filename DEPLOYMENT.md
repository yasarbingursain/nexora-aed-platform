# NEXORA AED PLATFORM - PRODUCTION DEPLOYMENT GUIDE

## 🎯 ENTERPRISE-GRADE DEPLOYMENT - NO LOCALHOST

This guide provides production-ready deployment instructions for the Nexora Autonomous Entity Defense Platform.

---

## 📦 DELIVERABLES COMPLETED

### ✅ 1. Comprehensive Playwright Test Suite
**File:** `tests/e2e/nexora-full-suite.spec.ts`

**Coverage:**
- Landing page navigation and UX
- Authentication flows (login/signup with validation)
- Demo page with live threat intelligence
- Client dashboard full feature set
- All dashboard sub-pages (threats, entities, compliance, reports, ML, integrations, forensics, honey-tokens)
- API endpoint security validation
- Security headers (CSP, HSTS, X-Frame-Options)
- Accessibility compliance (WCAG 2.1 AA)
- Performance metrics (LCP < 2.5s)
- Responsive design (mobile, tablet, desktop)
- Error handling (404, error boundaries)
- Complete user journeys

**Run Tests:**
```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run all tests
npx playwright test

# Run specific suite
npx playwright test tests/e2e/nexora-full-suite.spec.ts

# Run with UI
npx playwright test --ui

# Run specific browser
npx playwright test --project=chromium
```

---

### ✅ 2. Docker Production Configuration
**File:** `docker-compose.production.yml`

**Services Included:**
- PostgreSQL 16 (database)
- Redis 7 (cache/queue)
- Nexora API (Node.js/Express backend)
- Nexora ML (Python/FastAPI ML service)
- Nexora Frontend (Next.js)
- Nginx (reverse proxy with SSL)
- Prometheus (metrics - optional)
- Grafana (dashboards - optional)

**Features:**
- Health checks for all services
- Resource limits and reservations
- Non-root users for security
- Volume persistence
- Internal/external network separation
- Automatic restarts

---

### ✅ 3. Dockerfiles Created

#### Frontend Dockerfile
**File:** `Dockerfile.frontend`
- Multi-stage build for optimization
- Standalone Next.js output
- Non-root user (nextjs:nodejs)
- Health check endpoint
- Production-ready with minimal image size

#### Backend Dockerfile
**File:** `backend/Dockerfile` (already exists, verified)
- Multi-stage build
- Prisma client generation
- Non-root user (nexora:nodejs)
- Health check endpoint

#### ML Service Dockerfile
**File:** `backend-ml/Dockerfile`
- Python 3.11 slim base
- FastAPI with uvicorn
- Non-root user (mluser:mlservice)
- Health check endpoint

---

### ✅ 4. Nginx Reverse Proxy
**File:** `infrastructure/nginx/nginx.conf`

**Features:**
- SSL/TLS termination
- HTTP to HTTPS redirect
- Security headers (HSTS, CSP, X-Frame-Options, etc.)
- Rate limiting (API: 10r/s, Login: 5r/m)
- WebSocket support
- Static file caching
- CORS configuration
- Attack pattern blocking

---

### ✅ 5. Environment Configuration
**File:** `.env.production.example`

**Required Variables:**
- Database credentials
- Redis password
- JWT secrets (generate with openssl)
- Service ports
- URLs for production domain
- Optional: External API keys (GitHub, AbuseIPDB, NIST NVD)

---

## 🚀 PRODUCTION DEPLOYMENT

### Prerequisites

1. **Server Requirements:**
   - Linux server (Ubuntu 22.04 LTS recommended)
   - Docker Engine 24.0+
   - Docker Compose 2.20+
   - 8GB RAM minimum (16GB recommended)
   - 50GB disk space minimum
   - Domain name with DNS configured

2. **SSL Certificates:**
   - Use Let's Encrypt with Certbot
   - Or provide your own SSL certificates

---

### Step 1: Prepare Environment

```bash
# Clone repository to server
git clone <your-repo-url> /opt/nexora
cd /opt/nexora

# Copy environment template
cp .env.production.example .env.production

# Generate secure secrets
openssl rand -base64 64  # For JWT_SECRET
openssl rand -base64 64  # For JWT_REFRESH_SECRET
openssl rand -base64 32  # For POSTGRES_PASSWORD
openssl rand -base64 32  # For REDIS_PASSWORD

# Edit .env.production with your values
nano .env.production
```

**Critical Variables to Set:**
```env
# Database
POSTGRES_PASSWORD=<generated-password>

# Redis
REDIS_PASSWORD=<generated-password>

# JWT
JWT_SECRET=<generated-secret>
JWT_REFRESH_SECRET=<generated-secret>

# URLs (replace with your domain)
FRONTEND_URL=https://nexora.yourdomain.com
NEXT_PUBLIC_API_URL=https://api.nexora.yourdomain.com
ALLOWED_ORIGINS=https://nexora.yourdomain.com

# Grafana (if using monitoring)
GRAFANA_PASSWORD=<secure-password>
```

---

### Step 2: SSL Certificates

**Option A: Let's Encrypt (Recommended)**
```bash
# Install Certbot
sudo apt update
sudo apt install certbot

# Generate certificates
sudo certbot certonly --standalone -d nexora.yourdomain.com -d api.nexora.yourdomain.com

# Copy certificates to project
sudo mkdir -p infrastructure/nginx/ssl
sudo cp /etc/letsencrypt/live/nexora.yourdomain.com/fullchain.pem infrastructure/nginx/ssl/
sudo cp /etc/letsencrypt/live/nexora.yourdomain.com/privkey.pem infrastructure/nginx/ssl/
sudo chmod 644 infrastructure/nginx/ssl/*.pem
```

**Option B: Self-Signed (Development Only)**
```bash
mkdir -p infrastructure/nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout infrastructure/nginx/ssl/privkey.pem \
  -out infrastructure/nginx/ssl/fullchain.pem
```

---

### Step 3: Update Nginx Configuration

Edit `infrastructure/nginx/nginx.conf`:
```nginx
# Replace all instances of:
server_name nexora.yourdomain.com;
# With your actual domain
```

---

### Step 4: Build and Deploy

```bash
# Load environment variables
export $(cat .env.production | xargs)

# Build all services
docker-compose -f docker-compose.production.yml build

# Start services (without monitoring)
docker-compose -f docker-compose.production.yml up -d

# OR start with monitoring (Prometheus + Grafana)
docker-compose -f docker-compose.production.yml --profile monitoring up -d

# OR start with Nginx reverse proxy
docker-compose -f docker-compose.production.yml --profile with-nginx up -d
```

---

### Step 5: Initialize Database

```bash
# Run Prisma migrations
docker-compose -f docker-compose.production.yml exec nexora-api npx prisma migrate deploy

# Generate Prisma client (if needed)
docker-compose -f docker-compose.production.yml exec nexora-api npx prisma generate

# Seed database (optional)
docker-compose -f docker-compose.production.yml exec nexora-api npm run db:seed
```

---

### Step 6: Verify Deployment

```bash
# Check service status
docker-compose -f docker-compose.production.yml ps

# Check logs
docker-compose -f docker-compose.production.yml logs -f

# Test health endpoints
curl https://nexora.yourdomain.com/api/healthz
curl https://api.nexora.yourdomain.com/health

# Check metrics (if monitoring enabled)
curl http://localhost:9090  # Prometheus
curl http://localhost:3001  # Grafana
```

---

## 🔒 SECURITY HARDENING

### 1. Firewall Configuration
```bash
# Allow only necessary ports
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp  # SSH
sudo ufw enable
```

### 2. Docker Security
```bash
# Run Docker in rootless mode (recommended)
dockerd-rootless-setuptool.sh install

# Enable Docker Content Trust
export DOCKER_CONTENT_TRUST=1
```

### 3. Regular Updates
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker-compose -f docker-compose.production.yml pull
docker-compose -f docker-compose.production.yml up -d
```

### 4. Backup Strategy
```bash
# Backup database
docker-compose -f docker-compose.production.yml exec postgres pg_dump -U nexora_user nexora_db > backup.sql

# Backup volumes
docker run --rm -v nexora_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-backup.tar.gz /data
```

---

## 📊 MONITORING

### Access Grafana
1. Navigate to `https://grafana.nexora.yourdomain.com`
2. Login with credentials from `.env.production`
3. Import Nexora dashboards from `infrastructure/monitoring/grafana/dashboards/`

### Prometheus Metrics
- API metrics: `http://api.nexora.yourdomain.com/metrics`
- System metrics: `http://localhost:9090`

---

## 🧪 TESTING IN PRODUCTION

### Smoke Tests
```bash
# Test landing page
curl -I https://nexora.yourdomain.com

# Test API health
curl https://api.nexora.yourdomain.com/health

# Test demo page
curl https://nexora.yourdomain.com/demo

# Test authentication
curl -X POST https://api.nexora.yourdomain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### Load Testing
```bash
# Install k6
sudo apt install k6

# Run load test
k6 run tests/load/api-load-test.js
```

---

## 🔧 TROUBLESHOOTING

### Service Won't Start
```bash
# Check logs
docker-compose -f docker-compose.production.yml logs <service-name>

# Restart service
docker-compose -f docker-compose.production.yml restart <service-name>

# Rebuild service
docker-compose -f docker-compose.production.yml up -d --build <service-name>
```

### Database Connection Issues
```bash
# Check PostgreSQL is running
docker-compose -f docker-compose.production.yml exec postgres pg_isready

# Check connection string
docker-compose -f docker-compose.production.yml exec nexora-api env | grep DATABASE_URL
```

### SSL Certificate Issues
```bash
# Verify certificate
openssl x509 -in infrastructure/nginx/ssl/fullchain.pem -text -noout

# Test SSL configuration
curl -vI https://nexora.yourdomain.com
```

---

## 📈 SCALING

### Horizontal Scaling
```bash
# Scale API service
docker-compose -f docker-compose.production.yml up -d --scale nexora-api=3

# Scale ML service
docker-compose -f docker-compose.production.yml up -d --scale nexora-ml=2
```

### Load Balancer
Add Nginx upstream configuration for multiple backend instances.

---

## 🎯 WHAT NEXORA IS FIT FOR

### Primary Use Cases

1. **Non-Human Identity Security**
   - Service accounts, API keys, tokens
   - Machine-to-machine authentication
   - Bot and automation credentials

2. **Autonomous Threat Detection**
   - Real-time anomaly detection using ML
   - Behavioral analysis of non-human entities
   - Automated threat response

3. **Compliance & Audit**
   - SOC 2 Type II compliance
   - GDPR Article 22 (explainable AI)
   - HIPAA, PCI-DSS support
   - Complete audit trails

4. **Enterprise Security Operations**
   - SIEM integration (Splunk, QRadar, Sentinel)
   - Threat intelligence feeds
   - Forensics and incident response
   - Honey token deployment

5. **Post-Quantum Cryptography**
   - Quantum-resistant algorithms
   - Future-proof security

### Target Industries
- Financial Services
- Healthcare
- Technology/SaaS
- Government/Defense
- Critical Infrastructure

### Deployment Models
- Cloud (AWS, Azure, GCP)
- On-premises
- Hybrid
- Air-gapped environments

---

## 📞 SUPPORT

### Health Checks
- Frontend: `https://nexora.yourdomain.com/api/healthz`
- Backend: `https://api.nexora.yourdomain.com/health`
- ML Service: `https://api.nexora.yourdomain.com/ml/health`

### Logs Location
- Frontend: `docker-compose logs nexora-frontend`
- Backend: `docker-compose logs nexora-api`
- ML Service: `docker-compose logs nexora-ml`
- Nginx: `infrastructure/nginx/logs/`

---

## ✅ DEPLOYMENT CHECKLIST

- [ ] Server provisioned with Docker installed
- [ ] Domain DNS configured
- [ ] SSL certificates obtained
- [ ] `.env.production` configured with secure secrets
- [ ] Nginx configuration updated with domain
- [ ] Firewall rules configured
- [ ] Docker images built successfully
- [ ] All services started and healthy
- [ ] Database migrations applied
- [ ] Health endpoints responding
- [ ] Smoke tests passing
- [ ] Monitoring configured (optional)
- [ ] Backup strategy implemented
- [ ] Documentation reviewed

---

## 🎉 PRODUCTION READY

Your Nexora AED Platform is now ready for enterprise production deployment with:
- ✅ Zero localhost dependencies
- ✅ Enterprise-grade security
- ✅ Comprehensive testing
- ✅ Production monitoring
- ✅ Scalable architecture
- ✅ Complete documentation
