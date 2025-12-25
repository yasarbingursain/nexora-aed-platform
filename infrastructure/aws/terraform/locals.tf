# =============================================================================
# Nexora AWS Infrastructure - Local Values
# =============================================================================

locals {
  # Naming convention
  name_prefix = "${var.project_name}-${var.environment}"

  # Environment-specific configurations
  is_prod    = var.environment == "prod"
  is_staging = var.environment == "staging"
  is_dev     = var.environment == "dev"

  # Cost optimization flags
  use_spot           = local.is_dev
  single_nat_gateway = local.is_dev || local.is_staging

  # Security flags
  enable_deletion_protection = local.is_prod
  enable_multi_az            = local.is_prod
  enable_performance_insights = local.is_prod || local.is_staging

  # Common tags
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }

  # Service ports
  ports = {
    frontend = 3000
    backend  = 8080
    ml       = 8000
    postgres = 5432
    redis    = 6379
  }

  # Container images (ECR URLs constructed after ECR creation)
  ecr_base_url = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com"
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
data "aws_availability_zones" "available" {
  state = "available"
}
