# Quick Start Guide

Get your CitadelBuy infrastructure up and running in minutes.

## Prerequisites

```bash
# Install Terraform
terraform version  # Should be >= 1.0

# Install cloud CLI
az --version      # For Azure
aws --version     # For AWS

# Install kubectl
kubectl version
```

## 5-Minute Setup

### Step 1: Choose Your Cloud Provider

Create `terraform.tfvars` in your environment directory:

**For Azure:**
```hcl
cloud_provider        = "azure"
azure_subscription_id = "YOUR_SUBSCRIPTION_ID"
azure_tenant_id       = "YOUR_TENANT_ID"
db_admin_password     = "SecurePassword123!"
oncall_email          = "oncall@yourdomain.com"
team_email            = "team@yourdomain.com"
```

**For AWS:**
```hcl
cloud_provider    = "aws"
aws_region        = "us-east-1"
db_admin_password = "SecurePassword123!"
oncall_email      = "oncall@yourdomain.com"
team_email        = "team@yourdomain.com"
```

### Step 2: Initialize Terraform

```bash
cd environments/dev  # or staging, prod
terraform init
```

### Step 3: Review and Deploy

```bash
# See what will be created
terraform plan

# Deploy infrastructure
terraform apply
```

Type `yes` when prompted.

### Step 4: Get Kubernetes Credentials

**Azure:**
```bash
az aks get-credentials \
  --resource-group citadelbuy-dev-rg \
  --name citadelbuy-dev-aks

kubectl get nodes
```

**AWS:**
```bash
aws eks update-kubeconfig \
  --region us-east-1 \
  --name citadelbuy-dev-eks

kubectl get nodes
```

### Step 5: Get Connection Strings

```bash
# Database endpoint
terraform output database_endpoint

# Redis endpoint
terraform output redis_endpoint

# Container registry URL
terraform output container_registry_url
```

## Environment-Specific Deployment

### Development

```bash
cd environments/dev
terraform apply -var-file=dev.tfvars
```

**Characteristics:**
- Minimal resources (1-2 nodes)
- Single-zone deployment
- No high availability
- Cost: ~$200-300/month

### Staging

```bash
cd environments/staging
terraform apply -var-file=staging.tfvars
```

**Characteristics:**
- Medium resources (2-5 nodes)
- Multi-zone deployment
- Basic high availability
- Cost: ~$500-800/month

### Production

```bash
cd environments/prod
terraform apply -var-file=prod.tfvars
```

**Characteristics:**
- Large resources (3-20 nodes)
- Multi-zone with auto-scaling
- Full high availability
- Cost: ~$2000-5000/month

## Common Tasks

### Deploy Application to Kubernetes

```bash
# Build and push image
docker build -t myapp:latest .
docker tag myapp:latest ${REGISTRY_URL}/myapp:latest
docker push ${REGISTRY_URL}/myapp:latest

# Deploy
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
```

### Access Database

```bash
# Get connection details
DB_HOST=$(terraform output -raw database_endpoint)
DB_NAME="citadelbuy_dev"
DB_USER="citadeladmin"
DB_PASS="YourPasswordHere"

# Connect with psql
psql "postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}/${DB_NAME}"
```

### View Logs

**Azure:**
```bash
# Application Insights
az monitor app-insights query \
  --app citadelbuy-dev-appinsights \
  --analytics-query "requests | limit 100"
```

**AWS:**
```bash
# CloudWatch Logs
aws logs tail /aws/application/citadelbuy-dev --follow
```

### Scale Kubernetes Cluster

```bash
# Update variables.tf or terraform.tfvars
user_node_min = 5
user_node_max = 15

# Apply changes
terraform apply
```

## Switching Clouds

### From Azure to AWS

1. Update `terraform.tfvars`:
```hcl
cloud_provider = "aws"
aws_region = "us-east-1"
```

2. Re-initialize:
```bash
terraform init -reconfigure
```

3. Plan and apply:
```bash
terraform plan
terraform apply
```

### From AWS to Azure

1. Update `terraform.tfvars`:
```hcl
cloud_provider = "azure"
azure_subscription_id = "xxx"
azure_tenant_id = "xxx"
```

