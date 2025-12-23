# =============================================================================
# Nexora AWS Infrastructure - Variables
# =============================================================================

# -----------------------------------------------------------------------------
# Core Configuration
# -----------------------------------------------------------------------------
variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "nexora"
}

# -----------------------------------------------------------------------------
# Network Configuration
# -----------------------------------------------------------------------------
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones (2 for dev, 3 for prod)"
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
# Database Configuration
# -----------------------------------------------------------------------------
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
  # dev: db.t3.micro (~$12/mo)
  # staging: db.t3.small (~$24/mo)
  # prod: db.t3.medium (~$48/mo)
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "RDS max storage for autoscaling (GB)"
  type        = number
  default     = 100
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "nexora"
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "nexora_admin"
  sensitive   = true
}

variable "db_multi_az" {
  description = "Enable Multi-AZ for RDS"
  type        = bool
  default     = false
  # dev: false, staging: false, prod: true
}

variable "db_deletion_protection" {
  description = "Enable deletion protection"
  type        = bool
  default     = false
  # dev: false, staging: false, prod: true
}

# -----------------------------------------------------------------------------
# Redis Configuration
# -----------------------------------------------------------------------------
variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.micro"
  # dev: cache.t3.micro (~$12/mo)
  # staging: cache.t3.small (~$24/mo)
  # prod: cache.t3.medium (~$48/mo)
}

variable "redis_num_cache_nodes" {
  description = "Number of cache nodes (1 for dev, 2+ for prod with failover)"
  type        = number
  default     = 1
}

# -----------------------------------------------------------------------------
# ECS Configuration
# -----------------------------------------------------------------------------
variable "ecs_capacity_provider" {
  description = "ECS capacity provider (FARGATE_SPOT for dev, FARGATE for prod)"
  type        = string
  default     = "FARGATE_SPOT"
}

# Frontend
variable "frontend_cpu" {
  description = "Frontend task CPU units (256 = 0.25 vCPU)"
  type        = number
  default     = 256
}

variable "frontend_memory" {
  description = "Frontend task memory in MB"
  type        = number
  default     = 512
}

variable "frontend_desired_count" {
  description = "Frontend desired task count"
  type        = number
  default     = 1
}

variable "frontend_min_count" {
  description = "Frontend minimum task count for auto-scaling"
  type        = number
  default     = 1
}

variable "frontend_max_count" {
  description = "Frontend maximum task count for auto-scaling"
  type        = number
  default     = 4
}

# Backend
variable "backend_cpu" {
  description = "Backend task CPU units"
  type        = number
  default     = 512
}

variable "backend_memory" {
  description = "Backend task memory in MB"
  type        = number
  default     = 1024
}

variable "backend_desired_count" {
  description = "Backend desired task count"
  type        = number
  default     = 1
}

variable "backend_min_count" {
  description = "Backend minimum task count for auto-scaling"
  type        = number
  default     = 1
}

variable "backend_max_count" {
  description = "Backend maximum task count for auto-scaling"
  type        = number
  default     = 6
}

# ML Service
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
# Domain & SSL Configuration
# -----------------------------------------------------------------------------
variable "domain_name" {
  description = "Primary domain name (leave empty for ALB DNS only)"
  type        = string
  default     = ""
}

variable "create_dns_records" {
  description = "Create Route53 DNS records (requires hosted zone)"
  type        = bool
  default     = false
}

# -----------------------------------------------------------------------------
# Security Configuration
# -----------------------------------------------------------------------------
variable "enable_waf" {
  description = "Enable AWS WAF on ALB"
  type        = bool
  default     = true
}

variable "waf_rate_limit" {
  description = "WAF rate limit (requests per 5 minutes per IP)"
  type        = number
  default     = 2000
}

variable "enable_container_insights" {
  description = "Enable ECS Container Insights"
  type        = bool
  default     = false
  # dev: false, staging: true, prod: true
}

# -----------------------------------------------------------------------------
# Monitoring Configuration
# -----------------------------------------------------------------------------
variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 7
  # dev: 7, staging: 14, prod: 30
}

variable "enable_enhanced_monitoring" {
  description = "Enable RDS enhanced monitoring"
  type        = bool
  default     = false
  # dev: false, staging: false, prod: true
}

variable "alarm_email" {
  description = "Email for CloudWatch alarm notifications"
  type        = string
  default     = ""
}
