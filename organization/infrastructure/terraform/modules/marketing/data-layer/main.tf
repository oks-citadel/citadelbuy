# =============================================================================
# Marketing Data Layer Module
# Broxiva E-Commerce Platform - Marketing Infrastructure
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0.0"
    }
  }
}

# -----------------------------------------------------------------------------
# Data Sources
# -----------------------------------------------------------------------------
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# -----------------------------------------------------------------------------
# Local Variables
# -----------------------------------------------------------------------------
locals {
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.name

  common_tags = merge(var.common_tags, {
    Module      = "marketing/data-layer"
    Platform    = "broxiva-marketing"
    Environment = var.environment
    ManagedBy   = "terraform"
  })

  dynamodb_tables = {
    marketing_events = {
      name           = "marketing-events"
      billing_mode   = "PAY_PER_REQUEST"
      hash_key       = "event_id"
      range_key      = "timestamp"
      stream_enabled = true
      ttl_attribute  = "ttl"
      gsi = [
        {
          name            = "user-events-index"
          hash_key        = "user_id"
          range_key       = "timestamp"
          projection_type = "ALL"
        },
        {
          name            = "event-type-index"
          hash_key        = "event_type"
          range_key       = "timestamp"
          projection_type = "ALL"
        }
      ]
    }
    experiments = {
      name           = "experiments"
      billing_mode   = "PAY_PER_REQUEST"
      hash_key       = "experiment_id"
      range_key      = "user_id"
      stream_enabled = true
      ttl_attribute  = "ttl"
      gsi = [
        {
          name            = "user-experiments-index"
          hash_key        = "user_id"
          range_key       = "assigned_at"
          projection_type = "ALL"
        },
        {
          name            = "variant-index"
          hash_key        = "variant_id"
          range_key       = "assigned_at"
          projection_type = "KEYS_ONLY"
        }
      ]
    }
    feature_flags = {
      name           = "feature-flags"
      billing_mode   = "PAY_PER_REQUEST"
      hash_key       = "flag_key"
      range_key      = "environment"
      stream_enabled = false
      ttl_attribute  = null
      gsi = [
        {
          name            = "status-index"
          hash_key        = "status"
          range_key       = "updated_at"
          projection_type = "ALL"
        }
      ]
    }
    user_profiles = {
      name           = "user-profiles"
      billing_mode   = "PAY_PER_REQUEST"
      hash_key       = "user_id"
      range_key      = null
      stream_enabled = true
      ttl_attribute  = null
      gsi = [
        {
          name            = "segment-index"
          hash_key        = "segment_id"
          range_key       = "updated_at"
          projection_type = "ALL"
        },
        {
          name            = "email-index"
          hash_key        = "email_hash"
          range_key       = null
          projection_type = "KEYS_ONLY"
        }
      ]
    }
  }
}

