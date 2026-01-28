# ==============================================================================
# ECS Auto Scaling Variables - Broxiva E-Commerce Platform
# ==============================================================================
# Variables for ECS Auto Scaling configuration migrated from Kubernetes HPA.
# This file defines all auto-scaling related input variables.
# ==============================================================================

# ==============================================================================
# API Service Auto Scaling (broxiva-api)
# K8s HPA: Min=5, Max=20, CPU=70%, Memory=80%
# ==============================================================================

variable "autoscaling_api_min_capacity" {
  description = "Minimum capacity for API service (from K8s HPA: 5)"
  type        = number
  default     = 5
}

variable "autoscaling_api_max_capacity" {
  description = "Maximum capacity for API service (from K8s HPA: 20)"
  type        = number
  default     = 20
}

variable "autoscaling_api_cpu_target" {
  description = "Target CPU utilization for API service (from K8s HPA: 70%)"
  type        = number
  default     = 70
}

variable "autoscaling_api_memory_target" {
  description = "Target memory utilization for API service (from K8s HPA: 80%)"
  type        = number
  default     = 80
}

# ==============================================================================
# Web Service Auto Scaling (broxiva-web)
# K8s HPA: Min=5, Max=15, CPU=70%, Memory=80%
# ==============================================================================

variable "autoscaling_web_min_capacity" {
  description = "Minimum capacity for Web service (from K8s HPA: 5)"
  type        = number
  default     = 5
}

variable "autoscaling_web_max_capacity" {
  description = "Maximum capacity for Web service (from K8s HPA: 15)"
  type        = number
  default     = 15
}

variable "autoscaling_web_cpu_target" {
  description = "Target CPU utilization for Web service (from K8s HPA: 70%)"
  type        = number
  default     = 70
}

variable "autoscaling_web_memory_target" {
  description = "Target memory utilization for Web service (from K8s HPA: 80%)"
  type        = number
  default     = 80
}

# ==============================================================================
# Email Worker Auto Scaling
# K8s HPA: Min=3, Max=10, CPU=75%, Memory=80%
# ==============================================================================

variable "autoscaling_email_worker_min_capacity" {
  description = "Minimum capacity for email worker (from K8s HPA: 3)"
  type        = number
  default     = 3
}

variable "autoscaling_email_worker_max_capacity" {
  description = "Maximum capacity for email worker (from K8s HPA: 10)"
  type        = number
  default     = 10
}

variable "autoscaling_email_worker_cpu_target" {
  description = "Target CPU utilization for email worker (from K8s HPA: 75%)"
  type        = number
  default     = 75
}

variable "autoscaling_email_worker_memory_target" {
  description = "Target memory utilization for email worker (from K8s HPA: 80%)"
  type        = number
  default     = 80
}

# ==============================================================================
# Order Worker Auto Scaling
# K8s HPA: Min=5, Max=15, CPU=70%, Memory=80%
# ==============================================================================

variable "autoscaling_order_worker_min_capacity" {
  description = "Minimum capacity for order worker (from K8s HPA: 5)"
  type        = number
  default     = 5
}

variable "autoscaling_order_worker_max_capacity" {
  description = "Maximum capacity for order worker (from K8s HPA: 15)"
  type        = number
  default     = 15
}

variable "autoscaling_order_worker_cpu_target" {
  description = "Target CPU utilization for order worker (from K8s HPA: 70%)"
  type        = number
  default     = 70
}

variable "autoscaling_order_worker_memory_target" {
  description = "Target memory utilization for order worker (from K8s HPA: 80%)"
  type        = number
  default     = 80
}

# ==============================================================================
# Search Worker Auto Scaling
# K8s HPA: Min=3, Max=10, CPU=75%, Memory=80%
# ==============================================================================

variable "autoscaling_search_worker_min_capacity" {
  description = "Minimum capacity for search worker (from K8s HPA: 3)"
  type        = number
  default     = 3
}

variable "autoscaling_search_worker_max_capacity" {
  description = "Maximum capacity for search worker (from K8s HPA: 10)"
  type        = number
  default     = 10
}

variable "autoscaling_search_worker_cpu_target" {
  description = "Target CPU utilization for search worker (from K8s HPA: 75%)"
  type        = number
  default     = 75
}

