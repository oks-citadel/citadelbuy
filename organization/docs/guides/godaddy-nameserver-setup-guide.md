# Broxiva.com - GoDaddy to Azure DNS Setup Guide

## Domain Configuration: www.broxiva.com

**Domain Registrar:** GoDaddy
**Cloud Provider:** Microsoft Azure
**DNS Hosting:** Azure DNS Zone

---

## CRITICAL: Azure Nameservers

After running `terraform apply` for your production environment, Azure will generate unique nameservers for your DNS zone. These **MUST** be configured in GoDaddy.

### How to Get Your Nameservers

1. **Via Terraform Output:**
```bash
cd infrastructure/terraform/environments/prod
terraform output nameservers
```

2. **Via Azure Portal:**
   - Log into Azure Portal
   - Navigate to **DNS Zones**
   - Select **broxiva.com**
   - Copy the 4 nameservers from the overview page

3. **Via Azure CLI:**
```bash
az network dns zone show --name broxiva.com --resource-group broxiva-prod-rg --query nameServers
```

### Expected Nameserver Format

Azure nameservers typically look like:
```
ns1-XX.azure-dns.com.
ns2-XX.azure-dns.net.
ns3-XX.azure-dns.org.
ns4-XX.azure-dns.info.
```

---

## Step-by-Step GoDaddy Configuration

### STEP 1: Log Into GoDaddy

