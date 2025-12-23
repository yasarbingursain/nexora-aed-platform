# =============================================================================
# Nexora AWS Infrastructure - PRODUCTION Environment
# =============================================================================
# Estimated Cost: ~$350-450/month
# =============================================================================

environment = "prod"
aws_region  = "us-east-1"

# Network - 3 AZs for high availability
availability_zones   = ["us-east-1a", "us-east-1b", "us-east-1c"]
private_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
public_subnet_cidrs  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

# Database - Medium instance with Multi-AZ
db_instance_class        = "db.t3.medium"
db_allocated_storage     = 50
db_max_allocated_storage = 200
db_multi_az              = true
db_deletion_protection   = true

# Redis - 2 nodes with failover
redis_node_type       = "cache.t3.medium"
redis_num_cache_nodes = 2

# ECS - On-Demand for reliability
ecs_capacity_provider = "FARGATE"

frontend_cpu           = 512
frontend_memory        = 1024
frontend_desired_count = 2
frontend_min_count     = 2
frontend_max_count     = 6

backend_cpu           = 1024
backend_memory        = 2048
backend_desired_count = 2
backend_min_count     = 2
backend_max_count     = 10

ml_cpu           = 1024
ml_memory        = 2048
ml_desired_count = 2

# Security
enable_waf     = true
waf_rate_limit = 5000

# Monitoring - Full monitoring
enable_container_insights  = true
enable_enhanced_monitoring = true
log_retention_days         = 30
alarm_email                = "alerts@nexora.ai"

# Domain (REQUIRED for production)
domain_name        = "nexora.ai"
create_dns_records = true
