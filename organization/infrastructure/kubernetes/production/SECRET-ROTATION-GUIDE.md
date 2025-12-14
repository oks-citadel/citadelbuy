# Secret Rotation Guide for Broxiva Production

This guide provides detailed procedures for rotating secrets in the production environment without causing downtime.

## Overview

Secrets must be rotated on a regular schedule to maintain security compliance:

- **Critical Secrets**: NEVER rotate (encryption keys) - require data migration
- **High Priority**: Every 90 days (JWT, database, API keys)
- **Medium Priority**: Every 180 days (OAuth, admin passwords)
- **Low Priority**: As needed (monitoring, analytics)

## Before You Begin

1. **Schedule maintenance window** (for database password rotation)
2. **Notify the team** via Slack #platform-notifications
3. **Take a backup** of current secrets:
   ```bash
   kubectl get secret broxiva-secrets -n broxiva-prod -o yaml > backup-secrets-$(date +%Y%m%d).yaml
   ```
4. **Verify monitoring** is active

## Secret Categories

### Category 1: JWT and Session Secrets

**Impact**: All active user sessions will be invalidated
**Downtime**: None (rolling restart)
**Frequency**: Every 90 days

#### Procedure

1. Generate new secrets:
   ```bash
   NEW_JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
   NEW_JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '\n')
   NEW_SESSION_SECRET=$(openssl rand -base64 64 | tr -d '\n')
   ```

2. Update Kubernetes secret:
   ```bash
   kubectl patch secret broxiva-secrets -n broxiva-prod \
     --type='json' \
     -p="[
       {\"op\":\"replace\",\"path\":\"/data/JWT_SECRET\",\"value\":\"$(echo -n $NEW_JWT_SECRET | base64)\"},
       {\"op\":\"replace\",\"path\":\"/data/JWT_REFRESH_SECRET\",\"value\":\"$(echo -n $NEW_JWT_REFRESH_SECRET | base64)\"},
       {\"op\":\"replace\",\"path\":\"/data/SESSION_SECRET\",\"value\":\"$(echo -n $NEW_SESSION_SECRET | base64)\"}
     ]"
   ```

3. Perform rolling restart of API pods:
   ```bash
   kubectl rollout restart deployment broxiva-api -n broxiva-prod
   kubectl rollout status deployment broxiva-api -n broxiva-prod
   ```

4. Verify:
   ```bash
   # Test new login
   curl -X POST https://api.broxiva.com/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test"}'
   ```

5. Update Azure Key Vault:
   ```bash
   az keyvault secret set --vault-name broxiva-prod-kv --name jwt-secret --value "$NEW_JWT_SECRET"
   ```

6. Document rotation in change log

### Category 2: Database Passwords

**Impact**: Brief connection interruptions during password change
**Downtime**: ~30 seconds
**Frequency**: Every 90 days

#### Procedure (PostgreSQL)

1. **IMPORTANT**: Schedule during low-traffic period

2. Generate new password:
   ```bash
   NEW_POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d '\n' | sed 's/[^a-zA-Z0-9]//g')
   ```

3. Connect to database and create new user with temporary name:
   ```bash
   kubectl exec -it postgres-0 -n broxiva-prod -- psql -U postgres

   -- Inside psql:
   CREATE USER broxiva_temp WITH PASSWORD 'NEW_PASSWORD_HERE';
   GRANT ALL PRIVILEGES ON DATABASE broxiva_production TO broxiva_temp;
   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO broxiva_temp;
   GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO broxiva_temp;
   ```

4. Update Kubernetes secret with temporary user:
   ```bash
   NEW_DATABASE_URL="postgresql://broxiva_temp:${NEW_POSTGRES_PASSWORD}@postgres.broxiva-prod.svc.cluster.local:5432/broxiva_production?schema=public&sslmode=require"

   kubectl patch secret broxiva-secrets -n broxiva-prod \
     --type='json' \
     -p="[
       {\"op\":\"replace\",\"path\":\"/data/POSTGRES_PASSWORD\",\"value\":\"$(echo -n $NEW_POSTGRES_PASSWORD | base64)\"},
       {\"op\":\"replace\",\"path\":\"/data/DATABASE_URL\",\"value\":\"$(echo -n $NEW_DATABASE_URL | base64)\"}
     ]"
   ```

5. Rolling restart of all pods using the database:
   ```bash
   kubectl rollout restart deployment broxiva-api -n broxiva-prod
   kubectl rollout restart deployment broxiva-worker -n broxiva-prod
   kubectl rollout status deployment broxiva-api -n broxiva-prod
   ```

