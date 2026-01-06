# =============================================================================
# Marketing Infrastructure Root Module
# Broxiva E-Commerce Platform
# =============================================================================
# This module orchestrates all marketing infrastructure components for the
# Broxiva E-Commerce Platform on AWS EKS.
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = ">= 2.23.0"
    }
  }
}

# -----------------------------------------------------------------------------
# Local Variables
# -----------------------------------------------------------------------------
locals {
  common_tags = merge(var.common_tags, {
    Project     = var.project_name
    Environment = var.environment
    Platform    = "broxiva-marketing"
    ManagedBy   = "terraform"
  })
}

# -----------------------------------------------------------------------------
# EKS Namespaces Module
# -----------------------------------------------------------------------------
module "eks_namespaces" {
  source = "./eks-namespaces"

  environment    = var.environment
  common_labels  = var.common_labels
  irsa_role_arns = var.create_irsa_roles ? module.iam[0].all_role_arns : null

  enable_resource_quotas  = var.enable_resource_quotas
  enable_limit_ranges     = var.enable_limit_ranges
  enable_network_policies = var.enable_network_policies

  default_resource_quota     = var.default_resource_quota
  container_default_limits   = var.container_default_limits
  container_default_requests = var.container_default_requests
}

# -----------------------------------------------------------------------------
# Data Layer Module
# -----------------------------------------------------------------------------
module "data_layer" {
  source = "./data-layer"

  project_name = var.project_name
  environment  = var.environment
  common_tags  = local.common_tags

  vpc_id                  = var.vpc_id
  vpc_cidr                = var.vpc_cidr
  allowed_security_groups = var.allowed_security_groups

  opensearch_subnet_ids      = var.opensearch_subnet_ids
  opensearch_master_user_arn = var.opensearch_master_user_arn
  opensearch_instance_type   = var.opensearch_instance_type
  opensearch_instance_count  = var.opensearch_instance_count

  elasticache_subnet_ids = var.elasticache_subnet_ids
  elasticache_node_type  = var.elasticache_node_type
  elasticache_auth_token = var.elasticache_auth_token

  dynamodb_point_in_time_recovery = var.dynamodb_point_in_time_recovery
  log_retention_days              = var.log_retention_days
}

# -----------------------------------------------------------------------------
# Messaging Module
# -----------------------------------------------------------------------------
module "messaging" {
  source = "./messaging"

  project_name = var.project_name
  environment  = var.environment
  common_tags  = local.common_tags

  sqs_max_receive_count              = var.sqs_max_receive_count
  eventbridge_archive_retention_days = var.eventbridge_archive_retention_days
  alarm_sns_topic_arn                = var.alarm_sns_topic_arn
}

# -----------------------------------------------------------------------------
# Data Lake Module
# -----------------------------------------------------------------------------
module "data_lake" {
  source = "./data-lake"

  project_name = var.project_name
  environment  = var.environment
  common_tags  = local.common_tags

  kinesis_stream_mode     = var.kinesis_stream_mode
  kinesis_retention_hours = var.kinesis_retention_hours
  firehose_buffer_size    = var.firehose_buffer_size
  firehose_buffer_interval = var.firehose_buffer_interval

  glue_version           = var.glue_version
  glue_worker_type       = var.glue_worker_type
  glue_number_of_workers = var.glue_number_of_workers

  athena_bytes_scanned_cutoff = var.athena_bytes_scanned_cutoff
  s3_logging_bucket           = var.s3_logging_bucket
  log_retention_days          = var.log_retention_days
}

# -----------------------------------------------------------------------------
# Email Module
# -----------------------------------------------------------------------------
module "email" {
  source = "./email"

  project_name = var.project_name
  environment  = var.environment
  common_tags  = local.common_tags

  email_domain             = var.email_domain
  tracking_domain          = var.email_tracking_domain
  create_default_templates = var.create_email_templates

  bounce_rate_threshold            = var.bounce_rate_threshold
  complaint_rate_threshold         = var.complaint_rate_threshold
  daily_send_quota_alarm_threshold = var.daily_send_quota_alarm_threshold
  alarm_sns_topic_arn              = var.alarm_sns_topic_arn
  log_retention_days               = var.log_retention_days
}

# -----------------------------------------------------------------------------
# CDN Module
# -----------------------------------------------------------------------------
module "cdn" {
  source = "./cdn"

  project_name = var.project_name
  environment  = var.environment
  common_tags  = local.common_tags

  domain_aliases      = var.cdn_domain_aliases
  acm_certificate_arn = var.cdn_acm_certificate_arn
  price_class         = var.cdn_price_class
  waf_web_acl_arn     = var.waf_web_acl_arn

  app_origin_domain         = var.app_origin_domain
  app_origin_custom_headers = var.app_origin_custom_headers

  cors_allowed_origins      = var.cors_allowed_origins
  geo_restriction_type      = var.geo_restriction_type
  geo_restriction_locations = var.geo_restriction_locations

  alarm_sns_topic_arn = var.alarm_sns_topic_arn
  log_retention_days  = var.cdn_log_retention_days
}

# -----------------------------------------------------------------------------
# IAM (IRSA) Module
# -----------------------------------------------------------------------------
module "iam" {
  count  = var.create_irsa_roles ? 1 : 0
  source = "./iam"

  project_name = var.project_name
  environment  = var.environment
  common_tags  = local.common_tags

  oidc_provider_arn = var.oidc_provider_arn
  oidc_provider_url = var.oidc_provider_url

  kms_key_arns = [
    module.data_layer.kms_key_arn,
    module.data_lake.kms_key_arn,
    module.messaging.kms_key_arn,
    module.email.kms_key_arn,
    module.cdn.kms_key_arn
  ]

  # S3 Buckets
  seo_bucket_arn               = module.cdn.seo_files_bucket_arn
  marketing_assets_bucket_arn  = module.cdn.marketing_assets_bucket_arn
  data_lake_raw_bucket_arn     = module.data_lake.raw_bucket_arn
  data_lake_curated_bucket_arn = module.data_lake.curated_bucket_arn

  # DynamoDB Tables
  marketing_events_table_arn = module.data_layer.marketing_events_table_arn
  experiments_table_arn      = module.data_layer.experiments_table_arn
  feature_flags_table_arn    = module.data_layer.feature_flags_table_arn
  user_profiles_table_arn    = module.data_layer.user_profiles_table_arn

  # SQS Queues
  seo_crawl_queue_arn         = module.messaging.seo_crawl_queue_arn
  email_send_queue_arn        = module.messaging.email_send_queue_arn
  analytics_queue_arn         = module.messaging.analytics_events_queue_arn
  experiment_events_queue_arn = module.messaging.experiment_events_queue_arn

  # SNS Topics
  marketing_events_topic_arn      = module.messaging.marketing_events_topic_arn
  experiment_events_topic_arn     = module.messaging.experiment_events_topic_arn
  personalization_events_topic_arn = module.messaging.personalization_events_topic_arn

  # EventBridge
  event_bus_arn = module.messaging.event_bus_arn

  # OpenSearch
  opensearch_domain_arn = module.data_layer.opensearch_domain_arn

  # Kinesis
  kinesis_stream_arn = module.data_lake.kinesis_stream_arn

  # CloudFront
  cloudfront_distribution_arn = module.cdn.distribution_arn

  # Athena & Glue
  athena_workgroup_arn = module.data_lake.athena_workgroup_arn
  glue_database_arn    = module.data_lake.glue_database_arn

  # SES
  ses_from_addresses = var.ses_from_addresses
}
