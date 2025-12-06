# SSL Certificates Directory

This directory contains SSL/TLS certificates for the CitadelBuy platform.

## Important Security Notice

**NEVER commit actual SSL certificates, private keys, or certificate authorities to version control!**

This directory should only contain:
- Example configuration files
- README documentation
- Scripts for certificate management

## Certificate Management

### For Development (Self-Signed Certificates)

Generate self-signed certificates for local development:

```bash
# Generate self-signed certificate (valid for 365 days)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout privkey.pem \
  -out fullchain.pem \
  -subj "/C=US/ST=State/L=City/O=CitadelBuy/CN=localhost"
```

### For Production (Let's Encrypt)

Use cert-manager in Kubernetes for automated certificate management:

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Apply ClusterIssuer for Let's Encrypt
kubectl apply -f infrastructure/kubernetes/base/cert-manager-issuer.yaml
```

Certificates will be automatically provisioned via the ingress annotations.

### For Production (Manual Certificates)

If using manually obtained certificates:

1. Obtain certificates from your CA (e.g., Let's Encrypt, DigiCert, etc.)
2. Place them in this directory (ensure `.gitignore` excludes them)
3. Update nginx configuration to reference them

**Required files:**
- `fullchain.pem` - Full certificate chain
- `privkey.pem` - Private key
- `chain.pem` - CA certificate chain (optional)

### Certificate Validation

Verify your certificates before deployment:

```bash
# Check certificate validity
openssl x509 -in fullchain.pem -text -noout

# Verify private key matches certificate
openssl x509 -noout -modulus -in fullchain.pem | openssl md5
openssl rsa -noout -modulus -in privkey.pem | openssl md5

# Check certificate expiration
openssl x509 -in fullchain.pem -noout -enddate
```

## .gitignore

Ensure the following entries are in `.gitignore`:

```
*.pem
*.key
*.crt
*.csr
*.p12
*.pfx
```

## Certificate Rotation

### Automated (Recommended)

Use cert-manager in Kubernetes for automatic renewal:
- Certificates are automatically renewed 30 days before expiration
- No manual intervention required

### Manual

If rotating certificates manually:

1. Generate or obtain new certificates
2. Update this directory with new files
3. Reload nginx: `kubectl rollout restart deployment/nginx`
4. Verify: `curl -vI https://citadelbuy.com`

## Security Best Practices

1. **Use Strong Encryption**
   - Minimum 2048-bit RSA keys (4096-bit recommended)
   - Or 256-bit ECDSA keys

2. **Enable HSTS**
   - Configured in nginx: `Strict-Transport-Security: max-age=31536000`

3. **Regular Rotation**
   - Rotate certificates annually (or per your policy)
   - Use automated renewal where possible

4. **Secure Storage**
   - Never commit private keys to Git
   - Use secrets management (Azure Key Vault, AWS Secrets Manager)
   - Restrict file permissions: `chmod 600 privkey.pem`

5. **Monitor Expiration**
   - Set up alerts 30 days before expiration
   - Use monitoring tools to track certificate status

## Troubleshooting

### Certificate Not Loading

```bash
# Check nginx syntax
nginx -t

# View nginx error logs
kubectl logs deployment/nginx -n citadelbuy

# Verify certificate paths in nginx.conf
grep ssl_certificate /etc/nginx/nginx.conf
```

### Mixed Content Warnings

Ensure all resources load over HTTPS:
- Update API URLs to use `https://`
- Enable `Content-Security-Policy` header
- Use relative URLs where possible

### Certificate Chain Issues

```bash
# Test certificate chain
openssl s_client -connect citadelbuy.com:443 -showcerts

# Verify against CA bundle
openssl verify -CAfile chain.pem fullchain.pem
```

## Additional Resources

- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [SSL Labs Server Test](https://www.ssllabs.com/ssltest/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [cert-manager Documentation](https://cert-manager.io/docs/)
