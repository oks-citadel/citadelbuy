# Secrets Management Scripts

This directory contains automated scripts for generating and validating production secrets for CitadelBuy.

## Overview

Production deployments require cryptographically secure secrets for:
- JWT authentication (access and refresh tokens)
- Data encryption (AES-256)
- Database passwords
- Redis cache passwords
- Message queue credentials
- Object storage credentials
- Admin tool passwords
- Internal API keys

**CRITICAL:** Never commit actual secrets to version control. Use these scripts to generate secrets, then store them in a secrets manager (AWS Secrets Manager, Azure Key Vault, HashiCorp Vault, etc.).

---

## Scripts

### generate-secrets.sh (Linux/Mac/WSL)

**Purpose:** Generate all required secrets for production deployment using cryptographically secure methods.

**Requirements:**
- Bash shell
- OpenSSL

**Usage:**

```bash
# Basic usage - generates to .env.secrets
./scripts/generate-secrets.sh

# Generate to specific file
./scripts/generate-secrets.sh --output .env.production

# Generate in JSON format
./scripts/generate-secrets.sh --format json --output secrets.json

# Generate in YAML format (for Kubernetes ConfigMaps/Secrets)
./scripts/generate-secrets.sh --format yaml --output secrets.yaml

# Validate existing secrets instead of generating
./scripts/generate-secrets.sh --validate --output .env

# Show help
./scripts/generate-secrets.sh --help
```

**What it generates:**

| Secret | Length | Format | Purpose |
|--------|--------|--------|---------|
| JWT_SECRET | 64+ chars | Base64 | Sign access tokens |
| JWT_REFRESH_SECRET | 64+ chars | Base64 | Sign refresh tokens |
| ENCRYPTION_KEY | 64 hex chars | Hex | AES-256 encryption |
| KYC_ENCRYPTION_KEY | 64 hex chars | Hex | KYC data encryption |
| POSTGRES_PASSWORD | 48 chars | Base64 | Database access |
| REDIS_PASSWORD | 48 chars | Base64 | Cache access |
| SESSION_SECRET | 64+ chars | Base64 | Session cookies |
| RABBITMQ_PASSWORD | 48 chars | Base64 | Message queue |
| MINIO_ROOT_PASSWORD | 48 chars | Base64 | Object storage |
| MINIO_ACCESS_KEY | 32 chars | Base64 | S3 API access |
| MINIO_SECRET_KEY | 48 chars | Base64 | S3 API secret |
| GRAFANA_ADMIN_PASSWORD | 48 chars | Base64 | Monitoring |
| PGADMIN_DEFAULT_PASSWORD | 48 chars | Base64 | DB admin UI |
| INTERNAL_API_KEY | 40+ chars | Custom | Internal APIs |
| WEBHOOK_SECRET | 64+ chars | Base64 | Webhook verification |
| ELASTICSEARCH_PASSWORD | 48 chars | Base64 | Search service |

**Output formats:**

1. **ENV format** (default): Ready to copy to .env files
2. **JSON format**: Structured data for programmatic use
3. **YAML format**: For Kubernetes secrets/ConfigMaps

**Security features:**

- Uses OpenSSL cryptographic random number generator
- Validates secret lengths and formats
- Ensures JWT secrets are different
- Sets file permissions to 600 (owner read/write only)
- Comprehensive documentation in output

**Example output (ENV format):**

```env
################################################################################
# CitadelBuy Production Secrets
################################################################################
# Generated: 2024-12-04 12:34:56 UTC
#
# SECURITY WARNING:
#   - NEVER commit this file to version control
#   - Store securely in production secrets manager
#   - Rotate secrets regularly (every 90 days recommended)
################################################################################

JWT_SECRET=vK5xZpJq7M2nR9tW3yB8cD4eF6gH0jL1mN5oP7qS9uT2vX4yZ6aC8dE0fG2hJ4kL
JWT_REFRESH_SECRET=mN8pQ0rS2tU4vW6xY8zA0bC2dE4fG6hJ8kL0mN2oP4qR6sT8uV0wX2yZ4aB6cD8e
ENCRYPTION_KEY=7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b
# ... (all other secrets)
```

