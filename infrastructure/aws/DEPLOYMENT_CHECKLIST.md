# Nexora AWS Deployment Checklist

## ✅ Pre-Deployment Validation

### 1. Infrastructure Files Fixed
- [x] Backend Dockerfile compiles TypeScript (no ts-node at runtime)
- [x] All base images use AWS Public ECR (no Docker Hub rate limits)
- [x] Health check endpoints use `/health/alb` (public, no auth)
- [x] Terraform outputs.tf fixed (removed non-existent malgenx reference)
- [x] Secrets.tf uses empty strings (not hardcoded placeholders)
- [x] All buildspec files created (backend, frontend, ml)

### 2. Critical Security Issues Resolved
- [x] ALB health check path: `/health/alb` (public endpoint)
- [x] ECS task health check path: `/health/alb` (public endpoint)
- [x] Backend health route added: `/health/alb` endpoint
- [x] KMS encryption enabled for all secrets
- [x] WAF enabled with AWS managed rule sets
- [x] All Docker images run as non-root users

### 3. Files to Delete (Duplicates/Garbage)
**DO NOT USE THESE FILES - THEY ARE DUPLICATES:**
- `infrastructure/aws/docker/Dockerfile.backend` - Use `backend/Dockerfile` instead
- `infrastructure/aws/docker/Dockerfile.frontend` - Use `Dockerfile.frontend` instead  
- `infrastructure/aws/docker/Dockerfile.ml-service` - Use `backend-ml/Dockerfile` instead
- `docker-compose.production.yml` - For local only, not AWS
- `backend/buildspec.yml` - Use `infrastructure/aws/buildspec-*.yml` instead

## 🚀 Deployment Steps

### Step 1: Terraform Infrastructure Setup

```bash
cd infrastructure/aws/terraform

# Initialize Terraform
terraform init

# Create dev environment
terraform workspace new dev
terraform workspace select dev

# Plan infrastructure
terraform plan -var-file=envs/dev.tfvars -out=tfplan

# Apply infrastructure (creates VPC, RDS, Redis, ECS, ALB, ECR, etc.)
terraform apply tfplan
```

**IMPORTANT:** Save the outputs:
```bash
terraform output > ../../deployment-outputs.txt
```

### Step 2: Update Secrets in AWS Secrets Manager

After Terraform creates secrets with empty values, update them:

```bash
# Get secret ARNs from Terraform outputs
APP_SECRETS_ARN=$(terraform output -raw app_secrets_arn)

# Update app secrets with real values
aws secretsmanager update-secret \
  --secret-id $APP_SECRETS_ARN \
  --secret-string '{
    "stripe_secret_key": "sk_live_YOUR_KEY",
    "stripe_webhook_secret": "whsec_YOUR_SECRET",
    "otx_api_key": "YOUR_OTX_KEY",
    "censys_api_token": "YOUR_CENSYS_TOKEN",
    "sentry_dsn": "YOUR_SENTRY_DSN"
  }'
```

### Step 3: Create CodeBuild Projects

Create 3 CodeBuild projects (one per service):

#### Backend CodeBuild Project
```bash
aws codebuild create-project \
  --name nexora-dev-backend-build \
  --source type=S3,location=YOUR_S3_BUCKET/source.zip,buildspec=infrastructure/aws/buildspec-backend.yml \
  --artifacts type=NO_ARTIFACTS \
  --environment type=LINUX_CONTAINER,image=aws/codebuild/standard:7.0,computeType=BUILD_GENERAL1_SMALL,privilegedMode=true \
  --service-role arn:aws:iam::ACCOUNT_ID:role/codebuild-service-role \
  --environment-variables name=AWS_ACCOUNT_ID,value=ACCOUNT_ID
```

#### Frontend CodeBuild Project
```bash
aws codebuild create-project \
  --name nexora-dev-frontend-build \
  --source type=S3,location=YOUR_S3_BUCKET/source.zip,buildspec=infrastructure/aws/buildspec-frontend.yml \
  --artifacts type=NO_ARTIFACTS \
  --environment type=LINUX_CONTAINER,image=aws/codebuild/standard:7.0,computeType=BUILD_GENERAL1_SMALL,privilegedMode=true \
  --service-role arn:aws:iam::ACCOUNT_ID:role/codebuild-service-role \
  --environment-variables name=AWS_ACCOUNT_ID,value=ACCOUNT_ID
```

