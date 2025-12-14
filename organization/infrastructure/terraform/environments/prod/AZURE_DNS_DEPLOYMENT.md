# Azure DNS Zone Deployment for broxiva.com

## Overview

This document provides step-by-step instructions for deploying the Azure DNS zone for broxiva.com and configuring GoDaddy nameservers.

---

## Prerequisites

1. Azure CLI installed and authenticated
2. Terraform >= 1.5.0 installed
3. Access to Azure subscription
4. Access to GoDaddy account for broxiva.com

---

## Step 1: Initialize Terraform

```bash
cd infrastructure/terraform/environments/prod

# Initialize Terraform with Azure backend
terraform init \
  -backend-config="resource_group_name=broxiva-tfstate-rg" \
  -backend-config="storage_account_name=broxivatfstate" \
  -backend-config="container_name=tfstate" \
  -backend-config="key=prod.terraform.tfstate"
```

---

## Step 2: Create terraform.tfvars

Create `terraform.tfvars` with the following content:

```hcl
# Production Environment Configuration
environment     = "prod"
project_name    = "broxiva"
location        = "eastus"

# DNS Configuration
domain_name     = "broxiva.com"
enable_dns_zone = true

# Resource Tags
tags = {
  Environment = "production"
  Project     = "broxiva"
  ManagedBy   = "terraform"
  CostCenter  = "platform"
}
```

---

## Step 3: Deploy DNS Zone

```bash
# Plan the deployment
terraform plan -out=dns.tfplan

# Apply the changes
terraform apply dns.tfplan
```

---

## Step 4: Retrieve Azure Nameservers

After successful deployment, retrieve the nameservers:

```bash
# Get nameservers from Terraform output
terraform output nameservers

# Or get formatted instructions
terraform output nameservers_formatted

# Or use Azure CLI directly
az network dns zone show \
  --name broxiva.com \
  --resource-group broxiva-prod-rg \
  --query nameServers \
  --output tsv
```

**Expected Output:**
```
ns1-XX.azure-dns.com.
ns2-XX.azure-dns.net.
ns3-XX.azure-dns.org.
ns4-XX.azure-dns.info.
```

---

## Step 5: Configure GoDaddy

### 5.1 Log into GoDaddy

1. Go to https://www.godaddy.com
2. Sign in to your account
3. Navigate to "My Products"
4. Find broxiva.com and click "Manage"

### 5.2 Update Nameservers

1. Scroll to "Nameservers" section
2. Click "Change" or "Edit"
3. Select "I'll use my own nameservers"
4. Remove existing GoDaddy nameservers
5. Add Azure nameservers (from Step 4):
   - ns1-XX.azure-dns.com
   - ns2-XX.azure-dns.net
   - ns3-XX.azure-dns.org
   - ns4-XX.azure-dns.info
6. Click "Save"

### 5.3 Confirmation

GoDaddy will display a warning about DNS propagation. This is normal.

---

## Step 6: Verify DNS Propagation

DNS propagation takes 24-48 hours. Use these methods to check:

### Online Tools

- https://dnschecker.org/#NS/broxiva.com
- https://www.whatsmydns.net/#NS/broxiva.com

### Command Line

```bash
# Check nameserver records
nslookup -type=NS broxiva.com

# Expected: Azure nameservers
# ns1-XX.azure-dns.com
# ns2-XX.azure-dns.net
# ...

# Check A record (after front door is configured)
nslookup broxiva.com

# Check specific records
dig broxiva.com NS +short
dig broxiva.com A +short
dig api.broxiva.com CNAME +short
```

---

## Step 7: Post-Deployment Verification

### Verify DNS Zone in Azure Portal

1. Go to Azure Portal
2. Navigate to DNS zones
3. Select broxiva.com
4. Verify all records are present:
   - NS records (auto-created)
   - SOA record (auto-created)
   - A record for @ (root domain)
   - CNAME for www
   - CNAME for api
   - CNAME for cdn
   - TXT records (SPF, DKIM, DMARC)

### Verify SSL/TLS

Once DNS propagates:

```bash
# Test HTTPS
curl -I https://broxiva.com
curl -I https://www.broxiva.com
curl -I https://api.broxiva.com

# Check SSL certificate
openssl s_client -connect broxiva.com:443 -servername broxiva.com
```

---

## Troubleshooting

### DNS Not Propagating

1. Wait 24-48 hours for full propagation
2. Check GoDaddy nameserver configuration
3. Verify no typos in nameserver entries
4. Clear local DNS cache: `ipconfig /flushdns`

### Records Not Resolving

1. Verify records exist in Azure DNS zone
2. Check TTL values (lower = faster propagation)
3. Ensure Front Door IP is correctly configured

### SSL Certificate Issues

1. Verify domain validation in Azure
2. Check CAA records allow certificate issuance
3. Wait for certificate provisioning (up to 1 hour)

---

## DNS Records Reference

| Record | Name | Type | Value |
|--------|------|------|-------|
| Root | @ | A | Front Door IP |
| WWW | www | CNAME | broxiva.com or Front Door |
| API | api | CNAME | API endpoint |
| CDN | cdn | CNAME | CDN endpoint |
| Staging | staging | CNAME | Staging endpoint |
| SPF | @ | TXT | v=spf1 include:sendgrid.net ~all |
| DMARC | _dmarc | TXT | v=DMARC1; p=quarantine; ... |

---

## Support Contacts

- **Azure Support:** Azure Portal > Help + Support
- **GoDaddy Support:** support.godaddy.com
- **Internal Team:** devops@broxiva.com

---

*Azure DNS Deployment Guide v1.0*
*Broxiva Infrastructure Team*
