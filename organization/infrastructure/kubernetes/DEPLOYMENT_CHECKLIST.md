# Kubernetes Deployment Checklist

Quick reference checklist for deploying CitadelBuy to Kubernetes.

## Pre-Deployment Checklist

### Infrastructure Setup
- [ ] Kubernetes cluster created (1.26+)
- [ ] kubectl configured and authenticated
- [ ] Helm installed (v3+)
- [ ] kustomize installed
- [ ] Cluster has sufficient resources
  - [ ] Staging: 3+ nodes (2vCPU, 8GB RAM each)
  - [ ] Production: 5+ nodes (4vCPU, 16GB RAM each)

### Dependencies Installation
- [ ] Ingress Controller deployed (nginx-ingress)
  ```bash
  helm install nginx-ingress ingress-nginx/ingress-nginx -n ingress-nginx --create-namespace
  ```
- [ ] Cert Manager installed
  ```bash
  kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
  ```
- [ ] External Secrets Operator installed (Production)
  ```bash
  helm install external-secrets external-secrets/external-secrets -n external-secrets-system --create-namespace
  ```
- [ ] Prometheus Stack installed (Production)
  ```bash
  helm install prometheus prometheus-community/kube-prometheus-stack -n monitoring --create-namespace
  ```

### Secret Management
- [ ] External Secrets configured (Production)
- [ ] Secrets created in AWS Secrets Manager/Vault
- [ ] Secret templates filled with actual values
- [ ] Database passwords generated (min 32 chars)
- [ ] JWT secrets generated (min 64 chars)
- [ ] API keys configured (Stripe, SendGrid, etc.)
- [ ] OAuth credentials configured

### DNS & Networking
- [ ] Domain names registered
- [ ] DNS records ready for configuration
- [ ] Load balancer provisioned (if static IP needed)
- [ ] Firewall rules configured

---

## Staging Deployment Checklist

### 1. Namespace & RBAC
```bash
kubectl apply -f staging/namespace.yaml
kubectl apply -f staging/rbac.yaml
```
- [ ] Namespace created (citadelbuy-staging)
- [ ] Resource quotas applied
- [ ] Service accounts created
- [ ] RBAC roles configured

### 2. Secrets & ConfigMaps
```bash
# Create secrets (replace with actual values first!)
kubectl apply -f staging/secrets.yaml
kubectl apply -f staging/configmap.yaml
```
- [ ] Secrets configured with actual values
- [ ] ConfigMaps applied
- [ ] Environment variables verified

### 3. Storage
```bash
kubectl apply -f staging/pvc.yaml
```
- [ ] PVCs created for PostgreSQL
- [ ] PVCs created for Redis
- [ ] Storage class verified

### 4. Network Policies
```bash
kubectl apply -f staging/network-policies.yaml
```
- [ ] Network policies applied
- [ ] DNS resolution allowed
- [ ] Service-to-service communication tested

### 5. Database Deployment
```bash
kubectl apply -f staging/postgres-deployment.yaml
kubectl apply -f staging/redis-deployment.yaml
```
- [ ] PostgreSQL deployed
- [ ] PostgreSQL ready (check with: `kubectl wait --for=condition=ready pod -l app=postgres -n citadelbuy-staging`)
- [ ] Redis deployed
- [ ] Redis ready

### 6. Application Deployment
```bash
kubectl apply -f staging/api-deployment.yaml
kubectl apply -f staging/web-deployment.yaml
```
- [ ] API deployment successful
- [ ] Web deployment successful
- [ ] Pods running (check with: `kubectl get pods -n citadelbuy-staging`)
- [ ] Health checks passing

### 7. Ingress & Services
```bash
kubectl apply -f staging/ingress.yaml
```
- [ ] Ingress created
- [ ] TLS certificates issued
- [ ] Services accessible

### 8. Auto-scaling
```bash
kubectl apply -f staging/hpa.yaml
```
- [ ] HPA configured for API
- [ ] HPA configured for Web
- [ ] Metrics server working

### 9. Verification
- [ ] All pods in Running state
- [ ] Health endpoints responding
  - [ ] API: `curl https://staging-api.citadelbuy.com/api/health`
  - [ ] Web: `curl https://staging.citadelbuy.com/api/health`
- [ ] Database connectivity verified
- [ ] Redis connectivity verified
- [ ] Logs show no errors

---

## Production Deployment Checklist