---

### generate-secrets.ps1 (Windows PowerShell)

**Purpose:** Windows version with identical functionality using .NET cryptographic functions.

**Requirements:**
- PowerShell 5.1 or higher
- Windows 10 or Server 2016+

**Usage:**

```powershell
# Basic usage
.\scripts\generate-secrets.ps1

# Generate to specific file
.\scripts\generate-secrets.ps1 -OutputFile .env.production

# Generate in JSON format
.\scripts\generate-secrets.ps1 -Format json -OutputFile secrets.json

# Validate existing secrets
.\scripts\generate-secrets.ps1 -Validate -OutputFile .env

# Show help
.\scripts\generate-secrets.ps1 -Help
```

**Features:**

- Same secret generation as Bash version
- Uses `System.Security.Cryptography.RandomNumberGenerator`
- Sets Windows ACL permissions (current user only)
- Supports all output formats (env, json, yaml)
- Validates secrets using same criteria

---

### validate-secrets.sh (Linux/Mac/WSL)

**Purpose:** Validate that secrets meet security requirements and are production-ready.

**Requirements:**
- Bash shell
- Standard Unix tools (grep, wc, etc.)

**Usage:**

```bash
# Validate .env file
./scripts/validate-secrets.sh .env

# Validate production environment
./scripts/validate-secrets.sh .env.production

# Validate API environment
./scripts/validate-secrets.sh apps/api/.env
```

**Validation checks:**

**JWT Secrets:**
- Minimum 64 characters
- No placeholder patterns (changeme, your-, example, test)
- High entropy (at least 20 unique characters)
- No repeated character sequences
- JWT_SECRET ≠ JWT_REFRESH_SECRET

**Encryption Keys:**
- Exactly 64 hexadecimal characters
- Valid hex format
- No weak patterns (all zeros, all ones, alternating)
- High entropy

**Passwords:**
- Minimum 32 characters
- No common weak passwords
- No placeholder patterns
- High entropy (at least 15 unique characters)

**Database URLs:**
- Valid PostgreSQL format
- No placeholder passwords
- Embedded passwords meet length requirements

**API Keys:**
- Not test keys (e.g., sk_test_* for Stripe)
- No placeholder values
- Minimum length requirements

**Redis URLs:**
- Valid Redis URL format
- Password included and strong
- TLS configuration checked

**Email Configuration:**
- Valid email format
- No placeholder emails

**Environment Type:**
- NODE_ENV set to 'production' for production deployments

**Exit codes:**

- `0`: All validations passed
- `1`: Validation failures found
- `2`: File not found or invalid arguments

**Example output:**

```
╔════════════════════════════════════════════════════════════════════╗
║  CitadelBuy Secrets Validation                                    ║
╚════════════════════════════════════════════════════════════════════╝

Validating: .env.production

═══ Critical Secrets ═══

✓ JWT_SECRET: Valid (88 chars, high entropy)
✓ JWT_REFRESH_SECRET: Valid (88 chars, high entropy)
✓ JWT secrets are properly differentiated

═══ Encryption Keys ═══

✓ ENCRYPTION_KEY: Valid (64 hex chars, good entropy)
✓ KYC_ENCRYPTION_KEY: Valid (64 hex chars, good entropy)

═══ Database Configuration ═══

✓ DATABASE_URL: Valid format with secure password
✓ POSTGRES_PASSWORD: Valid (48 chars, good entropy)

═══ Validation Summary ═══

Total Checks:    25
Passed:          25
Failed:          0
Warnings:        0

Score:           100%

✓ Excellent! Your secrets are well-configured.
```

---

## Workflows

### Initial Production Setup

```bash
# Step 1: Generate all secrets
./scripts/generate-secrets.sh --output .env.production

# Step 2: Validate generated secrets
./scripts/validate-secrets.sh .env.production

# Step 3: Review the file
cat .env.production

# Step 4: Copy secrets to your secrets manager
# AWS Example:
aws secretsmanager create-secret \
  --name citadelbuy/production/jwt-secret \
  --secret-string "$(grep JWT_SECRET .env.production | cut -d= -f2)"

# Step 5: Delete the local file
rm .env.production

# Step 6: Add to .gitignore (if not already)
echo ".env.production" >> .gitignore
```

