# Nexora AWS Deployment Plan - Using Existing Infrastructure

**Status:** Ready to Execute  
**Strategy:** Use existing AWS resources, avoid duplicates

## ✅ Existing Infrastructure Verified

### Already Created (DO NOT RECREATE)
- ✅ IAM Roles: `nexora-ecs-task-execution-role`, `nexora-ecs-task-role`, `codebuild-nexora-service-role`
- ✅ ECS Cluster: `nexora-cluster`
- ✅ ECS Service: `nexora-web-svc` (1 task running)
- ✅ ECR Repos: `nexora-dev-backend`, `nexora-dev-frontend`, `nexora-dev-ml`
- ✅ ElastiCache Redis: `nexora-cache` (available)
- ✅ ALB: `alb-nexora` (active)
- ✅ VPC: `Nexora-vpc-vpc` (10.0.0.0/16)
- ✅ Secrets Manager: 6 secrets in `nexora/prod/*`

### Missing (Need to Create)
- ❌ RDS PostgreSQL database
- ❌ Updated task definitions with fixed Dockerfiles
- ❌ Security groups (may exist, need to verify)
- ❌ Target groups for ALB (may exist, need to verify)

## 🚀 Deployment Steps

### Step 1: Fix ECR Login Issue
**Problem:** Docker login to ECR failing with 400 Bad Request
**Solution:** Use CodeBuild to build images instead of local Docker

### Step 2: Use CodeBuild for Image Builds
Since you already have `codebuild-nexora-service-role`, we'll:
1. Create CodeBuild projects using existing buildspecs
2. Upload source code to S3
3. Trigger builds to push to existing ECR repos

### Step 3: Create RDS Database
Create PostgreSQL database using AWS CLI with proper security groups

### Step 4: Update ECS Service
Update existing `nexora-web-svc` with new task definitions

### Step 5: Run Migrations
Execute Prisma migrations via ECS task

## 📋 Execution Commands

### Create S3 Bucket for Source Code
```powershell
aws s3 mb s3://nexora-deployment-source-109542135897
```

### Package Source Code
```powershell
Compress-Archive -Path * -DestinationPath source.zip -Force
aws s3 cp source.zip s3://nexora-deployment-source-109542135897/
```

### Create CodeBuild Projects
Use existing buildspecs in `infrastructure/aws/buildspec-*.yml`

### Build Images via CodeBuild
```powershell
aws codebuild start-build --project-name nexora-backend-build
aws codebuild start-build --project-name nexora-frontend-build
aws codebuild start-build --project-name nexora-ml-build
```

## ⚠️ Cost Optimization
- Reusing all existing infrastructure
- No duplicate resources
- Only creating missing RDS database
- Estimated additional cost: ~$12-15/month for RDS db.t3.micro

## 🔒 Security Checklist
- ✅ All secrets in Secrets Manager (not environment variables)
- ✅ IAM roles follow least-privilege
- ✅ VPC with private subnets
- ✅ Redis encryption enabled
- ✅ ALB with HTTPS
- ✅ Non-root Docker containers

## 📊 Next Actions
1. Create S3 bucket for source code
2. Upload source code to S3
3. Create CodeBuild projects
4. Trigger builds
5. Create RDS database
6. Update ECS service
7. Run migrations
8. Verify deployment
