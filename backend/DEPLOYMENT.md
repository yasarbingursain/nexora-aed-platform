# Nexora AED Platform - Deployment Guide

This guide provides comprehensive instructions for deploying the Nexora backend API in various environments.

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ 
- PostgreSQL 16+
- Redis 7+
- Docker & Docker Compose (optional)

### Local Development

1. **Clone and Setup**
   ```bash
   git clone <repository-url>
   cd backend
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Database Setup**
   ```bash
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Verify Installation**
   ```bash
   # Health check
   curl http://localhost:8080/health
   
   # Metrics
   curl http://localhost:8080/metrics
   
   # API docs
   curl http://localhost:8080/api/docs
   ```

## 🐳 Docker Deployment

### Single Container

1. **Build Image**
   ```bash
   npm run docker:build
   ```

2. **Run Container**
   ```bash
   npm run docker:run
   ```

### Full Stack with Docker Compose

1. **Start All Services**
   ```bash
   npm run docker:up
   ```

2. **View Logs**
   ```bash
   npm run docker:logs
   ```

3. **Stop Services**
   ```bash
   npm run docker:down
   ```

### Services Included
- **nexora-api**: Backend API server
- **postgres**: PostgreSQL database
- **redis**: Redis cache and queues
- **vault**: HashiCorp Vault (development)
- **prometheus**: Metrics collection
- **grafana**: Monitoring dashboards

## 🏭 Production Deployment

### Environment Variables

**Critical Production Settings:**
```bash
NODE_ENV=production
JWT_SECRET="your-production-jwt-secret-32-chars-minimum"
JWT_REFRESH_SECRET="your-production-refresh-secret-32-chars-minimum"
ENCRYPTION_KEY="your-32-character-encryption-key"
DATABASE_URL="postgresql://user:pass@host:5432/nexora_prod"
REDIS_URL="redis://user:pass@host:6379"
VAULT_ADDR="https://vault.company.com:8200"
VAULT_TOKEN="your-vault-token"
```

**Security Settings:**
```bash
ENABLE_HELMET=true
ENABLE_CORS=true
ALLOWED_ORIGINS="https://app.nexora.com,https://admin.nexora.com"
RATE_LIMIT_MAX_REQUESTS=1000
AUTH_RATE_LIMIT_MAX_ATTEMPTS=3
```

**Monitoring Settings:**
```bash
ENABLE_METRICS=true
LOG_LEVEL=info
LOKI_URL="https://loki.company.com:3100"
PROMETHEUS_ENABLED=true
```

### Database Migration

```bash
# Production migration
npm run db:migrate

# Verify migration
npm run db:studio
```

### SSL/TLS Configuration

For production, ensure:
- TLS 1.3 certificates
- HSTS headers enabled
- Certificate pinning configured
- Perfect Forward Secrecy (PFS)

### Load Balancer Configuration

**Nginx Example:**
```nginx
upstream nexora_api {
    server nexora-api-1:8080;
    server nexora-api-2:8080;
    server nexora-api-3:8080;
}

server {
    listen 443 ssl http2;
    server_name api.nexora.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://nexora_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /metrics {
        deny all;
        return 404;
    }
}
```

## ☸️ Kubernetes Deployment

### Namespace Setup
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: nexora
```

### ConfigMap
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nexora-config
  namespace: nexora
data:
  NODE_ENV: "production"
  API_VERSION: "v1"
  ENABLE_METRICS: "true"
  LOG_LEVEL: "info"
```

### Secret
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: nexora-secrets
  namespace: nexora
type: Opaque
data:
  JWT_SECRET: <base64-encoded-secret>
  DATABASE_URL: <base64-encoded-url>
  REDIS_URL: <base64-encoded-url>