2. Re-initialize:
```bash
terraform init -reconfigure
```

3. Plan and apply:
```bash
terraform plan
terraform apply
```

## Cleanup

### Destroy Everything

```bash
# Review what will be destroyed
terraform plan -destroy

# Destroy all resources
terraform destroy
```

Type `yes` when prompted.

**Warning:** This will delete all resources including databases and storage. Make sure you have backups!

### Destroy Specific Resources

```bash
# Destroy only compute resources
terraform destroy -target=module.compute

# Destroy only database
terraform destroy -target=module.database
```

## Troubleshooting

### Issue: State Lock

```bash
# Azure
az storage blob lease break \
  --container-name tfstate \
  --blob-name dev.terraform.tfstate \
  --account-name citadelbuytfstate

# AWS
aws dynamodb delete-item \
  --table-name terraform-state-lock \
  --key '{"LockID":{"S":"citadelbuy-dev"}}'
```

### Issue: Authentication Failed

**Azure:**
```bash
az login
az account set --subscription YOUR_SUBSCRIPTION_ID
```

**AWS:**
```bash
aws configure
# Or
export AWS_ACCESS_KEY_ID="xxx"
export AWS_SECRET_ACCESS_KEY="xxx"
```

### Issue: Quota Exceeded

Contact cloud provider to increase quotas:

**Azure:**
```bash
az vm list-usage --location eastus
```

**AWS:**
```bash
aws service-quotas get-service-quota \
  --service-code eks \
  --quota-code L-1194D53C
```

### Issue: Plan Shows Many Changes

```bash
# Refresh state
terraform refresh

# If still showing changes, review the plan carefully
terraform plan -out=tfplan
terraform show tfplan
```

## Best Practices

### 1. Always Use Version Control

```bash
git add terraform.tfvars
git commit -m "Update infrastructure configuration"
git push
```

### 2. Use Remote State

Already configured in `backend` block:

**Azure:**
```hcl
backend "azurerm" {
  resource_group_name  = "citadelbuy-tfstate-rg"
  storage_account_name = "citadelbuytfstate"
  container_name       = "tfstate"
  key                  = "dev.terraform.tfstate"
}
```

**AWS:**
```hcl
backend "s3" {
  bucket         = "citadelbuy-tfstate"
  key            = "dev/terraform.tfstate"
  region         = "us-east-1"
  dynamodb_table = "terraform-state-lock"
}
```

### 3. Use Workspaces for Environments

```bash
terraform workspace new dev
terraform workspace new staging
terraform workspace new prod

terraform workspace select dev
```

### 4. Plan Before Apply

```bash
# Always review changes
terraform plan -out=tfplan

# Apply the plan
terraform apply tfplan
```

### 5. Enable Debug Logging When Needed

```bash
export TF_LOG=DEBUG
export TF_LOG_PATH=./terraform.log
terraform apply
```

## Next Steps

1. ✅ Infrastructure deployed
2. 📦 Deploy applications to Kubernetes
3. 🔐 Configure secrets in Key Vault/Secrets Manager
4. 📊 Set up dashboards and alerts
5. 🚀 Configure CI/CD pipelines
6. 📖 Review full documentation in README.md

## Getting Help

- **Documentation**: See [README.md](./README.md)
- **Module Details**: See [modules/README.md](./modules/README.md)
- **Issues**: Check logs and run `terraform plan`
- **Support**: Contact platform team on Slack #infrastructure

## Common Commands Reference

```bash
# Initialize
terraform init

# Validate configuration
terraform validate

# Format code
terraform fmt -recursive

# Plan changes
terraform plan

# Apply changes
terraform apply

# Show current state
terraform show

# List resources
terraform state list

# Get outputs
terraform output

# Destroy resources
terraform destroy

# Refresh state
terraform refresh

# Import existing resource
terraform import <resource_type>.<name> <id>

# Taint resource (force recreation)
terraform taint <resource>

# Untaint resource
terraform untaint <resource>
```

---

**Ready to deploy?** Start with the development environment and work your way up to production!
