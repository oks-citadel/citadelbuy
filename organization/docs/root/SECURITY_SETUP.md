# CitadelBuy Security Setup Guide

## Table of Contents
1. [Critical Security Overview](#critical-security-overview)
2. [Environment Variables Setup](#environment-variables-setup)
3. [Generating Secure Secrets](#generating-secure-secrets)
4. [Docker Compose Security](#docker-compose-security)
5. [Kubernetes Secrets Management](#kubernetes-secrets-management)
6. [Production Deployment Checklist](#production-deployment-checklist)
7. [Secret Rotation](#secret-rotation)

---

## Critical Security Overview

### 🚨 NEVER COMMIT THESE FILES TO VERSION CONTROL
```
.env
.env.local
.env.production
.env.*.local
apps/api/.env
infrastructure/docker/.env
credentials.json
*.pem
*.key
```

### ✅ Files Safe to Commit (Templates Only)
```
.env.example
.env.docker.example
apps/api/.env.example
kubernetes/**/secrets.yaml (with ${VAR} placeholders)
```

---

## Environment Variables Setup

### 1. Backend API Setup

```bash
# Navigate to API directory
cd organization/apps/api

# Copy example file
cp .env.example .env

# Edit with your secure credentials
nano .env  # or use your preferred editor
```

**Required Variables to Change:**
- `JWT_SECRET` - Must be at least 64 characters
- `JWT_REFRESH_SECRET` - Different from JWT_SECRET
- `DATABASE_URL` - Contains database password
- `ENCRYPTION_KEY` - Exactly 32 bytes (64 hex characters)
- All payment provider secrets (Stripe, PayPal, etc.)
- Storage credentials (AWS, Azure)
- API keys (OpenAI, Algolia, etc.)

### 2. Docker Compose Setup

```bash
# Navigate to organization directory
cd organization

# Copy docker environment template
cp .env.docker.example .env

# Edit with your credentials
nano .env
```

**Minimum Required for Docker:**
- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`

---

## Generating Secure Secrets

### JWT Secrets (Recommended: 64+ characters)

```bash
# Generate JWT secret
openssl rand -base64 64

# Example output:
# vK5xZpJq7M2nR9tW3yB8cD4eF6gH0jL1mN5oP7qS9uT2vX4yZ6aC8dE0fG2hJ4kL6mN8pQ0rS2tU4vW6xY8zA0bC2dE4fG6hJ8kL0m
```

Use the output directly in your .env file:
```
JWT_SECRET=vK5xZpJq7M2nR9tW3yB8cD4eF6gH0jL1mN5oP7qS9uT2vX4yZ6aC8dE0fG2hJ4kL6mN8pQ0rS2tU4vW6xY8zA0bC2dE4fG6hJ8kL0m
```

### Encryption Keys (Must be exactly 32 bytes = 64 hex characters)

```bash
# Generate 32-byte encryption key
openssl rand -hex 32

# Example output:
# 7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b
```

Use in .env:
```
ENCRYPTION_KEY=7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b
```

### Database Passwords

```bash
# Generate strong database password
openssl rand -base64 32

# Example output:
# kL7mN9pQ2rS4tU6vW8xY0zA2bC4dE6fG8hJ0kL2mN4oP6qR8sT0u
```

### Quick Script to Generate All Secrets

Create a file `generate-secrets.sh`:

```bash
#!/bin/bash

echo "==================================="
echo "CitadelBuy Secret Generator"
echo "==================================="
echo ""
echo "JWT_SECRET=$(openssl rand -base64 64)"
echo ""
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 64)"
echo ""
echo "ENCRYPTION_KEY=$(openssl rand -hex 32)"
echo ""
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32)"
echo ""
echo "REDIS_PASSWORD=$(openssl rand -base64 32)"
echo ""
echo "==================================="
echo "Copy these values to your .env file"
echo "==================================="
```

Make executable and run:
```bash
chmod +x generate-secrets.sh
./generate-secrets.sh
```

---

## Docker Compose Security

### Environment Variable Loading

Docker Compose automatically loads `.env` files from:
1. Same directory as docker-compose.yml
2. Parent directories (inheritance)

### Security Best Practices

#### ✅ DO:
```yaml
environment:
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
  JWT_SECRET: ${JWT_SECRET}
```

#### ❌ DON'T:
```yaml
environment:
  POSTGRES_PASSWORD: mypassword123
  JWT_SECRET: hardcoded-secret
```

### Default Values for Development

```yaml
environment:
  # Provides default for local dev, requires env var for production
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-changeme}
```

**Important:** The default value `changeme` should trigger failures in production if not set.

---

## Kubernetes Secrets Management

### Option 1: Environment Variable Substitution (Development)

```bash
# Set environment variables
export POSTGRES_PASSWORD=$(openssl rand -base64 32)
export JWT_SECRET=$(openssl rand -base64 64)

# Apply with substitution
envsubst < kubernetes/organization/secrets.yaml | kubectl apply -f -
```

### Option 2: Sealed Secrets (Recommended for Production)

Install Sealed Secrets:
```bash
# Install controller
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/controller.yaml

# Install kubeseal CLI
brew install kubeseal  # macOS
# OR
wget https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/kubeseal-linux-amd64
```

Create sealed secret:
```bash
# Create secret file
kubectl create secret generic citadelbuy-secrets \
  --from-literal=jwt-secret=$(openssl rand -base64 64) \
  --from-literal=database-password=$(openssl rand -base64 32) \
  --dry-run=client -o yaml > secret.yaml

# Seal it
kubeseal -f secret.yaml -w sealed-secret.yaml

# Commit sealed-secret.yaml (it's encrypted!)
git add sealed-secret.yaml
git commit -m "Add sealed secrets"
```

### Option 3: External Secrets Operator (Production)

Integrate with cloud secret managers:
- AWS Secrets Manager
- Azure Key Vault
- Google Secret Manager
- HashiCorp Vault

Example with AWS Secrets Manager:
```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets-manager
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: citadelbuy-secrets
spec:
  secretStoreRef:
    name: aws-secrets-manager
  target:
    name: citadelbuy-secrets
  data:
  - secretKey: jwt-secret
    remoteRef:
      key: citadelbuy/jwt-secret
  - secretKey: database-password
    remoteRef:
      key: citadelbuy/database-password
```

---

## Production Deployment Checklist

### Pre-Deployment Security Audit

- [ ] **All .env files are in .gitignore**
  ```bash
  git check-ignore -v .env
  # Should show: .gitignore:X:.env    .env
  ```

- [ ] **No secrets in git history**
  ```bash
  # Scan for common secret patterns
  git log -p | grep -i "jwt_secret\|password\|api_key"
  ```

- [ ] **Environment variables are set**
  ```bash
  # Verify critical variables
  echo $JWT_SECRET | wc -c  # Should be > 64
  echo $ENCRYPTION_KEY | wc -c  # Should be exactly 64 hex chars
  ```

- [ ] **Secrets are randomly generated**
  - NOT using example values
  - NOT using predictable patterns
  - NOT reusing secrets across environments

- [ ] **Database passwords are strong**
  - Minimum 32 characters
  - Contains letters, numbers, special characters
  - Different for each environment

- [ ] **API keys are production keys**
  - Stripe: `sk_live_*` not `sk_test_*`
  - PayPal: Production mode, not sandbox
  - Other services: Production credentials

- [ ] **CORS origins are restricted**
  ```env
  # ❌ Development (too permissive)
  CORS_ORIGINS=*

  # ✅ Production (specific domains)
  CORS_ORIGINS=https://citadelbuy.com,https://admin.citadelbuy.com
  ```

- [ ] **TLS/SSL certificates are valid**
  - Not self-signed in production
  - Valid chain of trust
  - Auto-renewal configured

- [ ] **Secrets rotation schedule established**
  - JWT secrets: Every 90 days
  - Database passwords: Every 90 days
  - API keys: Per provider recommendations

---

## Secret Rotation

### JWT Secret Rotation Strategy

To rotate JWT secrets without downtime:

1. **Add new secret to environment**
   ```env
   JWT_SECRET=new-secret-here
   JWT_SECRET_OLD=old-secret-here
   ```

2. **Update application to accept both**
   ```typescript
   // Verify with new secret, fallback to old
   try {
     jwt.verify(token, process.env.JWT_SECRET);
   } catch {
     jwt.verify(token, process.env.JWT_SECRET_OLD);
   }
   ```

3. **Wait for all old tokens to expire**
   - If JWT_EXPIRES_IN=7d, wait 7 days

4. **Remove old secret**
   ```env
   JWT_SECRET=new-secret-here
   # JWT_SECRET_OLD removed
   ```

### Database Password Rotation

```bash
# 1. Create new user with new password
psql -c "CREATE USER citadelbuy_new WITH PASSWORD 'new-password';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE citadelbuy TO citadelbuy_new;"

# 2. Update application to use new credentials
kubectl set env deployment/api DATABASE_URL=postgresql://citadelbuy_new:new-password@...

# 3. Wait for deployment to stabilize

# 4. Remove old user
psql -c "DROP USER citadelbuy;"

# 5. Rename new user to standard name
psql -c "ALTER USER citadelbuy_new RENAME TO citadelbuy;"
```

### Automated Rotation with AWS Secrets Manager

```bash
# Enable automatic rotation
aws secretsmanager rotate-secret \
  --secret-id citadelbuy/database-password \
  --rotation-lambda-arn arn:aws:lambda:region:account:function:rotation-function \
  --rotation-rules AutomaticallyAfterDays=90
```

---

## Emergency Secret Revocation

If secrets are compromised:

### 1. Immediate Actions
```bash
# Revoke all active sessions
redis-cli FLUSHDB

# Rotate JWT secrets immediately
export JWT_SECRET=$(openssl rand -base64 64)
kubectl set env deployment/api JWT_SECRET=$JWT_SECRET

# Force password resets
psql -c "UPDATE users SET force_password_reset = true;"
```

### 2. Change All Credentials
- Generate new secrets
- Update all deployments
- Rotate database passwords
- Regenerate API keys with providers

### 3. Audit Access
```bash
# Check for unauthorized access
kubectl logs deployment/api | grep -i "unauthorized\|failed"

# Review database connections
psql -c "SELECT * FROM pg_stat_activity;"
```

### 4. Post-Incident
- Document what was exposed
- Notify affected users if required
- Update security procedures
- Consider additional monitoring

---

## Additional Resources

- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [12 Factor App - Config](https://12factor.net/config)
- [NIST Password Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)

---

## Support

For security concerns, contact: security@citadelbuy.com

**DO NOT** post security issues in public repositories or forums.
