# Database Module - AWS RDS PostgreSQL and ElastiCache Redis
# Broxiva E-commerce Platform - AWS Infrastructure

# ============================================
# RDS Subnet Group
# ============================================
resource "aws_db_subnet_group" "main" {
  count      = var.cloud_provider == "aws" ? 1 : 0
  name       = "${var.project_name}-${var.environment}-db-subnet-group"
  subnet_ids = var.database_subnet_ids

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-db-subnet-group"
    }
  )
}

# ============================================
# RDS Security Group
# ============================================
resource "aws_security_group" "rds" {
  count       = var.cloud_provider == "aws" ? 1 : 0
  name        = "${var.project_name}-${var.environment}-rds-sg"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = var.allowed_security_group_ids
    description     = "PostgreSQL access from application"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-rds-sg"
    }
  )
}

# ============================================
# Random Password for RDS (if not provided)
# ============================================
resource "random_password" "rds_password" {
  count   = var.cloud_provider == "aws" && var.administrator_password == null ? 1 : 0
  length  = 32
  special = true
  override_special = "!#$%&*()-_=+[]{}:?"
}

locals {
  rds_password = var.cloud_provider == "aws" ? (
    var.administrator_password != null ? var.administrator_password : random_password.rds_password[0].result
  ) : ""
}

# ============================================
# RDS PostgreSQL Parameter Group
# ============================================
resource "aws_db_parameter_group" "postgres" {
  count  = var.cloud_provider == "aws" ? 1 : 0
  name   = "${var.project_name}-${var.environment}-postgres-params"
  family = "postgres${var.postgres_version}"

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }

  parameter {
    name  = "log_statement"
    value = "ddl"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000" # Log queries taking > 1 second
  }

  parameter {
    name  = "max_connections"
    value = var.postgres_max_connections
  }

  parameter {
    name  = "work_mem"
    value = var.postgres_work_mem
  }

  tags = var.tags
}

# ============================================
# RDS PostgreSQL Instance
# ============================================
resource "aws_db_instance" "postgres" {
  count      = var.cloud_provider == "aws" ? 1 : 0
  identifier = "${var.project_name}-${var.environment}-postgres"

  # Engine
  engine         = "postgres"
  engine_version = var.postgres_version

  # Instance
  instance_class        = var.rds_instance_class
  allocated_storage     = var.postgres_storage_gb
  max_allocated_storage = var.postgres_max_storage_gb
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = var.kms_key_arn

  # Database
  db_name  = replace("${var.project_name}_${var.environment}", "-", "_")
  username = var.administrator_login
  password = local.rds_password
  port     = 5432

  # Network
  db_subnet_group_name   = aws_db_subnet_group.main[0].name
  vpc_security_group_ids = [aws_security_group.rds[0].id]
  publicly_accessible    = false

  # High Availability
  multi_az = var.postgres_high_availability

  # Backup
  backup_retention_period = var.postgres_backup_retention
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"
  skip_final_snapshot     = var.environment != "prod"
  final_snapshot_identifier = var.environment == "prod" ? "${var.project_name}-${var.environment}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}" : null
  copy_tags_to_snapshot  = true

  # Performance Insights
  performance_insights_enabled    = var.environment == "prod"
  performance_insights_kms_key_id = var.environment == "prod" ? var.kms_key_arn : null
  performance_insights_retention_period = var.environment == "prod" ? 7 : null

  # Enhanced Monitoring
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  monitoring_interval             = 60
  monitoring_role_arn             = aws_iam_role.rds_monitoring[0].arn

  # Parameters
  parameter_group_name = aws_db_parameter_group.postgres[0].name

  # Auto minor version upgrade
  auto_minor_version_upgrade = true

  # Deletion protection
  deletion_protection = var.environment == "prod"

  tags = merge(
    var.tags,
    {
      Name    = "${var.project_name}-${var.environment}-postgres"
      Service = "Database"
    }
  )

  lifecycle {
    prevent_destroy = false # Set to true in production
  }
}

# ============================================
# RDS Read Replica (for production)
# ============================================
resource "aws_db_instance" "postgres_replica" {
  count              = var.cloud_provider == "aws" && var.environment == "prod" && var.create_read_replica ? 1 : 0
  identifier         = "${var.project_name}-${var.environment}-postgres-replica"
  replicate_source_db = aws_db_instance.postgres[0].identifier

  instance_class = var.rds_instance_class
  storage_type   = "gp3"

  publicly_accessible = false
  skip_final_snapshot = true

  performance_insights_enabled = true
  performance_insights_kms_key_id = var.kms_key_arn

  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring[0].arn

  auto_minor_version_upgrade = true

  tags = merge(
    var.tags,
    {
      Name    = "${var.project_name}-${var.environment}-postgres-replica"
      Service = "Database"
      Type    = "ReadReplica"
    }
  )
}

