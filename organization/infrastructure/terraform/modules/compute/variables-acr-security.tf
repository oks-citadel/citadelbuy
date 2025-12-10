# ACR Security Variables

variable "acr_trusted_ip_ranges" {
  description = "Trusted IP ranges allowed to access ACR (e.g., Azure DevOps agents, office IPs, CI/CD pipelines)"
  type        = list(string)
  default     = []
}
