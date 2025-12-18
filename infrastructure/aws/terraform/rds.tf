# =============================================================================
# RDS PostgreSQL Database
# =============================================================================
# Dev: db.t3.micro (~$12/month), Single-AZ, no read replicas
# Prod: db.t3.medium+, Multi-AZ, read replicas, enhanced monitoring
# =============================================================================

# DB Subnet Group
resource "aws_db_subnet_group" "main" {
  name        = "${var.project_name}-${var.environment}-db-subnet"
  description = "Database subnet group for ${var.project_name}"
  subnet_ids  = module.vpc.private_subnets

  tags = {
    Name = "${var.project_name}-${var.environment}-db-subnet"
  }
}

# RDS Parameter Group
resource "aws_db_parameter_group" "postgres" {
  name        = "${var.project_name}-${var.environment}-pg16-params"
  family      = "postgres16"
  description = "PostgreSQL 16 parameters for ${var.project_name}"

  parameter {
    name  = "log_statement"
    value = "all"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000" # Log queries taking > 1 second
  }

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-pg16-params"
  }
}

# RDS PostgreSQL Instance
resource "aws_db_instance" "postgres" {
  identifier = "${var.project_name}-${var.environment}-postgres"

  # Engine
  engine               = "postgres"
  engine_version       = "16.3"
  instance_class       = var.db_instance_class
  allocated_storage    = var.db_allocated_storage
  max_allocated_storage = var.environment == "dev" ? 50 : 200 # Auto-scaling

  # Database
  db_name  = var.db_name
  username = var.db_username
  password = random_password.db_password.result
  port     = 5432

  # Network
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  # High Availability (disable for dev to save cost)
  multi_az = var.environment != "dev"

  # Storage
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = aws_kms_key.main.arn

  # Backup
  backup_retention_period = var.environment == "dev" ? 7 : 35
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  # Monitoring
  performance_insights_enabled          = var.environment != "dev"
  performance_insights_retention_period = var.environment == "dev" ? 0 : 7
  monitoring_interval                   = var.environment == "dev" ? 0 : 60
  monitoring_role_arn                   = var.environment == "dev" ? null : aws_iam_role.rds_monitoring[0].arn

  # Parameters
  parameter_group_name = aws_db_parameter_group.postgres.name

  # Deletion Protection (enable for prod)
  deletion_protection      = var.environment != "dev"
  skip_final_snapshot      = var.environment == "dev"
  final_snapshot_identifier = var.environment == "dev" ? null : "${var.project_name}-${var.environment}-final-snapshot"

  # Auto minor version upgrade
  auto_minor_version_upgrade = true

  tags = {
    Name = "${var.project_name}-${var.environment}-postgres"
  }
}

# RDS Enhanced Monitoring Role (only for non-dev)
resource "aws_iam_role" "rds_monitoring" {
  count = var.environment != "dev" ? 1 : 0
  name  = "${var.project_name}-${var.environment}-rds-monitoring"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  count      = var.environment != "dev" ? 1 : 0
  role       = aws_iam_role.rds_monitoring[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}
