# =============================================================================
# Marketing Infrastructure Root Module - Outputs
# Broxiva E-Commerce Platform
# =============================================================================

# -----------------------------------------------------------------------------
# Namespace Outputs
# -----------------------------------------------------------------------------
output "namespaces" {
  description = "Map of created Kubernetes namespaces"
  value       = module.eks_namespaces.namespaces
}

output "service_account_names" {
  description = "Map of service account names per namespace"
  value       = module.eks_namespaces.service_account_names
}

# -----------------------------------------------------------------------------
# Data Layer Outputs
# -----------------------------------------------------------------------------
output "data_layer" {
  description = "Data layer module outputs"
  value = {
    kms_key_arn         = module.data_layer.kms_key_arn
    opensearch_endpoint = module.data_layer.opensearch_endpoint
    opensearch_arn      = module.data_layer.opensearch_domain_arn
    redis_endpoint      = module.data_layer.elasticache_primary_endpoint
    redis_reader_endpoint = module.data_layer.elasticache_reader_endpoint
    dynamodb_tables = {
      marketing_events = module.data_layer.marketing_events_table_name
      experiments      = module.data_layer.experiments_table_name
      feature_flags    = module.data_layer.feature_flags_table_name
      user_profiles    = module.data_layer.user_profiles_table_name
    }
    security_groups = {
      opensearch   = module.data_layer.opensearch_security_group_id
      elasticache  = module.data_layer.elasticache_security_group_id
    }
  }
}

# -----------------------------------------------------------------------------
# Messaging Outputs
# -----------------------------------------------------------------------------
output "messaging" {
  description = "Messaging module outputs"
  value = {
    kms_key_arn    = module.messaging.kms_key_arn
    event_bus_name = module.messaging.event_bus_name
    event_bus_arn  = module.messaging.event_bus_arn
    sqs_queues = {
      seo_crawl         = module.messaging.seo_crawl_queue_url
      email_send        = module.messaging.email_send_queue_url
      analytics_events  = module.messaging.analytics_events_queue_url
      experiment_events = module.messaging.experiment_events_queue_url
    }
    sns_topics = {
      marketing_events      = module.messaging.marketing_events_topic_arn
      seo_events            = module.messaging.seo_events_topic_arn
      email_events          = module.messaging.email_events_topic_arn
      experiment_events     = module.messaging.experiment_events_topic_arn
      personalization_events = module.messaging.personalization_events_topic_arn
    }
  }
}

# -----------------------------------------------------------------------------
# Data Lake Outputs
# -----------------------------------------------------------------------------
output "data_lake" {
  description = "Data lake module outputs"
  value = {
    kms_key_arn = module.data_lake.kms_key_arn
    s3_buckets = {
      raw     = module.data_lake.raw_bucket_id
      curated = module.data_lake.curated_bucket_id
    }
    kinesis = {
      stream_name = module.data_lake.kinesis_stream_name
      stream_arn  = module.data_lake.kinesis_stream_arn
    }
    firehose = {
      delivery_stream_name = module.data_lake.firehose_delivery_stream_name
      delivery_stream_arn  = module.data_lake.firehose_delivery_stream_arn
    }
    glue = {
      database_name = module.data_lake.glue_database_name
      etl_job_name  = module.data_lake.glue_etl_job_name
      crawler_name  = module.data_lake.glue_crawler_name
    }
    athena = {
      workgroup_name   = module.data_lake.athena_workgroup_name
      results_location = module.data_lake.athena_results_location
    }
  }
}

# -----------------------------------------------------------------------------
# Email Outputs
# -----------------------------------------------------------------------------
output "email" {
  description = "Email module outputs"
  value = {
    kms_key_arn           = module.email.kms_key_arn
    domain_identity_arn   = module.email.domain_identity_arn
    configuration_set     = module.email.configuration_set_name
    ses_events_topic_arn  = module.email.ses_events_topic_arn
    smtp_endpoint         = module.email.smtp_endpoint
    from_email            = module.email.from_email_address
    dns_records_required  = module.email.dns_records_required
    email_templates       = module.email.email_template_names
  }
}

# -----------------------------------------------------------------------------
# CDN Outputs
# -----------------------------------------------------------------------------
output "cdn" {
  description = "CDN module outputs"
  value = {
    kms_key_arn         = module.cdn.kms_key_arn
    distribution_id     = module.cdn.distribution_id
    distribution_domain = module.cdn.distribution_domain_name
    cdn_url             = module.cdn.cdn_url
    s3_buckets = {
      marketing_assets = module.cdn.marketing_assets_bucket_id
      seo_files        = module.cdn.seo_files_bucket_id
      access_logs      = module.cdn.access_logs_bucket_id
    }
    seo_urls = {
      sitemap  = module.cdn.sitemap_url
      robots   = module.cdn.robots_url
      manifest = module.cdn.manifest_url
    }
    dns_configuration = module.cdn.dns_configuration
  }
}

# -----------------------------------------------------------------------------
# IAM (IRSA) Outputs
# -----------------------------------------------------------------------------
output "irsa_roles" {
  description = "IRSA role ARNs for each marketing service"
  value       = var.create_irsa_roles ? module.iam[0].all_role_arns : {}
}

output "service_account_annotations" {
  description = "Service account annotations for IRSA"
  value       = var.create_irsa_roles ? module.iam[0].service_account_annotations : {}
}

# -----------------------------------------------------------------------------
# KMS Keys Summary
# -----------------------------------------------------------------------------
output "kms_keys" {
  description = "All KMS key ARNs used in marketing infrastructure"
  value = {
    data_layer = module.data_layer.kms_key_arn
    messaging  = module.messaging.kms_key_arn
    data_lake  = module.data_lake.kms_key_arn
    email      = module.email.kms_key_arn
    cdn        = module.cdn.kms_key_arn
  }
}

# -----------------------------------------------------------------------------
# Connection Information for Applications
# -----------------------------------------------------------------------------
output "application_config" {
  description = "Configuration values for marketing applications"
  sensitive   = true
  value = {
    opensearch = {
      endpoint = module.data_layer.opensearch_connection_url
    }
    redis = {
      endpoint = module.data_layer.redis_connection_url
      port     = module.data_layer.elasticache_port
    }
    kinesis = module.data_lake.kinesis_connection_info
    athena  = module.data_lake.athena_connection_info
    eventbridge = {
      bus_name = module.messaging.event_bus_name
    }
    ses = {
      configuration_set = module.email.configuration_set_name
      from_address      = module.email.from_email_address
      region            = module.email.ses_region
    }
    cdn = {
      distribution_id = module.cdn.distribution_id
      domain          = module.cdn.distribution_domain_name
    }
  }
}
