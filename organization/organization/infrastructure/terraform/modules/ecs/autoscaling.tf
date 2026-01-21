#===============================================================================
# Broxiva E-Commerce Platform - ECS Auto Scaling Configuration
#===============================================================================
# This file provides comprehensive auto-scaling configuration for ECS services
# migrated from Kubernetes HPA settings.
#
# Features:
# - Application Auto Scaling targets for each ECS service
# - CPU-based step scaling policies for gradual scale-out
# - Memory-based scaling policies (optional)
# - Scale-down stabilization with 300s cooldown
# - Scheduled scaling for known traffic patterns
# - Fargate Spot for non-critical services (cost optimization)
# - Fargate On-Demand for critical services (reliability)
#
# Service Mapping from Kubernetes HPA:
# | Service          | Min | Max | CPU Target | Memory Target | Critical |
# |------------------|-----|-----|------------|---------------|----------|
# | broxiva-api      | 5   | 20  | 70%        | 80%           | Yes      |
# | broxiva-web      | 5   | 15  | 70%        | 80%           | Yes      |
# | email-worker     | 3   | 10  | 75%        | 80%           | No       |
# | order-worker     | 5   | 15  | 70%        | 80%           | No       |
# | search-worker    | 3   | 10  | 75%        | 80%           | No       |
# | cart-worker      | 2   | 6   | 75%        | 80%           | No       |
# | scheduled-worker | 2   | 5   | 75%        | 80%           | No       |
#===============================================================================

#-------------------------------------------------------------------------------
# Local Variables for Auto Scaling Configuration
#-------------------------------------------------------------------------------

locals {
  # Derive name_prefix from project and environment if not explicitly set
  effective_name_prefix = var.name_prefix != "" ? var.name_prefix : "${var.project_name}-${var.environment}"

  # Service scaling configurations mapped from Kubernetes HPA settings
  # Critical services use Fargate On-Demand, non-critical use Spot for cost optimization
  scaling_configs = {
    api = {
      min_capacity       = var.autoscaling_api_min_capacity
      max_capacity       = var.autoscaling_api_max_capacity
      cpu_target         = var.autoscaling_api_cpu_target
      memory_target      = var.autoscaling_api_memory_target
      is_critical        = true
      scale_in_cooldown  = 300  # 5 minute stabilization
      scale_out_cooldown = 60   # Quick response to load
    }
    web = {
      min_capacity       = var.autoscaling_web_min_capacity
      max_capacity       = var.autoscaling_web_max_capacity
      cpu_target         = var.autoscaling_web_cpu_target
      memory_target      = var.autoscaling_web_memory_target
      is_critical        = true
      scale_in_cooldown  = 300
      scale_out_cooldown = 60
    }
  }

  # Worker scaling configurations - use Spot for cost optimization
  worker_scaling_configs = var.enable_worker_services ? {
    email-worker = {
      min_capacity       = var.autoscaling_email_worker_min_capacity
      max_capacity       = var.autoscaling_email_worker_max_capacity
      cpu_target         = var.autoscaling_email_worker_cpu_target
      memory_target      = var.autoscaling_email_worker_memory_target
      is_critical        = false
      scale_in_cooldown  = 300
      scale_out_cooldown = 120
    }
    order-worker = {
      min_capacity       = var.autoscaling_order_worker_min_capacity
      max_capacity       = var.autoscaling_order_worker_max_capacity
      cpu_target         = var.autoscaling_order_worker_cpu_target
      memory_target      = var.autoscaling_order_worker_memory_target
      is_critical        = false
      scale_in_cooldown  = 300
      scale_out_cooldown = 90
    }
    search-worker = {
      min_capacity       = var.autoscaling_search_worker_min_capacity
      max_capacity       = var.autoscaling_search_worker_max_capacity
      cpu_target         = var.autoscaling_search_worker_cpu_target
      memory_target      = var.autoscaling_search_worker_memory_target
      is_critical        = false
      scale_in_cooldown  = 300
      scale_out_cooldown = 120
    }
    cart-worker = {
      min_capacity       = var.autoscaling_cart_worker_min_capacity
      max_capacity       = var.autoscaling_cart_worker_max_capacity
      cpu_target         = var.autoscaling_cart_worker_cpu_target
      memory_target      = var.autoscaling_cart_worker_memory_target
      is_critical        = false
      scale_in_cooldown  = 300
      scale_out_cooldown = 120
    }
    scheduled-worker = {
      min_capacity       = var.autoscaling_scheduled_worker_min_capacity
      max_capacity       = var.autoscaling_scheduled_worker_max_capacity
      cpu_target         = var.autoscaling_scheduled_worker_cpu_target
      memory_target      = var.autoscaling_scheduled_worker_memory_target
      is_critical        = false
      scale_in_cooldown  = 300
      scale_out_cooldown = 180
    }
  } : {}

  # Merge all scaling configs
  all_scaling_configs = merge(local.scaling_configs, local.worker_scaling_configs)
}

