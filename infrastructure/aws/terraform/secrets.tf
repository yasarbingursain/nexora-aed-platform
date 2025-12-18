# =============================================================================
# AWS Secrets Manager
# =============================================================================
# Replaces HashiCorp Vault for managed secrets
# =============================================================================

# Database Credentials Secret
resource "aws_secretsmanager_secret" "db_credentials" {
  name                    = "${var.project_name}/${var.environment}/db-credentials"
  description             = "PostgreSQL database credentials"
  kms_key_id              = aws_kms_key.main.arn
  recovery_window_in_days = var.environment == "dev" ? 0 : 30

  tags = {
    Name = "${var.project_name}-${var.environment}-db-credentials"
  }
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = var.db_username
    password = random_password.db_password.result
    host     = aws_db_instance.postgres.address
    port     = aws_db_instance.postgres.port
    dbname   = var.db_name
    url      = "postgresql://${var.db_username}:${random_password.db_password.result}@${aws_db_instance.postgres.address}:${aws_db_instance.postgres.port}/${var.db_name}"
  })
}

# Redis Credentials Secret
resource "aws_secretsmanager_secret" "redis_credentials" {
  name                    = "${var.project_name}/${var.environment}/redis-credentials"
  description             = "Redis authentication credentials"
  kms_key_id              = aws_kms_key.main.arn
  recovery_window_in_days = var.environment == "dev" ? 0 : 30

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-credentials"
  }
}

resource "aws_secretsmanager_secret_version" "redis_credentials" {
  secret_id = aws_secretsmanager_secret.redis_credentials.id
  secret_string = jsonencode({
    auth_token = random_password.redis_auth_token.result
    host       = aws_elasticache_replication_group.redis.primary_endpoint_address
    port       = 6379
    url        = "rediss://:${random_password.redis_auth_token.result}@${aws_elasticache_replication_group.redis.primary_endpoint_address}:6379"
  })
}

# JWT Secrets
resource "aws_secretsmanager_secret" "jwt_secrets" {
  name                    = "${var.project_name}/${var.environment}/jwt-secrets"
  description             = "JWT signing secrets"
  kms_key_id              = aws_kms_key.main.arn
  recovery_window_in_days = var.environment == "dev" ? 0 : 30

  tags = {
    Name = "${var.project_name}-${var.environment}-jwt-secrets"
  }
}

resource "aws_secretsmanager_secret_version" "jwt_secrets" {
  secret_id = aws_secretsmanager_secret.jwt_secrets.id
  secret_string = jsonencode({
    jwt_secret         = random_password.jwt_secret.result
    jwt_refresh_secret = random_password.jwt_refresh_secret.result
  })
}

# Application Secrets (API keys, etc.)
resource "aws_secretsmanager_secret" "app_secrets" {
  name                    = "${var.project_name}/${var.environment}/app-secrets"
  description             = "Application secrets and API keys"
  kms_key_id              = aws_kms_key.main.arn
  recovery_window_in_days = var.environment == "dev" ? 0 : 30

  tags = {
    Name = "${var.project_name}-${var.environment}-app-secrets"
  }
}

# Placeholder - update via AWS Console or CLI with actual values
resource "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = aws_secretsmanager_secret.app_secrets.id
  secret_string = jsonencode({
    stripe_secret_key    = "sk_test_placeholder"
    stripe_webhook_secret = "whsec_placeholder"
    sentry_dsn           = ""
    otx_api_key          = ""
    censys_api_token     = ""
  })

  lifecycle {
    ignore_changes = [secret_string] # Allow manual updates
  }
}