6. Verify connections are working:
   ```bash
   kubectl logs -n broxiva-prod deployment/broxiva-api | grep "database connected"
   ```

7. Update original user password and switch back:
   ```bash
   -- In psql:
   ALTER USER broxiva WITH PASSWORD 'NEW_PASSWORD_HERE';
   ```

8. Update secret to use original username again:
   ```bash
   NEW_DATABASE_URL="postgresql://broxiva:${NEW_POSTGRES_PASSWORD}@postgres.broxiva-prod.svc.cluster.local:5432/broxiva_production?schema=public&sslmode=require"

   kubectl patch secret broxiva-secrets -n broxiva-prod \
     --type='json' \
     -p="[{\"op\":\"replace\",\"path\":\"/data/DATABASE_URL\",\"value\":\"$(echo -n $NEW_DATABASE_URL | base64)\"}]"
   ```

9. Another rolling restart:
   ```bash
   kubectl rollout restart deployment broxiva-api -n broxiva-prod
   kubectl rollout restart deployment broxiva-worker -n broxiva-prod
   ```

10. Clean up temporary user:
    ```bash
    -- In psql:
    DROP USER broxiva_temp;
    ```

11. Update postgres-secrets secret:
    ```bash
    kubectl patch secret postgres-secrets -n broxiva-prod \
      --type='json' \
      -p="[{\"op\":\"replace\",\"path\":\"/data/POSTGRES_PASSWORD\",\"value\":\"$(echo -n $NEW_POSTGRES_PASSWORD | base64)\"}]"
    ```

12. Update Azure Key Vault

### Category 3: Redis Password

**Impact**: All cached data will be lost
**Downtime**: None
**Frequency**: Every 90 days

#### Procedure

1. Generate new password:
   ```bash
   NEW_REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d '\n' | sed 's/[^a-zA-Z0-9]//g')
   ```

2. Update Redis configuration:
   ```bash
   kubectl exec -it redis-0 -n broxiva-prod -- redis-cli

   # Inside redis-cli:
   CONFIG SET requirepass NEW_PASSWORD_HERE
   CONFIG REWRITE
   ```

3. Update Kubernetes secrets:
   ```bash
   NEW_REDIS_URL="redis://:${NEW_REDIS_PASSWORD}@redis.broxiva-prod.svc.cluster.local:6379"

   kubectl patch secret broxiva-secrets -n broxiva-prod \
     --type='json' \
     -p="[
       {\"op\":\"replace\",\"path\":\"/data/REDIS_PASSWORD\",\"value\":\"$(echo -n $NEW_REDIS_PASSWORD | base64)\"},
       {\"op\":\"replace\",\"path\":\"/data/REDIS_URL\",\"value\":\"$(echo -n $NEW_REDIS_URL | base64)\"}
     ]"

   kubectl patch secret redis-secrets -n broxiva-prod \
     --type='json' \
     -p="[{\"op\":\"replace\",\"path\":\"/data/REDIS_PASSWORD\",\"value\":\"$(echo -n $NEW_REDIS_PASSWORD | base64)\"}]"
   ```

4. Rolling restart:
   ```bash
   kubectl rollout restart deployment broxiva-api -n broxiva-prod
   kubectl rollout restart deployment broxiva-worker -n broxiva-prod
   ```

5. Verify:
   ```bash
   kubectl exec -it redis-0 -n broxiva-prod -- redis-cli -a "$NEW_REDIS_PASSWORD" PING
   ```

### Category 4: Stripe API Keys

**Impact**: Payment processing will fail if keys are invalid
**Downtime**: None
**Frequency**: As needed (usually when compromised)

#### Procedure

1. Log into Stripe Dashboard: https://dashboard.stripe.com/apikeys

2. **IMPORTANT**: Create NEW keys before deleting old ones

3. Create new Restricted Key with minimal permissions needed

4. Update Kubernetes secret:
   ```bash
   kubectl patch secret broxiva-secrets -n broxiva-prod \
     --type='json' \
     -p="[{\"op\":\"replace\",\"path\":\"/data/STRIPE_SECRET_KEY\",\"value\":\"$(echo -n 'sk_live_NEW_KEY' | base64)\"}]"
   ```

5. Rolling restart:
   ```bash
   kubectl rollout restart deployment broxiva-api -n broxiva-prod
   ```

6. Test payment:
   ```bash
   # Test with Stripe test mode first
   curl -X POST https://api.broxiva.com/payments/test
   ```

