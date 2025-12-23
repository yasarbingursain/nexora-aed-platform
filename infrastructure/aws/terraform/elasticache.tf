# =============================================================================
# Nexora AWS Infrastructure - ElastiCache Redis
# =============================================================================
# Production-grade Redis with encryption, auth, and optional replication
# =============================================================================

# ElastiCache Subnet Group
resource "aws_elasticache_subnet_group" "main" {
  name        = "${local.name_prefix}-redis-subnet"
  description = "Redis subnet group for ${var.project_name}"
  subnet_ids  = module.vpc.private_subnets

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-redis-subnet"
  })
}

# ElastiCache Parameter Group
resource "aws_elasticache_parameter_group" "redis" {
  name        = "${local.name_prefix}-redis7-params"
  family      = "redis7"
  description = "Redis 7 parameters for ${var.project_name}"

  # Memory management
  parameter {
    name  = "maxmemory-policy"
    value = "volatile-lru"
  }

  # Persistence
  parameter {
    name  = "appendonly"
    value = "yes"
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-redis7-params"
  })
}

# ElastiCache Redis Replication Group
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "${local.name_prefix}-redis"
  description          = "Redis cluster for ${var.project_name} ${var.environment}"

  # Engine
  engine               = "redis"
  engine_version       = "7.1"
  node_type            = var.redis_node_type
  port                 = local.ports.redis

  # Cluster Configuration
  num_cache_clusters         = var.redis_num_cache_nodes
  automatic_failover_enabled = var.redis_num_cache_nodes > 1
  multi_az_enabled           = var.redis_num_cache_nodes > 1

  # Network
  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  # Security
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.redis_auth_token.result
  kms_key_id                 = aws_kms_key.main.arn

  # Parameters
  parameter_group_name = aws_elasticache_parameter_group.redis.name

  # Maintenance
  maintenance_window       = "sun:05:00-sun:06:00"
  snapshot_window          = "04:00-05:00"
  snapshot_retention_limit = local.is_prod ? 7 : 1

  # Updates
  auto_minor_version_upgrade = true
  apply_immediately          = !local.is_prod

  # Notifications
  notification_topic_arn = local.is_prod && var.alarm_email != "" ? aws_sns_topic.alerts[0].arn : null

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-redis"
  })

  lifecycle {
    ignore_changes = [num_cache_clusters]
  }
}