#===============================================================================
# Application Auto Scaling - Scalable Targets
#===============================================================================

# API Service Scalable Target
resource "aws_appautoscaling_target" "api" {
  count = var.enable_autoscaling ? 1 : 0

  max_capacity       = var.autoscaling_api_max_capacity
  min_capacity       = var.autoscaling_api_min_capacity
  resource_id        = "service/${local.effective_name_prefix}-cluster/${local.effective_name_prefix}-api"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"

  tags = merge(var.tags, {
    Name    = "${local.effective_name_prefix}-api-scaling-target"
    Service = "api"
  })
}

# Web Service Scalable Target
resource "aws_appautoscaling_target" "web" {
  count = var.enable_autoscaling ? 1 : 0

  max_capacity       = var.autoscaling_web_max_capacity
  min_capacity       = var.autoscaling_web_min_capacity
  resource_id        = "service/${local.effective_name_prefix}-cluster/${local.effective_name_prefix}-web"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"

  tags = merge(var.tags, {
    Name    = "${local.effective_name_prefix}-web-scaling-target"
    Service = "web"
  })
}

# Worker Services Scalable Targets
resource "aws_appautoscaling_target" "workers" {
  for_each = var.enable_autoscaling ? local.worker_scaling_configs : {}

  max_capacity       = each.value.max_capacity
  min_capacity       = each.value.min_capacity
  resource_id        = "service/${local.effective_name_prefix}-cluster/${local.effective_name_prefix}-${each.key}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"

  tags = merge(var.tags, {
    Name    = "${local.effective_name_prefix}-${each.key}-scaling-target"
    Service = each.key
  })
}

#===============================================================================
# CPU-Based Step Scaling Policies - Scale Out (Gradual)
#===============================================================================