### Secret Rotation (Every 90 days)

```bash
# Step 1: Generate new secrets
./scripts/generate-secrets.sh --output .env.production.new

# Step 2: Validate
./scripts/validate-secrets.sh .env.production.new

# Step 3: Update secrets manager
# (Specific commands depend on your secrets manager)

# Step 4: Deploy with dual-secret support for JWT
# (Keep old JWT secret as JWT_SECRET_OLD for grace period)

# Step 5: Wait for old tokens to expire

# Step 6: Remove old secrets

# Step 7: Clean up local files
rm .env.production.new
```

### CI/CD Integration

**GitHub Actions:**

```yaml
name: Validate Secrets
on: [push]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Validate example files
        run: |
          chmod +x scripts/validate-secrets.sh
          ./scripts/validate-secrets.sh .env.example
```

**GitLab CI:**

```yaml
validate-secrets:
  stage: test
  script:
    - chmod +x scripts/validate-secrets.sh
    - ./scripts/validate-secrets.sh .env.example
```

---

## Security Best Practices

### Generation

1. **Always use the provided scripts** - Don't create secrets manually
2. **Generate unique secrets per environment** - Never reuse dev secrets in production
3. **Delete generated files after use** - Copy to secrets manager, then delete
4. **Never commit generated files** - Add all output files to .gitignore
5. **Use secrets managers in production** - Not .env files on servers

### Storage

1. **Development**: Local .env files (in .gitignore)
2. **Staging/Production**: Cloud secrets manager (AWS, Azure, GCP, Vault)
3. **CI/CD**: Environment variables or secrets management
4. **Kubernetes**: Sealed Secrets or External Secrets Operator
5. **Docker**: Docker secrets or secrets manager integration

### Rotation

1. **JWT Secrets**: Every 90 days
2. **Database Passwords**: Every 90 days
3. **API Keys**: Per provider recommendation
4. **Encryption Keys**: Every 180 days (requires data migration)
5. **Document rotation**: Keep rotation schedule and last rotation date

### Validation

1. **Before deployment**: Always validate secrets
2. **After generation**: Validate immediately
3. **Regular audits**: Monthly security audits
4. **CI/CD checks**: Validate example files
5. **Monitor failures**: Set up alerts for validation failures

---

## Troubleshooting

### "openssl: command not found"

**Linux:**
```bash
# Ubuntu/Debian
sudo apt-get install openssl

# RHEL/CentOS
sudo yum install openssl
```

**Mac:**
```bash
# OpenSSL should be pre-installed
# If missing, install via Homebrew
brew install openssl
```

**Windows:**
```powershell
# Use PowerShell version instead (no OpenSSL required)
.\scripts\generate-secrets.ps1
```

### "Permission denied"

```bash
# Make script executable
chmod +x scripts/generate-secrets.sh
chmod +x scripts/validate-secrets.sh
```

### "JWT secret too short"

The secret must be at least 64 characters. Regenerate using:

```bash
openssl rand -base64 64
```

### "Invalid encryption key length"

The encryption key must be exactly 64 hex characters (32 bytes). Regenerate:

```bash
openssl rand -hex 32
```

### "Validation failed"

Review the validation output for specific failures. Common issues:

1. Using placeholder values (changeme, your-secret, etc.)
2. Secrets too short
3. JWT secrets are the same
4. Test API keys in production
5. Weak passwords

Fix each issue and re-validate.

---

## Additional Resources

- **Security Documentation**: `../docs/SECURITY_CREDENTIALS.md`
- **Setup Guide**: `../docs/SECURITY_SETUP.md`
- **Environment Templates**:
  - `../.env.example`
  - `../.env.production.example`
  - `../apps/api/.env.example`
- **OWASP Secrets Management**: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html

---

## Support

**Security Issues**: security@citadelbuy.com

**DO NOT** post secrets or security issues in public repositories or forums.

---

**Last Updated**: 2024-12-04
**Version**: 1.0.0
