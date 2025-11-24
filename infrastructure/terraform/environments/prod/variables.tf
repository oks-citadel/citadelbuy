variable "location" {
  description = "Azure region"
  type        = string
  default     = "East US"
}

variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.28"
}

variable "db_admin_password" {
  description = "Database administrator password"
  type        = string
  sensitive   = true
}