variable "autoscaling_search_worker_memory_target" {
  description = "Target memory utilization for search worker (from K8s HPA: 80%)"
  type        = number
  default     = 80
}

# ==============================================================================
# Cart Worker Auto Scaling
# K8s HPA: Min=2, Max=6, CPU=75%, Memory=80%
# ==============================================================================

variable "autoscaling_cart_worker_min_capacity" {
  description = "Minimum capacity for cart worker (from K8s HPA: 2)"
  type        = number
  default     = 2
}

variable "autoscaling_cart_worker_max_capacity" {
  description = "Maximum capacity for cart worker (from K8s HPA: 6)"
  type        = number
  default     = 6
}

variable "autoscaling_cart_worker_cpu_target" {
  description = "Target CPU utilization for cart worker (from K8s HPA: 75%)"
  type        = number
  default     = 75
}

variable "autoscaling_cart_worker_memory_target" {
  description = "Target memory utilization for cart worker (from K8s HPA: 80%)"
  type        = number
  default     = 80
}

# ==============================================================================
# Scheduled Worker Auto Scaling
# K8s HPA: Min=2, Max=5, CPU=75%, Memory=80%
# ==============================================================================

variable "autoscaling_scheduled_worker_min_capacity" {
  description = "Minimum capacity for scheduled worker (from K8s HPA: 2)"
  type        = number
  default     = 2
}

variable "autoscaling_scheduled_worker_max_capacity" {
  description = "Maximum capacity for scheduled worker (from K8s HPA: 5)"
  type        = number
  default     = 5
}

variable "autoscaling_scheduled_worker_cpu_target" {
  description = "Target CPU utilization for scheduled worker (from K8s HPA: 75%)"
  type        = number
  default     = 75
}

variable "autoscaling_scheduled_worker_memory_target" {
  description = "Target memory utilization for scheduled worker (from K8s HPA: 80%)"
  type        = number
  default     = 80
}

# ==============================================================================
# Enhanced Scaling Features
# ==============================================================================

variable "enable_worker_services" {
  description = "Enable all worker services (email, order, search, cart, scheduled)"
  type        = bool
  default     = true
}

variable "enable_memory_based_scaling" {
  description = "Enable memory-based auto scaling policies (target tracking)"
  type        = bool
  default     = true
}

variable "enable_scheduled_scaling" {
  description = "Enable scheduled scaling for known traffic patterns (weekday/weekend)"
  type        = bool
  default     = true
}

variable "scheduled_scaling_timezone" {
  description = "Timezone for scheduled scaling actions (e.g., UTC, America/New_York)"
  type        = string
  default     = "UTC"
}

variable "flash_sale_schedule" {
  description = "Cron expression for flash sale/promotional event scaling (null to disable). Example: cron(0 10 15 12 ? 2024)"
  type        = string
  default     = null
}

variable "enable_scaling_notifications" {
  description = "Enable SNS notifications for scaling events and capacity alerts"
  type        = bool
  default     = true
}

variable "scaling_notification_email" {
  description = "Email address for scaling notifications (leave empty to skip email subscription)"
  type        = string
  default     = ""
}

variable "create_autoscaling_dashboard" {
  description = "Create CloudWatch dashboard for auto scaling monitoring"
  type        = bool
  default     = true
}

# ==============================================================================
# Worker Service Extended Configuration (Cost Optimization)
# ==============================================================================

variable "worker_images" {
  description = "Map of worker service names to Docker image URLs"
  type        = map(string)
  default     = {}
}

variable "worker_on_demand_weight" {
  description = "Weight for Fargate On-Demand capacity provider for workers (0-100). Higher = more On-Demand."
  type        = number
  default     = 20

  validation {
    condition     = var.worker_on_demand_weight >= 0 && var.worker_on_demand_weight <= 100
    error_message = "Worker On-Demand weight must be between 0 and 100."
  }
}

variable "worker_spot_weight" {
  description = "Weight for Fargate Spot capacity provider for workers (0-100). Higher = more Spot (cost savings)."
  type        = number
  default     = 80

  validation {
    condition     = var.worker_spot_weight >= 0 && var.worker_spot_weight <= 100
    error_message = "Worker Spot weight must be between 0 and 100."
  }
}