# API CPU Step Scale Out
resource "aws_appautoscaling_policy" "api_cpu_step_scale_out" {
  count = var.enable_autoscaling ? 1 : 0

  name               = "${local.effective_name_prefix}-api-cpu-step-scale-out"
  policy_type        = "StepScaling"
  resource_id        = aws_appautoscaling_target.api[0].resource_id
  scalable_dimension = aws_appautoscaling_target.api[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.api[0].service_namespace

  step_scaling_policy_configuration {
    adjustment_type         = "ChangeInCapacity"
    cooldown                = 60
    metric_aggregation_type = "Average"

    # Step 1: CPU 70-80% - Add 1 task (normal load increase)
    step_adjustment {
      metric_interval_lower_bound = 0
      metric_interval_upper_bound = 10
      scaling_adjustment          = 1
    }

    # Step 2: CPU 80-90% - Add 2 tasks (significant load)
    step_adjustment {
      metric_interval_lower_bound = 10
      metric_interval_upper_bound = 20
      scaling_adjustment          = 2
    }

    # Step 3: CPU 90-100% - Add 3 tasks (high load)
    step_adjustment {
      metric_interval_lower_bound = 20
      metric_interval_upper_bound = 30
      scaling_adjustment          = 3
    }

    # Step 4: CPU > 100% - Add 4 tasks (emergency/burst)
    step_adjustment {
      metric_interval_lower_bound = 30
      scaling_adjustment          = 4
    }
  }
}

# Web CPU Step Scale Out
resource "aws_appautoscaling_policy" "web_cpu_step_scale_out" {
  count = var.enable_autoscaling ? 1 : 0

  name               = "${local.effective_name_prefix}-web-cpu-step-scale-out"
  policy_type        = "StepScaling"
  resource_id        = aws_appautoscaling_target.web[0].resource_id
  scalable_dimension = aws_appautoscaling_target.web[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.web[0].service_namespace

  step_scaling_policy_configuration {
    adjustment_type         = "ChangeInCapacity"
    cooldown                = 60
    metric_aggregation_type = "Average"

    step_adjustment {
      metric_interval_lower_bound = 0
      metric_interval_upper_bound = 10
      scaling_adjustment          = 1
    }

    step_adjustment {
      metric_interval_lower_bound = 10
      metric_interval_upper_bound = 20
      scaling_adjustment          = 2
    }

    step_adjustment {
      metric_interval_lower_bound = 20
      metric_interval_upper_bound = 30
      scaling_adjustment          = 3
    }

    step_adjustment {
      metric_interval_lower_bound = 30
      scaling_adjustment          = 4
    }
  }
}

# Worker CPU Step Scale Out Policies
resource "aws_appautoscaling_policy" "workers_cpu_step_scale_out" {
  for_each = var.enable_autoscaling ? local.worker_scaling_configs : {}

  name               = "${local.effective_name_prefix}-${each.key}-cpu-step-scale-out"
  policy_type        = "StepScaling"
  resource_id        = aws_appautoscaling_target.workers[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.workers[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.workers[each.key].service_namespace

  step_scaling_policy_configuration {
    adjustment_type         = "ChangeInCapacity"
    cooldown                = each.value.scale_out_cooldown
    metric_aggregation_type = "Average"

    step_adjustment {
      metric_interval_lower_bound = 0
      metric_interval_upper_bound = 10
      scaling_adjustment          = 1
    }

    step_adjustment {
      metric_interval_lower_bound = 10
      metric_interval_upper_bound = 20
      scaling_adjustment          = 2
    }

    step_adjustment {
      metric_interval_lower_bound = 20
      scaling_adjustment          = 3
    }
  }
}

#===============================================================================
# CloudWatch Alarms for CPU Scale Out
#===============================================================================

resource "aws_cloudwatch_metric_alarm" "api_cpu_high" {
  count = var.enable_autoscaling ? 1 : 0

  alarm_name          = "${local.effective_name_prefix}-api-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = var.autoscaling_api_cpu_target
  alarm_description   = "API CPU utilization exceeded ${var.autoscaling_api_cpu_target}%"

  dimensions = {
    ClusterName = "${local.effective_name_prefix}-cluster"
    ServiceName = "${local.effective_name_prefix}-api"
  }

  alarm_actions = [aws_appautoscaling_policy.api_cpu_step_scale_out[0].arn]

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "web_cpu_high" {
  count = var.enable_autoscaling ? 1 : 0

  alarm_name          = "${local.effective_name_prefix}-web-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = var.autoscaling_web_cpu_target
  alarm_description   = "Web CPU utilization exceeded ${var.autoscaling_web_cpu_target}%"

  dimensions = {
    ClusterName = "${local.effective_name_prefix}-cluster"
    ServiceName = "${local.effective_name_prefix}-web"
  }

  alarm_actions = [aws_appautoscaling_policy.web_cpu_step_scale_out[0].arn]

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "workers_cpu_high" {
  for_each = var.enable_autoscaling ? local.worker_scaling_configs : {}

  alarm_name          = "${local.effective_name_prefix}-${each.key}-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = each.value.cpu_target
  alarm_description   = "${each.key} CPU utilization exceeded ${each.value.cpu_target}%"

  dimensions = {
    ClusterName = "${local.effective_name_prefix}-cluster"
    ServiceName = "${local.effective_name_prefix}-${each.key}"
  }

  alarm_actions = [aws_appautoscaling_policy.workers_cpu_step_scale_out[each.key].arn]

  tags = var.tags
}

#===============================================================================
# CPU-Based Step Scaling Policies - Scale In (with 300s stabilization)
#===============================================================================

resource "aws_appautoscaling_policy" "api_cpu_step_scale_in" {
  count = var.enable_autoscaling ? 1 : 0

  name               = "${local.effective_name_prefix}-api-cpu-step-scale-in"
  policy_type        = "StepScaling"
  resource_id        = aws_appautoscaling_target.api[0].resource_id
  scalable_dimension = aws_appautoscaling_target.api[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.api[0].service_namespace

  step_scaling_policy_configuration {
    adjustment_type         = "ChangeInCapacity"
    cooldown                = 300  # 5 minute stabilization cooldown
    metric_aggregation_type = "Average"

    step_adjustment {
      metric_interval_upper_bound = 0
      scaling_adjustment          = -1
    }
  }
}

resource "aws_appautoscaling_policy" "web_cpu_step_scale_in" {
  count = var.enable_autoscaling ? 1 : 0

  name               = "${local.effective_name_prefix}-web-cpu-step-scale-in"
  policy_type        = "StepScaling"
  resource_id        = aws_appautoscaling_target.web[0].resource_id
  scalable_dimension = aws_appautoscaling_target.web[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.web[0].service_namespace

  step_scaling_policy_configuration {
    adjustment_type         = "ChangeInCapacity"
    cooldown                = 300
    metric_aggregation_type = "Average"

    step_adjustment {
      metric_interval_upper_bound = 0
      scaling_adjustment          = -1
    }
  }
}

resource "aws_appautoscaling_policy" "workers_cpu_step_scale_in" {
  for_each = var.enable_autoscaling ? local.worker_scaling_configs : {}

  name               = "${local.effective_name_prefix}-${each.key}-cpu-step-scale-in"
  policy_type        = "StepScaling"
  resource_id        = aws_appautoscaling_target.workers[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.workers[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.workers[each.key].service_namespace

  step_scaling_policy_configuration {
    adjustment_type         = "ChangeInCapacity"
    cooldown                = each.value.scale_in_cooldown  # 300s stabilization
    metric_aggregation_type = "Average"

    step_adjustment {
      metric_interval_upper_bound = 0
      scaling_adjustment          = -1
    }
  }
}

#===============================================================================
# CloudWatch Alarms for CPU Scale In
#===============================================================================

resource "aws_cloudwatch_metric_alarm" "api_cpu_low" {
  count = var.enable_autoscaling ? 1 : 0

  alarm_name          = "${local.effective_name_prefix}-api-cpu-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 5  # 5 minutes of low CPU before scaling in
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = var.autoscaling_api_cpu_target - 20
  alarm_description   = "API CPU utilization below ${var.autoscaling_api_cpu_target - 20}%"

  dimensions = {
    ClusterName = "${local.effective_name_prefix}-cluster"
    ServiceName = "${local.effective_name_prefix}-api"
  }

  alarm_actions = [aws_appautoscaling_policy.api_cpu_step_scale_in[0].arn]

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "web_cpu_low" {
  count = var.enable_autoscaling ? 1 : 0

  alarm_name          = "${local.effective_name_prefix}-web-cpu-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 5
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = var.autoscaling_web_cpu_target - 20
  alarm_description   = "Web CPU utilization below ${var.autoscaling_web_cpu_target - 20}%"

  dimensions = {
    ClusterName = "${local.effective_name_prefix}-cluster"
    ServiceName = "${local.effective_name_prefix}-web"
  }

  alarm_actions = [aws_appautoscaling_policy.web_cpu_step_scale_in[0].arn]

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "workers_cpu_low" {
  for_each = var.enable_autoscaling ? local.worker_scaling_configs : {}

  alarm_name          = "${local.effective_name_prefix}-${each.key}-cpu-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 5
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = each.value.cpu_target - 20
  alarm_description   = "${each.key} CPU utilization below ${each.value.cpu_target - 20}%"

  dimensions = {
    ClusterName = "${local.effective_name_prefix}-cluster"
    ServiceName = "${local.effective_name_prefix}-${each.key}"
  }

  alarm_actions = [aws_appautoscaling_policy.workers_cpu_step_scale_in[each.key].arn]

  tags = var.tags
}

#===============================================================================
# Memory-Based Scaling Policies (Optional - Target Tracking)
#===============================================================================

resource "aws_appautoscaling_policy" "api_memory_tracking" {
  count = var.enable_autoscaling && var.enable_memory_based_scaling ? 1 : 0

  name               = "${local.effective_name_prefix}-api-memory-tracking"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.api[0].resource_id
  scalable_dimension = aws_appautoscaling_target.api[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.api[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }

    target_value       = var.autoscaling_api_memory_target
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
    disable_scale_in   = true  # Prevent conflicts with CPU scale-in
  }
}

resource "aws_appautoscaling_policy" "web_memory_tracking" {
  count = var.enable_autoscaling && var.enable_memory_based_scaling ? 1 : 0

  name               = "${local.effective_name_prefix}-web-memory-tracking"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.web[0].resource_id
  scalable_dimension = aws_appautoscaling_target.web[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.web[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }

    target_value       = var.autoscaling_web_memory_target
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
    disable_scale_in   = true
  }
}

resource "aws_appautoscaling_policy" "workers_memory_tracking" {
  for_each = var.enable_autoscaling && var.enable_memory_based_scaling ? local.worker_scaling_configs : {}

  name               = "${local.effective_name_prefix}-${each.key}-memory-tracking"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.workers[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.workers[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.workers[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }

    target_value       = each.value.memory_target
    scale_in_cooldown  = each.value.scale_in_cooldown
    scale_out_cooldown = each.value.scale_out_cooldown
    disable_scale_in   = true
  }
}

#===============================================================================
# Scheduled Scaling - Known Traffic Patterns
#===============================================================================

# Morning Scale-Up (6 AM - Pre-business hours preparation)
resource "aws_appautoscaling_scheduled_action" "api_morning_scale_up" {
  count = var.enable_autoscaling && var.enable_scheduled_scaling ? 1 : 0

  name               = "${local.effective_name_prefix}-api-morning-scale-up"
  service_namespace  = aws_appautoscaling_target.api[0].service_namespace
  resource_id        = aws_appautoscaling_target.api[0].resource_id
  scalable_dimension = aws_appautoscaling_target.api[0].scalable_dimension

  schedule = "cron(0 6 ? * MON-FRI *)"
  timezone = var.scheduled_scaling_timezone

  scalable_target_action {
    min_capacity = ceil(var.autoscaling_api_min_capacity * 1.5)
    max_capacity = var.autoscaling_api_max_capacity
  }
}

resource "aws_appautoscaling_scheduled_action" "web_morning_scale_up" {
  count = var.enable_autoscaling && var.enable_scheduled_scaling ? 1 : 0

  name               = "${local.effective_name_prefix}-web-morning-scale-up"
  service_namespace  = aws_appautoscaling_target.web[0].service_namespace
  resource_id        = aws_appautoscaling_target.web[0].resource_id
  scalable_dimension = aws_appautoscaling_target.web[0].scalable_dimension

  schedule = "cron(0 6 ? * MON-FRI *)"
  timezone = var.scheduled_scaling_timezone

  scalable_target_action {
    min_capacity = ceil(var.autoscaling_web_min_capacity * 1.5)
    max_capacity = var.autoscaling_web_max_capacity
  }
}

# Peak Hours Scale-Up (9 AM - Business hours start)
resource "aws_appautoscaling_scheduled_action" "api_peak_scale_up" {
  count = var.enable_autoscaling && var.enable_scheduled_scaling ? 1 : 0

  name               = "${local.effective_name_prefix}-api-peak-scale-up"
  service_namespace  = aws_appautoscaling_target.api[0].service_namespace
  resource_id        = aws_appautoscaling_target.api[0].resource_id
  scalable_dimension = aws_appautoscaling_target.api[0].scalable_dimension

  schedule = "cron(0 9 ? * MON-FRI *)"
  timezone = var.scheduled_scaling_timezone

  scalable_target_action {
    min_capacity = var.autoscaling_api_min_capacity * 2
    max_capacity = var.autoscaling_api_max_capacity
  }
}

resource "aws_appautoscaling_scheduled_action" "web_peak_scale_up" {
  count = var.enable_autoscaling && var.enable_scheduled_scaling ? 1 : 0

  name               = "${local.effective_name_prefix}-web-peak-scale-up"
  service_namespace  = aws_appautoscaling_target.web[0].service_namespace
  resource_id        = aws_appautoscaling_target.web[0].resource_id
  scalable_dimension = aws_appautoscaling_target.web[0].scalable_dimension

  schedule = "cron(0 9 ? * MON-FRI *)"
  timezone = var.scheduled_scaling_timezone

  scalable_target_action {
    min_capacity = var.autoscaling_web_min_capacity * 2
    max_capacity = var.autoscaling_web_max_capacity
  }
}

# Evening Scale-Down (6 PM - After business hours)
resource "aws_appautoscaling_scheduled_action" "api_evening_scale_down" {
  count = var.enable_autoscaling && var.enable_scheduled_scaling ? 1 : 0

  name               = "${local.effective_name_prefix}-api-evening-scale-down"
  service_namespace  = aws_appautoscaling_target.api[0].service_namespace
  resource_id        = aws_appautoscaling_target.api[0].resource_id
  scalable_dimension = aws_appautoscaling_target.api[0].scalable_dimension

  schedule = "cron(0 18 ? * MON-FRI *)"
  timezone = var.scheduled_scaling_timezone

  scalable_target_action {
    min_capacity = var.autoscaling_api_min_capacity
    max_capacity = var.autoscaling_api_max_capacity
  }
}

resource "aws_appautoscaling_scheduled_action" "web_evening_scale_down" {
  count = var.enable_autoscaling && var.enable_scheduled_scaling ? 1 : 0

  name               = "${local.effective_name_prefix}-web-evening-scale-down"
  service_namespace  = aws_appautoscaling_target.web[0].service_namespace
  resource_id        = aws_appautoscaling_target.web[0].resource_id
  scalable_dimension = aws_appautoscaling_target.web[0].scalable_dimension

  schedule = "cron(0 18 ? * MON-FRI *)"
  timezone = var.scheduled_scaling_timezone

  scalable_target_action {
    min_capacity = var.autoscaling_web_min_capacity
    max_capacity = var.autoscaling_web_max_capacity
  }
}

# Weekend Scale-Down (Saturday midnight)
resource "aws_appautoscaling_scheduled_action" "api_weekend_scale_down" {
  count = var.enable_autoscaling && var.enable_scheduled_scaling ? 1 : 0

  name               = "${local.effective_name_prefix}-api-weekend-scale-down"
  service_namespace  = aws_appautoscaling_target.api[0].service_namespace
  resource_id        = aws_appautoscaling_target.api[0].resource_id
  scalable_dimension = aws_appautoscaling_target.api[0].scalable_dimension

  schedule = "cron(0 0 ? * SAT *)"
  timezone = var.scheduled_scaling_timezone

  scalable_target_action {
    min_capacity = ceil(var.autoscaling_api_min_capacity * 0.6)
    max_capacity = var.autoscaling_api_max_capacity
  }
}

resource "aws_appautoscaling_scheduled_action" "web_weekend_scale_down" {
  count = var.enable_autoscaling && var.enable_scheduled_scaling ? 1 : 0

  name               = "${local.effective_name_prefix}-web-weekend-scale-down"
  service_namespace  = aws_appautoscaling_target.web[0].service_namespace
  resource_id        = aws_appautoscaling_target.web[0].resource_id
  scalable_dimension = aws_appautoscaling_target.web[0].scalable_dimension

  schedule = "cron(0 0 ? * SAT *)"
  timezone = var.scheduled_scaling_timezone

  scalable_target_action {
    min_capacity = ceil(var.autoscaling_web_min_capacity * 0.6)
    max_capacity = var.autoscaling_web_max_capacity
  }
}

# Monday Morning Scale-Up (Return from weekend)
resource "aws_appautoscaling_scheduled_action" "api_monday_scale_up" {
  count = var.enable_autoscaling && var.enable_scheduled_scaling ? 1 : 0

  name               = "${local.effective_name_prefix}-api-monday-scale-up"
  service_namespace  = aws_appautoscaling_target.api[0].service_namespace
  resource_id        = aws_appautoscaling_target.api[0].resource_id
  scalable_dimension = aws_appautoscaling_target.api[0].scalable_dimension

  schedule = "cron(0 5 ? * MON *)"
  timezone = var.scheduled_scaling_timezone

  scalable_target_action {
    min_capacity = var.autoscaling_api_min_capacity
    max_capacity = var.autoscaling_api_max_capacity
  }
}

resource "aws_appautoscaling_scheduled_action" "web_monday_scale_up" {
  count = var.enable_autoscaling && var.enable_scheduled_scaling ? 1 : 0

  name               = "${local.effective_name_prefix}-web-monday-scale-up"
  service_namespace  = aws_appautoscaling_target.web[0].service_namespace
  resource_id        = aws_appautoscaling_target.web[0].resource_id
  scalable_dimension = aws_appautoscaling_target.web[0].scalable_dimension

  schedule = "cron(0 5 ? * MON *)"
  timezone = var.scheduled_scaling_timezone

  scalable_target_action {
    min_capacity = var.autoscaling_web_min_capacity
    max_capacity = var.autoscaling_web_max_capacity
  }
}

#===============================================================================
# Flash Sale / Promotional Event Scaling
#===============================================================================

resource "aws_appautoscaling_scheduled_action" "api_flash_sale" {
  count = var.enable_autoscaling && var.flash_sale_schedule != null ? 1 : 0

  name               = "${local.effective_name_prefix}-api-flash-sale"
  service_namespace  = aws_appautoscaling_target.api[0].service_namespace
  resource_id        = aws_appautoscaling_target.api[0].resource_id
  scalable_dimension = aws_appautoscaling_target.api[0].scalable_dimension

  schedule = var.flash_sale_schedule
  timezone = var.scheduled_scaling_timezone

  scalable_target_action {
    min_capacity = var.autoscaling_api_max_capacity
    max_capacity = var.autoscaling_api_max_capacity
  }
}

resource "aws_appautoscaling_scheduled_action" "web_flash_sale" {
  count = var.enable_autoscaling && var.flash_sale_schedule != null ? 1 : 0

  name               = "${local.effective_name_prefix}-web-flash-sale"
  service_namespace  = aws_appautoscaling_target.web[0].service_namespace
  resource_id        = aws_appautoscaling_target.web[0].resource_id
  scalable_dimension = aws_appautoscaling_target.web[0].scalable_dimension

  schedule = var.flash_sale_schedule
  timezone = var.scheduled_scaling_timezone

  scalable_target_action {
    min_capacity = var.autoscaling_web_max_capacity
    max_capacity = var.autoscaling_web_max_capacity
  }
}

resource "aws_appautoscaling_scheduled_action" "workers_flash_sale" {
  for_each = var.enable_autoscaling && var.flash_sale_schedule != null ? local.worker_scaling_configs : {}

  name               = "${local.effective_name_prefix}-${each.key}-flash-sale"
  service_namespace  = aws_appautoscaling_target.workers[each.key].service_namespace
  resource_id        = aws_appautoscaling_target.workers[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.workers[each.key].scalable_dimension

  schedule = var.flash_sale_schedule
  timezone = var.scheduled_scaling_timezone

  scalable_target_action {
    min_capacity = each.value.max_capacity
    max_capacity = each.value.max_capacity
  }
}

#===============================================================================
# SNS Topic for Scaling Notifications
#===============================================================================

resource "aws_sns_topic" "scaling_notifications" {
  count = var.enable_scaling_notifications ? 1 : 0

  name = "${local.effective_name_prefix}-ecs-scaling-notifications"

  tags = merge(var.tags, {
    Name = "${local.effective_name_prefix}-scaling-notifications"
  })
}

resource "aws_sns_topic_subscription" "scaling_email" {
  count = var.enable_scaling_notifications && var.scaling_notification_email != "" ? 1 : 0

  topic_arn = aws_sns_topic.scaling_notifications[0].arn
  protocol  = "email"
  endpoint  = var.scaling_notification_email
}

#===============================================================================
# Capacity Alerts - Near Maximum Capacity
#===============================================================================

resource "aws_cloudwatch_metric_alarm" "api_near_max_capacity" {
  count = var.enable_scaling_notifications ? 1 : 0

  alarm_name          = "${local.effective_name_prefix}-api-near-max-capacity"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "RunningTaskCount"
  namespace           = "ECS/ContainerInsights"
  period              = 60
  statistic           = "Maximum"
  threshold           = var.autoscaling_api_max_capacity - 2
  alarm_description   = "API service is approaching maximum capacity"

  dimensions = {
    ClusterName = "${local.effective_name_prefix}-cluster"
    ServiceName = "${local.effective_name_prefix}-api"
  }

  alarm_actions = [aws_sns_topic.scaling_notifications[0].arn]
  ok_actions    = [aws_sns_topic.scaling_notifications[0].arn]

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "web_near_max_capacity" {
  count = var.enable_scaling_notifications ? 1 : 0

  alarm_name          = "${local.effective_name_prefix}-web-near-max-capacity"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "RunningTaskCount"
  namespace           = "ECS/ContainerInsights"
  period              = 60
  statistic           = "Maximum"
  threshold           = var.autoscaling_web_max_capacity - 2
  alarm_description   = "Web service is approaching maximum capacity"

  dimensions = {
    ClusterName = "${local.effective_name_prefix}-cluster"
    ServiceName = "${local.effective_name_prefix}-web"
  }

  alarm_actions = [aws_sns_topic.scaling_notifications[0].arn]
  ok_actions    = [aws_sns_topic.scaling_notifications[0].arn]

  tags = var.tags
}

#===============================================================================
# CloudWatch Dashboard for Auto Scaling Monitoring
#===============================================================================

resource "aws_cloudwatch_dashboard" "ecs_autoscaling" {
  count = var.create_autoscaling_dashboard ? 1 : 0

  dashboard_name = "${local.effective_name_prefix}-ecs-autoscaling"

  dashboard_body = jsonencode({
    widgets = [
      # Row 1: API Service Metrics
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "API Service - Task Count & Utilization"
          view    = "timeSeries"
          stacked = false
          metrics = [
            ["AWS/ECS", "DesiredTaskCount", "ClusterName", "${local.effective_name_prefix}-cluster", "ServiceName", "${local.effective_name_prefix}-api", { label = "Desired" }],
            [".", "RunningTaskCount", ".", ".", ".", ".", { label = "Running" }],
            [".", "CPUUtilization", ".", ".", ".", ".", { yAxis = "right", label = "CPU %" }],
            [".", "MemoryUtilization", ".", ".", ".", ".", { yAxis = "right", label = "Memory %" }]
          ]
          period = 60
          yAxis = {
            left  = { min = 0 }
            right = { min = 0, max = 100 }
          }
          annotations = {
            horizontal = [
              { value = var.autoscaling_api_cpu_target, label = "CPU Target", color = "#ff7f0e", yAxis = "right" },
              { value = var.autoscaling_api_max_capacity, label = "Max Capacity", color = "#d62728", yAxis = "left" }
            ]
          }
        }
      },
      # Row 1: Web Service Metrics
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "Web Service - Task Count & Utilization"
          view    = "timeSeries"
          stacked = false
          metrics = [
            ["AWS/ECS", "DesiredTaskCount", "ClusterName", "${local.effective_name_prefix}-cluster", "ServiceName", "${local.effective_name_prefix}-web", { label = "Desired" }],
            [".", "RunningTaskCount", ".", ".", ".", ".", { label = "Running" }],
            [".", "CPUUtilization", ".", ".", ".", ".", { yAxis = "right", label = "CPU %" }],
            [".", "MemoryUtilization", ".", ".", ".", ".", { yAxis = "right", label = "Memory %" }]
          ]
          period = 60
          yAxis = {
            left  = { min = 0 }
            right = { min = 0, max = 100 }
          }
        }
      },
      # Row 2: Cluster Overview
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 24
        height = 6
        properties = {
          title   = "Cluster Overview - All Services Running Tasks"
          view    = "timeSeries"
          stacked = true
          metrics = [
            ["AWS/ECS", "RunningTaskCount", "ClusterName", "${local.effective_name_prefix}-cluster", "ServiceName", "${local.effective_name_prefix}-api", { label = "API" }],
            [".", ".", ".", ".", ".", "${local.effective_name_prefix}-web", { label = "Web" }],
            [".", ".", ".", ".", ".", "${local.effective_name_prefix}-email-worker", { label = "Email Worker" }],
            [".", ".", ".", ".", ".", "${local.effective_name_prefix}-order-worker", { label = "Order Worker" }],
            [".", ".", ".", ".", ".", "${local.effective_name_prefix}-search-worker", { label = "Search Worker" }],
            [".", ".", ".", ".", ".", "${local.effective_name_prefix}-cart-worker", { label = "Cart Worker" }],
            [".", ".", ".", ".", ".", "${local.effective_name_prefix}-scheduled-worker", { label = "Scheduled Worker" }]
          ]
          period = 60
        }
      },
      # Row 3: Cost Optimization
      {
        type   = "metric"
        x      = 0
        y      = 12
        width  = 12
        height = 6
        properties = {
          title  = "Fargate Spot vs On-Demand Tasks"
          view   = "timeSeries"
          metrics = [
            ["ECS/ContainerInsights", "TaskCount", "ClusterName", "${local.effective_name_prefix}-cluster", "LaunchType", "FARGATE", { label = "On-Demand" }],
            [".", ".", ".", ".", ".", "FARGATE_SPOT", { label = "Spot" }]
          ]
          period = 60
        }
      },
      # Row 3: Scaling Events
      {
        type   = "metric"
        x      = 12
        y      = 12
        width  = 12
        height = 6
        properties = {
          title  = "Worker Services - CPU Utilization"
          view   = "timeSeries"
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ClusterName", "${local.effective_name_prefix}-cluster", "ServiceName", "${local.effective_name_prefix}-email-worker", { label = "Email" }],
            [".", ".", ".", ".", ".", "${local.effective_name_prefix}-order-worker", { label = "Order" }],
            [".", ".", ".", ".", ".", "${local.effective_name_prefix}-search-worker", { label = "Search" }],
            [".", ".", ".", ".", ".", "${local.effective_name_prefix}-cart-worker", { label = "Cart" }],
            [".", ".", ".", ".", ".", "${local.effective_name_prefix}-scheduled-worker", { label = "Scheduled" }]
          ]
          period = 60
          yAxis = {
            left = { min = 0, max = 100 }
          }
          annotations = {
            horizontal = [
              { value = 75, label = "Target (75%)", color = "#ff7f0e" }
            ]
          }
        }
      }
    ]
  })
}

#===============================================================================
# Outputs
#===============================================================================

output "autoscaling_api_target_id" {
  description = "API service auto scaling target ID"
  value       = var.enable_autoscaling ? aws_appautoscaling_target.api[0].id : null
}

output "autoscaling_web_target_id" {
  description = "Web service auto scaling target ID"
  value       = var.enable_autoscaling ? aws_appautoscaling_target.web[0].id : null
}

output "autoscaling_worker_target_ids" {
  description = "Worker services auto scaling target IDs"
  value       = var.enable_autoscaling ? { for k, v in aws_appautoscaling_target.workers : k => v.id } : {}
}

output "scaling_notifications_topic_arn" {
  description = "SNS topic ARN for scaling notifications"
  value       = var.enable_scaling_notifications ? aws_sns_topic.scaling_notifications[0].arn : null
}

output "autoscaling_dashboard_name" {
  description = "CloudWatch dashboard name for auto scaling monitoring"
  value       = var.create_autoscaling_dashboard ? aws_cloudwatch_dashboard.ecs_autoscaling[0].dashboard_name : null
}
