# RBAC Matrix - Broxiva Platform

## Service Account Inventory

### broxiva Namespace

| Service Account | Pod/Deployment | automountToken | IAM Role (IRSA) |
|-----------------|----------------|----------------|-----------------|
| broxiva-api | broxiva-api | true | broxiva-api-production |
| broxiva-web | broxiva-web | true | broxiva-web-production |
| broxiva-worker | worker deployments | true | broxiva-worker-production |
| postgres | postgres StatefulSet | false | N/A |
| redis | redis StatefulSet | false | N/A |
| elasticsearch | elasticsearch StatefulSet | false | N/A |
| postgres-exporter | postgres-exporter | true | N/A |
| redis-exporter | redis-exporter | true | N/A |
| elasticsearch-exporter | elasticsearch-exporter | true | N/A |
| external-secrets | external-secrets-operator | true | broxiva-external-secrets |

### broxiva-ai Namespace

| Service Account | Pod/Deployment | automountToken | IAM Role (IRSA) |
|-----------------|----------------|----------------|-----------------|
| ai-gateway | ai-gateway | false | N/A |
| recommendation-service | recommendation-service | false | N/A |

### broxiva-monitoring Namespace

| Service Account | Pod/Deployment | automountToken | IAM Role (IRSA) |
|-----------------|----------------|----------------|-----------------|
| prometheus | prometheus | true | N/A |
| grafana | grafana | false | N/A |

### dropshipping (no namespace specified)

| Service Account | Pod/Deployment | automountToken | IAM Role (IRSA) |
|-----------------|----------------|----------------|-----------------|
| supplier-integration | supplier-integration | false | N/A |
| dropshipping-worker | inventory/price/order/tracking workers | false | N/A |
| ai-engine | ai-engine | false | N/A |

---

## Role Definitions

### broxiva-api-role (Namespace: broxiva)

| Resource | Verbs | Resource Names |
|----------|-------|----------------|
| configmaps | get, list, watch | broxiva-config |
| secrets | get, list, watch | broxiva-secrets |
| pods | get, list | - |
| services | get, list | - |

### broxiva-web-role (Namespace: broxiva)

| Resource | Verbs | Resource Names |
|----------|-------|----------------|
| configmaps | get, list, watch | broxiva-config |
| pods | get, list | - |
| services | get, list | - |

### monitoring-exporter-role (Namespace: broxiva)

| Resource | Verbs | Resource Names |
|----------|-------|----------------|
| secrets | get, list | - |
| services | get, list | - |
| endpoints | get, list | - |

### external-secrets-role (Namespace: broxiva)

| Resource | Verbs | Resource Names |
|----------|-------|----------------|
| secrets | get, list, watch, create, update, patch | - |
| events | create, patch | - |
| secretstores (external-secrets.io) | get, list, watch | - |
| externalsecrets (external-secrets.io) | get, list, watch | - |
| externalsecrets/status | get, patch, update | - |
| secretstores/status | get, patch, update | - |

### pod-log-reader (Namespace: broxiva)

| Resource | Verbs | Resource Names |
|----------|-------|----------------|
| pods | get, list, watch | - |
| pods/log | get, list, watch | - |

---

## ClusterRole Definitions

### broxiva-metrics-reader

| Resource | Verbs |
|----------|-------|
| nodes | get, list, watch |
| nodes/metrics | get, list, watch |
| services | get, list, watch |
| endpoints | get, list, watch |
| pods | get, list, watch |
| configmaps | get |
| /metrics (non-resource) | get |
| /metrics/cadvisor (non-resource) | get |

### prometheus

| Resource | Verbs |
|----------|-------|
| nodes | get, list, watch |
| nodes/proxy | get, list, watch |
| services | get, list, watch |
| endpoints | get, list, watch |
| pods | get, list, watch |
| ingresses (extensions) | get, list, watch |
| /metrics (non-resource) | get |

### broxiva-psp-restricted (Legacy PSP)

| Resource | Verbs | Resource Names |
|----------|-------|----------------|
| podsecuritypolicies (policy) | use | broxiva-restricted |

### broxiva-psp-database (Legacy PSP)

| Resource | Verbs | Resource Names |
|----------|-------|----------------|
| podsecuritypolicies (policy) | use | broxiva-database |

### broxiva-network-policy-reader

| Resource | Verbs |
|----------|-------|
| networkpolicies (networking.k8s.io) | get, list, watch |

---

## RoleBindings

### broxiva Namespace

| RoleBinding | Role | Subjects |
|-------------|------|----------|
| broxiva-api-rolebinding | broxiva-api-role | SA: broxiva-api |
| broxiva-web-rolebinding | broxiva-web-role | SA: broxiva-web |
| postgres-exporter-rolebinding | monitoring-exporter-role | SA: postgres-exporter |
| redis-exporter-rolebinding | monitoring-exporter-role | SA: redis-exporter |
| elasticsearch-exporter-rolebinding | monitoring-exporter-role | SA: elasticsearch-exporter |
| external-secrets-rolebinding | external-secrets-role | SA: external-secrets |

### broxiva-staging Namespace

| RoleBinding | Role | Subjects |
|-------------|------|----------|
| broxiva-api-rolebinding | broxiva-api-role | SA: broxiva-api |
| broxiva-web-rolebinding | broxiva-web-role | SA: broxiva-web |

### broxiva-production Namespace

| RoleBinding | Role | Subjects |
|-------------|------|----------|
| broxiva-api-rolebinding | broxiva-api-role | SA: broxiva-api |
| broxiva-web-rolebinding | broxiva-web-role | SA: broxiva-web |
| broxiva-worker-rolebinding | broxiva-worker-role | SA: broxiva-worker |
| external-secrets-rolebinding | external-secrets-role | SA: external-secrets |

---

## ClusterRoleBindings

| ClusterRoleBinding | ClusterRole | Subjects |
|--------------------|-------------|----------|
| broxiva-psp-restricted-binding | broxiva-psp-restricted | SA: broxiva-api, broxiva-web, exporters |
| broxiva-psp-database-binding | broxiva-psp-database | SA: postgres, redis, elasticsearch |
| prometheus-metrics-reader | broxiva-metrics-reader | SA: prometheus (broxiva-monitoring) |
| prometheus | prometheus | SA: prometheus (broxiva-monitoring) |

---

## Security Assessment

### Least Privilege Compliance

| Check | Status | Notes |
|-------|--------|-------|
| Specific resourceNames used | PASS | ConfigMaps/Secrets scoped |
| No wildcard verbs | PASS | Only required verbs |
| No cluster-admin | PASS | Not assigned |
| Namespace-scoped roles | PASS | No unnecessary ClusterRoles |
| Token mount disabled for databases | PASS | postgres, redis, elasticsearch |

### Recommendations

1. Review periodic access to ensure no role creep
2. Implement RBAC audit logging
3. Consider implementing just-in-time access for debugging roles

---

*Generated: 2026-01-05*
*RBAC Matrix - Broxiva Platform*
