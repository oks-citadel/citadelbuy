# Variables for Africa Region Infrastructure

variable "primary_vnet_cidr" {
  description = "CIDR block for primary VNet in South Africa"
  type        = string
  default     = "10.20.0.0/16"
}

variable "secondary_vnet_cidr" {
  description = "CIDR block for secondary VNet (West Europe backup)"
  type        = string
  default     = "10.21.0.0/16"
}

variable "aks_node_count" {
  description = "Number of nodes in AKS cluster"
  type        = number
  default     = 3
}

variable "aks_node_vm_size" {
  description = "VM size for AKS nodes"
  type        = string
  default     = "Standard_D4s_v3"  # 4 vCPU, 16 GB RAM
}

variable "min_node_count" {
  description = "Minimum number of nodes for autoscaling"
  type        = number
  default     = 2
}

variable "max_node_count" {
  description = "Maximum number of nodes for autoscaling"
  type        = number
  default     = 10
}

variable "postgresql_sku_name" {
  description = "SKU for PostgreSQL Flexible Server"
  type        = string
  default     = "GP_Standard_D4s_v3"  # General Purpose, 4 vCPU, 16 GB RAM
}

variable "postgresql_storage_mb" {
  description = "Storage size in MB for PostgreSQL"
  type        = number
  default     = 131072  # 128 GB
}

variable "alert_email_addresses" {
  description = "Email addresses for monitoring alerts"
  type        = list(string)
  default     = ["ops-africa@citadelbuy.com"]
}

variable "enable_ddos_protection" {
  description = "Enable DDoS protection for the VNet"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Additional tags for resources"
  type        = map(string)
  default     = {}
}