# ============================================
# IAM Role for Enhanced Monitoring
# ============================================
resource "aws_iam_role" "rds_monitoring" {
  count = var.cloud_provider == "aws" ? 1 : 0
  name  = "${var.project_name}-${var.environment}-rds-monitoring-role"

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

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  count      = var.cloud_provider == "aws" ? 1 : 0
  role       = aws_iam_role.rds_monitoring[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# ============================================
# ElastiCache Subnet Group
# ============================================
resource "aws_elasticache_subnet_group" "main" {
  count      = var.cloud_provider == "aws" ? 1 : 0
  name       = "${var.project_name}-${var.environment}-redis-subnet-group"
  subnet_ids = var.redis_subnet_ids

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-redis-subnet-group"
    }
  )
}

# ============================================
# ElastiCache Security Group
# ============================================
resource "aws_security_group" "redis" {
  count       = var.cloud_provider == "aws" ? 1 : 0
  name        = "${var.project_name}-${var.environment}-redis-sg"
  description = "Security group for ElastiCache Redis"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = var.allowed_security_group_ids
    description     = "Redis access from application"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-redis-sg"
    }
  )
}

# ============================================
# ElastiCache Parameter Group
# ============================================
resource "aws_elasticache_parameter_group" "redis" {
  count  = var.cloud_provider == "aws" ? 1 : 0
  name   = "${var.project_name}-${var.environment}-redis-params"
  family = "redis7"

  parameter {
    name  = "maxmemory-policy"
    value = "volatile-lru"
  }

  parameter {
    name  = "notify-keyspace-events"
    value = "KEA"
  }

  tags = var.tags
}

# ============================================
# ElastiCache Replication Group (Redis Cluster)
# ============================================
resource "aws_elasticache_replication_group" "redis" {
  count                      = var.cloud_provider == "aws" ? 1 : 0
  replication_group_id       = "${var.project_name}-${var.environment}-redis"
  replication_group_description = "Redis cluster for ${var.project_name} ${var.environment}"

  engine               = "redis"
  engine_version       = var.redis_engine_version
  node_type            = var.redis_node_type
  num_cache_clusters   = var.redis_num_cache_nodes
  parameter_group_name = aws_elasticache_parameter_group.redis[0].name
  port                 = 6379

  # Network
  subnet_group_name  = aws_elasticache_subnet_group.main[0].name
  security_group_ids = [aws_security_group.redis[0].id]

  # Security
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token_enabled         = true
  auth_token                 = var.redis_auth_token
  kms_key_id                 = var.kms_key_arn

  # High Availability
  automatic_failover_enabled = var.redis_num_cache_nodes > 1
  multi_az_enabled          = var.redis_num_cache_nodes > 1

  # Backup
  snapshot_retention_limit = var.redis_snapshot_retention_days
  snapshot_window          = "03:00-04:00"
  maintenance_window       = "sun:04:00-sun:05:00"
  final_snapshot_identifier = var.environment == "prod" ? "${var.project_name}-${var.environment}-redis-final" : null

  # Auto minor version upgrade
  auto_minor_version_upgrade = true

  # Logging
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow_log[0].name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "slow-log"
  }

  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_engine_log[0].name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "engine-log"
  }

  tags = merge(
    var.tags,
    {
      Name    = "${var.project_name}-${var.environment}-redis"
      Service = "Cache"
    }
  )
}

# ============================================
# CloudWatch Log Groups for Redis
# ============================================
resource "aws_cloudwatch_log_group" "redis_slow_log" {
  count             = var.cloud_provider == "aws" ? 1 : 0
  name              = "/aws/elasticache/${var.project_name}-${var.environment}/redis/slow-log"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "redis_engine_log" {
  count             = var.cloud_provider == "aws" ? 1 : 0
  name              = "/aws/elasticache/${var.project_name}-${var.environment}/redis/engine-log"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

# ============================================
# CloudWatch Log Group for RDS
# ============================================
resource "aws_cloudwatch_log_group" "rds" {
  count             = var.cloud_provider == "aws" ? 1 : 0
  name              = "/aws/rds/instance/${var.project_name}-${var.environment}-postgres/postgresql"
  retention_in_days = var.log_retention_days

  tags = var.tags
}
