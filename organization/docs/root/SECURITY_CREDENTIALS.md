# Security Credentials Guide for CitadelBuy

**Last Updated:** December 3, 2025
**Status:** Production-Ready
**Audience:** DevOps Engineers, System Administrators, Security Teams

---

## Table of Contents

1. [Critical Security Overview](#critical-security-overview)
2. [Generating Secure Secrets](#generating-secure-secrets)
3. [Secret Types and Requirements](#secret-types-and-requirements)
4. [Secrets Management Best Practices](#secrets-management-best-practices)
5. [Recommended Secrets Managers](#recommended-secrets-managers)
6. [Secret Rotation Procedures](#secret-rotation-procedures)
7. [Emergency Response](#emergency-response)
8. [Compliance and Audit](#compliance-and-audit)

---

## Critical Security Overview

### Never Commit These to Version Control

```
.env
.env.local
.env.production
.env.*.local
apps/api/.env
apps/web/.env.local
credentials.json
*.pem
*.key
*.cert
```

### Safe to Commit (Templates Only)

```
.env.example
.env.docker.example
apps/api/.env.example
apps/web/.env.example
```

### The Golden Rules

1. **NEVER** use example values in production
2. **NEVER** reuse secrets across environments
3. **ALWAYS** use cryptographically random secrets
4. **ALWAYS** store production secrets in a secrets manager
5. **ROTATE** secrets regularly (every 90 days minimum)

---

## Generating Secure Secrets

### Quick Reference

| Secret Type | Command | Length | Usage |
|------------|---------|--------|-------|
| JWT Secret | `openssl rand -base64 64` | 88 chars | Authentication tokens |
| Encryption Key | `openssl rand -hex 32` | 64 hex chars | AES-256 encryption |
| Database Password | `openssl rand -base64 32` | 44 chars | Database access |
| API Key | `openssl rand -base64 48` | 64 chars | General API keys |
| Webhook Secret | `openssl rand -base64 32` | 44 chars | Webhook verification |

### Detailed Instructions

#### 1. JWT Secrets (Authentication Tokens)

**Purpose:** Sign and verify JSON Web Tokens for user authentication

**Requirements:**
- Minimum 64 characters (recommended: 88+ from base64)
- Cryptographically random
- Different for access and refresh tokens
- Different across all environments

**Generate:**
```bash
# Generate JWT secret
openssl rand -base64 64

# Example output (DO NOT USE THIS):
vK5xZpJq7M2nR9tW3yB8cD4eF6gH0jL1mN5oP7qS9uT2vX4yZ6aC8dE0fG2hJ4kL6mN8pQ0rS2tU4vW6xY8zA0bC2dE4fG6hJ8kL0m
```

**Use in .env:**
```env
JWT_SECRET=<paste_generated_value_here>
JWT_REFRESH_SECRET=<paste_different_generated_value_here>
```

**What happens if compromised:**
- Attackers can forge authentication tokens
- Attackers can impersonate any user
- Complete authentication bypass
- Immediate rotation required

---

#### 2. Encryption Keys (Sensitive Data)

**Purpose:** Encrypt personally identifiable information (PII), KYC documents, financial data

**Requirements:**
- MUST be exactly 64 hexadecimal characters (32 bytes)
- Required for AES-256-GCM encryption
- Changing this key makes existing encrypted data unrecoverable
- NEVER rotate without data migration plan

**Generate:**
```bash
# Generate encryption key (exactly 32 bytes = 64 hex chars)
openssl rand -hex 32

# Example output (DO NOT USE THIS):
7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b
```

**Verify length:**
```bash
# Should output exactly 64
echo -n "7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b" | wc -c
```

**Use in .env:**
```env
KYC_ENCRYPTION_KEY=<paste_generated_64_hex_chars_here>
```

**What this encrypts:**
- KYC documents (passport, ID cards, proof of address)
- Social security numbers and tax IDs
- Bank account information
- Credit card details (if stored)
- Personal health information
- Any PII subject to GDPR/CCPA

**What happens if compromised:**
- All encrypted data can be decrypted
- Massive privacy breach
- Regulatory fines (GDPR: up to 20M EUR or 4% of revenue)
- Class action lawsuits
- Immediate incident response required

---

#### 3. Database Passwords

**Purpose:** Authenticate to PostgreSQL, MongoDB, Redis databases

**Requirements:**
- Minimum 32 characters (recommended: 44+ from base64)
- Include letters, numbers, special characters
- Different for each database
- Different for each environment

**Generate:**
```bash
# Generate strong database password
openssl rand -base64 32

# Example output (DO NOT USE THIS):
kL7mN9pQ2rS4tU6vW8xY0zA2bC4dE6fG8hJ0kL2mN4oP6qR8sT0u
```

**Use in DATABASE_URL:**
```env
# PostgreSQL
DATABASE_URL="postgresql://citadelbuy:<password>@localhost:5432/citadelbuy_dev?schema=public"

# Redis with password
REDIS_URL="redis://:<password>@redis.example.com:6379"
```

**Best practices:**
- Use different passwords for dev, staging, production
- Use different passwords for different databases
- Rotate every 90 days
- Use database-specific users with minimal permissions

---

#### 4. API Keys and Webhook Secrets

**Purpose:** Authenticate API requests and verify webhook signatures

**Generate:**
```bash
# General API key
openssl rand -base64 48

# Webhook secret
openssl rand -base64 32
```

**Use cases:**
- Internal API authentication
- Webhook signature verification (Stripe, PayPal, etc.)
- Service-to-service authentication
- API rate limiting bypass tokens

---

### Complete Secret Generation Script

Create a file `generate-secrets.sh`:

```bash
#!/bin/bash

echo "=========================================="
echo "CitadelBuy Secret Generator"
echo "=========================================="
echo ""
echo "CRITICAL: Copy these to your .env file"
echo "NEVER commit actual secrets to git!"
echo ""
echo "=========================================="
echo ""

echo "# JWT Secrets"
echo "JWT_SECRET=$(openssl rand -base64 64)"
echo ""
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 64)"
echo ""

echo "# Encryption Key (must be exactly 64 hex chars)"
echo "KYC_ENCRYPTION_KEY=$(openssl rand -hex 32)"
echo ""

echo "# Database Passwords"
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32)"
echo ""
echo "REDIS_PASSWORD=$(openssl rand -base64 32)"
echo ""
echo "MONGO_PASSWORD=$(openssl rand -base64 32)"
echo ""

echo "# Admin Tool Passwords"
echo "PGADMIN_DEFAULT_PASSWORD=$(openssl rand -base64 32)"
echo ""
echo "GRAFANA_ADMIN_PASSWORD=$(openssl rand -base64 32)"
echo ""

echo "# Service Passwords"
echo "RABBITMQ_PASSWORD=$(openssl rand -base64 32)"
echo ""
echo "MINIO_ROOT_PASSWORD=$(openssl rand -base64 32)"
echo ""

echo "# API Keys"
echo "INTERNAL_API_KEY=$(openssl rand -base64 48)"
echo ""

echo "=========================================="
echo "Verification:"
echo "=========================================="

# Verify encryption key length
ENCRYPTION_KEY=$(openssl rand -hex 32)
KEY_LENGTH=$(echo -n "$ENCRYPTION_KEY" | wc -c)
echo "Encryption key length: $KEY_LENGTH (must be 64)"

if [ "$KEY_LENGTH" -eq 64 ]; then
    echo "✓ Encryption key length is correct"
else
    echo "✗ ERROR: Encryption key length is $KEY_LENGTH, must be 64"
fi

echo ""
echo "=========================================="
echo "Next Steps:"
echo "=========================================="
echo "1. Copy the values above to your .env file"
echo "2. Verify .env is in .gitignore"
echo "3. Store production secrets in secrets manager"
echo "4. Test your application with new secrets"
echo "5. Document secret rotation date"
echo "=========================================="
```

Make it executable:
```bash
chmod +x generate-secrets.sh
./generate-secrets.sh > secrets.txt
```

**SECURITY WARNING:** Delete `secrets.txt` after copying to .env!

---

## Secret Types and Requirements

### Critical Secrets (Highest Priority)

| Secret | Length | Format | Rotation Frequency |
|--------|--------|--------|-------------------|
| JWT_SECRET | 88+ chars | Base64 | 90 days |
| JWT_REFRESH_SECRET | 88+ chars | Base64 | 90 days |
| KYC_ENCRYPTION_KEY | 64 hex chars | Hexadecimal | 180 days* |
| DATABASE_URL password | 44+ chars | Base64 | 90 days |

*Requires data migration

### High-Priority Secrets

| Secret | Purpose | Where to Get |
|--------|---------|--------------|
| STRIPE_SECRET_KEY | Payment processing | https://dashboard.stripe.com/apikeys |
| PAYPAL_CLIENT_SECRET | Payment processing | https://developer.paypal.com/dashboard |
| AWS_SECRET_ACCESS_KEY | File storage | https://console.aws.amazon.com/iam/ |
| SENDGRID_API_KEY | Email delivery | https://app.sendgrid.com/settings/api_keys |

### Medium-Priority Secrets

| Secret | Purpose | Where to Get |
|--------|---------|--------------|
| GOOGLE_CLIENT_SECRET | OAuth authentication | https://console.cloud.google.com/apis/credentials |
| FACEBOOK_APP_SECRET | OAuth authentication | https://developers.facebook.com/apps/ |
| GITHUB_CLIENT_SECRET | OAuth authentication | https://github.com/settings/developers |
| OPENAI_API_KEY | AI features | https://platform.openai.com/api-keys |

---

## Secrets Management Best Practices

### 1. Local Development

**DO:**
- Use `.env` file (in .gitignore)
- Use weak/dummy values for third-party services
- Use local database passwords
- Copy from `.env.example` template

**DON'T:**
- Commit .env file
- Share .env files via Slack/email
- Use production secrets locally
- Hardcode secrets in code

### 2. Staging/QA Environment

**DO:**
- Use separate secrets from production
- Use secrets manager (AWS Secrets Manager, etc.)
- Use test API keys from providers (sk_test_*, sandbox mode)
- Rotate secrets every 90 days

**DON'T:**
- Use production secrets
- Use local development secrets
- Share secrets in plain text
- Skip secret rotation

### 3. Production Environment

**DO:**
- Use secrets manager (required)
- Use live API keys (sk_live_*, live mode)
- Enable secret rotation
- Monitor secret access
- Use different secrets per region/cluster
- Enable audit logging

**DON'T:**
- Use .env files (use secrets manager)
- Use weak or predictable secrets
- Share secrets across environments
- Skip regular audits

---

## Recommended Secrets Managers

### AWS Secrets Manager (Recommended for AWS)

**Setup:**
```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure
aws configure

# Create secret
aws secretsmanager create-secret \
    --name citadelbuy/production/jwt-secret \
    --secret-string "$(openssl rand -base64 64)"

# Retrieve secret
aws secretsmanager get-secret-value \
    --secret-id citadelbuy/production/jwt-secret \
    --query SecretString \
    --output text
```

**Automatic Rotation:**
```bash
aws secretsmanager rotate-secret \
    --secret-id citadelbuy/production/database-password \
    --rotation-lambda-arn arn:aws:lambda:us-east-1:123456789012:function:rotate-db-password \
    --rotation-rules AutomaticallyAfterDays=90
```

**Cost:** $0.40/secret/month + $0.05/10,000 API calls

### Azure Key Vault (Recommended for Azure)

**Setup:**
```bash
# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login
az login

# Create Key Vault
az keyvault create \
    --name citadelbuy-vault \
    --resource-group citadelbuy-rg \
    --location eastus

# Add secret
az keyvault secret set \
    --vault-name citadelbuy-vault \
    --name jwt-secret \
    --value "$(openssl rand -base64 64)"

# Retrieve secret
az keyvault secret show \
    --vault-name citadelbuy-vault \
    --name jwt-secret \
    --query value \
    --output tsv
```

**Cost:** $0.03/10,000 operations

### HashiCorp Vault (Recommended for Multi-Cloud)

**Setup:**
```bash
# Install Vault
curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add -
sudo apt-add-repository "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release -cs) main"
sudo apt-get update && sudo apt-get install vault

# Start Vault server (development mode)
vault server -dev

# Set environment
export VAULT_ADDR='http://127.0.0.1:8200'
export VAULT_TOKEN='<dev-root-token>'

# Store secret
vault kv put secret/citadelbuy/jwt-secret value="$(openssl rand -base64 64)"

# Retrieve secret
vault kv get -field=value secret/citadelbuy/jwt-secret
```

**Cost:** Free (self-hosted) or $0.03/hour per cluster (HCP Vault)

### Google Secret Manager (Recommended for GCP)

**Setup:**
```bash
# Install gcloud CLI
curl https://sdk.cloud.google.com | bash

# Init and authenticate
gcloud init
gcloud auth login

# Enable API
gcloud services enable secretmanager.googleapis.com

# Create secret
echo -n "$(openssl rand -base64 64)" | \
    gcloud secrets create jwt-secret \
    --data-file=- \
    --replication-policy="automatic"

# Access secret
gcloud secrets versions access latest --secret="jwt-secret"
```

**Cost:** $0.06/10,000 access operations

### Comparison Matrix

| Feature | AWS Secrets Manager | Azure Key Vault | HashiCorp Vault | Google Secret Manager |
|---------|-------------------|-----------------|-----------------|----------------------|
| Auto-rotation | ✓ | ✓ | ✓ | ✓ |
| Audit logs | ✓ | ✓ | ✓ | ✓ |
| Encryption at rest | ✓ | ✓ | ✓ | ✓ |
| Multi-cloud | ✗ | ✗ | ✓ | ✗ |
| Self-hosted | ✗ | ✗ | ✓ | ✗ |
| Free tier | ✗ | ✗ | ✓ | ✗ |

---

## Secret Rotation Procedures

### JWT Secret Rotation (Zero-Downtime)

**Goal:** Rotate JWT secrets without invalidating active sessions

**Strategy:** Dual-secret verification period

**Steps:**

1. **Add new secret alongside old:**
   ```env
   JWT_SECRET=<new-secret>
   JWT_SECRET_OLD=<current-secret>
   ```

2. **Update application to verify both:**
   ```typescript
   // Update auth service
   function verifyToken(token: string): Payload {
     try {
       return jwt.verify(token, process.env.JWT_SECRET);
     } catch (error) {
       // Fallback to old secret
       return jwt.verify(token, process.env.JWT_SECRET_OLD);
     }
   }
   ```

3. **Deploy updated application**

4. **Wait for old tokens to expire** (JWT_EXPIRES_IN duration)

5. **Remove old secret:**
   ```env
   JWT_SECRET=<new-secret>
   # JWT_SECRET_OLD removed
   ```

6. **Deploy final update**

**Timeline:**
- If JWT_EXPIRES_IN=7d, total rotation takes 7 days
- If JWT_EXPIRES_IN=1h, total rotation takes 1 hour

---

### Encryption Key Rotation (With Data Migration)

**Goal:** Rotate encryption key while preserving access to encrypted data

**⚠️ WARNING:** This requires data migration and can be complex. Plan carefully.

**Strategy:** Re-encrypt all data with new key

**Steps:**

1. **Generate new encryption key:**
   ```bash
   NEW_KEY=$(openssl rand -hex 32)
   echo "New key: $NEW_KEY"
   ```

2. **Add new key to environment:**
   ```env
   KYC_ENCRYPTION_KEY=<old-key>
   KYC_ENCRYPTION_KEY_NEW=<new-key>
   ```

3. **Create migration script:**
   ```typescript
   // migration-script.ts
   import { decrypt, encrypt } from './crypto';

   async function migrateEncryptedData() {
     const oldKey = process.env.KYC_ENCRYPTION_KEY;
     const newKey = process.env.KYC_ENCRYPTION_KEY_NEW;

     // Get all records with encrypted data
     const records = await db.kycDocuments.findMany();

     for (const record of records) {
       // Decrypt with old key
       const decrypted = decrypt(record.encryptedData, oldKey);

       // Re-encrypt with new key
       const reencrypted = encrypt(decrypted, newKey);

       // Update record
       await db.kycDocuments.update({
         where: { id: record.id },
         data: { encryptedData: reencrypted }
       });

       console.log(`Migrated record ${record.id}`);
     }
   }

   migrateEncryptedData().catch(console.error);
   ```

4. **Run migration in maintenance window:**
   ```bash
   npm run migrate:encryption-key
   ```

5. **Update environment to use new key:**
   ```env
   KYC_ENCRYPTION_KEY=<new-key>
   # KYC_ENCRYPTION_KEY_NEW removed
   ```

6. **Verify all data is accessible**

7. **Remove old key from all systems**

**Timeline:** Depends on data volume
- 1,000 records: ~10 minutes
- 100,000 records: ~2 hours
- 1,000,000 records: ~20 hours

**Best practices:**
- Do this during maintenance window
- Make database backup first
- Test migration on staging first
- Monitor error rates
- Keep old key for 30 days (rollback)

---

### Database Password Rotation

**Goal:** Change database passwords without downtime

**Strategy:** Create new user, migrate, remove old user

**Steps:**

1. **Create new database user:**
   ```sql
   -- PostgreSQL
   CREATE USER citadelbuy_new WITH PASSWORD '<new-password>';
   GRANT ALL PRIVILEGES ON DATABASE citadelbuy TO citadelbuy_new;
   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO citadelbuy_new;
   GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO citadelbuy_new;
   ```

2. **Update connection string:**
   ```env
   DATABASE_URL="postgresql://citadelbuy_new:<new-password>@localhost:5432/citadelbuy_dev?schema=public"
   ```

3. **Deploy updated configuration**

4. **Wait for old connections to close** (~5 minutes)

5. **Verify new connections:**
   ```sql
   SELECT usename, COUNT(*)
   FROM pg_stat_activity
   WHERE datname = 'citadelbuy'
   GROUP BY usename;
   ```

6. **Remove old user:**
   ```sql
   DROP USER citadelbuy;
   ```

7. **Optionally rename new user:**
   ```sql
   ALTER USER citadelbuy_new RENAME TO citadelbuy;
   ```

---

### API Key Rotation (Third-Party Services)

**Goal:** Rotate API keys for external services (Stripe, SendGrid, etc.)

**Steps:**

1. **Generate new key in provider dashboard:**
   - Stripe: https://dashboard.stripe.com/apikeys
   - SendGrid: https://app.sendgrid.com/settings/api_keys
   - AWS: https://console.aws.amazon.com/iam/

2. **Add new key to secrets manager:**
   ```bash
   aws secretsmanager update-secret \
       --secret-id citadelbuy/production/stripe-secret-key \
       --secret-string "<new-key>"
   ```

3. **Deploy updated configuration**

4. **Verify functionality with new key**

5. **Revoke old key in provider dashboard**

6. **Monitor for errors** (check logs for 24 hours)

**Timeline:** ~15 minutes per service

---

## Emergency Response

### If Secrets Are Compromised

**Immediate Actions (Within 1 Hour):**

1. **Revoke compromised secrets immediately**
   ```bash
   # Rotate JWT secrets
   kubectl set env deployment/api \
       JWT_SECRET="$(openssl rand -base64 64)" \
       JWT_REFRESH_SECRET="$(openssl rand -base64 64)"

   # Force all user logouts
   redis-cli FLUSHDB
   ```

2. **Invalidate all active sessions**
   ```sql
   DELETE FROM sessions;
   UPDATE users SET force_password_reset = true;
   ```

3. **Disable compromised API keys**
   - Stripe: Dashboard → Developers → API keys → Delete
   - AWS: IAM → Users → Security credentials → Deactivate
   - SendGrid: Settings → API Keys → Delete

4. **Enable additional monitoring**
   ```bash
   # Increase logging verbosity
   kubectl set env deployment/api LOG_LEVEL=debug

   # Enable Sentry alerts
   # Monitor unauthorized access attempts
   ```

**Within 24 Hours:**

5. **Complete forensic investigation:**
   - Check git history: `git log -p | grep -i "password\|secret\|key"`
   - Check access logs: `kubectl logs deployment/api | grep -i "unauthorized"`
   - Check database access: `SELECT * FROM pg_stat_activity;`
   - Review Sentry errors for anomalies

6. **Rotate all related secrets:**
   - All authentication secrets
   - All database passwords
   - All API keys
   - All encryption keys (with data migration)

7. **Notify affected parties:**
   - Internal security team
   - Users (if PII compromised)
   - Compliance officer
   - Legal team

8. **Document incident:**
   - What was compromised
   - How it was discovered
   - Timeline of events
   - Actions taken
   - Lessons learned

**Within 1 Week:**

9. **Implement additional safeguards:**
   - Enable secrets scanning (GitGuardian, Snyk)
   - Add pre-commit hooks
   - Enable AWS GuardDuty
   - Configure SIEM alerts

10. **Conduct security review:**
    - Review access controls
    - Audit secrets manager permissions
    - Review CI/CD pipeline security
    - Conduct penetration test

### If Secrets Are Leaked to Git

**⚠️ CRITICAL:** Simply deleting the commit doesn't remove secrets from Git history!

**Steps:**

1. **Immediately revoke the secrets** (follow above procedures)

2. **Remove from Git history using BFG Repo-Cleaner:**
   ```bash
   # Install BFG
   brew install bfg  # macOS
   # or download from: https://rtyley.github.io/bfg-repo-cleaner/

   # Clone mirror
   git clone --mirror https://github.com/citadelbuy/citadelbuy.git
   cd citadelbuy.git

   # Remove .env files
   bfg --delete-files .env
   bfg --delete-files "*.pem"
   bfg --delete-files "*.key"

   # Clean up
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive

   # Force push
   git push --force
   ```

3. **Alternative: Use git-filter-repo:**
   ```bash
   # Install
   pip3 install git-filter-repo

   # Remove file from history
   git filter-repo --path .env --invert-paths
   git filter-repo --path apps/api/.env --invert-paths
   ```

4. **Notify all developers:**
   ```
   SECURITY ALERT: Secrets were committed to git

   ACTION REQUIRED:
   1. Delete your local clone
   2. Re-clone the repository
   3. Update your .env file with new secrets
   4. Never commit .env files
   ```

5. **Consider repository as compromised:**
   - If public repository: secrets are permanently exposed
   - If private repository: assume anyone with access saw the secrets
   - Rotate ALL secrets, not just the exposed ones

---

## Compliance and Audit

### Regulatory Requirements

| Regulation | Requirements | Penalties for Non-Compliance |
|------------|-------------|----------------------------|
| **GDPR** (EU) | Encrypt PII, secure access controls, breach notification within 72h | Up to €20M or 4% of revenue |
| **CCPA** (California) | Secure personal information, right to deletion | Up to $7,500 per violation |
| **PCI DSS** (Payment Card) | Encrypt cardholder data, restrict access, regular audits | Fines + loss of payment processing |
| **HIPAA** (Healthcare) | Encrypt PHI, access controls, audit logs | Up to $1.5M per violation category |
| **SOC 2** | Documented security controls, regular audits | Loss of customer trust, failed audits |

### Security Audit Checklist

**Monthly:**
- [ ] Review secrets manager access logs
- [ ] Check for secrets in application logs
- [ ] Verify .env files in .gitignore
- [ ] Review Sentry alerts for auth failures
- [ ] Check database connection logs

**Quarterly (Every 90 Days):**
- [ ] Rotate JWT secrets
- [ ] Rotate database passwords
- [ ] Review and revoke unused API keys
- [ ] Audit secrets manager permissions
- [ ] Conduct vulnerability scan

**Annually:**
- [ ] Rotate encryption keys (with data migration)
- [ ] Conduct penetration test
- [ ] Review incident response procedures
- [ ] Update security documentation
- [ ] Conduct security training for team

### Audit Logging

**What to log:**
```typescript
// Secret access
logger.info({
  event: 'secret_accessed',
  secret_name: 'jwt_secret',
  accessed_by: 'api-server-pod-123',
  timestamp: new Date(),
  ip_address: '10.0.1.42'
});

// Secret rotation
logger.info({
  event: 'secret_rotated',
  secret_name: 'database_password',
  rotated_by: 'admin@citadelbuy.com',
  timestamp: new Date(),
  old_secret_age_days: 87
});

// Failed authentication
logger.warn({
  event: 'auth_failed',
  reason: 'invalid_jwt',
  user_id: '12345',
  ip_address: '203.0.113.42',
  timestamp: new Date()
});
```

**Where to store logs:**
- CloudWatch Logs (AWS)
- Azure Monitor (Azure)
- Stackdriver Logging (GCP)
- Elasticsearch + Kibana (self-hosted)
- Datadog / New Relic (third-party)

**Retention period:**
- Security logs: 1 year minimum
- Compliance logs: 7 years (varies by regulation)
- Debug logs: 30 days

---

## Additional Resources

### Tools

- **Secrets Scanning:**
  - [GitGuardian](https://www.gitguardian.com/) - Real-time secrets detection
  - [TruffleHog](https://github.com/trufflesecurity/trufflehog) - Find secrets in git history
  - [detect-secrets](https://github.com/Yelp/detect-secrets) - Pre-commit hook
  - [Snyk](https://snyk.io/) - Security scanning with secrets detection

- **Password Generators:**
  - [1Password](https://1password.com/password-generator/) - Strong password generator
  - [Bitwarden](https://bitwarden.com/password-generator/) - Open-source generator
  - Command line: `openssl rand -base64 32`

- **Secret Management:**
  - [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/)
  - [Azure Key Vault](https://azure.microsoft.com/en-us/services/key-vault/)
  - [HashiCorp Vault](https://www.vaultproject.io/)
  - [Google Secret Manager](https://cloud.google.com/secret-manager)

### Documentation

- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [NIST Password Guidelines (SP 800-63B)](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [12 Factor App - Config](https://12factor.net/config)
- [CWE-798: Use of Hard-coded Credentials](https://cwe.mitre.org/data/definitions/798.html)

### Training

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [AWS Security Best Practices](https://aws.amazon.com/architecture/security-identity-compliance/)
- [Azure Security Documentation](https://docs.microsoft.com/en-us/azure/security/)

---

## Support

**For security concerns:**
- Email: security@citadelbuy.com
- PGP Key: [Download](https://citadelbuy.com/security.asc)

**For secret rotation assistance:**
- Internal Wiki: `https://wiki.citadelbuy.internal/security/secret-rotation`
- Slack: #security-team

**For incident response:**
- Emergency: Call security team lead
- After hours: Page on-call engineer
- Critical incidents: Escalate to CTO

---

**Document Version:** 1.0
**Last Reviewed:** December 3, 2025
**Next Review:** March 3, 2026
**Owner:** Security Team
**Approved By:** CTO

---

**Remember:** Security is everyone's responsibility. When in doubt, ask the security team!
