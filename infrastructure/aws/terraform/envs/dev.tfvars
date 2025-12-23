# =============================================================================
# Nexora AWS Infrastructure - DEV Environment
# =============================================================================
# Estimated Cost: ~$100-120/month
# =============================================================================

environment = "dev"
aws_region  = "us-east-1"

# Network
availability_zones   = ["us-east-1a", "us-east-1b"]
private_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24"]
public_subnet_cidrs  = ["10.0.101.0/24", "10.0.102.0/24"]

# Database - Minimal for dev
db_instance_class        = "db.t3.micro"
db_allocated_storage     = 20
db_max_allocated_storage = 50
db_multi_az              = false
db_deletion_protection   = false

# Redis - Single node for dev
redis_node_type       = "cache.t3.micro"
redis_num_cache_nodes = 1

# ECS - Use Spot instances for cost savings
ecs_capacity_provider = "FARGATE_SPOT"

frontend_cpu           = 256
frontend_memory        = 512
frontend_desired_count = 1
frontend_min_count     = 1
frontend_max_count     = 2

backend_cpu           = 512
backend_memory        = 1024
backend_desired_count = 1
backend_min_count     = 1
backend_max_count     = 3

ml_cpu           = 512
ml_memory        = 1024
ml_desired_count = 1

# Security
enable_waf     = true
waf_rate_limit = 2000

# Monitoring - Minimal for dev
enable_container_insights  = false
enable_enhanced_monitoring = false
log_retention_days         = 7
alarm_email                = ""

# Domain (leave empty to use ALB DNS)
domain_name        = ""
create_dns_records = false
