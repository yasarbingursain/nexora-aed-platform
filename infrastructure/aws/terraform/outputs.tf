# =============================================================================
# Terraform Outputs
# =============================================================================

# -----------------------------------------------------------------------------
# VPC Outputs
# -----------------------------------------------------------------------------
output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "private_subnets" {
  description = "Private subnet IDs"
  value       = module.vpc.private_subnets
}

output "public_subnets" {
  description = "Public subnet IDs"
  value       = module.vpc.public_subnets
}

# -----------------------------------------------------------------------------
# ALB Outputs
# -----------------------------------------------------------------------------
output "alb_dns_name" {
  description = "ALB DNS name"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "ALB zone ID"
  value       = aws_lb.main.zone_id
}

output "app_url" {
  description = "Application URL"
  value       = var.domain_name != "" ? "https://${var.domain_name}" : "https://${aws_lb.main.dns_name}"
}

output "api_url" {
  description = "API URL"
  value       = var.domain_name != "" ? "https://api.${var.domain_name}" : "https://${aws_lb.main.dns_name}/api"
}

# -----------------------------------------------------------------------------
# Database Outputs
# -----------------------------------------------------------------------------
output "rds_endpoint" {
  description = "RDS endpoint"
  value       = aws_db_instance.postgres.endpoint
  sensitive   = true
}

output "rds_port" {
  description = "RDS port"
  value       = aws_db_instance.postgres.port
}

# -----------------------------------------------------------------------------
# Redis Outputs
# -----------------------------------------------------------------------------
output "redis_endpoint" {
  description = "Redis primary endpoint"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
  sensitive   = true
}

output "redis_port" {
  description = "Redis port"
  value       = 6379
}

# -----------------------------------------------------------------------------
# ECR Outputs
# -----------------------------------------------------------------------------
output "ecr_frontend_url" {
  description = "ECR Frontend repository URL"
  value       = aws_ecr_repository.frontend.repository_url
}

output "ecr_backend_url" {
  description = "ECR Backend repository URL"
  value       = aws_ecr_repository.backend.repository_url
}

output "ecr_ml_service_url" {
  description = "ECR ML Service repository URL"
  value       = aws_ecr_repository.ml_service.repository_url
}

output "ecr_malgenx_url" {
  description = "ECR MalGenX repository URL"
  value       = aws_ecr_repository.malgenx.repository_url
}

# -----------------------------------------------------------------------------
# ECS Outputs
# -----------------------------------------------------------------------------
output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "ecs_cluster_arn" {
  description = "ECS cluster ARN"
  value       = aws_ecs_cluster.main.arn
}

# -----------------------------------------------------------------------------
# Secrets Manager Outputs
# -----------------------------------------------------------------------------
output "secrets_db_credentials_arn" {
  description = "Database credentials secret ARN"
  value       = aws_secretsmanager_secret.db_credentials.arn
}

output "secrets_redis_credentials_arn" {
  description = "Redis credentials secret ARN"
  value       = aws_secretsmanager_secret.redis_credentials.arn
}

output "secrets_jwt_arn" {
  description = "JWT secrets ARN"
  value       = aws_secretsmanager_secret.jwt_secrets.arn
}

output "secrets_app_arn" {
  description = "Application secrets ARN"
  value       = aws_secretsmanager_secret.app_secrets.arn
}

# -----------------------------------------------------------------------------
# Service Discovery Outputs
# -----------------------------------------------------------------------------
output "service_discovery_namespace" {
  description = "Service discovery namespace"
  value       = aws_service_discovery_private_dns_namespace.main.name
}

output "ml_service_discovery_name" {
  description = "ML service discovery DNS name"
  value       = "ml-service.${aws_service_discovery_private_dns_namespace.main.name}"
}

output "malgenx_service_discovery_name" {
  description = "MalGenX service discovery DNS name"
  value       = "malgenx.${aws_service_discovery_private_dns_namespace.main.name}"
}

# -----------------------------------------------------------------------------
# Cost Estimate
# -----------------------------------------------------------------------------
output "estimated_monthly_cost" {
  description = "Estimated monthly cost for dev environment"
  value       = <<-EOT
    
    ============================================
    ESTIMATED MONTHLY COST (DEV ENVIRONMENT)
    ============================================
    
    RDS PostgreSQL (db.t3.micro):     ~$12/month
    ElastiCache Redis (cache.t3.micro): ~$12/month
    NAT Gateway (single):              ~$32/month
    ALB:                               ~$16/month
    ECS Fargate (4 services, minimal): ~$30/month
    ECR Storage:                       ~$1/month
    Secrets Manager (4 secrets):       ~$2/month
    CloudWatch Logs:                   ~$5/month
    Data Transfer:                     ~$10/month
    --------------------------------------------
    TOTAL ESTIMATED:                   ~$120/month
    
    NOTE: Actual costs may vary based on usage.
    Use AWS Cost Explorer for accurate tracking.
    
    PRODUCTION SCALING:
    - RDS: db.t3.medium + Multi-AZ = ~$50/month
    - Redis: cache.t3.medium + replica = ~$50/month
    - NAT Gateway: per AZ = ~$64/month
    - ECS: increased task counts = ~$100/month
    - Total Prod Estimate: ~$300-400/month
    
  EOT
}
