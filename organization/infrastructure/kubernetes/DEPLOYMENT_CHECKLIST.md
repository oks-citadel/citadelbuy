# CitadelBuy Kubernetes Security Deployment Checklist

Use this checklist to ensure all security hardening measures are properly deployed and configured.

## Pre-Deployment

### Prerequisites
- [ ] Kubernetes cluster running version 1.25 or higher (for Pod Security Standards)
- [ ] kubectl configured with cluster admin access
- [ ] Network policy support enabled (Calico, Cilium, or built-in)
- [ ] Metrics server installed for resource monitoring
- [ ] Helm installed (for External Secrets Operator)

### Preparation
- [ ] Review SECURITY_HARDENING.md documentation
- [ ] Prepare external secrets management system (AWS Secrets Manager, Vault, etc.)
- [ ] Configure cloud provider IAM/service account for workload identity
- [ ] Prepare TLS certificates for ingress (if applicable)
- [ ] Review and adjust resource limits based on expected load

## Phase 1: Foundation

### Namespaces
- [ ] Apply namespace configuration
  ```bash
  kubectl apply -f base/namespace.yaml
  ```
- [ ] Verify namespaces created
  ```bash
  kubectl get namespaces citadelbuy citadelbuy-ai citadelbuy-monitoring
  ```

### Pod Security Standards
- [ ] Apply Pod Security Standards configuration
  ```bash
  kubectl apply -f base/pod-security.yaml
  ```
- [ ] Verify PSS labels on namespaces
  ```bash
  kubectl get namespace citadelbuy -o yaml | grep pod-security
  ```
- [ ] Verify Pod Disruption Budgets created
  ```bash
  kubectl get pdb -n citadelbuy
  ```
- [ ] Verify LimitRange and ResourceQuota created
  ```bash
  kubectl get limitrange,resourcequota -n citadelbuy
  ```

### RBAC Configuration
- [ ] Apply RBAC configuration
  ```bash
  kubectl apply -f base/rbac.yaml
  ```
- [ ] Verify service accounts created
  ```bash
  kubectl get serviceaccounts -n citadelbuy
  ```
- [ ] Verify roles and rolebindings
  ```bash
  kubectl get roles,rolebindings -n citadelbuy
  ```
- [ ] Test API service account permissions
  ```bash
  kubectl auth can-i list configmaps --as=system:serviceaccount:citadelbuy:citadelbuy-api -n citadelbuy
  ```

## Phase 2: Network Security

### Network Policies
- [ ] Apply network policies
  ```bash
  kubectl apply -f base/network-policies.yaml
  ```
- [ ] Verify default deny policies created
  ```bash
  kubectl get networkpolicy default-deny-ingress -n citadelbuy
  kubectl get networkpolicy default-deny-egress -n citadelbuy
  ```
- [ ] Verify all allow policies created
  ```bash
  kubectl get networkpolicies -n citadelbuy
  ```
- [ ] Count should be approximately 15+ policies
  ```bash
  kubectl get networkpolicies -n citadelbuy --no-headers | wc -l
  ```

## Phase 3: Secrets Management

### External Secrets Operator (Optional but Recommended)
- [ ] Install External Secrets Operator
  ```bash
  helm repo add external-secrets https://charts.external-secrets.io
  helm repo update
  helm install external-secrets external-secrets/external-secrets \
    -n external-secrets-system --create-namespace
  ```
- [ ] Verify operator is running
  ```bash
  kubectl get pods -n external-secrets-system
  ```

### Configure Secret Provider
- [ ] Choose provider (AWS, Vault, Azure, GCP)
- [ ] Configure provider credentials/workload identity
- [ ] For AWS with IRSA:
  ```bash
  # Annotate service account with IAM role
  kubectl annotate serviceaccount external-secrets \
    -n citadelbuy \
    eks.amazonaws.com/role-arn=arn:aws:iam::ACCOUNT_ID:role/citadelbuy-secrets-role
  ```

