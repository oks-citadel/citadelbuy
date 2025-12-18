# Monitoring Module - AWS CloudWatch, X-Ray, CloudWatch Insights
# Comprehensive observability infrastructure for AWS

# ============================================
# SNS Topics for Alerts
# ============================================
resource "aws_sns_topic" "critical_alerts" {
  count = var.cloud_provider == "aws" ? 1 : 0
  name  = "${var.project_name}-${var.environment}-critical-alerts"

  tags = var.tags
}

resource "aws_sns_topic" "warning_alerts" {
  count = var.cloud_provider == "aws" ? 1 : 0
  name  = "${var.project_name}-${var.environment}-warning-alerts"

  tags = var.tags
}

# Email subscriptions
resource "aws_sns_topic_subscription" "critical_email" {
  count     = var.cloud_provider == "aws" ? 1 : 0
  topic_arn = aws_sns_topic.critical_alerts[0].arn
  protocol  = "email"
  endpoint  = var.oncall_email
}

resource "aws_sns_topic_subscription" "warning_email" {
  count     = var.cloud_provider == "aws" ? 1 : 0
  topic_arn = aws_sns_topic.warning_alerts[0].arn
  protocol  = "email"
  endpoint  = var.team_email
}

# ============================================
# CloudWatch Log Groups
# ============================================
resource "aws_cloudwatch_log_group" "application" {
  count             = var.cloud_provider == "aws" ? 1 : 0
  name              = "/aws/application/${var.project_name}-${var.environment}"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

# ============================================
# CloudWatch Alarms - Application Performance
# ============================================

# API Response Time Alarm
resource "aws_cloudwatch_metric_alarm" "api_response_time" {
  count               = var.cloud_provider == "aws" && var.alb_arn != "" ? 1 : 0
  alarm_name          = "${var.project_name}-${var.environment}-api-response-time"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Average"
  threshold           = var.response_time_threshold_ms / 1000 # Convert to seconds
  alarm_description   = "Alert when API response time exceeds threshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = split("/", var.alb_arn)[1]
  }

  alarm_actions = [aws_sns_topic.warning_alerts[0].arn]

  tags = var.tags
}

# Failed Requests Alarm
resource "aws_cloudwatch_metric_alarm" "failed_requests" {
  count               = var.cloud_provider == "aws" && var.alb_arn != "" ? 1 : 0
  alarm_name          = "${var.project_name}-${var.environment}-failed-requests"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Sum"
  threshold           = var.failed_requests_threshold
  alarm_description   = "Alert when failed request count exceeds threshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = split("/", var.alb_arn)[1]
  }

  alarm_actions = [aws_sns_topic.critical_alerts[0].arn]

  tags = var.tags
}

# ============================================
# CloudWatch Alarms - EKS Cluster
# ============================================

# EKS Node CPU Utilization
resource "aws_cloudwatch_metric_alarm" "eks_node_cpu" {
  count               = var.cloud_provider == "aws" && var.eks_cluster_name != "" ? 1 : 0
  alarm_name          = "${var.project_name}-${var.environment}-eks-node-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "node_cpu_utilization"
  namespace           = "ContainerInsights"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Alert when EKS node CPU exceeds 80%"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ClusterName = var.eks_cluster_name
  }

  alarm_actions = [aws_sns_topic.warning_alerts[0].arn]

  tags = var.tags
}

# EKS Node Memory Utilization
resource "aws_cloudwatch_metric_alarm" "eks_node_memory" {
  count               = var.cloud_provider == "aws" && var.eks_cluster_name != "" ? 1 : 0
  alarm_name          = "${var.project_name}-${var.environment}-eks-node-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "node_memory_utilization"
  namespace           = "ContainerInsights"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Alert when EKS node memory exceeds 80%"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ClusterName = var.eks_cluster_name
  }

  alarm_actions = [aws_sns_topic.warning_alerts[0].arn]

  tags = var.tags
}

# ============================================
# CloudWatch Alarms - RDS Database
# ============================================

# RDS CPU Utilization
resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  count               = var.cloud_provider == "aws" && var.rds_instance_id != "" ? 1 : 0
  alarm_name          = "${var.project_name}-${var.environment}-rds-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Alert when RDS CPU exceeds 80%"
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBInstanceIdentifier = var.rds_instance_id
  }

  alarm_actions = [aws_sns_topic.warning_alerts[0].arn]

  tags = var.tags
}

