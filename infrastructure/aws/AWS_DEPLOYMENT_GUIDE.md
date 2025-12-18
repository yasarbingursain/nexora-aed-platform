# Nexora AWS Deployment Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AWS Cloud (us-east-1)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         VPC (10.0.0.0/16)                           │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │                    Public Subnets                            │   │   │
│  │  │  ┌─────────────────────────────────────────────────────┐    │   │   │
│  │  │  │              Application Load Balancer               │    │   │   │
│  │  │  │         (HTTPS:443, HTTP:80 → redirect)             │    │   │   │
│  │  │  └─────────────────────────────────────────────────────┘    │   │   │
│  │  │                           │                                  │   │   │
│  │  │                    NAT Gateway                               │   │   │
│  │  └───────────────────────────┼──────────────────────────────────┘   │   │
│  │                              │                                       │   │
│  │  ┌───────────────────────────┼──────────────────────────────────┐   │   │
│  │  │                    Private Subnets                           │   │   │
│  │  │                           │                                  │   │   │
│  │  │  ┌────────────────────────┴────────────────────────────┐    │   │   │
│  │  │  │                 ECS Fargate Cluster                  │    │   │   │
│  │  │  │  ┌──────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐  │    │   │   │
│  │  │  │  │ Frontend │ │ Backend  │ │   ML   │ │ MalGenX  │  │    │   │   │
│  │  │  │  │  :3000   │ │  :8080   │ │ :8000  │ │  :8001   │  │    │   │   │
│  │  │  │  └──────────┘ └──────────┘ └────────┘ └──────────┘  │    │   │   │
│  │  │  └─────────────────────────────────────────────────────┘    │   │   │
│  │  │                           │                                  │   │   │
│  │  │  ┌────────────────────────┴────────────────────────────┐    │   │   │
│  │  │  │                   Data Layer                         │    │   │   │
│  │  │  │  ┌──────────────────┐    ┌──────────────────────┐   │    │   │   │
│  │  │  │  │ RDS PostgreSQL   │    │  ElastiCache Redis   │   │    │   │   │
│  │  │  │  │   (db.t3.micro)  │    │  (cache.t3.micro)    │   │    │   │   │
│  │  │  │  └──────────────────┘    └──────────────────────┘   │    │   │   │
│  │  │  └─────────────────────────────────────────────────────┘    │   │   │
│  │  └──────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │  Secrets Manager │  │       ECR       │  │      CloudWatch Logs        │ │
│  │  (credentials)   │  │  (containers)   │  │      (monitoring)           │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Cost Breakdown

### DEV Environment (~$120/month)

| Service | Instance Type | Monthly Cost |
|---------|--------------|--------------|
| RDS PostgreSQL | db.t3.micro | ~$12 |
| ElastiCache Redis | cache.t3.micro | ~$12 |
| NAT Gateway (single) | - | ~$32 |
| ALB | - | ~$16 |
| ECS Fargate (4 services) | 0.25-0.5 vCPU | ~$30 |
| ECR Storage | ~2GB | ~$1 |
| Secrets Manager (4) | - | ~$2 |
| CloudWatch Logs | - | ~$5 |
| Data Transfer | ~10GB | ~$10 |
| **TOTAL** | | **~$120/month** |

### PRODUCTION Environment (~$350-400/month)

| Service | Instance Type | Monthly Cost |
|---------|--------------|--------------|
| RDS PostgreSQL | db.t3.medium + Multi-AZ | ~$50 |
| ElastiCache Redis | cache.t3.medium + replica | ~$50 |
| NAT Gateway (per AZ) | 2 AZs | ~$64 |
| ALB | - | ~$20 |
| ECS Fargate (scaled) | 1-2 vCPU | ~$100 |
| ECR Storage | ~5GB | ~$2 |
| Secrets Manager | - | ~$2 |
| CloudWatch Logs + Insights | - | ~$20 |
| Data Transfer | ~50GB | ~$50 |
| **TOTAL** | | **~$350-400/month** |

---

## Prerequisites

