# Root Environment Configuration
# This file serves as a template/example for environment-specific configurations
# Actual environments are in prod/ and staging/ subdirectories

# This file intentionally left minimal as environments are managed separately
# See:
# - environments/prod/main.tf for production configuration
# - environments/staging/main.tf for staging configuration

terraform {
  required_version = ">= 1.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

# Provider configuration should be specified in environment-specific directories
