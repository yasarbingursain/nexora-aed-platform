# Nexora AWS Deployment Guide

## Enterprise-Grade Infrastructure for Startups

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AWS Cloud (us-east-1)                          │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         VPC (10.0.0.0/16)                             │  │
│  │                                                                       │  │
│  │   ┌─────────────┐     ┌─────────────────────────────────────────┐    │  │
│  │   │  WAF + ALB  │────▶│           Public Subnets                │    │  │
│  │   │  (HTTPS)    │     │         (NAT Gateway)                   │    │  │
│  │   └──────┬──────┘     └─────────────────────────────────────────┘    │  │
│  │          │                                                           │  │
│  │   ┌──────▼──────────────────────────────────────────────────────┐    │  │
│  │   │                    Private Subnets                          │    │  │
│  │   │  ┌────────────────────────────────────────────────────────┐ │    │  │
│  │   │  │              ECS Fargate Cluster                       │ │    │  │
│  │   │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │ │    │  │
│  │   │  │  │ Frontend │ │ Backend  │ │ML Service│ │ MalGenX  │  │ │    │  │
│  │   │  │  │ (Next.js)│ │ (Node)   │ │ (Python) │ │ (Python) │  │ │    │  │
│  │   │  │  └──────────┘ └────┬─────┘ └──────────┘ └──────────┘  │ │    │  │
│  │   │  └────────────────────┼───────────────────────────────────┘ │    │  │
│  │   │                       │                                     │    │  │
│  │   │  ┌────────────────────▼─────────────────────────────────┐   │    │  │
│  │   │  │  ┌─────────────────────┐  ┌────────────────────────┐ │   │    │  │
│  │   │  │  │  RDS PostgreSQL 16  │  │  ElastiCache Redis 7   │ │   │    │  │
│  │   │  │  │  (Multi-AZ in prod) │  │  (Cluster mode)        │ │   │    │  │
│  │   │  │  └─────────────────────┘  └────────────────────────┘ │   │    │  │
│  │   │  └──────────────────────────────────────────────────────┘   │    │  │
│  │   └─────────────────────────────────────────────────────────────┘    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │     ECR      │ │   Secrets    │ │     KMS      │ │  CloudWatch  │       │
│  │  (Registry)  │ │   Manager    │ │ (Encryption) │ │   (Logs)     │       │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Cost Estimates

| Environment | Monthly Cost | Key Optimizations |
|-------------|--------------|-------------------|
| **Dev**     | ~$100-120    | Fargate Spot, single NAT, t3.micro instances |
| **Staging** | ~$180-220    | Fargate Spot, single NAT, t3.small instances |
| **Prod**    | ~$350-450    | Fargate On-Demand, Multi-AZ, t3.medium instances |

---

## Prerequisites

- AWS Account with admin access
- AWS CLI v2 installed
- Terraform v1.6+ installed
- Docker installed
- Git access to repository

---

## Step 1: Install Tools

### macOS
```bash
brew install awscli terraform docker
```

### Linux
```bash
# AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip && sudo ./aws/install

# Terraform
sudo apt-get update && sudo apt-get install -y gnupg software-properties-common
wget -O- https://apt.releases.hashicorp.com/gpg | gpg --dearmor | sudo tee /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform
```

### Windows (PowerShell Admin)
```powershell
choco install awscli terraform docker-desktop -y
```

### Verify
```bash
aws --version && terraform --version && docker --version
```

---

## Step 2: Configure AWS Credentials

```bash
aws configure
# AWS Access Key ID: YOUR_KEY
# AWS Secret Access Key: YOUR_SECRET
# Default region: us-east-1
# Default output format: json

# Verify
aws sts get-caller-identity
```

---

## Step 3: Setup Remote State (One-time)

```bash
cd infrastructure/aws/scripts
chmod +x setup-remote-state.sh
./setup-remote-state.sh
```

Then uncomment the backend block in `infrastructure/aws/terraform/versions.tf`:

```hcl
backend "s3" {
  bucket         = "nexora-terraform-state-YOUR_ACCOUNT_ID"
  key            = "nexora/terraform.tfstate"
  region         = "us-east-1"
  encrypt        = true
  dynamodb_table = "nexora-terraform-locks"
}
```

---

## Step 4: Deploy Infrastructure

```bash
cd infrastructure/aws/terraform

# Initialize
terraform init

# Plan (review changes)
terraform plan -var-file=envs/dev.tfvars

# Apply
terraform apply -var-file=envs/dev.tfvars

# Save outputs
terraform output -json > outputs.json
```

### Environment Files
- `envs/dev.tfvars` - Development (~$100/mo)
- `envs/staging.tfvars` - Staging (~$200/mo)
- `envs/prod.tfvars` - Production (~$400/mo)

---

## Step 5: Configure Secrets

After Terraform creates secrets, update with real values:

```bash
# Get secret ARN
SECRET_ARN=$(aws secretsmanager list-secrets \
  --query "SecretList[?contains(Name,'app-secrets')].ARN" \
  --output text)

# Update secrets
aws secretsmanager put-secret-value \
  --secret-id $SECRET_ARN \
  --secret-string '{
    "stripe_secret_key": "sk_live_xxx",
    "stripe_webhook_secret": "whsec_xxx",
    "sentry_dsn": "https://xxx@sentry.io/xxx"
  }'
```