1. **AWS Account** with admin access
2. **AWS CLI** installed and configured
3. **Terraform** >= 1.5.0
4. **Docker** installed
5. **Git** for version control

### Install AWS CLI
```bash
# Windows (PowerShell)
msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi

# macOS
brew install awscli

# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip && sudo ./aws/install
```

### Configure AWS CLI
```bash
aws configure
# Enter: AWS Access Key ID, Secret Access Key, Region (us-east-1), Output format (json)
```

### Install Terraform
```bash
# Windows (Chocolatey)
choco install terraform

# macOS
brew install terraform

# Linux
wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
unzip terraform_1.6.0_linux_amd64.zip && sudo mv terraform /usr/local/bin/
```

---

## Deployment Steps

### Step 1: Configure Variables

```bash
cd infrastructure/aws/terraform

# Copy example and edit with your values
cp terraform.tfvars.example terraform.tfvars

# Edit terraform.tfvars with your configuration
```

### Step 2: Initialize Terraform

```bash
terraform init
```

### Step 3: Review Infrastructure Plan

```bash
terraform plan
```

### Step 4: Deploy Infrastructure

```bash
terraform apply
```

**This creates:**
- VPC with public/private subnets
- NAT Gateway
- Application Load Balancer
- RDS PostgreSQL database
- ElastiCache Redis cluster
- ECS Fargate cluster
- ECR repositories
- Secrets Manager secrets
- Security groups
- IAM roles

### Step 5: Build and Push Docker Images

```powershell
# Windows
.\infrastructure\aws\scripts\deploy.ps1 -Environment dev -Service all

# Linux/macOS
./infrastructure/aws/scripts/deploy.sh dev all
```

### Step 6: Run Database Migrations

```bash
# Using the deploy script
./infrastructure/aws/scripts/deploy.sh dev migrate

# Or manually via AWS CLI
aws ecs run-task \
  --cluster nexora-dev-cluster \
  --task-definition nexora-dev-backend \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx]}" \
  --overrides '{"containerOverrides":[{"name":"backend","command":["npx","prisma","migrate","deploy"]}]}'
```

### Step 7: Verify Deployment

```bash
# Get ALB DNS name
terraform output alb_dns_name

# Test endpoints
curl https://<alb-dns>/api/health
curl https://<alb-dns>/api/healthz
```

---

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/aws-deploy.yml`) automatically:

1. **On push to `develop`**: Deploy to dev environment
2. **On push to `main`**: Deploy to prod environment
3. **Manual trigger**: Deploy specific service to specific environment

### Required GitHub Secrets

Add these secrets in GitHub repository settings:

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | AWS IAM user access key |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM user secret key |
| `API_URL` | Backend API URL for frontend build |

### Manual Deployment

```bash
# Trigger via GitHub CLI
gh workflow run aws-deploy.yml -f environment=dev -f service=backend
```

---

## Security Considerations

### Network Security
- All services run in **private subnets**
- Only ALB is publicly accessible
- Security groups restrict traffic to necessary ports only
- NAT Gateway for outbound internet access

### Data Security
- **RDS encryption** at rest using KMS
- **Redis encryption** in transit and at rest
- **Secrets Manager** for all credentials (no hardcoded secrets)
- **TLS 1.3** on ALB

### IAM Security
- **Least privilege** IAM roles for ECS tasks
- Tasks can only access their required secrets
- No root credentials used

### Compliance
- VPC Flow Logs enabled (production)
- CloudWatch Logs for audit trail
- Automated security scanning on ECR push

---

## Scaling Strategy

### Horizontal Scaling (ECS)

```hcl
# In terraform.tfvars for production
frontend_desired_count = 3
backend_desired_count = 3
ml_desired_count = 2
```

Auto-scaling can be added:
```hcl
resource "aws_appautoscaling_target" "backend" {
  max_capacity       = 10
  min_capacity       = 2
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.backend.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "backend_cpu" {
  name               = "backend-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.backend.resource_id
  scalable_dimension = aws_appautoscaling_target.backend.scalable_dimension
  service_namespace  = aws_appautoscaling_target.backend.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70.0
  }
}
```

### Vertical Scaling (RDS/Redis)

```hcl
# Upgrade instance class
db_instance_class = "db.t3.large"
redis_node_type   = "cache.t3.large"
```

### Database Read Replicas (Production)

```hcl
resource "aws_db_instance" "read_replica" {
  identifier             = "nexora-prod-postgres-replica"
  replicate_source_db    = aws_db_instance.postgres.identifier
  instance_class         = "db.t3.medium"
  publicly_accessible    = false
  vpc_security_group_ids = [aws_security_group.rds.id]
}
```

---

## Monitoring & Alerting

### CloudWatch Dashboards

Access via AWS Console → CloudWatch → Dashboards

Key metrics to monitor:
- ECS CPU/Memory utilization
- RDS connections, CPU, storage
- Redis memory, connections
- ALB request count, latency, 5xx errors

### CloudWatch Alarms (Add to Terraform)

```hcl
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "nexora-${var.environment}-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "ECS CPU utilization is high"
  
  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.backend.name
  }
}
```

---

## Troubleshooting

### View ECS Logs

```bash
# Via AWS CLI
aws logs tail /ecs/nexora-dev/backend --follow