# -----------------------------------------------------------------------------
# KMS Key for Data Layer Encryption
# -----------------------------------------------------------------------------
resource "aws_kms_key" "data_layer" {
  description             = "KMS key for Broxiva marketing data layer encryption"
  deletion_window_in_days = var.kms_deletion_window_days
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${local.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow OpenSearch Service"
        Effect = "Allow"
        Principal = {
          Service = "es.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      },
      {
        Sid    = "Allow DynamoDB Service"
        Effect = "Allow"
        Principal = {
          Service = "dynamodb.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      },
      {
        Sid    = "Allow ElastiCache Service"
        Effect = "Allow"
        Principal = {
          Service = "elasticache.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-data-layer-kms"
  })
}

resource "aws_kms_alias" "data_layer" {
  name          = "alias/${var.project_name}-${var.environment}-marketing-data-layer"
  target_key_id = aws_kms_key.data_layer.key_id
}

# -----------------------------------------------------------------------------
# OpenSearch Security Group
# -----------------------------------------------------------------------------
resource "aws_security_group" "opensearch" {
  name        = "${var.project_name}-${var.environment}-opensearch-sg"
  description = "Security group for OpenSearch domain"
  vpc_id      = var.vpc_id

  ingress {
    description     = "HTTPS from VPC"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    cidr_blocks     = [var.vpc_cidr]
    security_groups = var.allowed_security_groups
  }

  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-opensearch-sg"
  })
}

# -----------------------------------------------------------------------------
# OpenSearch Service Linked Role
# -----------------------------------------------------------------------------
resource "aws_iam_service_linked_role" "opensearch" {
  count            = var.create_opensearch_service_linked_role ? 1 : 0
  aws_service_name = "opensearchservice.amazonaws.com"
}

# -----------------------------------------------------------------------------
# OpenSearch Domain
# -----------------------------------------------------------------------------
resource "aws_opensearch_domain" "marketing" {
  domain_name    = "${var.project_name}-${var.environment}-marketing"
  engine_version = var.opensearch_engine_version

  cluster_config {
    instance_type            = var.opensearch_instance_type
    instance_count           = var.opensearch_instance_count
    dedicated_master_enabled = var.opensearch_dedicated_master_enabled
    dedicated_master_type    = var.opensearch_dedicated_master_enabled ? var.opensearch_dedicated_master_type : null
    dedicated_master_count   = var.opensearch_dedicated_master_enabled ? var.opensearch_dedicated_master_count : null
    zone_awareness_enabled   = var.opensearch_zone_awareness_enabled

    dynamic "zone_awareness_config" {
      for_each = var.opensearch_zone_awareness_enabled ? [1] : []
      content {
        availability_zone_count = var.opensearch_availability_zone_count
      }
    }

    warm_enabled = var.opensearch_warm_enabled
    warm_type    = var.opensearch_warm_enabled ? var.opensearch_warm_type : null
    warm_count   = var.opensearch_warm_enabled ? var.opensearch_warm_count : null
  }

  ebs_options {
    ebs_enabled = true
    volume_type = var.opensearch_ebs_volume_type
    volume_size = var.opensearch_ebs_volume_size
    iops        = var.opensearch_ebs_volume_type == "gp3" ? var.opensearch_ebs_iops : null
    throughput  = var.opensearch_ebs_volume_type == "gp3" ? var.opensearch_ebs_throughput : null
  }

  vpc_options {
    subnet_ids         = var.opensearch_subnet_ids
    security_group_ids = [aws_security_group.opensearch.id]
  }

  encrypt_at_rest {
    enabled    = true
    kms_key_id = aws_kms_key.data_layer.key_id
  }

  node_to_node_encryption {
    enabled = true
  }

  domain_endpoint_options {
    enforce_https       = true
    tls_security_policy = "Policy-Min-TLS-1-2-2019-07"
  }

  advanced_security_options {
    enabled                        = true
    internal_user_database_enabled = false
    master_user_options {
      master_user_arn = var.opensearch_master_user_arn
    }
  }

  log_publishing_options {
    cloudwatch_log_group_arn = aws_cloudwatch_log_group.opensearch_index_slow.arn
    log_type                 = "INDEX_SLOW_LOGS"
  }

  log_publishing_options {
    cloudwatch_log_group_arn = aws_cloudwatch_log_group.opensearch_search_slow.arn
    log_type                 = "SEARCH_SLOW_LOGS"
  }

  log_publishing_options {
    cloudwatch_log_group_arn = aws_cloudwatch_log_group.opensearch_error.arn
    log_type                 = "ES_APPLICATION_LOGS"
  }

  auto_tune_options {
    desired_state       = var.opensearch_auto_tune_enabled ? "ENABLED" : "DISABLED"
    rollback_on_disable = "NO_ROLLBACK"
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-marketing-opensearch"
  })

  depends_on = [aws_iam_service_linked_role.opensearch]
}

# -----------------------------------------------------------------------------
# OpenSearch CloudWatch Log Groups
# -----------------------------------------------------------------------------
resource "aws_cloudwatch_log_group" "opensearch_index_slow" {
  name              = "/aws/opensearch/${var.project_name}-${var.environment}-marketing/index-slow-logs"
  retention_in_days = var.log_retention_days
  kms_key_id        = aws_kms_key.data_layer.arn

  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "opensearch_search_slow" {
  name              = "/aws/opensearch/${var.project_name}-${var.environment}-marketing/search-slow-logs"
  retention_in_days = var.log_retention_days
  kms_key_id        = aws_kms_key.data_layer.arn

  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "opensearch_error" {
  name              = "/aws/opensearch/${var.project_name}-${var.environment}-marketing/error-logs"
  retention_in_days = var.log_retention_days
  kms_key_id        = aws_kms_key.data_layer.arn

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# OpenSearch Log Resource Policy
# -----------------------------------------------------------------------------
resource "aws_cloudwatch_log_resource_policy" "opensearch" {
  policy_name = "${var.project_name}-${var.environment}-opensearch-logs"

  policy_document = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "es.amazonaws.com"
        }
        Action = [
          "logs:PutLogEvents",
          "logs:PutLogEventsBatch",
          "logs:CreateLogStream"
        ]
        Resource = [
          "${aws_cloudwatch_log_group.opensearch_index_slow.arn}:*",
          "${aws_cloudwatch_log_group.opensearch_search_slow.arn}:*",
          "${aws_cloudwatch_log_group.opensearch_error.arn}:*"
        ]
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# DynamoDB Tables
# -----------------------------------------------------------------------------
resource "aws_dynamodb_table" "marketing" {
  for_each = local.dynamodb_tables

  name         = "${var.project_name}-${var.environment}-${each.value.name}"
  billing_mode = each.value.billing_mode
  hash_key     = each.value.hash_key
  range_key    = each.value.range_key

  attribute {
    name = each.value.hash_key
    type = "S"
  }

  dynamic "attribute" {
    for_each = each.value.range_key != null ? [each.value.range_key] : []
    content {
      name = attribute.value
      type = "S"
    }
  }

  # Additional attributes for GSIs
  dynamic "attribute" {
    for_each = { for gsi in each.value.gsi : gsi.name => gsi if gsi.hash_key != each.value.hash_key && gsi.hash_key != each.value.range_key }
    content {
      name = attribute.value.hash_key
      type = "S"
    }
  }

  dynamic "attribute" {
    for_each = { for gsi in each.value.gsi : "${gsi.name}-range" => gsi if gsi.range_key != null && gsi.range_key != each.value.hash_key && gsi.range_key != each.value.range_key }
    content {
      name = attribute.value.range_key
      type = "S"
    }
  }

  dynamic "global_secondary_index" {
    for_each = { for idx, gsi in each.value.gsi : idx => gsi }
    content {
      name            = global_secondary_index.value.name
      hash_key        = global_secondary_index.value.hash_key
      range_key       = global_secondary_index.value.range_key
      projection_type = global_secondary_index.value.projection_type
    }
  }

  dynamic "ttl" {
    for_each = each.value.ttl_attribute != null ? [each.value.ttl_attribute] : []
    content {
      attribute_name = ttl.value
      enabled        = true
    }
  }

  stream_enabled   = each.value.stream_enabled
  stream_view_type = each.value.stream_enabled ? "NEW_AND_OLD_IMAGES" : null

  point_in_time_recovery {
    enabled = var.dynamodb_point_in_time_recovery
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.data_layer.arn
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-${each.value.name}"
  })
}

# -----------------------------------------------------------------------------
# ElastiCache Subnet Group
# -----------------------------------------------------------------------------
resource "aws_elasticache_subnet_group" "marketing" {
  name        = "${var.project_name}-${var.environment}-marketing-redis"
  description = "Subnet group for marketing Redis cluster"
  subnet_ids  = var.elasticache_subnet_ids

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# ElastiCache Security Group
# -----------------------------------------------------------------------------
resource "aws_security_group" "elasticache" {
  name        = "${var.project_name}-${var.environment}-elasticache-sg"
  description = "Security group for ElastiCache Redis cluster"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Redis from VPC"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    cidr_blocks     = [var.vpc_cidr]
    security_groups = var.allowed_security_groups
  }

  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-elasticache-sg"
  })
}

# -----------------------------------------------------------------------------
# ElastiCache Parameter Group
# -----------------------------------------------------------------------------
resource "aws_elasticache_parameter_group" "marketing" {
  name        = "${var.project_name}-${var.environment}-marketing-redis"
  family      = var.elasticache_parameter_group_family
  description = "Parameter group for marketing Redis cluster"

  parameter {
    name  = "maxmemory-policy"
    value = "volatile-lru"
  }

  parameter {
    name  = "notify-keyspace-events"
    value = "Ex"
  }

  tags = local.common_tags
}

# -----------------------------------------------------------------------------
# ElastiCache Replication Group (Redis Cluster)
# -----------------------------------------------------------------------------
resource "aws_elasticache_replication_group" "marketing" {
  replication_group_id = "${var.project_name}-${var.environment}-marketing"
  description          = "Redis cluster for marketing platform caching"

  node_type                  = var.elasticache_node_type
  num_cache_clusters         = var.elasticache_num_cache_clusters
  port                       = 6379
  parameter_group_name       = aws_elasticache_parameter_group.marketing.name
  subnet_group_name          = aws_elasticache_subnet_group.marketing.name
  security_group_ids         = [aws_security_group.elasticache.id]
  automatic_failover_enabled = var.elasticache_num_cache_clusters > 1
  multi_az_enabled           = var.elasticache_num_cache_clusters > 1
  engine_version             = var.elasticache_engine_version
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  kms_key_id                 = aws_kms_key.data_layer.arn
  auth_token                 = var.elasticache_auth_token
  snapshot_retention_limit   = var.elasticache_snapshot_retention_limit
  snapshot_window            = var.elasticache_snapshot_window
  maintenance_window         = var.elasticache_maintenance_window
  auto_minor_version_upgrade = true
  apply_immediately          = var.apply_immediately

  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.elasticache_slow.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "slow-log"
  }

  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.elasticache_engine.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "engine-log"
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-marketing-redis"
  })
}

# -----------------------------------------------------------------------------
# ElastiCache CloudWatch Log Groups
# -----------------------------------------------------------------------------
resource "aws_cloudwatch_log_group" "elasticache_slow" {
  name              = "/aws/elasticache/${var.project_name}-${var.environment}-marketing/slow-log"
  retention_in_days = var.log_retention_days
  kms_key_id        = aws_kms_key.data_layer.arn

  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "elasticache_engine" {
  name              = "/aws/elasticache/${var.project_name}-${var.environment}-marketing/engine-log"
  retention_in_days = var.log_retention_days
  kms_key_id        = aws_kms_key.data_layer.arn

  tags = local.common_tags
}