```

### Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nexora-api
  namespace: nexora
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nexora-api
  template:
    metadata:
      labels:
        app: nexora-api
    spec:
      containers:
      - name: nexora-api
        image: nexora/api:latest
        ports:
        - containerPort: 8080
        envFrom:
        - configMapRef:
            name: nexora-config
        - secretRef:
            name: nexora-secrets
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

### Service
```yaml
apiVersion: v1
kind: Service
metadata:
  name: nexora-api-service
  namespace: nexora
spec:
  selector:
    app: nexora-api
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
  type: ClusterIP
```

### Ingress
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nexora-api-ingress
  namespace: nexora
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - api.nexora.com
    secretName: nexora-api-tls
  rules:
  - host: api.nexora.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: nexora-api-service
            port:
              number: 80
```

## 📊 Monitoring Setup

### Prometheus Configuration
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'nexora-api'
    static_configs:
      - targets: ['nexora-api:8080']
    metrics_path: '/metrics'
```

### Grafana Dashboards
- **API Performance**: Response times, throughput, errors
- **Security Metrics**: Auth attempts, rate limits, threats
- **Business Metrics**: Active threats, identities, actions
- **Infrastructure**: CPU, memory, database connections

### Alerting Rules
```yaml
groups:
  - name: nexora-api
    rules:
      - alert: HighErrorRate
        expr: rate(nexora_http_requests_total{status_code=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: High error rate detected
      
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(nexora_http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: High response time detected
```

## 🔒 Security Checklist

### Pre-Deployment Security Review
- [ ] All secrets stored in Vault/K8s secrets
- [ ] Security headers configured (CSP, HSTS, etc.)
- [ ] Rate limiting enabled and configured
- [ ] Input validation implemented
- [ ] Audit logging configured
- [ ] TLS certificates valid and configured
- [ ] Database encryption enabled
- [ ] Backup encryption verified
- [ ] Security tests passing
- [ ] Vulnerability scan completed

### Production Security Hardening
- [ ] Firewall rules configured
- [ ] VPN/bastion host setup
- [ ] Database access restricted
- [ ] Redis access secured
- [ ] Vault sealed and configured
- [ ] Log aggregation secured
- [ ] Monitoring alerts configured
- [ ] Incident response plan ready

## 🔧 Troubleshooting

### Common Issues

**Database Connection Errors:**
```bash
# Check database connectivity
npm run db:studio

# Verify connection string
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1;"
```

**Redis Connection Errors:**
```bash
# Test Redis connection
redis-cli -u $REDIS_URL ping

# Check Redis logs
docker logs nexora-redis
```

**Authentication Issues:**
```bash
# Verify JWT secrets
echo $JWT_SECRET | wc -c  # Should be >= 32

# Check Vault connectivity
vault status
```

### Performance Tuning

**Database Optimization:**
- Connection pooling: 10-20 connections per instance
- Query optimization with indexes
- Regular VACUUM and ANALYZE

**Redis Optimization:**
- Memory allocation: 2-4GB for production
- Persistence: AOF for durability
- Clustering for high availability

**Application Optimization:**
- Node.js cluster mode
- PM2 for process management
- Memory leak monitoring

### Monitoring and Alerts

**Key Metrics to Monitor:**
- Response time (95th percentile < 500ms)
- Error rate (< 1%)
- CPU usage (< 70%)
- Memory usage (< 80%)
- Database connections (< 80% of pool)
- Redis memory usage (< 80%)

**Critical Alerts:**
- Service down
- High error rate
- Database connection failures
- Security events
- Resource exhaustion

## 📞 Support

### Getting Help
- **Documentation**: https://docs.nexora.com
- **API Support**: api-support@nexora.com
- **Security Issues**: security@nexora.com
- **Emergency**: +1-XXX-XXX-XXXX

### Maintenance Windows
- **Scheduled**: Sundays 2-4 AM UTC
- **Emergency**: As needed with 1-hour notice
- **Updates**: Monthly security patches

---

**Last Updated**: October 2024  
**Version**: 1.2.0  
**Maintainer**: Nexora DevOps Team