### Pre-Production Requirements
- [ ] All staging tests passed
- [ ] Load testing completed
- [ ] Security scan passed
- [ ] Database backups verified
- [ ] Runbooks prepared
- [ ] On-call rotation established
- [ ] Rollback plan documented

### 1. Namespace & RBAC
```bash
kubectl apply -f production/namespace.yaml
kubectl apply -f production/rbac.yaml
```
- [ ] Namespace created (citadelbuy-production)
- [ ] Resource quotas applied (50 CPU, 100Gi memory)
- [ ] Service accounts created with IAM annotations
- [ ] RBAC roles configured

### 2. External Secrets (Recommended)
```bash
kubectl apply -f base/external-secrets.yaml
```
- [ ] SecretStore configured
- [ ] Secrets created in AWS Secrets Manager/Vault
- [ ] ExternalSecrets syncing successfully
- [ ] Verify: `kubectl get externalsecrets -n citadelbuy-production`

### 3. Secrets & ConfigMaps
```bash
# If not using External Secrets:
kubectl apply -f production/secrets.yaml
kubectl apply -f production/configmap.yaml
```
- [ ] All production secrets configured
- [ ] ConfigMaps applied
- [ ] Production environment variables set

### 4. Storage
```bash
kubectl apply -f production/pvc.yaml
```
- [ ] PVCs created for all components
- [ ] High-performance storage class used (gp3/premium-rwo)
- [ ] Backup snapshots configured
- [ ] Volume snapshots tested

### 5. Network Policies
```bash
kubectl apply -f production/network-policies.yaml
```
- [ ] Default deny policies applied
- [ ] Service communication rules configured
- [ ] Database isolation verified
- [ ] External access configured

### 6. Database Deployment
**Note:** Consider using managed databases (RDS, CloudSQL) for production
```bash
# If self-hosting:
kubectl apply -f base/postgres-deployment.yaml
kubectl apply -f base/redis-deployment.yaml
```
- [ ] PostgreSQL primary deployed
- [ ] PostgreSQL replica deployed (HA)
- [ ] Redis master deployed
- [ ] Redis replica deployed (HA)
- [ ] Replication configured and verified
- [ ] Backups configured

### 7. Application Deployment
```bash
kubectl apply -f production/api-deployment.yaml
kubectl apply -f production/web-deployment.yaml
kubectl apply -f production/worker-deployment.yaml
```
- [ ] API deployment (5 replicas)
- [ ] Web deployment (5 replicas)
- [ ] Email worker deployed
- [ ] Order processing worker deployed
- [ ] Search indexing worker deployed
- [ ] All workers deployed
- [ ] Pod anti-affinity working (pods spread across nodes)

### 8. Ingress & Services
```bash
kubectl apply -f production/ingress.yaml
```
- [ ] Ingress created
- [ ] TLS certificates issued
- [ ] ModSecurity WAF enabled
- [ ] Rate limiting configured
- [ ] Multiple domains configured
- [ ] WWW redirect working

### 9. Auto-scaling
```bash
kubectl apply -f production/hpa.yaml
```
- [ ] HPA configured for all deployments
- [ ] Custom metrics configured (RPS)
- [ ] Scale behaviors tested
- [ ] PodDisruptionBudgets applied

### 10. Monitoring
```bash
kubectl apply -f production/servicemonitor.yaml
```
- [ ] ServiceMonitors created
- [ ] Prometheus scraping metrics
- [ ] Grafana dashboards configured
- [ ] Alert rules applied
- [ ] PagerDuty/Slack integration configured
- [ ] On-call notifications working

### 11. DNS Configuration
- [ ] DNS A/CNAME records created
  - [ ] api.citadelbuy.com → LoadBalancer IP
  - [ ] citadelbuy.com → LoadBalancer IP
  - [ ] www.citadelbuy.com → LoadBalancer IP
- [ ] DNS propagation verified
- [ ] TTL set appropriately (300s recommended)

### 12. Production Verification
- [ ] All pods in Running state
- [ ] Health checks passing
  - [ ] API: `curl https://api.citadelbuy.com/api/health`
  - [ ] Web: `curl https://citadelbuy.com/api/health`
- [ ] Database connections working
- [ ] Redis connections working
- [ ] Payment gateway integration tested
- [ ] Email sending tested
- [ ] Monitoring dashboards showing data
- [ ] Alerts firing to correct channels
- [ ] SSL certificates valid
- [ ] Security headers present

