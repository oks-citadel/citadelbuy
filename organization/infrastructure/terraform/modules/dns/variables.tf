# Broxiva DNS Module Variables
# Configuration for Azure DNS Zone

variable "domain_name" {
  description = "The domain name for the DNS zone (e.g., broxiva.com)"
  type        = string
  default     = "broxiva.com"
}

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default = {
    Project     = "Broxiva"
    ManagedBy   = "Terraform"
    Environment = "Production"
  }
}

# ============================================
# Frontend / CDN Configuration
# ============================================

variable "front_door_ip" {
  description = "Azure Front Door or Load Balancer IP address for A records"
  type        = string
  default     = ""
}

variable "front_door_hostname" {
  description = "Azure Front Door hostname for CNAME records (e.g., broxiva.azurefd.net)"
  type        = string
  default     = ""
}

variable "use_cname_for_www" {
  description = "Use CNAME record for www subdomain instead of A record"
  type        = bool
  default     = true
}

# ============================================
# API Configuration
# ============================================

variable "api_hostname" {
  description = "Hostname for API subdomain (e.g., broxiva-api.azurewebsites.net)"
  type        = string
  default     = ""
}

# ============================================
# CDN Configuration
# ============================================

variable "cdn_hostname" {
  description = "Hostname for CDN subdomain"
  type        = string
  default     = ""
}

# ============================================
# Staging Configuration
# ============================================

variable "staging_hostname" {
  description = "Hostname for staging environment"
  type        = string
  default     = ""
}

variable "staging_api_hostname" {
  description = "Hostname for staging API"
  type        = string
  default     = ""
}

# ============================================
# Health Check Configuration
# ============================================

variable "health_check_hostname" {
  description = "Hostname for health check endpoint"
  type        = string
  default     = ""
}

# ============================================
# Domain Verification
# ============================================

variable "azure_verification_code" {
  description = "Azure domain verification TXT record value"
  type        = string
  default     = ""
}

# ============================================
# Email Configuration
# ============================================

variable "enable_email_records" {
  description = "Enable MX, SPF, DKIM, DMARC records"
  type        = bool
  default     = true
}

variable "mx_records" {
  description = "MX records for email routing"
  type = list(object({
    preference = number
    exchange   = string
  }))
  default = [
    {
      preference = 1
      exchange   = "aspmx.l.google.com."
    },
    {
      preference = 5
      exchange   = "alt1.aspmx.l.google.com."
    },
    {
      preference = 5
      exchange   = "alt2.aspmx.l.google.com."
    },
    {
      preference = 10
      exchange   = "alt3.aspmx.l.google.com."
    },
    {
      preference = 10
      exchange   = "alt4.aspmx.l.google.com."
    }
  ]
}

variable "spf_record" {
  description = "SPF record value (leave empty for default)"
  type        = string
  default     = ""
}

variable "dkim_record" {
  description = "DKIM record value"
  type        = string
  default     = ""
}

variable "dmarc_record" {
  description = "DMARC record value (leave empty for default)"
  type        = string
  default     = ""
}

# ============================================
# CAA Records
# ============================================

variable "enable_caa_records" {
  description = "Enable Certificate Authority Authorization records"
  type        = bool
  default     = true
}

# ============================================
# Custom Records
# ============================================

variable "custom_cname_records" {
  description = "Additional custom CNAME records"
  type = map(object({
    record = string
    ttl    = number
  }))
  default = {}
}

variable "custom_a_records" {
  description = "Additional custom A records"
  type = map(object({
    records = list(string)
    ttl     = number
  }))
  default = {}
}
