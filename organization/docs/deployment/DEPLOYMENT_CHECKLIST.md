# Broxiva Deployment Checklist

## Current Status
- **Live Site:** https://broxiva.com shows placeholder only
- **Local Changes:** 570 files changed, ready to deploy
- **Infrastructure:** Terraform configured for Azure

---

## Step 1: Rotate Exposed GitHub Token (URGENT)

Your GitHub PAT is exposed in git config. Rotate it immediately:

1. Go to https://github.com/settings/tokens
2. Delete the exposed token: `github_pat_11BZJZHLY0...`
3. Create a new token
4. Update the remote:
```bash
git remote set-url github https://github.com/oks-citadel/citadelbuy.git
```

---

## Step 2: Configure GitHub Secrets

Go to your GitHub repo Settings > Secrets and variables > Actions

Add these secrets:

```
AZURE_CLIENT_ID        = <your-service-principal-client-id>
AZURE_TENANT_ID        = <your-azure-tenant-id>
AZURE_SUBSCRIPTION_ID  = <your-azure-subscription-id>
```

For OIDC authentication (recommended), also set up:
- Federated credentials in Azure AD for GitHub Actions

---

## Step 3: Provision Azure Infrastructure

### Option A: Using Azure Portal
1. Create Resource Group: `broxiva-rg`
2. Create AKS Cluster: `broxiva-aks-prod`
3. Create ACR: `broxivaacr`
4. Create Storage Account for assets

### Option B: Using Terraform (Recommended)
```bash
cd organization/infrastructure/terraform/environments/prod

# Initialize Terraform
terraform init

# Plan changes
terraform plan -out=tfplan

# Apply (creates all Azure resources)
terraform apply tfplan
```

---

## Step 4: Commit and Push Changes

```bash
cd CitadelBuy

# Add all changes
git add -A

# Commit
git commit -m "feat: implement monorepo structure, Docker best practices, and CI/CD

- Phase 1: Asset policy with assets/large for runtime mounting
- Phase 2: Standardized Dockerfiles (debian-slim, UTF-8, OCI labels)
- Phase 3: Selective build detection scripts
- Phase 4: CI build/push workflow with change detection
- Phase 5: Azure Blob/Files runtime asset strategy
- Phase 6: AKS auto-deploy workflow
- Phase 7: Frontend BuildInfo component
- Phase 8: Guardrail scripts and CI integration
- Phase 9: Local development documentation

🤖 Generated with Claude Code"

# Push to trigger CI/CD
git push origin main
```

---

## Step 5: Verify CI/CD Pipeline

After pushing:

1. Go to GitHub Actions: https://github.com/oks-citadel/citadelbuy/actions
2. Watch the `CI Build & Push to ACR (Selective)` workflow
3. Verify images are pushed to ACR
4. Watch the `CD - Deploy to AKS` workflow
5. Verify pods are running in AKS

---

## Step 6: Configure DNS

Point your domain to AKS:

```bash
# Get the AKS ingress IP
kubectl get ingress -n broxiva-prod

# Update DNS A record:
# broxiva.com -> <INGRESS_IP>
# api.broxiva.com -> <INGRESS_IP>
```

---

## Step 7: Verify Deployment

```bash
# Check pods
kubectl get pods -n broxiva-prod

# Check services
kubectl get svc -n broxiva-prod

# Check ingress
kubectl get ingress -n broxiva-prod

# Test health endpoints
curl https://broxiva.com/api/health
curl https://api.broxiva.com/api/health
```

---

## Quick Deploy Commands

```bash
# One-liner to commit and push all changes
cd CitadelBuy && git add -A && git commit -m "Deploy full Broxiva platform" && git push origin main

# Watch deployment
gh run watch

# Check AKS status
az aks get-credentials --resource-group broxiva-rg --name broxiva-aks-prod
kubectl get all -n broxiva-prod
```

---

## Troubleshooting

### CI/CD fails with "Azure login failed"
- Verify GitHub secrets are set correctly
- Check OIDC federation is configured in Azure AD

### Images not pushing to ACR
- Verify ACR exists: `az acr show --name broxivaacr`
- Check ACR credentials

### Pods not starting
- Check pod logs: `kubectl logs <pod-name> -n broxiva-prod`
- Check events: `kubectl get events -n broxiva-prod`

### Site shows old content
- Clear CDN cache
- Check ingress is pointing to new pods
- Verify DNS propagation: `nslookup broxiva.com`

---

## Expected Result

After deployment:
- https://broxiva.com → Full Next.js frontend
- https://api.broxiva.com → NestJS API
- Footer shows version, commit SHA, environment
- All 15 services running in AKS
