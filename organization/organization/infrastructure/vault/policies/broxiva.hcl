# Broxiva Vault Policy
# This policy defines access permissions for the Broxiva application

# Database credentials - read-only
path "secret/data/broxiva/+/database/*" {
  capabilities = ["read", "list"]
}

# Redis credentials - read-only
path "secret/data/broxiva/+/redis/*" {
  capabilities = ["read", "list"]
}

# JWT secrets - read-only
path "secret/data/broxiva/+/jwt/*" {
  capabilities = ["read", "list"]
}

# Stripe credentials - read-only
path "secret/data/broxiva/+/stripe/*" {
  capabilities = ["read", "list"]
}

# AWS credentials - read-only
path "secret/data/broxiva/+/aws/*" {
  capabilities = ["read", "list"]
}

# OpenAI credentials - read-only
path "secret/data/broxiva/+/openai/*" {
  capabilities = ["read", "list"]
}

# OAuth credentials - read-only
path "secret/data/broxiva/+/oauth/*" {
  capabilities = ["read", "list"]
}

# Elasticsearch credentials - read-only
path "secret/data/broxiva/+/elasticsearch/*" {
  capabilities = ["read", "list"]
}

# Session secrets - read-only
path "secret/data/broxiva/+/session/*" {
  capabilities = ["read", "list"]
}

# List all secrets under broxiva path
path "secret/metadata/broxiva/+/*" {
  capabilities = ["list"]
}

# Dynamic database credentials (if using Vault database secrets engine)
path "database/creds/broxiva-*" {
  capabilities = ["read"]
}

# Transit encryption (if using Vault transit engine)
path "transit/encrypt/broxiva-*" {
  capabilities = ["update"]
}

path "transit/decrypt/broxiva-*" {
  capabilities = ["update"]
}

# PKI certificates (if using Vault PKI engine)
path "pki/issue/broxiva-*" {
  capabilities = ["create", "update"]
}