# RDS Storage Space
resource "aws_cloudwatch_metric_alarm" "rds_storage" {
  count               = var.cloud_provider == "aws" && var.rds_instance_id != "" ? 1 : 0
  alarm_name          = "${var.project_name}-${var.environment}-rds-storage"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 10737418240 # 10 GB in bytes
  alarm_description   = "Alert when RDS free storage is less than 10GB"
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBInstanceIdentifier = var.rds_instance_id
  }

  alarm_actions = [aws_sns_topic.critical_alerts[0].arn]

  tags = var.tags
}

# RDS Connection Count
resource "aws_cloudwatch_metric_alarm" "rds_connections" {
  count               = var.cloud_provider == "aws" && var.rds_instance_id != "" ? 1 : 0
  alarm_name          = "${var.project_name}-${var.environment}-rds-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Alert when RDS connections exceed threshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBInstanceIdentifier = var.rds_instance_id
  }

  alarm_actions = [aws_sns_topic.warning_alerts[0].arn]

  tags = var.tags
}

# ============================================
# CloudWatch Alarms - ElastiCache Redis
# ============================================

# Redis CPU Utilization
resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  count               = var.cloud_provider == "aws" && var.redis_cluster_id != "" ? 1 : 0
  alarm_name          = "${var.project_name}-${var.environment}-redis-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = 75
  alarm_description   = "Alert when Redis CPU exceeds 75%"
  treat_missing_data  = "notBreaching"

  dimensions = {
    CacheClusterId = var.redis_cluster_id
  }

  alarm_actions = [aws_sns_topic.warning_alerts[0].arn]

  tags = var.tags
}

# Redis Memory Usage
resource "aws_cloudwatch_metric_alarm" "redis_memory" {
  count               = var.cloud_provider == "aws" && var.redis_cluster_id != "" ? 1 : 0
  alarm_name          = "${var.project_name}-${var.environment}-redis-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Alert when Redis memory usage exceeds 80%"
  treat_missing_data  = "notBreaching"

  dimensions = {
    CacheClusterId = var.redis_cluster_id
  }

  alarm_actions = [aws_sns_topic.warning_alerts[0].arn]

  tags = var.tags
}

# ============================================
# CloudWatch Insights Query Definitions
# ============================================
resource "aws_cloudwatch_query_definition" "error_logs" {
  count = var.cloud_provider == "aws" ? 1 : 0
  name  = "${var.project_name}-${var.environment}-error-logs"

  log_group_names = [
    aws_cloudwatch_log_group.application[0].name
  ]

  query_string = <<-EOT
    fields @timestamp, @message, @logStream
    | filter @message like /ERROR/
    | sort @timestamp desc
    | limit 100
  EOT
}

resource "aws_cloudwatch_query_definition" "slow_requests" {
  count = var.cloud_provider == "aws" ? 1 : 0
  name  = "${var.project_name}-${var.environment}-slow-requests"

  log_group_names = [
    aws_cloudwatch_log_group.application[0].name
  ]

  query_string = <<-EOT
    fields @timestamp, @message, duration
    | filter duration > 1000
    | sort duration desc
    | limit 50
  EOT
}

# ============================================
# CloudWatch Dashboard
# ============================================
resource "aws_cloudwatch_dashboard" "main" {
  count          = var.cloud_provider == "aws" ? 1 : 0
  dashboard_name = "${var.project_name}-${var.environment}-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "RequestCount"],
            [".", "TargetResponseTime"],
            [".", "HTTPCode_Target_5XX_Count"]
          ]
          period = 300
          stat   = "Sum"
          region = var.region
          title  = "Application Load Balancer Metrics"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/RDS", "CPUUtilization"],
            [".", "DatabaseConnections"],
            [".", "FreeStorageSpace"]
          ]
          period = 300
          stat   = "Average"
          region = var.region
          title  = "RDS Metrics"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["ContainerInsights", "node_cpu_utilization"],
            [".", "node_memory_utilization"],
            [".", "node_network_total_bytes"]
          ]
          period = 300
          stat   = "Average"
          region = var.region
          title  = "EKS Node Metrics"
        }
      }
    ]
  })
}

# ============================================
# X-Ray Sampling Rule (for distributed tracing)
# ============================================
resource "aws_xray_sampling_rule" "main" {
  count = var.cloud_provider == "aws" && var.enable_xray ? 1 : 0

  rule_name      = "${var.project_name}-${var.environment}-sampling"
  priority       = 1000
  version        = 1
  reservoir_size = 1
  fixed_rate     = var.environment == "prod" ? 0.05 : 0.1 # 5% in prod, 10% in non-prod
  url_path       = "*"
  host           = "*"
  http_method    = "*"
  service_type   = "*"
  service_name   = "*"
  resource_arn   = "*"

  tags = var.tags
}
