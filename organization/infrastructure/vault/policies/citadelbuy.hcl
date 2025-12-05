# CitadelBuy Vault Policy
# This policy defines access permissions for the CitadelBuy application

# Database credentials - read-only
path "secret/data/citadelbuy/+/database/*" {
  capabilities = ["read", "list"]
}

# Redis credentials - read-only
path "secret/data/citadelbuy/+/redis/*" {
  capabilities = ["read", "list"]
}

# JWT secrets - read-only
path "secret/data/citadelbuy/+/jwt/*" {
  capabilities = ["read", "list"]
}

# Stripe credentials - read-only
path "secret/data/citadelbuy/+/stripe/*" {
  capabilities = ["read", "list"]
}

# AWS credentials - read-only
path "secret/data/citadelbuy/+/aws/*" {
  capabilities = ["read", "list"]
}

# OpenAI credentials - read-only
path "secret/data/citadelbuy/+/openai/*" {
  capabilities = ["read", "list"]
}

# OAuth credentials - read-only
path "secret/data/citadelbuy/+/oauth/*" {
  capabilities = ["read", "list"]
}

# Elasticsearch credentials - read-only
path "secret/data/citadelbuy/+/elasticsearch/*" {
  capabilities = ["read", "list"]
}

# Session secrets - read-only
path "secret/data/citadelbuy/+/session/*" {
  capabilities = ["read", "list"]
}

# List all secrets under citadelbuy path
path "secret/metadata/citadelbuy/+/*" {
  capabilities = ["list"]
}

# Dynamic database credentials (if using Vault database secrets engine)
path "database/creds/citadelbuy-*" {
  capabilities = ["read"]
}

# Transit encryption (if using Vault transit engine)
path "transit/encrypt/citadelbuy-*" {
  capabilities = ["update"]
}

path "transit/decrypt/citadelbuy-*" {
  capabilities = ["update"]
}

# PKI certificates (if using Vault PKI engine)
path "pki/issue/citadelbuy-*" {
  capabilities = ["create", "update"]
}
