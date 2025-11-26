# Monitoring Module - Log Analytics, Application Insights, Alerts, Dashboards
# Comprehensive observability infrastructure for Azure

terraform {
  required_version = ">= 1.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

# ============================================
# Log Analytics Workspace
# ============================================
resource "azurerm_log_analytics_workspace" "main" {
  name                = "${var.project_name}-${var.environment}-logs"
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = "PerGB2018"
  retention_in_days   = var.log_retention_days

  daily_quota_gb = var.environment == "prod" ? -1 : 1

  tags = var.tags
}

# ============================================
# Application Insights
# ============================================
resource "azurerm_application_insights" "main" {
  name                = "${var.project_name}-${var.environment}-appinsights"
  location            = var.location
  resource_group_name = var.resource_group_name
  workspace_id        = azurerm_log_analytics_workspace.main.id
  application_type    = "web"

  daily_data_cap_in_gb                  = var.environment == "prod" ? 100 : 1
  daily_data_cap_notifications_disabled = false
  retention_in_days                     = var.log_retention_days
  sampling_percentage                   = var.environment == "prod" ? 100 : 50
  disable_ip_masking                    = false

  tags = var.tags
}

# ============================================
# Action Groups for Alerts
# ============================================
resource "azurerm_monitor_action_group" "critical" {
  name                = "${var.project_name}-${var.environment}-critical-ag"
  resource_group_name = var.resource_group_name
  short_name          = "Critical"

  email_receiver {
    name                    = "oncall-email"
    email_address           = var.oncall_email
    use_common_alert_schema = true
  }

  dynamic "email_receiver" {
    for_each = var.additional_alert_emails
    content {
      name                    = "alert-${email_receiver.key}"
      email_address           = email_receiver.value
      use_common_alert_schema = true
    }
  }

  dynamic "webhook_receiver" {
    for_each = var.pagerduty_webhook_url != "" ? [1] : []
    content {
      name                    = "pagerduty"
      service_uri             = var.pagerduty_webhook_url
      use_common_alert_schema = true
    }
  }

  dynamic "webhook_receiver" {
    for_each = var.slack_webhook_url != "" ? [1] : []
    content {
      name                    = "slack"
      service_uri             = var.slack_webhook_url
      use_common_alert_schema = true
    }
  }

  tags = var.tags
}

resource "azurerm_monitor_action_group" "warning" {
  name                = "${var.project_name}-${var.environment}-warning-ag"
  resource_group_name = var.resource_group_name
  short_name          = "Warning"

  email_receiver {
    name                    = "team-email"
    email_address           = var.team_email
    use_common_alert_schema = true
  }

  dynamic "webhook_receiver" {
    for_each = var.slack_webhook_url != "" ? [1] : []
    content {
      name                    = "slack"
      service_uri             = var.slack_webhook_url
      use_common_alert_schema = true
    }
  }

  tags = var.tags
}

# ============================================
# Metric Alerts - Application Performance
# ============================================
resource "azurerm_monitor_metric_alert" "response_time" {
  name                = "${var.project_name}-${var.environment}-response-time-alert"
  resource_group_name = var.resource_group_name
  scopes              = [azurerm_application_insights.main.id]
  description         = "Alert when average response time exceeds threshold"
  severity            = 2
  frequency           = "PT5M"
  window_size         = "PT15M"
  enabled             = var.environment == "prod"

  criteria {
    metric_namespace = "microsoft.insights/components"
    metric_name      = "requests/duration"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = var.response_time_threshold_ms
  }

  action {
    action_group_id = azurerm_monitor_action_group.warning.id
  }

  tags = var.tags
}

resource "azurerm_monitor_metric_alert" "failed_requests" {
  name                = "${var.project_name}-${var.environment}-failed-requests-alert"
  resource_group_name = var.resource_group_name
  scopes              = [azurerm_application_insights.main.id]
  description         = "Alert when failed request rate exceeds threshold"
  severity            = 1
  frequency           = "PT1M"
  window_size         = "PT5M"
  enabled             = var.environment == "prod"

  criteria {
    metric_namespace = "microsoft.insights/components"
    metric_name      = "requests/failed"
    aggregation      = "Count"
    operator         = "GreaterThan"
    threshold        = var.failed_requests_threshold
  }

  action {
    action_group_id = azurerm_monitor_action_group.critical.id
  }

  tags = var.tags
}

resource "azurerm_monitor_metric_alert" "exceptions" {
  name                = "${var.project_name}-${var.environment}-exceptions-alert"
  resource_group_name = var.resource_group_name
  scopes              = [azurerm_application_insights.main.id]
  description         = "Alert when exception rate exceeds threshold"
  severity            = 2
  frequency           = "PT5M"
  window_size         = "PT15M"
  enabled             = var.environment == "prod"

  criteria {
    metric_namespace = "microsoft.insights/components"
    metric_name      = "exceptions/count"
    aggregation      = "Count"
    operator         = "GreaterThan"
    threshold        = var.exceptions_threshold
  }

  action {
    action_group_id = azurerm_monitor_action_group.warning.id
  }

  tags = var.tags
}

# ============================================
# Metric Alerts - Infrastructure
# ============================================
resource "azurerm_monitor_metric_alert" "aks_cpu" {
  count = var.aks_cluster_id != "" ? 1 : 0

  name                = "${var.project_name}-${var.environment}-aks-cpu-alert"
  resource_group_name = var.resource_group_name
  scopes              = [var.aks_cluster_id]
  description         = "Alert when AKS node CPU exceeds threshold"
  severity            = 2
  frequency           = "PT5M"
  window_size         = "PT15M"
  enabled             = var.environment == "prod"

  criteria {
    metric_namespace = "Insights.Container/nodes"
    metric_name      = "cpuUsagePercentage"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 80
  }

  action {
    action_group_id = azurerm_monitor_action_group.warning.id
  }

  tags = var.tags
}

resource "azurerm_monitor_metric_alert" "aks_memory" {
  count = var.aks_cluster_id != "" ? 1 : 0

  name                = "${var.project_name}-${var.environment}-aks-memory-alert"
  resource_group_name = var.resource_group_name
  scopes              = [var.aks_cluster_id]
  description         = "Alert when AKS node memory exceeds threshold"
  severity            = 2
  frequency           = "PT5M"
  window_size         = "PT15M"
  enabled             = var.environment == "prod"

  criteria {
    metric_namespace = "Insights.Container/nodes"
    metric_name      = "memoryWorkingSetPercentage"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 80
  }

  action {
    action_group_id = azurerm_monitor_action_group.warning.id
  }

  tags = var.tags
}

resource "azurerm_monitor_metric_alert" "database_cpu" {
  count = var.database_id != "" ? 1 : 0

  name                = "${var.project_name}-${var.environment}-db-cpu-alert"
  resource_group_name = var.resource_group_name
  scopes              = [var.database_id]
  description         = "Alert when database CPU exceeds threshold"
  severity            = 2
  frequency           = "PT5M"
  window_size         = "PT15M"
  enabled             = var.environment == "prod"

  criteria {
    metric_namespace = "Microsoft.DBforPostgreSQL/flexibleServers"
    metric_name      = "cpu_percent"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 80
  }

  action {
    action_group_id = azurerm_monitor_action_group.warning.id
  }

  tags = var.tags
}

resource "azurerm_monitor_metric_alert" "database_storage" {
  count = var.database_id != "" ? 1 : 0

  name                = "${var.project_name}-${var.environment}-db-storage-alert"
  resource_group_name = var.resource_group_name
  scopes              = [var.database_id]
  description         = "Alert when database storage exceeds threshold"
  severity            = 1
  frequency           = "PT15M"
  window_size         = "PT1H"
  enabled             = var.environment == "prod"

  criteria {
    metric_namespace = "Microsoft.DBforPostgreSQL/flexibleServers"
    metric_name      = "storage_percent"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 85
  }

  action {
    action_group_id = azurerm_monitor_action_group.critical.id
  }

  tags = var.tags
}

# ============================================
# Availability Tests
# ============================================
resource "azurerm_application_insights_web_test" "health_check" {
  name                    = "${var.project_name}-${var.environment}-health-test"
  location                = var.location
  resource_group_name     = var.resource_group_name
  application_insights_id = azurerm_application_insights.main.id
  kind                    = "ping"
  frequency               = 300
  timeout                 = 30
  enabled                 = true
  retry_enabled           = true
  geo_locations           = ["us-tx-sn1-azr", "us-il-ch1-azr", "emea-gb-db3-azr", "apac-hk-hkn-azr"]

  configuration = <<XML
<WebTest Name="${var.project_name}-${var.environment}-health" Enabled="True" Timeout="30" xmlns="http://microsoft.com/schemas/VisualStudio/TeamTest/2010">
  <Items>
    <Request Method="GET" Version="1.1" Url="${var.app_url}/api/health" ThinkTime="0" />
  </Items>
</WebTest>
XML

  lifecycle {
    ignore_changes = [tags]
  }

  tags = var.tags
}

resource "azurerm_monitor_metric_alert" "availability" {
  name                = "${var.project_name}-${var.environment}-availability-alert"
  resource_group_name = var.resource_group_name
  scopes              = [azurerm_application_insights.main.id]
  description         = "Alert when availability drops below threshold"
  severity            = 0
  frequency           = "PT1M"
  window_size         = "PT5M"
  enabled             = var.environment == "prod"

  criteria {
    metric_namespace = "microsoft.insights/components"
    metric_name      = "availabilityResults/availabilityPercentage"
    aggregation      = "Average"
    operator         = "LessThan"
    threshold        = 99

    dimension {
      name     = "availabilityResult/name"
      operator = "Include"
      values   = [azurerm_application_insights_web_test.health_check.name]
    }
  }

  action {
    action_group_id = azurerm_monitor_action_group.critical.id
  }

  tags = var.tags
}

# ============================================
# Log Alerts
# ============================================
resource "azurerm_monitor_scheduled_query_rules_alert_v2" "error_spike" {
  name                = "${var.project_name}-${var.environment}-error-spike-alert"
  location            = var.location
  resource_group_name = var.resource_group_name
  scopes              = [azurerm_log_analytics_workspace.main.id]
  description         = "Alert when there's a spike in error logs"
  severity            = 2
  enabled             = var.environment == "prod"

  evaluation_frequency = "PT5M"
  window_duration      = "PT15M"

  criteria {
    query = <<-QUERY
      AppExceptions
      | where TimeGenerated > ago(15m)
      | summarize ErrorCount = count() by bin(TimeGenerated, 5m)
      | where ErrorCount > ${var.error_spike_threshold}
    QUERY

    time_aggregation_method = "Count"
    threshold               = 1
    operator                = "GreaterThan"

    failing_periods {
      minimum_failing_periods_to_trigger_alert = 1
      number_of_evaluation_periods             = 1
    }
  }

  action {
    action_groups = [azurerm_monitor_action_group.warning.id]
  }

  tags = var.tags
}

resource "azurerm_monitor_scheduled_query_rules_alert_v2" "slow_queries" {
  name                = "${var.project_name}-${var.environment}-slow-queries-alert"
  location            = var.location
  resource_group_name = var.resource_group_name
  scopes              = [azurerm_log_analytics_workspace.main.id]
  description         = "Alert when slow database queries are detected"
  severity            = 3
  enabled             = var.environment == "prod"

  evaluation_frequency = "PT15M"
  window_duration      = "PT1H"

  criteria {
    query = <<-QUERY
      AppDependencies
      | where TimeGenerated > ago(1h)
      | where Type == "SQL" or Type == "PostgreSQL"
      | where DurationMs > 5000
      | summarize SlowQueries = count() by bin(TimeGenerated, 15m)
      | where SlowQueries > 10
    QUERY

    time_aggregation_method = "Count"
    threshold               = 1
    operator                = "GreaterThan"

    failing_periods {
      minimum_failing_periods_to_trigger_alert = 1
      number_of_evaluation_periods             = 1
    }
  }

  action {
    action_groups = [azurerm_monitor_action_group.warning.id]
  }

  tags = var.tags
}

# ============================================
# Workbooks / Dashboards
# ============================================
resource "azurerm_portal_dashboard" "main" {
  name                = "${var.project_name}-${var.environment}-dashboard"
  resource_group_name = var.resource_group_name
  location            = var.location

  dashboard_properties = jsonencode({
    lenses = {
      "0" = {
        order = 0
        parts = {
          "0" = {
            position = { x = 0, y = 0, colSpan = 6, rowSpan = 4 }
            metadata = {
              type = "Extension/Microsoft_Azure_Monitoring/PartType/MetricsChartPart"
              inputs = [{
                name  = "resourceId"
                value = azurerm_application_insights.main.id
              }]
            }
          }
        }
      }
    }
    metadata = {
      model = {
        timeRange = {
          value = { relative = { duration = 24, timeUnit = 1 } }
          type  = "MsPortalFx.Composition.Configuration.ValueTypes.TimeRange"
        }
      }
    }
  })

  tags = var.tags
}

# ============================================
# Diagnostic Settings
# ============================================
resource "azurerm_monitor_diagnostic_setting" "app_insights" {
  name                       = "${var.project_name}-${var.environment}-appinsights-diag"
  target_resource_id         = azurerm_application_insights.main.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  enabled_log {
    category = "AppAvailabilityResults"
  }

  enabled_log {
    category = "AppBrowserTimings"
  }

  enabled_log {
    category = "AppEvents"
  }

  enabled_log {
    category = "AppMetrics"
  }

  enabled_log {
    category = "AppDependencies"
  }

  enabled_log {
    category = "AppExceptions"
  }

  enabled_log {
    category = "AppPageViews"
  }

  enabled_log {
    category = "AppPerformanceCounters"
  }

  enabled_log {
    category = "AppRequests"
  }

  enabled_log {
    category = "AppTraces"
  }

  metric {
    category = "AllMetrics"
    enabled  = true
  }
}