---

## Step 6: Build & Deploy Services

```bash
cd infrastructure/aws/scripts
chmod +x deploy.sh

# Deploy all services
./deploy.sh dev deploy all

# Or deploy individually
./deploy.sh dev deploy backend
./deploy.sh dev deploy frontend
```

---

## Step 7: Run Database Migrations

```bash
./deploy.sh dev migrate
```

---

## Step 8: Configure GitHub Actions

### Add Repository Secrets

Go to GitHub → Settings → Secrets → Actions, add:

| Secret | Value |
|--------|-------|
| `AWS_ACCESS_KEY_ID` | From Terraform output or IAM |
| `AWS_SECRET_ACCESS_KEY` | From Terraform output or IAM |
| `API_URL` | ALB DNS or your domain |

### Create Environments

1. Go to Settings → Environments
2. Create: `dev`, `staging`, `prod`
3. For `prod`: Add required reviewers

---

## Step 9: Configure Domain (Optional)

1. Update tfvars:
```hcl
domain_name        = "nexora.ai"
create_dns_records = true
```

2. Apply:
```bash
terraform apply -var-file=envs/prod.tfvars
```

3. Update DNS at your registrar to point to Route53 nameservers

---

## Common Commands

### View Logs
```bash
./deploy.sh dev logs backend
```

### Check Status
```bash
./deploy.sh dev status
```

### Rollback
```bash
./deploy.sh dev rollback backend
```

### SSH into Container
```bash
./deploy.sh dev exec backend
```

### Scale Service
```bash
aws ecs update-service \
  --cluster nexora-dev-cluster \
  --service nexora-dev-backend \
  --desired-count 3
```

---

## Monitoring

### CloudWatch Alarms (auto-configured)
- ECS CPU/Memory > 85%
- RDS CPU > 80%
- RDS Storage < 5GB
- Redis Memory > 80%
- ALB 5XX errors > 10/min
- ALB latency p95 > 2s

### View Metrics
```bash
# ECS service metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ClusterName,Value=nexora-dev-cluster \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 300 \
  --statistics Average
```

---

## Troubleshooting

### ECS Tasks Not Starting
```bash
# Check stopped task reason
aws ecs describe-tasks \
  --cluster nexora-dev-cluster \
  --tasks $(aws ecs list-tasks --cluster nexora-dev-cluster --desired-status STOPPED --query 'taskArns[0]' --output text) \
  --query 'tasks[0].stoppedReason'
```

### Database Connection Issues
```bash
# Verify security group allows ECS
aws ec2 describe-security-groups \
  --group-ids $(terraform output -raw rds_security_group_id) \
  --query 'SecurityGroups[0].IpPermissions'
```

### Container Logs
```bash
aws logs tail /ecs/nexora-dev/backend --follow
```

### Health Check Failures
```bash
# Check target group health
aws elbv2 describe-target-health \
  --target-group-arn $(terraform output -raw backend_target_group_arn)
```

---

## Security Checklist

- [x] All data encrypted at rest (KMS)
- [x] All traffic encrypted in transit (TLS 1.3)
- [x] Secrets in AWS Secrets Manager
- [x] WAF enabled with rate limiting
- [x] Private subnets for all services
- [x] Non-root container users
- [x] Security group least privilege
- [x] VPC Flow Logs (prod)
- [x] ECR image scanning enabled
- [x] RDS deletion protection (prod)

---

## Destroy Infrastructure

**WARNING: This will delete ALL resources including databases!**

```bash
# Remove deletion protection first (prod only)
aws rds modify-db-instance \
  --db-instance-identifier nexora-prod-postgres \
  --no-deletion-protection

# Destroy
terraform destroy -var-file=envs/dev.tfvars
```

---

## File Structure

```
infrastructure/aws/
├── terraform/
│   ├── versions.tf      # Provider versions, backend
│   ├── variables.tf     # Input variables
│   ├── locals.tf        # Local values
│   ├── vpc.tf           # VPC, subnets, NAT, endpoints
│   ├── security-groups.tf
│   ├── kms.tf           # Encryption keys
│   ├── secrets.tf       # Secrets Manager
│   ├── rds.tf           # PostgreSQL database
│   ├── elasticache.tf   # Redis cache
│   ├── ecr.tf           # Container registries
│   ├── iam.tf           # IAM roles and policies
│   ├── alb.tf           # Load balancer, SSL
│   ├── waf.tf           # Web Application Firewall
│   ├── ecs.tf           # ECS cluster, services, tasks
│   ├── autoscaling.tf   # Auto-scaling policies
│   ├── monitoring.tf    # CloudWatch alarms
│   ├── outputs.tf       # Output values
│   └── envs/
│       ├── dev.tfvars
│       ├── staging.tfvars
│       └── prod.tfvars
├── docker/
│   ├── Dockerfile.frontend
│   ├── Dockerfile.backend
│   ├── Dockerfile.ml-service
│   └── Dockerfile.malgenx
├── scripts/
│   ├── deploy.sh
│   ├── setup-remote-state.sh
│   └── create-github-secrets.sh
└── AWS_DEPLOYMENT_GUIDE.md
```

---

## Support

For issues:
1. Check CloudWatch logs
2. Review ECS task stopped reasons
3. Verify security group rules
4. Check Secrets Manager values
