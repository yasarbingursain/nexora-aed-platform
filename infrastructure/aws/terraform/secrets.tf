# =============================================================================
# Nexora AWS Infrastructure - Secrets Manager
# =============================================================================
# Centralized secrets management with automatic rotation support
# =============================================================================

# Random password generation
resource "random_password" "db_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}:?"
}

resource "random_password" "redis_auth_token" {
  length  = 64
  special = false
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = false
}

resource "random_password" "jwt_refresh_secret" {
  length  = 64
  special = false
}

resource "random_password" "encryption_key" {
  length  = 32
  special = false
}

# -----------------------------------------------------------------------------
# Database Credentials
# -----------------------------------------------------------------------------
resource "aws_secretsmanager_secret" "db_credentials" {
  name                    = "${local.name_prefix}/db-credentials"
  description             = "PostgreSQL database credentials"
  kms_key_id              = aws_kms_key.main.arn
  recovery_window_in_days = local.is_prod ? 30 : 0

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-db-credentials"
  })
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = var.db_username
    password = random_password.db_password.result
    host     = aws_db_instance.postgres.address
    port     = aws_db_instance.postgres.port
    dbname   = var.db_name
    url      = "postgresql://${var.db_username}:${urlencode(random_password.db_password.result)}@${aws_db_instance.postgres.address}:${aws_db_instance.postgres.port}/${var.db_name}?sslmode=require"
  })
}

# -----------------------------------------------------------------------------
# Redis Credentials
# -----------------------------------------------------------------------------
resource "aws_secretsmanager_secret" "redis_credentials" {
  name                    = "${local.name_prefix}/redis-credentials"
  description             = "Redis authentication credentials"
  kms_key_id              = aws_kms_key.main.arn
  recovery_window_in_days = local.is_prod ? 30 : 0

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-redis-credentials"
  })
}

resource "aws_secretsmanager_secret_version" "redis_credentials" {
  secret_id = aws_secretsmanager_secret.redis_credentials.id
  secret_string = jsonencode({
    auth_token = random_password.redis_auth_token.result
    host       = aws_elasticache_replication_group.redis.primary_endpoint_address
    port       = local.ports.redis
    url        = "rediss://:${random_password.redis_auth_token.result}@${aws_elasticache_replication_group.redis.primary_endpoint_address}:${local.ports.redis}"
  })
}

# -----------------------------------------------------------------------------
# JWT Secrets
# -----------------------------------------------------------------------------
resource "aws_secretsmanager_secret" "jwt_secrets" {
  name                    = "${local.name_prefix}/jwt-secrets"
  description             = "JWT signing secrets"
  kms_key_id              = aws_kms_key.main.arn
  recovery_window_in_days = local.is_prod ? 30 : 0

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-jwt-secrets"
  })
}

resource "aws_secretsmanager_secret_version" "jwt_secrets" {
  secret_id = aws_secretsmanager_secret.jwt_secrets.id
  secret_string = jsonencode({
    jwt_secret         = random_password.jwt_secret.result
    jwt_refresh_secret = random_password.jwt_refresh_secret.result
    encryption_key     = random_password.encryption_key.result
  })
}

# -----------------------------------------------------------------------------
# Application Secrets (API keys, third-party integrations)
# -----------------------------------------------------------------------------
resource "aws_secretsmanager_secret" "app_secrets" {
  name                    = "${local.name_prefix}/app-secrets"
  description             = "Application secrets and API keys"
  kms_key_id              = aws_kms_key.main.arn
  recovery_window_in_days = local.is_prod ? 30 : 0

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-app-secrets"
  })
}

resource "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = aws_secretsmanager_secret.app_secrets.id
  secret_string = jsonencode({
    stripe_secret_key     = "sk_test_REPLACE_ME"
    stripe_webhook_secret = "whsec_REPLACE_ME"
    otx_api_key           = ""
    censys_api_token      = ""
    sentry_dsn            = ""
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}
