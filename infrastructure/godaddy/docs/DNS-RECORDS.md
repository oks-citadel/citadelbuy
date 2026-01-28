# Broxiva DNS Records Configuration

## Target DNS Configuration for GoDaddy

After migration, your GoDaddy DNS zone should contain ONLY these records:

### Primary A Records

| Type | Host | Points To | TTL | Purpose |
|------|------|-----------|-----|---------|
| A | @ | `YOUR_SERVER_IP` | 3600 | Root domain (redirects to www) |
| A | www | `YOUR_SERVER_IP` | 3600 | Frontend application |
| A | api | `YOUR_SERVER_IP` | 3600 | Backend API |

### Email Records (If using email)

| Type | Host | Points To | TTL | Purpose |
|------|------|-----------|-----|---------|
| MX | @ | `mail.broxiva.com` | 3600 | Mail server (if applicable) |
| TXT | @ | `v=spf1 include:_spf.google.com ~all` | 3600 | SPF record |
| TXT | _dmarc | `v=DMARC1; p=quarantine; rua=mailto:dmarc@broxiva.com` | 3600 | DMARC policy |

### Optional Records

| Type | Host | Points To | TTL | Purpose |
|------|------|-----------|-----|---------|
| CNAME | status | `stats.uptimerobot.com` | 3600 | Status page |
| TXT | @ | `google-site-verification=...` | 3600 | Google verification |

---

## Migration Timeline

### T-48h: Lower TTL

1. Change all A record TTLs from current value to **60 seconds**
2. This allows faster propagation during cutover

```
Before: A www → Vercel_IP TTL=3600
After:  A www → Vercel_IP TTL=60
```

### T-0: Cutover

1. Update A records to point to GoDaddy server IP
2. Keep TTL at 60 seconds

```
Before: A www → Vercel_IP TTL=60
After:  A www → GoDaddy_IP TTL=60
```

### T+48h: Stabilize

1. After confirming stability, increase TTL back to 3600 (1 hour)
2. Lock DNS configuration

```
Before: A www → GoDaddy_IP TTL=60
After:  A www → GoDaddy_IP TTL=3600
```

---

## GoDaddy DNS Configuration Steps

### Step 1: Access DNS Management

1. Log into https://dss.godaddy.com
2. Select "broxiva.com"
3. Click "DNS" or "Manage DNS"

### Step 2: Remove Old Records

Delete any records pointing to:
- Vercel IPs (76.76.21.x, etc.)
- Railway domains (*.up.railway.app)
- Old CNAME records for www

### Step 3: Add New A Records

Click "Add" and create:

**Root domain (@):**
- Type: A
- Host: @
- Points to: `YOUR_SERVER_IP`
- TTL: 1 Hour (or Custom: 60 for cutover)

**WWW subdomain:**
- Type: A
- Host: www
- Points to: `YOUR_SERVER_IP`
- TTL: 1 Hour

**API subdomain:**
- Type: A
- Host: api
- Points to: `YOUR_SERVER_IP`
- TTL: 1 Hour

### Step 4: Save Changes

1. Click "Save"
2. Changes typically propagate within 5-30 minutes globally

---

## Verification Commands

### Check DNS Resolution

```bash
# From server
dig +short broxiva.com
dig +short www.broxiva.com
dig +short api.broxiva.com

# Check nameservers
dig NS broxiva.com

# Full record check
dig ANY broxiva.com
```

### Check Global Propagation

Use these online tools:
- https://www.whatsmydns.net
- https://dnschecker.org
- https://www.dnswatch.info

### Expected Results

```
$ dig +short www.broxiva.com
YOUR_SERVER_IP

$ dig +short api.broxiva.com
YOUR_SERVER_IP
```

---

## Troubleshooting

### DNS Not Propagating

1. Clear local DNS cache:
   ```bash
   # Windows
   ipconfig /flushdns

   # macOS
   sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder

   # Linux
   sudo systemd-resolve --flush-caches
   ```

2. Check if GoDaddy nameservers are authoritative:
   ```bash
   dig NS broxiva.com
   ```

3. Verify record was actually saved in GoDaddy dashboard

### Wrong IP Resolving

1. Wait for TTL to expire
2. Check if old CNAME records exist
3. Verify A record priority

### SSL Certificate Issues

SSL certificate issuance requires DNS to be pointing correctly.

```bash
# Test DNS before Certbot
dig +short www.broxiva.com

# If correct, run Certbot
certbot certonly -d broxiva.com -d www.broxiva.com -d api.broxiva.com
```

---

## Records to REMOVE

After migration, ensure these records are deleted:

| Type | Host | Current Points To | Action |
|------|------|-------------------|--------|
| CNAME | www | cname.vercel-dns.com | DELETE |
| A | @ | 76.76.21.x (Vercel) | DELETE |
| CNAME | api | *.up.railway.app | DELETE |

---

## Final Checklist

- [ ] A @ → GoDaddy IP
- [ ] A www → GoDaddy IP
- [ ] A api → GoDaddy IP
- [ ] No Vercel CNAMEs remaining
- [ ] No Railway references remaining
- [ ] TTL set to 3600+ (after stabilization)
- [ ] SSL certificates issued and working
