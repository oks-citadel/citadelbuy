# Variables for Asia-Pacific Region Infrastructure

variable "primary_vnet_cidr" {
  description = "CIDR block for primary VNet in Singapore"
  type        = string
  default     = "10.30.0.0/16"
}

variable "secondary_vnet_cidr" {
  description = "CIDR block for secondary VNet in Sydney"
  type        = string
  default     = "10.31.0.0/16"
}

variable "tertiary_vnet_cidr" {
  description = "CIDR block for tertiary VNet in Tokyo"
  type        = string
  default     = "10.32.0.0/16"
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
  default     = 15
}

variable "postgresql_sku_name" {
  description = "SKU for PostgreSQL Flexible Server"
  type        = string
  default     = "GP_Standard_D4s_v3"  # General Purpose, 4 vCPU, 16 GB RAM
}

variable "postgresql_storage_mb" {
  description = "Storage size in MB for PostgreSQL"
  type        = number
  default     = 262144  # 256 GB
}

variable "alert_email_addresses" {
  description = "Email addresses for monitoring alerts"
  type        = list(string)
  default     = ["ops-apac@citadelbuy.com"]
}

variable "enable_ddos_protection" {
  description = "Enable DDoS protection for the VNet"
  type        = bool
  default     = true
}

variable "enable_japan_region" {
  description = "Enable Japan region for data residency compliance"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Additional tags for resources"
  type        = map(string)
  default     = {}
}
