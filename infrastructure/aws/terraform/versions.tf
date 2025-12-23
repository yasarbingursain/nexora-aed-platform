# =============================================================================
# Nexora AWS Infrastructure - Terraform Configuration
# =============================================================================
# Enterprise-grade, budget-conscious infrastructure for startup
# Supports: dev (~$100/mo), staging (~$200/mo), prod (~$400/mo)
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.31"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # REQUIRED: Configure remote state before first apply
  # 1. Create S3 bucket: aws s3 mb s3://nexora-terraform-state-<account-id>
  # 2. Create DynamoDB table: aws dynamodb create-table --table-name nexora-terraform-locks --attribute-definitions AttributeName=LockID,AttributeType=S --key-schema AttributeName=LockID,KeyType=HASH --billing-mode PAY_PER_REQUEST
  # 3. Uncomment below and run: terraform init -migrate-state
  
  # backend "s3" {
  #   bucket         = "nexora-terraform-state-ACCOUNT_ID"
  #   key            = "nexora/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "nexora-terraform-locks"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "Nexora"
      Environment = var.environment
      ManagedBy   = "Terraform"
      CostCenter  = "Engineering"
    }
  }
}

# Secondary provider for ACM certificates (must be us-east-1 for CloudFront)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}
