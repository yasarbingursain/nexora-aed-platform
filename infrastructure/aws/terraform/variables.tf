# =============================================================================
# Nexora AWS Infrastructure - Variables
# =============================================================================

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "nexora"
}

# -----------------------------------------------------------------------------
# VPC Configuration
# -----------------------------------------------------------------------------
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24"]
}

# -----------------------------------------------------------------------------
# RDS Configuration
# -----------------------------------------------------------------------------
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro" # Dev: t3.micro ($12/mo), Prod: t3.medium
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "nexora_db"
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "nexora_admin"
  sensitive   = true
}

# -----------------------------------------------------------------------------
# ElastiCache Configuration
# -----------------------------------------------------------------------------
variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.micro" # Dev: t3.micro ($12/mo), Prod: t3.medium
}

variable "redis_num_cache_nodes" {
  description = "Number of cache nodes"
  type        = number
  default     = 1 # Dev: 1, Prod: 2+
}

# -----------------------------------------------------------------------------
# ECS Configuration
# -----------------------------------------------------------------------------
variable "frontend_cpu" {
  description = "Frontend task CPU units"
  type        = number
  default     = 256 # 0.25 vCPU
}

variable "frontend_memory" {
  description = "Frontend task memory in MB"
  type        = number
  default     = 512
}

variable "frontend_desired_count" {
  description = "Frontend desired task count"
  type        = number
  default     = 1 # Dev: 1, Prod: 2+
}

variable "backend_cpu" {
  description = "Backend task CPU units"
  type        = number
  default     = 512 # 0.5 vCPU
}

variable "backend_memory" {
  description = "Backend task memory in MB"
  type        = number
  default     = 1024
}

variable "backend_desired_count" {
  description = "Backend desired task count"
  type        = number
  default     = 1 # Dev: 1, Prod: 2+
}

variable "ml_cpu" {
  description = "ML service task CPU units"
  type        = number
  default     = 512
}

variable "ml_memory" {
  description = "ML service task memory in MB"
  type        = number
  default     = 1024
}

variable "ml_desired_count" {
  description = "ML service desired task count"
  type        = number
  default     = 1
}

# -----------------------------------------------------------------------------
# Domain Configuration
# -----------------------------------------------------------------------------
variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "" # Set to your domain, e.g., "nexora.ai"
}

variable "create_dns_records" {
  description = "Whether to create Route53 DNS records"
  type        = bool
  default     = false
}

# -----------------------------------------------------------------------------
# Tags
# -----------------------------------------------------------------------------
variable "tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default = {
    Project     = "Nexora"
    ManagedBy   = "Terraform"
    Environment = "dev"
  }
}