### Create Secrets in Provider
- [ ] Create database password in secret store
- [ ] Create Redis password in secret store
- [ ] Create Elasticsearch password in secret store
- [ ] Create JWT secret in secret store
- [ ] Create payment gateway credentials
- [ ] Create email service credentials
- [ ] Create OAuth credentials

### Apply External Secrets
- [ ] Edit external-secrets.yaml with your provider configuration
- [ ] Apply external secrets configuration
  ```bash
  kubectl apply -f base/external-secrets.yaml
  ```
- [ ] Verify SecretStore is ready
  ```bash
  kubectl get secretstore -n citadelbuy
  kubectl describe secretstore aws-secrets-manager -n citadelbuy
  ```
- [ ] Verify ExternalSecrets are syncing
  ```bash
  kubectl get externalsecrets -n citadelbuy
  kubectl describe externalsecret citadelbuy-database-credentials -n citadelbuy
  ```
- [ ] Verify secrets are created
  ```bash
  kubectl get secrets -n citadelbuy
  ```

### Alternative: Manual Secrets (Development Only)
If not using External Secrets Operator:
- [ ] Create secrets manually
  ```bash
  kubectl create secret generic citadelbuy-secrets \
    -n citadelbuy \
    --from-literal=DATABASE_PASSWORD=your-password \
    --from-literal=REDIS_PASSWORD=your-redis-password \
    --from-literal=ELASTICSEARCH_PASSWORD=your-es-password
  ```

## Phase 4: ConfigMaps

### Application Configuration
- [ ] Review and edit base/configmap.yaml
- [ ] Update environment-specific values
- [ ] Apply ConfigMap
  ```bash
  kubectl apply -f base/configmap.yaml
  ```
- [ ] Verify ConfigMap created
  ```bash
  kubectl get configmap citadelbuy-config -n citadelbuy
  kubectl describe configmap citadelbuy-config -n citadelbuy
  ```

## Phase 5: Database Deployments

### PostgreSQL
- [ ] Review postgres-deployment.yaml security settings
- [ ] Apply PostgreSQL deployment
  ```bash
  kubectl apply -f base/postgres-deployment.yaml
  ```
- [ ] Wait for PostgreSQL to be ready
  ```bash
  kubectl wait --for=condition=ready pod -l app=postgres -n citadelbuy --timeout=300s
  ```
- [ ] Verify StatefulSet is running
  ```bash
  kubectl get statefulset postgres -n citadelbuy
  ```
- [ ] Verify PVC is bound
  ```bash
  kubectl get pvc postgres-pvc -n citadelbuy
  ```
- [ ] Check pod security context
  ```bash
  kubectl get pod -l app=postgres -n citadelbuy -o jsonpath='{.items[0].spec.securityContext}'
  ```
- [ ] Verify resource limits
  ```bash
  kubectl get pod -l app=postgres -n citadelbuy -o jsonpath='{.items[0].spec.containers[0].resources}'
  ```

### Redis
- [ ] Review redis-deployment.yaml security settings
- [ ] Apply Redis deployment
  ```bash
  kubectl apply -f base/redis-deployment.yaml
  ```
- [ ] Wait for Redis to be ready
  ```bash
  kubectl wait --for=condition=ready pod -l app=redis -n citadelbuy --timeout=300s
  ```
- [ ] Verify StatefulSet is running
  ```bash
  kubectl get statefulset redis -n citadelbuy
  ```
- [ ] Test Redis connectivity (from inside cluster)
  ```bash
  kubectl run -it --rm redis-test --image=redis:7-alpine -n citadelbuy -- redis-cli -h redis ping
  ```

### Elasticsearch
- [ ] Review elasticsearch-deployment.yaml security settings
- [ ] Apply Elasticsearch deployment
  ```bash
  kubectl apply -f base/elasticsearch-deployment.yaml
  ```
- [ ] Wait for Elasticsearch to be ready (may take 5-10 minutes)
  ```bash
  kubectl wait --for=condition=ready pod -l app=elasticsearch -n citadelbuy --timeout=600s
  ```
- [ ] Verify cluster health
  ```bash
  kubectl run -it --rm es-test --image=curlimages/curl -n citadelbuy -- \
    curl -u elastic:PASSWORD http://elasticsearch:9200/_cluster/health
  ```