### 13. Performance Testing
- [ ] Load test completed (sustained traffic)
- [ ] Stress test completed (peak traffic)
- [ ] Auto-scaling verified
- [ ] Response times acceptable (p95 < 500ms)
- [ ] Error rate acceptable (<0.1%)

### 14. Security Verification
- [ ] Container images scanned
- [ ] Network policies enforced
- [ ] Secrets not in plain text
- [ ] RBAC least privilege verified
- [ ] TLS everywhere
- [ ] Database encryption at rest
- [ ] Audit logs enabled

---

## Post-Deployment Checklist

### Immediate (Day 1)
- [ ] Monitor error rates
- [ ] Monitor response times
- [ ] Monitor resource usage
- [ ] Check for pod restarts
- [ ] Verify auto-scaling
- [ ] Test rollback procedure

### First Week
- [ ] Daily monitoring review
- [ ] Tune HPA thresholds
- [ ] Optimize resource requests/limits
- [ ] Review and adjust alerts
- [ ] Database performance tuning
- [ ] Cache hit rate optimization

### First Month
- [ ] Conduct disaster recovery drill
- [ ] Review and update runbooks
- [ ] Security audit
- [ ] Cost optimization review
- [ ] Capacity planning
- [ ] Update documentation

---

## Rollback Procedure

### Quick Rollback
```bash
# Rollback API
kubectl rollout undo deployment/citadelbuy-api -n citadelbuy-production

# Rollback Web
kubectl rollout undo deployment/citadelbuy-web -n citadelbuy-production

# Verify rollback
kubectl rollout status deployment/citadelbuy-api -n citadelbuy-production
kubectl rollout status deployment/citadelbuy-web -n citadelbuy-production
```

### Emergency Procedures
1. Scale down to minimum replicas
2. Check logs: `kubectl logs -f deployment/citadelbuy-api -n citadelbuy-production`
3. Check events: `kubectl get events -n citadelbuy-production --sort-by='.lastTimestamp'`
4. Rollback if needed
5. Notify team
6. Update incident log

---

## Common Commands

### Viewing Resources
```bash
# Get all resources
kubectl get all -n citadelbuy-production

# Get pod status
kubectl get pods -n citadelbuy-production -o wide

# Watch pod status
kubectl get pods -n citadelbuy-production -w

# Check resource usage
kubectl top pods -n citadelbuy-production
kubectl top nodes
```

### Viewing Logs
```bash
# API logs
kubectl logs -f deployment/citadelbuy-api -n citadelbuy-production

# Web logs
kubectl logs -f deployment/citadelbuy-web -n citadelbuy-production

# Previous logs (after crash)
kubectl logs deployment/citadelbuy-api -n citadelbuy-production --previous
```

### Debugging
```bash
# Describe pod
kubectl describe pod <pod-name> -n citadelbuy-production

# Get events
kubectl get events -n citadelbuy-production --sort-by='.lastTimestamp'

# Execute command in pod
kubectl exec -it <pod-name> -n citadelbuy-production -- /bin/sh

# Port forward for testing
kubectl port-forward svc/citadelbuy-api 4000:4000 -n citadelbuy-production
```

### Scaling
```bash
# Manual scale
kubectl scale deployment/citadelbuy-api --replicas=10 -n citadelbuy-production

# Check HPA status
kubectl get hpa -n citadelbuy-production

# Describe HPA
kubectl describe hpa citadelbuy-api-hpa -n citadelbuy-production
```

---

## Critical Alerts to Monitor

### Day 1
- [ ] Pod crash loops
- [ ] High error rates (>1%)
- [ ] High response times (>1s)
- [ ] Database connection issues
- [ ] Memory usage >80%
- [ ] CPU usage >80%

### Ongoing
- [ ] Certificate expiration (30 days)
- [ ] Disk usage >80%
- [ ] Backup failures
- [ ] Replication lag
- [ ] Security vulnerabilities

---

## Support Contacts

- **DevOps Team:** devops@citadelbuy.com
- **On-Call:** PagerDuty escalation
- **Documentation:** https://docs.citadelbuy.com
- **Status Page:** https://status.citadelbuy.com

---

## Related Documentation

- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Comprehensive deployment documentation
- [Review Report](./KUBERNETES_REVIEW_REPORT.md) - Infrastructure review findings
- [External Secrets](./base/external-secrets.yaml) - Secret management configuration
- [Network Policies](./production/network-policies.yaml) - Network security configuration

---

**Last Updated:** December 6, 2024
**Version:** 1.0
**Status:** Production Ready ✅