7. Only after verification, delete old key from Stripe Dashboard

8. Update webhook secret if changed:
   ```bash
   kubectl patch secret broxiva-secrets -n broxiva-prod \
     --type='json' \
     -p="[{\"op\":\"replace\",\"path\":\"/data/STRIPE_WEBHOOK_SECRET\",\"value\":\"$(echo -n 'whsec_NEW' | base64)\"}]"
   ```

### Category 5: Encryption Keys (CRITICAL)

**Impact**: ALL encrypted data becomes unreadable if done wrong
**Downtime**: Significant (requires data migration)
**Frequency**: NEVER (unless absolutely necessary)

#### Procedure (Multi-Step Migration)

**WARNING**: This is a high-risk operation. Only perform if absolutely necessary.

1. **Plan the migration**:
   - Identify all tables with encrypted columns
   - Estimate migration time
   - Schedule extended maintenance window

2. **Implement dual-key support** in application:
   ```javascript
   // Support both old and new encryption keys
   const OLD_ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
   const NEW_ENCRYPTION_KEY = process.env.NEW_ENCRYPTION_KEY;

   function decrypt(data) {
     try {
       return decryptWith(data, NEW_ENCRYPTION_KEY);
     } catch {
       return decryptWith(data, OLD_ENCRYPTION_KEY);
     }
   }

   function encrypt(data) {
     return encryptWith(data, NEW_ENCRYPTION_KEY);
   }
   ```

3. Deploy dual-key version:
   ```bash
   # Add NEW_ENCRYPTION_KEY to secrets
   NEW_ENCRYPTION_KEY=$(openssl rand -hex 32)
   kubectl patch secret broxiva-secrets -n broxiva-prod \
     --type='json' \
     -p="[{\"op\":\"add\",\"path\":\"/data/NEW_ENCRYPTION_KEY\",\"value\":\"$(echo -n $NEW_ENCRYPTION_KEY | base64)\"}]"

   # Deploy new version
   kubectl rollout restart deployment broxiva-api -n broxiva-prod
   ```

4. Run migration script:
   ```bash
   kubectl exec -it broxiva-api-xxx -n broxiva-prod -- \
     node scripts/migrate-encryption.js
   ```

5. Verify all data is migrated:
   ```bash
   # Check migration logs
   # Verify random samples
   ```

6. Remove old key support from code

7. Deploy final version

8. Remove old key from secrets

## Automated Rotation with External Secrets Operator

For automated rotation using Azure Key Vault:

1. Store secrets in Azure Key Vault
2. Enable automatic rotation in Key Vault
3. Configure External Secrets Operator to sync
4. Set up rotation triggers

Example ExternalSecret:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: broxiva-secrets-auto
  namespace: broxiva-prod
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: azure-secret-store
    kind: SecretStore
  target:
    name: broxiva-secrets
    creationPolicy: Owner
  data:
    - secretKey: JWT_SECRET
      remoteRef:
        key: jwt-secret
        version: latest
    - secretKey: DATABASE_URL
      remoteRef:
        key: database-url
        version: latest
```

## Rollback Procedure

If rotation causes issues:

1. Restore from backup:
   ```bash
   kubectl apply -f backup-secrets-YYYYMMDD.yaml
   ```

2. Rolling restart all pods:
   ```bash
   kubectl rollout restart deployment broxiva-api -n broxiva-prod
   kubectl rollout restart deployment broxiva-worker -n broxiva-prod
   kubectl rollout restart deployment broxiva-web -n broxiva-prod
   ```

3. Verify services are healthy:
   ```bash
   kubectl get pods -n broxiva-prod
   kubectl logs -n broxiva-prod deployment/broxiva-api --tail=100
   ```

## Monitoring and Alerting

Set up alerts for:

- Secret rotation reminders (90 days before expiry)
- Failed authentication attempts (may indicate key mismatch)
- Database connection errors
- Payment processing failures

## Compliance and Audit

- All rotations must be logged in change management system
- Update rotation date in secret annotations:
  ```bash
  kubectl annotate secret broxiva-secrets -n broxiva-prod \
    last-rotated="$(date +%Y-%m-%d)" --overwrite
  ```
- Document in security audit log
- Update runbook if procedure changes

## Emergency Contact

For rotation issues:
- Platform Team Lead: platform-lead@broxiva.com
- Security Team: security@broxiva.com
- On-Call: PagerDuty escalation

---

**Last Updated**: 2025-12-14
**Next Review**: 2026-03-14
