#!/bin/bash

##############################################################################
# Elasticsearch SSL Certificate Generation Script
# CitadelBuy E-Commerce Platform
##############################################################################
# This script generates SSL certificates for Elasticsearch cluster:
# 1. Creates Certificate Authority (CA)
# 2. Generates certificates for each node
# 3. Generates certificates for HTTP layer (optional)
##############################################################################

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERT_DIR="$SCRIPT_DIR/../infrastructure/docker/elasticsearch/certificates"
CA_DIR="$CERT_DIR/ca"

# Node names
NODES=("es-node-01" "es-node-02" "es-node-03")

# Create directories
mkdir -p "$CA_DIR"
for node in "${NODES[@]}"; do
    mkdir -p "$CERT_DIR/$node"
done

echo ""
echo "=========================================="
echo "  Elasticsearch SSL Certificate Setup"
echo "=========================================="
echo ""

##############################################################################
# Generate Certificate Authority (CA)
##############################################################################

log_info "Generating Certificate Authority..."

# Generate CA private key
openssl genrsa -out "$CA_DIR/ca.key" 4096

# Generate CA certificate
openssl req -new -x509 -days 3650 -key "$CA_DIR/ca.key" -out "$CA_DIR/ca.crt" \
    -subj "/C=US/ST=State/L=City/O=CitadelBuy/OU=IT/CN=CitadelBuy Elasticsearch CA"

log_success "Certificate Authority created"

##############################################################################
# Generate Node Certificates
##############################################################################

for node in "${NODES[@]}"; do
    log_info "Generating certificate for $node..."

    NODE_DIR="$CERT_DIR/$node"

    # Generate private key
    openssl genrsa -out "$NODE_DIR/$node.key" 2048

    # Generate Certificate Signing Request (CSR)
    openssl req -new -key "$NODE_DIR/$node.key" -out "$NODE_DIR/$node.csr" \
        -subj "/C=US/ST=State/L=City/O=CitadelBuy/OU=IT/CN=$node"

    # Create extensions file for SAN (Subject Alternative Names)
    cat > "$NODE_DIR/$node.ext" << EOF
subjectAltName = DNS:$node,DNS:localhost,DNS:citadelbuy-elasticsearch-01,DNS:citadelbuy-elasticsearch-02,DNS:citadelbuy-elasticsearch-03,IP:127.0.0.1
extendedKeyUsage = serverAuth,clientAuth
EOF

    # Sign certificate with CA
    openssl x509 -req -in "$NODE_DIR/$node.csr" \
        -CA "$CA_DIR/ca.crt" \
        -CAkey "$CA_DIR/ca.key" \
        -CAcreateserial \
        -out "$NODE_DIR/$node.crt" \
        -days 3650 \
        -sha256 \
        -extfile "$NODE_DIR/$node.ext"

    # Copy CA certificate to node directory
    cp "$CA_DIR/ca.crt" "$NODE_DIR/"

    # Clean up CSR and extensions file
    rm "$NODE_DIR/$node.csr" "$NODE_DIR/$node.ext"

    log_success "Certificate created for $node"
done

##############################################################################
# Generate HTTP Layer Certificate (Optional)
##############################################################################

log_info "Generating HTTP layer certificate..."

HTTP_DIR="$CERT_DIR/http"
mkdir -p "$HTTP_DIR"

# Generate HTTP private key
openssl genrsa -out "$HTTP_DIR/http.key" 2048

# Generate CSR
openssl req -new -key "$HTTP_DIR/http.key" -out "$HTTP_DIR/http.csr" \
    -subj "/C=US/ST=State/L=City/O=CitadelBuy/OU=IT/CN=*.citadelbuy.com"

# Create extensions file
cat > "$HTTP_DIR/http.ext" << EOF
subjectAltName = DNS:*.citadelbuy.com,DNS:citadelbuy.com,DNS:localhost,IP:127.0.0.1
extendedKeyUsage = serverAuth
EOF