### Monitoring Exporters
- [ ] Verify postgres-exporter is running
  ```bash
  kubectl get deployment postgres-exporter -n citadelbuy
  ```
- [ ] Verify redis-exporter is running
  ```bash
  kubectl get deployment redis-exporter -n citadelbuy
  ```
- [ ] Verify elasticsearch-exporter is running
  ```bash
  kubectl get deployment elasticsearch-exporter -n citadelbuy
  ```

## Phase 6: Application Deployments

### API Backend
- [ ] Review apps/api-deployment.yaml security settings
- [ ] Verify Docker image is available
  ```bash
  docker pull citadelplatforms/citadelbuy-ecommerce:backend-latest
  ```
- [ ] Apply API deployment
  ```bash
  kubectl apply -f apps/api-deployment.yaml
  ```
- [ ] Wait for API to be ready
  ```bash
  kubectl wait --for=condition=ready pod -l app=citadelbuy-api -n citadelbuy --timeout=300s
  ```
- [ ] Verify deployment is scaled to 3 replicas
  ```bash
  kubectl get deployment citadelbuy-api -n citadelbuy
  ```
- [ ] Test health endpoint
  ```bash
  kubectl run -it --rm api-test --image=curlimages/curl -n citadelbuy -- \
    curl http://citadelbuy-api/health
  ```
- [ ] Verify HPA is created
  ```bash
  kubectl get hpa citadelbuy-api-hpa -n citadelbuy
  ```

### Web Frontend
- [ ] Review apps/web-deployment.yaml security settings
- [ ] Verify Docker image is available
  ```bash
  docker pull citadelplatforms/citadelbuy-ecommerce:frontend-latest
  ```
- [ ] Apply web deployment
  ```bash
  kubectl apply -f apps/web-deployment.yaml
  ```
- [ ] Wait for web to be ready
  ```bash
  kubectl wait --for=condition=ready pod -l app=citadelbuy-web -n citadelbuy --timeout=300s
  ```
- [ ] Verify deployment is scaled to 3 replicas
  ```bash
  kubectl get deployment citadelbuy-web -n citadelbuy
  ```
- [ ] Verify HPA is created
  ```bash
  kubectl get hpa citadelbuy-web-hpa -n citadelbuy
  ```

## Phase 7: Verification

### Run Security Verification Script
- [ ] Execute verification script
  ```bash
  cd organization/infrastructure/kubernetes
  ./verify-security.sh
  ```
- [ ] Review and address any failures or warnings

### Manual Security Checks
- [ ] Verify all pods are running as non-root
  ```bash
  kubectl get pods -n citadelbuy -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.securityContext.runAsUser}{"\n"}{end}'
  ```
- [ ] Verify read-only root filesystems (where applicable)
  ```bash
  kubectl get deployments -n citadelbuy -o json | \
    jq '.items[] | {name: .metadata.name, readOnlyRootFilesystem: .spec.template.spec.containers[0].securityContext.readOnlyRootFilesystem}'
  ```
- [ ] Verify privilege escalation is disabled
  ```bash
  kubectl get deployments -n citadelbuy -o json | \
    jq '.items[] | {name: .metadata.name, allowPrivilegeEscalation: .spec.template.spec.containers[0].securityContext.allowPrivilegeEscalation}'
  ```
- [ ] Verify resource limits are set
  ```bash
  kubectl get deployments,statefulsets -n citadelbuy -o json | \
    jq '.items[] | {name: .metadata.name, resources: .spec.template.spec.containers[0].resources}'
  ```

### Functional Testing
- [ ] Test API health endpoint
- [ ] Test web application access
- [ ] Test database connectivity from API
- [ ] Test Redis connectivity from API
- [ ] Test Elasticsearch connectivity from API
- [ ] Verify email sending works
- [ ] Verify payment processing works (test mode)
- [ ] Test user authentication flow
- [ ] Test OAuth/social login

