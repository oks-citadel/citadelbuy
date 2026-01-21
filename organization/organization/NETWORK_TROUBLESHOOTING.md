# Broxiva Platform - Network Troubleshooting Guide

This document provides comprehensive guidance for diagnosing and resolving "Failed to fetch" errors and other network connectivity issues in the Broxiva e-commerce platform.

## Table of Contents
1. [Common Causes of "Failed to Fetch" Errors](#common-causes-of-failed-to-fetch-errors)
2. [Quick Diagnostic Checklist](#quick-diagnostic-checklist)
3. [Environment-Specific Configurations](#environment-specific-configurations)
4. [AWS Infrastructure Configuration](#aws-infrastructure-configuration)
5. [Kubernetes Network Configuration](#kubernetes-network-configuration)
6. [Docker Compose Network Configuration](#docker-compose-network-configuration)
7. [Security Group Requirements](#security-group-requirements)
8. [CORS Configuration](#cors-configuration)
9. [Health Check Configuration](#health-check-configuration)
10. [Troubleshooting Commands](#troubleshooting-commands)

---

## Common Causes of "Failed to Fetch" Errors

### 1. CORS (Cross-Origin Resource Sharing) Issues

**Symptoms:**
- Browser console shows: `Access to fetch at '...' from origin '...' has been blocked by CORS policy`
- Requests work from Postman/curl but fail from browser

**Diagnosis:**
```bash
# Check CORS headers from API
curl -I -X OPTIONS https://api.broxiva.com/health \
  -H "Origin: https://broxiva.com" \
  -H "Access-Control-Request-Method: GET"
```

**Resolution:**
- Verify Kubernetes Ingress CORS annotations in `infrastructure/kubernetes/production/ingress.yaml`:
  ```yaml
  nginx.ingress.kubernetes.io/enable-cors: "true"
  nginx.ingress.kubernetes.io/cors-allow-origin: "https://broxiva.com,https://www.broxiva.com"
  nginx.ingress.kubernetes.io/cors-allow-methods: "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  nginx.ingress.kubernetes.io/cors-allow-headers: "DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization,X-CSRF-Token"
  nginx.ingress.kubernetes.io/cors-allow-credentials: "true"
  ```

### 2. SSL/TLS Certificate Issues

**Symptoms:**
- `NET::ERR_CERT_AUTHORITY_INVALID`
- `SSL_ERROR_RX_RECORD_TOO_LONG`
- HTTPS requests fail while HTTP works

**Diagnosis:**
```bash
# Check SSL certificate validity
openssl s_client -connect api.broxiva.com:443 -servername api.broxiva.com

# Verify certificate chain
curl -vvv https://api.broxiva.com/health 2>&1 | grep -A5 "SSL certificate"
```

**Resolution:**
- Ensure cert-manager is properly configured with letsencrypt-production issuer
- Verify TLS secrets exist in the correct namespace:
  ```bash
  kubectl get secrets -n broxiva-production | grep tls
  ```

### 3. DNS Resolution Failures

**Symptoms:**
- `ERR_NAME_NOT_RESOLVED`
- `getaddrinfo ENOTFOUND`

**Diagnosis:**
```bash
# Check DNS resolution
nslookup api.broxiva.com
dig api.broxiva.com

# Check Route53 records (AWS)
aws route53 list-resource-record-sets --hosted-zone-id <zone-id> | jq '.ResourceRecordSets[] | select(.Name | startswith("api"))'
```

**Resolution:**
- Verify Route53 records point to the correct ALB/EKS endpoint
- Check DNS propagation: https://www.whatsmydns.net

### 4. Network Policy Blocking Traffic

**Symptoms:**
- Connection timeouts within cluster
- Services can't communicate with each other

**Diagnosis:**
```bash
# Check network policies in namespace
kubectl get networkpolicies -n broxiva-production

# Describe specific policy
kubectl describe networkpolicy allow-api-ingress -n broxiva-production
```

**Resolution:**
- Review `infrastructure/kubernetes/production/network-policies.yaml`
- Ensure ingress rules allow traffic from ingress-nginx namespace
- Verify egress rules allow external API calls (ports 443, 80)

### 5. Security Group Misconfiguration (AWS)

**Symptoms:**
- Timeouts when accessing services
- ALB health checks failing

**Diagnosis:**
```bash
# Check ALB security group
aws ec2 describe-security-groups --group-ids <alb-sg-id>

# Check EKS security groups
aws eks describe-cluster --name broxiva-prod-eks --query 'cluster.resourcesVpcConfig.securityGroupIds'
```

**Resolution:**
- ALB Security Group must allow inbound 80/443 from 0.0.0.0/0
- ECS/EKS tasks must allow traffic from ALB security group

### 6. Service Not Ready / Health Check Failures

**Symptoms:**
- 503 Service Unavailable
- `upstream connect error or disconnect/reset before headers`

**Diagnosis:**
```bash
# Check pod health
kubectl get pods -n broxiva-production -l app=broxiva-api

# Check pod logs
kubectl logs -n broxiva-production -l app=broxiva-api --tail=100

# Check endpoints
kubectl get endpoints broxiva-api -n broxiva-production
```

**Resolution:**
- Verify health check endpoints return 200
- Check liveness/readiness probe configuration
- Ensure adequate startup time (startupProbe)

### 7. Rate Limiting / WAF Blocking

**Symptoms:**
- 429 Too Many Requests
- 403 Forbidden from specific IPs

**Diagnosis:**
```bash
# Check Nginx rate limit status (in pod)
curl -I http://localhost:4000/api/health

# Check ModSecurity/WAF logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/component=controller | grep -i "modsecurity"
```

**Resolution:**
- Review rate limit settings in ingress annotations:
  ```yaml
  nginx.ingress.kubernetes.io/limit-rps: "50"
  nginx.ingress.kubernetes.io/limit-connections: "100"
  ```
- Whitelist trusted IPs if needed

### 8. Proxy Timeout

**Symptoms:**
- 504 Gateway Timeout
- `upstream request timeout`

**Diagnosis:**
```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s https://api.broxiva.com/health
```

**Resolution:**
- Increase proxy timeouts in ingress:
  ```yaml
  nginx.ingress.kubernetes.io/proxy-read-timeout: "600"
  nginx.ingress.kubernetes.io/proxy-send-timeout: "600"
  nginx.ingress.kubernetes.io/proxy-connect-timeout: "60"
  ```

---

## Quick Diagnostic Checklist

Run through these checks in order when troubleshooting:

```bash
# 1. Check if API is reachable from the internet
curl -I https://api.broxiva.com/health

# 2. Check DNS resolution
nslookup api.broxiva.com

# 3. Check SSL certificate
echo | openssl s_client -connect api.broxiva.com:443 2>/dev/null | openssl x509 -noout -dates

# 4. Check CORS headers
curl -I -X OPTIONS https://api.broxiva.com/api/health \
  -H "Origin: https://broxiva.com" \
  -H "Access-Control-Request-Method: GET"

# 5. Check Kubernetes resources (if using EKS)
kubectl get ingress -n broxiva-production
kubectl get svc -n broxiva-production
kubectl get pods -n broxiva-production

# 6. Check ALB health (AWS)
aws elbv2 describe-target-health --target-group-arn <target-group-arn>

# 7. Check CloudWatch logs
aws logs tail /aws/eks/broxiva-prod-eks/cluster --follow

# 8. Check VPC Flow Logs for blocked traffic
aws logs filter-log-events --log-group-name /aws/vpc/broxiva-prod --filter-pattern "REJECT"
```

---

## Environment-Specific Configurations

### Development Environment

| Component | Port | Host | Notes |
|-----------|------|------|-------|
| API (NestJS) | 4000 | localhost | Direct access |
| Web (Next.js) | 3000 | localhost | Direct access |
| PostgreSQL | 5432 | localhost | Internal only |
| Redis | 6379 | localhost | Internal only |
| Elasticsearch | 9200 | localhost | Internal only |
| Nginx | 80/443 | localhost | API Gateway |

**CORS Origin:** `http://localhost:3000`

**API URL in Frontend:**
```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

### Staging Environment

| Component | Port | Host | Notes |
|-----------|------|------|-------|
| API | 4000 | api-staging.broxiva.com | Via ALB/Ingress |
| Web | 3000 | staging.broxiva.com | Via ALB/Ingress |

**CORS Origin:** `https://staging.broxiva.com`

### Production Environment

| Component | Port | Host | Notes |
|-----------|------|------|-------|
| API | 4000 | api.broxiva.com | Via ALB/Ingress |
| Web | 3000 | broxiva.com, www.broxiva.com | Via ALB/Ingress |

**CORS Origins:** `https://broxiva.com,https://www.broxiva.com`

---

## AWS Infrastructure Configuration

### VPC Architecture

```
VPC CIDR: 10.0.0.0/16

Public Subnets (ALB, NAT Gateway):
  - 10.0.0.0/24 (us-east-1a)
  - 10.0.1.0/24 (us-east-1b)
  - 10.0.2.0/24 (us-east-1c)

Private Subnets (EKS/ECS, Applications):
  - 10.0.10.0/24 (us-east-1a)
  - 10.0.11.0/24 (us-east-1b)
  - 10.0.12.0/24 (us-east-1c)

Database Subnets (RDS, ElastiCache):
  - 10.0.20.0/24 (us-east-1a)
  - 10.0.21.0/24 (us-east-1b)
  - 10.0.22.0/24 (us-east-1c)
```

### VPC Endpoints (Reduce NAT Gateway costs)

The following VPC endpoints are configured:

| Endpoint | Type | Purpose |
|----------|------|---------|
| S3 | Gateway | S3 access without NAT |
| ECR API | Interface | ECR authentication |
| ECR DKR | Interface | Docker image pull |
| Secrets Manager | Interface | Secrets access |
| CloudWatch Logs | Interface | Log streaming |

### Load Balancer Configuration

**Application Load Balancer (ALB):**
- Scheme: Internet-facing
- Subnets: Public subnets across 3 AZs
- Security Group: Allows 80/443 from 0.0.0.0/0
- HTTPS Listener: Port 443, TLS 1.2/1.3
- HTTP Listener: Port 80, redirects to HTTPS
- Idle Timeout: 60 seconds

**Target Groups:**
- API: Port 4000, Health check `/api/health/ready`
- Web: Port 3000, Health check `/api/health`

---

## Kubernetes Network Configuration

### Ingress Controller (nginx-ingress)

Location: `infrastructure/kubernetes/production/ingress.yaml`

**Key Annotations:**
```yaml
# SSL/TLS
nginx.ingress.kubernetes.io/ssl-redirect: "true"
nginx.ingress.kubernetes.io/force-ssl-redirect: "true"

# Timeouts
nginx.ingress.kubernetes.io/proxy-read-timeout: "600"
nginx.ingress.kubernetes.io/proxy-send-timeout: "600"
nginx.ingress.kubernetes.io/proxy-connect-timeout: "60"

# Rate Limiting
nginx.ingress.kubernetes.io/limit-rps: "50"
nginx.ingress.kubernetes.io/limit-connections: "100"

# CORS
nginx.ingress.kubernetes.io/enable-cors: "true"
nginx.ingress.kubernetes.io/cors-allow-origin: "https://broxiva.com,https://www.broxiva.com"

# WAF (ModSecurity)
nginx.ingress.kubernetes.io/enable-modsecurity: "true"
nginx.ingress.kubernetes.io/enable-owasp-core-rules: "true"
```

### Network Policies

Location: `infrastructure/kubernetes/production/network-policies.yaml`

**Default Deny Policy:**
- All ingress denied by default
- All egress denied by default
- DNS (port 53) explicitly allowed for all pods

**Allow Rules:**
| Policy Name | From | To | Ports |
|-------------|------|-----|-------|
| allow-ingress-to-api | ingress-nginx namespace | broxiva-api pods | 4000/TCP |
| allow-ingress-to-web | ingress-nginx namespace | broxiva-web pods | 3000/TCP |
| allow-web-to-api | broxiva-web pods | broxiva-api pods | 4000/TCP |
| allow-api-to-postgres | broxiva-api pods | postgres pods | 5432/TCP |
| allow-api-to-redis | broxiva-api pods | redis pods | 6379/TCP |
| allow-api-external | broxiva-api pods | External | 443, 80, 587, 465/TCP |

### Service Configuration

**API Service:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: broxiva-api
spec:
  type: ClusterIP
  ports:
  - port: 4000
    targetPort: 4000
    protocol: TCP
```

**Web Service:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: broxiva-web
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: 3000
    protocol: TCP
```

---

## Docker Compose Network Configuration

### Development Network

Location: `docker-compose.yml`

```yaml
networks:
  broxiva-network:
    driver: bridge
    name: broxiva-network
```

### Production Network

Location: `infrastructure/docker/docker-compose.production.yml`

```yaml
networks:
  broxiva-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
  monitoring-network:
    driver: bridge
```

### Port Mappings

| Service | Internal Port | External Port | Notes |
|---------|---------------|---------------|-------|
| nginx | 80, 443 | 80, 443 | API Gateway |
| frontend | 3000 | 3000 | Next.js |
| backend | 4000 | 4000 | NestJS API |
| postgres | 5432 | NOT EXPOSED | Internal only |
| redis | 6379 | NOT EXPOSED | Internal only |
| elasticsearch | 9200, 9300 | NOT EXPOSED | Internal only |
| rabbitmq | 5672, 15672 | NOT EXPOSED | Internal only |

---

## Security Group Requirements

### ALB Security Group

**Inbound Rules:**
| Type | Port | Source | Description |
|------|------|--------|-------------|
| HTTP | 80 | 0.0.0.0/0 | HTTP traffic (redirects to HTTPS) |
| HTTPS | 443 | 0.0.0.0/0 | HTTPS traffic |

**Outbound Rules:**
| Type | Port | Destination | Description |
|------|------|-------------|-------------|
| All TCP | 0-65535 | VPC CIDR (10.0.0.0/16) | Traffic to targets |

### EKS/ECS Tasks Security Group

**Inbound Rules:**
| Type | Port | Source | Description |
|------|------|--------|-------------|
| All TCP | 0-65535 | ALB Security Group | Traffic from ALB |
| All TCP | 0-65535 | Self | Inter-service communication |
| All TCP | 0-65535 | VPC CIDR | Service discovery |

**Outbound Rules:**
| Type | Port | Destination | Description |
|------|------|-------------|-------------|
| All Traffic | All | 0.0.0.0/0 | External APIs, package downloads |

### Database Security Group

**Inbound Rules:**
| Type | Port | Source | Description |
|------|------|--------|-------------|
| PostgreSQL | 5432 | EKS Security Group | Database access from apps |
| PostgreSQL | 5432 | ECS Tasks Security Group | Database access from ECS |

**Outbound Rules:**
| Type | Port | Destination | Description |
|------|------|-------------|-------------|
| DNS | 53 | kube-system namespace | DNS resolution only |

### Redis Security Group

**Inbound Rules:**
| Type | Port | Source | Description |
|------|------|--------|-------------|
| Custom TCP | 6379 | EKS Security Group | Redis access from apps |
| Custom TCP | 6379 | ECS Tasks Security Group | Redis access from ECS |

---

## CORS Configuration

### Backend Configuration (NestJS)

Location: `apps/api/src/main.ts`

```typescript
app.enableCors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  credentials: true,
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-CSRF-Token',
  ],
});
```

### Environment Variables

```env
# Development
CORS_ORIGIN=http://localhost:3000

# Staging
CORS_ORIGIN=https://staging.broxiva.com

# Production
CORS_ORIGIN=https://broxiva.com,https://www.broxiva.com
```

### Nginx CORS Headers

Location: `infrastructure/nginx/nginx.conf`

```nginx
add_header 'Access-Control-Allow-Origin' '$http_origin' always;
add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, PATCH, DELETE, OPTIONS' always;
add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
add_header 'Access-Control-Allow-Credentials' 'true' always;

if ($request_method = 'OPTIONS') {
    add_header 'Access-Control-Max-Age' 1728000;
    add_header 'Content-Type' 'text/plain; charset=utf-8';
    add_header 'Content-Length' 0;
    return 204;
}
```

---

## Health Check Configuration

### Kubernetes Health Probes

Location: `infrastructure/kubernetes/production/api-deployment.yaml`

**API Health Checks:**
```yaml
livenessProbe:
  httpGet:
    path: /api/health/live
    port: 4000
  initialDelaySeconds: 60
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /api/health/ready
    port: 4000
  initialDelaySeconds: 20
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3

startupProbe:
  httpGet:
    path: /api/health/live
    port: 4000
  initialDelaySeconds: 0
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 30
```

### ALB Target Group Health Checks

```hcl
health_check {
  enabled             = true
  healthy_threshold   = 2
  unhealthy_threshold = 3
  timeout             = 10
  interval            = 30
  path                = "/health"
  port                = "traffic-port"
  protocol            = "HTTP"
  matcher             = "200-299"
}
```

### Docker Compose Health Checks

```yaml
healthcheck:
  test: ['CMD', 'curl', '-f', 'http://localhost:4000/api/health']
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 60s
```

---

## Troubleshooting Commands

### Kubernetes Commands

```bash
# Check ingress status
kubectl get ingress -n broxiva-production -o wide

# Check ingress controller logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/component=controller --tail=100

# Check pod status and events
kubectl describe pod -n broxiva-production -l app=broxiva-api

# Check service endpoints
kubectl get endpoints -n broxiva-production

# Check network policies
kubectl get networkpolicies -n broxiva-production -o yaml

# Test connectivity from within cluster
kubectl run test-pod --rm -it --image=busybox --restart=Never -- wget -qO- http://broxiva-api:4000/health

# Check DNS resolution in cluster
kubectl run test-dns --rm -it --image=busybox --restart=Never -- nslookup broxiva-api.broxiva-production.svc.cluster.local
```

### AWS CLI Commands

```bash
# Check ALB status
aws elbv2 describe-load-balancers --names broxiva-prod-alb

# Check target group health
aws elbv2 describe-target-health --target-group-arn <arn>

# Check security group rules
aws ec2 describe-security-groups --group-ids <sg-id> --query 'SecurityGroups[0].IpPermissions'

# Check VPC Flow Logs for rejected traffic
aws logs filter-log-events \
  --log-group-name /aws/vpc/broxiva-prod \
  --filter-pattern "REJECT" \
  --start-time $(date -d '1 hour ago' +%s000)

# Check Route53 records
aws route53 list-resource-record-sets --hosted-zone-id <zone-id>

# Check CloudWatch alarms
aws cloudwatch describe-alarms --alarm-name-prefix broxiva
```

### Docker Commands

```bash
# Check container network
docker network inspect broxiva-network

# Check container logs
docker logs broxiva-backend --tail=100 -f

# Test connectivity between containers
docker exec broxiva-backend curl -I http://postgres:5432

# Check exposed ports
docker port broxiva-nginx
```

### General Network Commands

```bash
# Check DNS resolution
dig api.broxiva.com
nslookup api.broxiva.com

# Check SSL certificate
echo | openssl s_client -connect api.broxiva.com:443 2>/dev/null | openssl x509 -noout -dates -issuer -subject

# Check HTTP response with timing
curl -w "\n\nDNS: %{time_namelookup}s\nConnect: %{time_connect}s\nTLS: %{time_appconnect}s\nStart: %{time_starttransfer}s\nTotal: %{time_total}s\n" \
  -o /dev/null -s https://api.broxiva.com/health

# Test CORS preflight
curl -I -X OPTIONS https://api.broxiva.com/api/health \
  -H "Origin: https://broxiva.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization"

# Check for blocked ports
nc -zv api.broxiva.com 443

# Trace route to API
traceroute api.broxiva.com
```

---

## Common Resolution Patterns

### Pattern 1: Frontend Can't Reach API

1. Check browser console for specific error
2. Verify API URL in frontend environment variables
3. Test API directly with curl
4. Check CORS configuration
5. Verify SSL certificates

### Pattern 2: Services Can't Communicate in Kubernetes

1. Check network policies allow traffic
2. Verify service names and ports
3. Check DNS resolution works
4. Verify pods are running and healthy
5. Check security group rules (if using AWS CNI)

### Pattern 3: Intermittent Connection Failures

1. Check for rate limiting
2. Verify health check configuration
3. Check for resource constraints (CPU/memory)
4. Review auto-scaling settings
5. Check for connection pool exhaustion

### Pattern 4: Slow Response Times

1. Check proxy timeouts
2. Review database query performance
3. Check for memory pressure
4. Review CDN caching
5. Check for network congestion

---

## Contact Information

For infrastructure issues:
- DevOps Team: devops@broxiva.com
- On-Call: PagerDuty rotation

For application issues:
- Backend Team: backend@broxiva.com
- Frontend Team: frontend@broxiva.com