# Sign certificate
openssl x509 -req -in "$HTTP_DIR/http.csr" \
    -CA "$CA_DIR/ca.crt" \
    -CAkey "$CA_DIR/ca.key" \
    -CAcreateserial \
    -out "$HTTP_DIR/http.crt" \
    -days 3650 \
    -sha256 \
    -extfile "$HTTP_DIR/http.ext"

# Copy CA certificate
cp "$CA_DIR/ca.crt" "$HTTP_DIR/"

# Clean up
rm "$HTTP_DIR/http.csr" "$HTTP_DIR/http.ext"

log_success "HTTP certificate created"

##############################################################################
# Set Permissions
##############################################################################

log_info "Setting certificate permissions..."

# Make all private keys readable only by owner
find "$CERT_DIR" -name "*.key" -exec chmod 600 {} \;

# Make certificates readable by all
find "$CERT_DIR" -name "*.crt" -exec chmod 644 {} \;

log_success "Permissions set"

##############################################################################
# Verification
##############################################################################

log_info "Verifying certificates..."

# Verify each node certificate
for node in "${NODES[@]}"; do
    openssl verify -CAfile "$CA_DIR/ca.crt" "$CERT_DIR/$node/$node.crt" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        log_success "$node certificate verified"
    else
        log_warning "$node certificate verification failed"
    fi
done

# Verify HTTP certificate
openssl verify -CAfile "$CA_DIR/ca.crt" "$HTTP_DIR/http.crt" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    log_success "HTTP certificate verified"
else
    log_warning "HTTP certificate verification failed"
fi

##############################################################################
# Summary
##############################################################################

echo ""
log_success "Certificate generation complete!"
echo ""
echo "Certificate locations:"
echo "  CA Certificate: $CA_DIR/ca.crt"
echo "  CA Key: $CA_DIR/ca.key"
echo ""
echo "Node certificates:"
for node in "${NODES[@]}"; do
    echo "  $node:"
    echo "    Certificate: $CERT_DIR/$node/$node.crt"
    echo "    Key: $CERT_DIR/$node/$node.key"
done
echo ""
echo "HTTP certificate:"
echo "  Certificate: $HTTP_DIR/http.crt"
echo "  Key: $HTTP_DIR/http.key"
echo ""
echo "Next steps:"
echo "  1. Start Elasticsearch cluster: docker-compose -f docker-compose.elasticsearch-prod.yml up -d"
echo "  2. Wait for cluster to be healthy (2-3 minutes)"
echo "  3. Setup passwords: docker exec citadelbuy-elasticsearch-01 bin/elasticsearch-setup-passwords auto"
echo "  4. Save generated passwords securely!"
echo ""

# Create README in certificates directory
cat > "$CERT_DIR/README.md" << EOF
# Elasticsearch SSL Certificates

## Generated Certificates

This directory contains SSL/TLS certificates for the Elasticsearch cluster.

### Certificate Authority (CA)
- **ca.crt**: Root CA certificate
- **ca.key**: Root CA private key (keep secure!)

### Node Certificates
Each node has its own certificate and private key:
- es-node-01/
- es-node-02/
- es-node-03/

### HTTP Certificate
- http/: Certificate for HTTPS API access

## Certificate Validity

All certificates are valid for 10 years (3650 days).

## Renewal

To renew certificates before expiration:
1. Regenerate certificates: ./scripts/setup-elasticsearch-certs.sh
2. Restart Elasticsearch nodes one by one
3. Verify cluster health after each restart

## Security Notes

1. **Private Keys**: Keep all .key files secure and never commit to version control
2. **CA Certificate**: Distribute ca.crt to clients that need to verify server certificates
3. **Backup**: Store a secure backup of the CA key and certificate

## Verification

To verify a certificate:
\`\`\`bash
openssl verify -CAfile ca/ca.crt es-node-01/es-node-01.crt
\`\`\`

To view certificate details:
\`\`\`bash
openssl x509 -in es-node-01/es-node-01.crt -text -noout
\`\`\`

## Generated: $(date)
EOF

log_success "README created: $CERT_DIR/README.md"