#### ML Service CodeBuild Project
```bash
aws codebuild create-project \
  --name nexora-dev-ml-build \
  --source type=S3,location=YOUR_S3_BUCKET/source.zip,buildspec=infrastructure/aws/buildspec-ml.yml \
  --artifacts type=NO_ARTIFACTS \
  --environment type=LINUX_CONTAINER,image=aws/codebuild/standard:7.0,computeType=BUILD_GENERAL1_SMALL,privilegedMode=true \
  --service-role arn:aws:iam::ACCOUNT_ID:role/codebuild-service-role \
  --environment-variables name=AWS_ACCOUNT_ID,value=ACCOUNT_ID
```

### Step 4: Upload Source Code to S3

```bash
# Create deployment bucket
aws s3 mb s3://nexora-deployment-source

# Zip source code (from repo root)
zip -r source.zip . -x "*.git*" "node_modules/*" "dist/*" ".next/*" "venv/*"

# Upload to S3
aws s3 cp source.zip s3://nexora-deployment-source/
```

### Step 5: Build and Push Docker Images

```bash
# Start builds
aws codebuild start-build --project-name nexora-dev-backend-build
aws codebuild start-build --project-name nexora-dev-frontend-build
aws codebuild start-build --project-name nexora-dev-ml-build

# Monitor builds
aws codebuild batch-get-builds --ids <build-id>
```

### Step 6: Update ECS Services

After images are in ECR, update ECS services:

```bash
# Get cluster and service names from Terraform outputs
CLUSTER_NAME=$(terraform output -raw ecs_cluster_name)
BACKEND_SERVICE=$(terraform output -raw backend_service_name)
FRONTEND_SERVICE=$(terraform output -raw frontend_service_name)

# Force new deployment
aws ecs update-service --cluster $CLUSTER_NAME --service $BACKEND_SERVICE --force-new-deployment
aws ecs update-service --cluster $CLUSTER_NAME --service $FRONTEND_SERVICE --force-new-deployment
```

### Step 7: Run Database Migrations

```bash
# Get backend task definition
TASK_DEF=$(aws ecs describe-services --cluster $CLUSTER_NAME --services $BACKEND_SERVICE --query 'services[0].taskDefinition' --output text)

# Run migration task
aws ecs run-task \
  --cluster $CLUSTER_NAME \
  --task-definition $TASK_DEF \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[SUBNET_ID],securityGroups=[SG_ID],assignPublicIp=DISABLED}" \
  --overrides '{"containerOverrides":[{"name":"backend","command":["npx","prisma","migrate","deploy"]}]}'
```

### Step 8: Verify Deployment

```bash
# Get ALB DNS name
ALB_DNS=$(terraform output -raw alb_dns_name)

# Test health endpoints
curl https://$ALB_DNS/health/alb
curl https://$ALB_DNS/api/health/alb

# Check ECS service status
aws ecs describe-services --cluster $CLUSTER_NAME --services $BACKEND_SERVICE $FRONTEND_SERVICE
```

## 🔒 Security Validation

- [ ] All secrets stored in AWS Secrets Manager (not environment variables)
- [ ] KMS encryption enabled for RDS, Redis, ECR, Secrets Manager
- [ ] WAF enabled on ALB with rate limiting
- [ ] Security groups follow least-privilege (no 0.0.0.0/0 except ALB)
- [ ] ECS tasks run as non-root users
- [ ] SSL/TLS enforced (ALB redirects HTTP to HTTPS)
- [ ] VPC flow logs enabled (prod only)
- [ ] CloudWatch logs encrypted with KMS

## 📊 Monitoring Setup

- [ ] CloudWatch alarms configured (CPU, memory, errors, latency)
- [ ] SNS topic created for alerts
- [ ] Email subscription confirmed
- [ ] ECS Container Insights enabled (staging/prod)
- [ ] RDS Enhanced Monitoring enabled (prod)

## 🎯 Go-Live Checklist

- [ ] Domain name configured in Route53 (if using custom domain)
- [ ] ACM certificate validated
- [ ] DNS records pointing to ALB
- [ ] All health checks passing (ALB + ECS)
- [ ] Database migrations completed
- [ ] Seed data loaded (if needed)
- [ ] Frontend accessible via ALB
- [ ] Backend API responding
- [ ] WebSocket connections working
- [ ] ML service accessible from backend

## 🚨 Rollback Plan

If deployment fails:

```bash
# Rollback to previous task definition
aws ecs update-service --cluster $CLUSTER_NAME --service $BACKEND_SERVICE --task-definition PREVIOUS_TASK_DEF

# Or scale down to 0 and troubleshoot
aws ecs update-service --cluster $CLUSTER_NAME --service $BACKEND_SERVICE --desired-count 0
```

## 📝 Post-Deployment

- [ ] Update buildspec files with actual ALB DNS/domain URLs
- [ ] Configure CI/CD pipeline (GitHub Actions)
- [ ] Set up automated backups
- [ ] Document runbook for common issues
- [ ] Train team on AWS console navigation
