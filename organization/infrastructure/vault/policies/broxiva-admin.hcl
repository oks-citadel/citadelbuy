# Broxiva Vault Admin Policy
# This policy defines full access permissions for administrators

# Full access to all broxiva secrets
path "secret/data/broxiva/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "secret/metadata/broxiva/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "secret/delete/broxiva/*" {
  capabilities = ["update"]
}

path "secret/undelete/broxiva/*" {
  capabilities = ["update"]
}

path "secret/destroy/broxiva/*" {
  capabilities = ["update"]
}

# Manage database secrets engine
path "database/config/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "database/roles/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "database/creds/*" {
  capabilities = ["read"]
}

# Manage transit encryption
path "transit/keys/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "transit/encrypt/*" {
  capabilities = ["update"]
}

path "transit/decrypt/*" {
  capabilities = ["update"]
}

# Manage PKI
path "pki/root/generate/*" {
  capabilities = ["create", "update"]
}

path "pki/roles/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "pki/issue/*" {
  capabilities = ["create", "update"]
}

# Manage policies
path "sys/policies/acl/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Manage auth methods
path "sys/auth" {
  capabilities = ["read", "list"]
}

path "sys/auth/*" {
  capabilities = ["create", "read", "update", "delete", "sudo"]
}

# Manage audit devices
path "sys/audit" {
  capabilities = ["read", "list"]
}

path "sys/audit/*" {
  capabilities = ["create", "read", "update", "delete", "sudo"]
}

# Health and metrics
path "sys/health" {
  capabilities = ["read"]
}

path "sys/metrics" {
  capabilities = ["read"]
}

# Seal status
path "sys/seal-status" {
  capabilities = ["read"]
}

# List mounted secrets engines
path "sys/mounts" {
  capabilities = ["read", "list"]
}

path "sys/mounts/*" {
  capabilities = ["create", "read", "update", "delete", "sudo"]
}