1. Go to [https://www.godaddy.com](https://www.godaddy.com)
2. Click **Sign In** in the top right corner
3. Enter your credentials
4. Navigate to **My Products** or **Domain Portfolio**

### STEP 2: Access Domain Settings

1. Find **broxiva.com** in your domain list
2. Click **Manage** or **DNS** next to the domain
3. Scroll down to find the **Nameservers** section
4. Click **Change** or **Edit Nameservers**

### STEP 3: Select Custom Nameservers

1. When prompted, select **"I'll use my own nameservers"** or **"Enter my own nameservers (advanced)"**
2. You may see a warning about leaving GoDaddy nameservers - this is expected

### STEP 4: Enter Azure Nameservers

Remove all existing GoDaddy nameservers and enter the 4 Azure nameservers:

| Field | Value (Example - Use Your Actual Values) |
|-------|------------------------------------------|
| Nameserver 1 | `ns1-XX.azure-dns.com` |
| Nameserver 2 | `ns2-XX.azure-dns.net` |
| Nameserver 3 | `ns3-XX.azure-dns.org` |
| Nameserver 4 | `ns4-XX.azure-dns.info` |

**IMPORTANT:**
- Remove the trailing dot (.) if GoDaddy requires
- Enter ALL 4 nameservers
- Double-check for typos

### STEP 5: Save and Confirm

1. Click **Save** or **Continue**
2. Confirm the nameserver change when prompted
3. GoDaddy may show a warning - proceed anyway
4. Note that changes take effect within 24-48 hours

---

## Post-Configuration Verification

### 1. Check DNS Propagation

Use online tools to verify nameserver propagation:

**Option A: DNSChecker.org**
```
https://dnschecker.org/#NS/broxiva.com
```

**Option B: WhatsMyDNS.net**
```
https://whatsmydns.net/#NS/broxiva.com
```

### 2. Command Line Verification

**Windows (Command Prompt or PowerShell):**
```powershell
nslookup -type=NS broxiva.com
nslookup broxiva.com
nslookup www.broxiva.com
nslookup api.broxiva.com
```

**Linux/Mac:**
```bash
dig NS broxiva.com
dig broxiva.com
dig www.broxiva.com
dig api.broxiva.com
```

### 3. Expected Results

After full propagation, you should see:

```
broxiva.com        nameserver = ns1-XX.azure-dns.com.
broxiva.com        nameserver = ns2-XX.azure-dns.net.
broxiva.com        nameserver = ns3-XX.azure-dns.org.
broxiva.com        nameserver = ns4-XX.azure-dns.info.

www.broxiva.com    CNAME      broxiva.azurefd.net
api.broxiva.com    CNAME      broxiva-api.azurewebsites.net
```

---

## DNS Records Overview

Once Azure DNS is configured, these records will be active:

### A Records (Root Domain)
| Name | Type | Value | TTL |
|------|------|-------|-----|
| @ | A | Azure Front Door IP | 300 |

### CNAME Records (Subdomains)
| Name | Type | Value | TTL |
|------|------|-------|-----|
| www | CNAME | Azure Front Door hostname | 300 |
| api | CNAME | broxiva-api.azurewebsites.net | 300 |
| cdn | CNAME | Azure CDN endpoint | 300 |
| staging | CNAME | Staging Front Door | 300 |
| staging-api | CNAME | Staging API endpoint | 300 |

### MX Records (Email)
| Name | Type | Priority | Value | TTL |
|------|------|----------|-------|-----|
| @ | MX | 1 | aspmx.l.google.com | 3600 |
| @ | MX | 5 | alt1.aspmx.l.google.com | 3600 |
| @ | MX | 5 | alt2.aspmx.l.google.com | 3600 |
| @ | MX | 10 | alt3.aspmx.l.google.com | 3600 |
| @ | MX | 10 | alt4.aspmx.l.google.com | 3600 |

### TXT Records (Email Security)
| Name | Type | Value | TTL |
|------|------|-------|-----|
| @ | TXT | v=spf1 include:_spf.google.com include:spf.protection.outlook.com -all | 3600 |
| @ | TXT | azure-domain-verification=... | 3600 |
| _dmarc | TXT | v=DMARC1; p=quarantine; rua=mailto:dmarc@broxiva.com | 3600 |

### CAA Records (SSL Certificates)
| Name | Type | Value | TTL |
|------|------|-------|-----|
| @ | CAA | 0 issue "digicert.com" | 3600 |
| @ | CAA | 0 issue "letsencrypt.org" | 3600 |
| @ | CAA | 0 issuewild "digicert.com" | 3600 |

---

## Troubleshooting

### Issue: "DNS not propagating"

**Causes:**
- Propagation can take up to 48 hours
- ISP DNS caching

**Solutions:**
1. Wait 24-48 hours
2. Clear local DNS cache:
   ```powershell
   # Windows
   ipconfig /flushdns

   # Mac
   sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder

   # Linux
   sudo systemd-resolve --flush-caches
   ```
3. Use different DNS servers (8.8.8.8, 1.1.1.1)

### Issue: "Website not loading"

**Causes:**
- DNS not propagated yet
- Azure resources not deployed
- Front Door not configured

**Solutions:**
1. Verify DNS resolution first
2. Check Azure Portal for resource status
3. Verify Front Door routes are configured
4. Check SSL certificate status

### Issue: "SSL certificate errors"

**Causes:**
- Certificate not provisioned yet
- CAA records blocking issuance
- DNS validation pending

**Solutions:**
1. Wait for DNS propagation
2. Verify CAA records allow your CA
3. Check Azure Front Door certificate status
4. Manually trigger certificate validation

### Issue: "Email not working"

**Causes:**
- MX records not propagated
- SPF/DKIM/DMARC misconfigured
- Email service not configured

**Solutions:**
1. Verify MX records are resolving
2. Check SPF record syntax
3. Verify DKIM key is correct
4. Check email service configuration

---

## Timeline

| Phase | Duration | Notes |
|-------|----------|-------|
| GoDaddy update | Immediate | Save nameserver changes |
| Initial propagation | 1-4 hours | Some ISPs update quickly |
| Full propagation | 24-48 hours | Worldwide DNS cache updates |
| SSL certificate | 1-24 hours | After DNS propagates |
| Full go-live | 48-72 hours | All systems operational |

---

## Support Contacts

### GoDaddy Support
- Phone: 1-480-505-8877
- Chat: Available 24/7 on godaddy.com
- Help: [https://www.godaddy.com/help](https://www.godaddy.com/help)

### Azure Support
- Portal: [https://portal.azure.com](https://portal.azure.com)
- Docs: [https://docs.microsoft.com/azure/dns](https://docs.microsoft.com/azure/dns)

### Broxiva Support
- Email: support@broxiva.com
- Status: https://status.broxiva.com

---

## Quick Reference Card

```
╔══════════════════════════════════════════════════════════════════╗
║                    BROXIVA.COM DNS SETUP                          ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  STEP 1: Get Azure Nameservers                                    ║
║  ─────────────────────────────                                    ║
║  cd infrastructure/terraform/environments/prod                     ║
║  terraform output nameservers                                      ║
║                                                                   ║
║  STEP 2: Update GoDaddy                                           ║
║  ─────────────────────────                                        ║
║  godaddy.com → My Products → broxiva.com → DNS → Nameservers     ║
║  Change to "I'll use my own nameservers"                          ║
║  Enter all 4 Azure nameservers                                    ║
║  Save changes                                                     ║
║                                                                   ║
║  STEP 3: Verify (Wait 24-48 hours)                                ║
║  ─────────────────────────────────                                ║
║  nslookup -type=NS broxiva.com                                    ║
║  Visit: https://dnschecker.org/#NS/broxiva.com                    ║
║                                                                   ║
║  STEP 4: Test                                                     ║
║  ────────────                                                     ║
║  https://www.broxiva.com                                          ║
║  https://api.broxiva.com/health                                   ║
║                                                                   ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## Checklist

- [ ] Azure infrastructure deployed with `terraform apply`
- [ ] Nameservers retrieved from Terraform output
- [ ] GoDaddy nameservers updated to Azure DNS
- [ ] Waited for DNS propagation (24-48 hours)
- [ ] Verified NS records resolve to Azure
- [ ] Verified A/CNAME records resolve correctly
- [ ] SSL certificates provisioned and active
- [ ] Website accessible at www.broxiva.com
- [ ] API accessible at api.broxiva.com
- [ ] Email configured and MX records active

---

**Document Version:** 1.0
**Last Updated:** December 2024
**Platform:** Broxiva - Premium Global E-Commerce
