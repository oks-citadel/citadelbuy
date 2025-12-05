# CitadelBuy HashiCorp Vault Configuration
# This configuration file sets up Vault for the CitadelBuy platform

# Storage backend - PostgreSQL
storage "postgresql" {
  connection_url = "postgres://vault:VAULT_DB_PASSWORD@postgres:5432/vault?sslmode=disable"
  table          = "vault_kv_store"
  max_parallel   = 128
}

# Alternative: Consul storage backend (for HA setup)
# storage "consul" {
#   address = "consul:8500"
#   path    = "vault/"
#   token   = "CONSUL_TOKEN"
# }

# Alternative: Raft integrated storage (for HA setup without external dependencies)
# storage "raft" {
#   path    = "/vault/data"
#   node_id = "vault-node-1"
#
#   retry_join {
#     leader_api_addr = "http://vault-node-2:8200"
#   }
#
#   retry_join {
#     leader_api_addr = "http://vault-node-3:8200"
#   }
# }

# Listener configuration
listener "tcp" {
  address       = "0.0.0.0:8200"
  tls_disable   = 0
  tls_cert_file = "/vault/certs/vault.crt"
  tls_key_file  = "/vault/certs/vault.key"

  # For local development only
  # tls_disable = 1
}

# API address
api_addr = "https://vault.citadelbuy.internal:8200"

# Cluster address (for HA)
cluster_addr = "https://vault.citadelbuy.internal:8201"

# UI
ui = true

# Telemetry
telemetry {
  prometheus_retention_time = "30s"
  disable_hostname          = false

  statsd_address = "statsd:8125"

  unauthenticated_metrics_access = false
}

# Seal configuration - Auto-unseal using AWS KMS (production)
seal "awskms" {
  region     = "us-east-1"
  kms_key_id = "AWS_KMS_KEY_ID"
  endpoint   = "https://kms.us-east-1.amazonaws.com"
}

# Alternative: Azure Key Vault auto-unseal
# seal "azurekeyvault" {
#   tenant_id      = "AZURE_TENANT_ID"
#   client_id      = "AZURE_CLIENT_ID"
#   client_secret  = "AZURE_CLIENT_SECRET"
#   vault_name     = "citadelbuy-vault-unseal"
#   key_name       = "vault-unseal-key"
# }

# Alternative: Shamir seal (default - requires manual unseal)
# seal "shamir" {
#   # No configuration needed
# }

# Maximum lease TTL
max_lease_ttl = "768h"

# Default lease TTL
default_lease_ttl = "168h"

# Disable mlock (set to true in production with proper permissions)
disable_mlock = false

# Log level
log_level = "info"

# Plugin directory
plugin_directory = "/vault/plugins"

# Enable raw endpoint (disable in production)
raw_storage_endpoint = false

# Cluster name
cluster_name = "citadelbuy-vault-cluster"

# Disable cache
disable_cache = false

# Disable clustering (set to false for HA)
disable_clustering = false

# Disable performance standby (set to false for HA)
disable_performance_standby = false

# Log format (json or standard)
log_format = "json"

# Pid file
pid_file = "/vault/vault.pid"