### Network Policy Testing
- [ ] Test that databases are NOT accessible from unauthorized pods
  ```bash
  # This should FAIL (timeout)
  kubectl run -it --rm unauthorized --image=postgres:15-alpine -n citadelbuy -- \
    psql -h postgres -U citadelbuy -d citadelbuy -c "SELECT 1"
  ```
- [ ] Test that API can access databases
  ```bash
  # Check API logs for database connection success
  kubectl logs -l app=citadelbuy-api -n citadelbuy | grep -i "database\|connection"
  ```
- [ ] Test that web can access API
- [ ] Test that monitoring exporters can scrape metrics

### Performance Testing
- [ ] Check pod resource usage
  ```bash
  kubectl top pods -n citadelbuy
  ```
- [ ] Verify autoscaling is working
  ```bash
  kubectl get hpa -n citadelbuy
  ```
- [ ] Load test API endpoints (optional)

## Phase 8: Monitoring Setup

### Prometheus (if not already deployed)
- [ ] Deploy Prometheus to citadelbuy-monitoring namespace
- [ ] Configure Prometheus to scrape CitadelBuy metrics
- [ ] Verify Prometheus is collecting metrics from exporters

### Grafana (if not already deployed)
- [ ] Deploy Grafana to citadelbuy-monitoring namespace
- [ ] Import dashboards for PostgreSQL, Redis, Elasticsearch
- [ ] Create custom dashboards for CitadelBuy application

### Alerting
- [ ] Configure alerts for:
  - [ ] Pod crashes/restarts
  - [ ] High memory/CPU usage
  - [ ] Database connection failures
  - [ ] API error rates
  - [ ] Security policy violations

## Phase 9: Documentation

- [ ] Document any custom configurations
- [ ] Update environment-specific variables
- [ ] Document secret rotation procedures
- [ ] Create runbook for common operations
- [ ] Document disaster recovery procedures
- [ ] Share deployment details with team

## Phase 10: Production Hardening (Additional)

### Additional Security Measures
- [ ] Enable audit logging on Kubernetes API server
- [ ] Configure admission controllers (OPA Gatekeeper, Kyverno)
- [ ] Set up runtime security monitoring (Falco)
- [ ] Enable etcd encryption at rest
- [ ] Configure TLS/mTLS for inter-service communication
- [ ] Implement service mesh (Istio, Linkerd) for advanced traffic management

### Compliance
- [ ] Run CIS Kubernetes benchmark scan
  ```bash
  kube-bench
  ```
- [ ] Run vulnerability scanning on images
  ```bash
  trivy image citadelplatforms/citadelbuy-ecommerce:backend-latest
  ```
- [ ] Run security posture assessment
  ```bash
  kubescape scan framework nsa
  ```
- [ ] Document compliance requirements met

### Backup and DR
- [ ] Configure backup for persistent volumes
- [ ] Test database backup/restore procedures
- [ ] Document disaster recovery plan
- [ ] Test failover procedures

## Post-Deployment

### Ongoing Maintenance
- [ ] Schedule regular security audits
- [ ] Set up automated vulnerability scanning
- [ ] Implement secret rotation schedule
- [ ] Monitor security advisories for dependencies
- [ ] Keep Kubernetes cluster updated
- [ ] Review and update network policies as needed

### Monitoring
- [ ] Set up log aggregation
- [ ] Configure security event monitoring
- [ ] Set up alerting for security incidents
- [ ] Regular review of audit logs

## Troubleshooting

If you encounter issues, refer to:
- [ ] SECURITY_HARDENING.md - Troubleshooting section
- [ ] Kubernetes events: `kubectl get events -n citadelbuy --sort-by='.lastTimestamp'`
- [ ] Pod logs: `kubectl logs <pod-name> -n citadelbuy`
- [ ] Pod descriptions: `kubectl describe pod <pod-name> -n citadelbuy`

## Sign-off

Deployment completed by: ___________________
Date: ___________________
Environment: [ ] Development [ ] Staging [ ] Production

Security review by: ___________________
Date: ___________________

Production approval by: ___________________
Date: ___________________

---

**Note**: This checklist should be used in conjunction with the SECURITY_HARDENING.md documentation. Always test in a non-production environment first.