# Via AWS Console
# CloudWatch → Log groups → /ecs/nexora-dev/backend
```

### SSH into Container (ECS Exec)

```bash
# Enable ECS Exec on service first
aws ecs update-service \
  --cluster nexora-dev-cluster \
  --service nexora-dev-backend \
  --enable-execute-command

# Execute command
aws ecs execute-command \
  --cluster nexora-dev-cluster \
  --task <task-id> \
  --container backend \
  --interactive \
  --command "/bin/sh"
```

### Database Connection

```bash
# Get RDS endpoint
terraform output rds_endpoint

# Connect via bastion or ECS Exec
psql -h <rds-endpoint> -U nexora_admin -d nexora_db
```

### Common Issues

| Issue | Solution |
|-------|----------|
| ECS task fails to start | Check CloudWatch logs, verify secrets access |
| ALB health check failing | Verify security groups, check /health endpoint |
| Database connection refused | Check security group rules, verify DATABASE_URL |
| Redis connection timeout | Verify Redis auth token, check security groups |

---

## Cleanup

**WARNING: This will destroy all resources including data!**

```bash
cd infrastructure/aws/terraform

# Destroy all resources
terraform destroy

# Confirm with 'yes'
```

---

## Files Created

```
infrastructure/aws/
├── terraform/
│   ├── main.tf                    # Provider, VPC, Security Groups
│   ├── variables.tf               # Input variables
│   ├── outputs.tf                 # Output values
│   ├── rds.tf                     # PostgreSQL database
│   ├── elasticache.tf             # Redis cache
│   ├── ecs.tf                     # ECS cluster and services
│   ├── ecr.tf                     # Container registries
│   ├── alb.tf                     # Load balancer
│   ├── kms.tf                     # Encryption keys
│   ├── secrets.tf                 # Secrets Manager
│   ├── terraform.tfvars.example   # Dev config example
│   └── terraform.tfvars.prod.example # Prod config example
├── docker/
│   ├── Dockerfile.frontend        # Next.js frontend
│   ├── Dockerfile.backend         # Node.js backend
│   ├── Dockerfile.ml-service      # FastAPI ML service
│   └── Dockerfile.malgenx         # FastAPI MalGenX service
├── scripts/
│   ├── deploy.sh                  # Bash deployment script
│   ├── deploy.ps1                 # PowerShell deployment script
│   └── setup-infrastructure.sh    # Infrastructure setup
└── AWS_DEPLOYMENT_GUIDE.md        # This guide

.github/workflows/
└── aws-deploy.yml                 # CI/CD pipeline
```

---

## Support

For issues:
1. Check CloudWatch Logs
2. Review Terraform state: `terraform state list`
3. Verify AWS credentials: `aws sts get-caller-identity`
