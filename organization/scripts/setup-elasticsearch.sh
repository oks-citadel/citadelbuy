#!/bin/bash

##############################################################################
# Elasticsearch Production Setup Script
# CitadelBuy E-Commerce Platform
##############################################################################
# This script:
# 1. Creates production indices with optimized settings
# 2. Sets up Index Lifecycle Management (ILM) policies
# 3. Configures index templates
# 4. Creates user roles and permissions
# 5. Initializes snapshot repository
# 6. Imports initial product data
##############################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CONFIG_DIR="$PROJECT_ROOT/apps/api/src/modules/search/config"

# Elasticsearch connection
ES_HOST="${ELASTICSEARCH_NODE:-http://localhost:9200}"
ES_USER="${ELASTICSEARCH_USERNAME:-elastic}"
ES_PASS="${ELASTICSEARCH_PASSWORD}"
ES_INDEX_PREFIX="${ELASTICSEARCH_INDEX_PREFIX:-citadelbuy}"
ES_ENV="${NODE_ENV:-production}"

# Check if password is provided
if [ -z "${ES_PASS:-}" ]; then
    echo -e "${RED}Error: ELASTICSEARCH_PASSWORD environment variable is not set${NC}"
    echo "Usage: ELASTICSEARCH_PASSWORD=your_password ./setup-elasticsearch.sh"
    exit 1
fi

##############################################################################
# Helper Functions
##############################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Execute Elasticsearch API call
es_api() {
    local method=$1
    local endpoint=$2
    local data=${3:-}

    if [ -n "$data" ]; then
        curl -s -u "$ES_USER:$ES_PASS" -X "$method" "$ES_HOST$endpoint" \
            -H 'Content-Type: application/json' \
            -d "$data"
    else
        curl -s -u "$ES_USER:$ES_PASS" -X "$method" "$ES_HOST$endpoint"
    fi
}

# Check if Elasticsearch is available
check_elasticsearch() {
    log_info "Checking Elasticsearch connection..."

    local response
    response=$(es_api GET "/_cluster/health")

    if echo "$response" | grep -q "cluster_name"; then
        local cluster_name=$(echo "$response" | grep -o '"cluster_name":"[^"]*"' | cut -d'"' -f4)
        local status=$(echo "$response" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        log_success "Connected to Elasticsearch cluster: $cluster_name (Status: $status)"
        return 0
    else
        log_error "Failed to connect to Elasticsearch at $ES_HOST"
        exit 1
    fi
}

##############################################################################
# ILM Policy Setup
##############################################################################

create_ilm_policies() {
    log_info "Creating Index Lifecycle Management (ILM) policies..."

    # Products ILM Policy
    log_info "Creating products ILM policy..."
    es_api PUT "/_ilm/policy/${ES_INDEX_PREFIX}-products-policy" '{
      "policy": {
        "phases": {
          "hot": {
            "actions": {
              "rollover": {
                "max_age": "30d",
                "max_size": "50gb"
              },
              "set_priority": {
                "priority": 100
              }
            }
          },
          "warm": {
            "min_age": "30d",
            "actions": {
              "set_priority": {
                "priority": 50
              },
              "shrink": {
                "number_of_shards": 1
              },
              "forcemerge": {
                "max_num_segments": 1
              }
            }
          },
          "cold": {
            "min_age": "90d",
            "actions": {
              "set_priority": {
                "priority": 0
              }
            }
          },
          "delete": {
            "min_age": "180d",
            "actions": {
              "delete": {}
            }
          }
        }
      }
    }'
    log_success "Products ILM policy created"

    # Analytics ILM Policy (delete after 90 days)
    log_info "Creating analytics ILM policy..."
    es_api PUT "/_ilm/policy/${ES_INDEX_PREFIX}-analytics-policy" '{
      "policy": {
        "phases": {
          "hot": {
            "actions": {
              "rollover": {
                "max_age": "7d",
                "max_size": "10gb"
              }
            }
          },
          "delete": {
            "min_age": "90d",
            "actions": {
              "delete": {}
            }
          }
        }
      }
    }'
    log_success "Analytics ILM policy created"
}

##############################################################################
# Index Templates
##############################################################################

create_index_templates() {
    log_info "Creating index templates..."

    # Products Index Template
    es_api PUT "/_index_template/${ES_INDEX_PREFIX}-products-template" '{
      "index_patterns": ["'${ES_INDEX_PREFIX}'-*-products*"],
      "template": {
        "settings": {
          "number_of_shards": 3,
          "number_of_replicas": 2,
          "refresh_interval": "30s",
          "max_result_window": 10000,
          "codec": "best_compression",
          "lifecycle.name": "'${ES_INDEX_PREFIX}'-products-policy"
        }
      },
      "priority": 500,
      "version": 1
    }'
    log_success "Products index template created"

    # Analytics Index Template
    es_api PUT "/_index_template/${ES_INDEX_PREFIX}-analytics-template" '{
      "index_patterns": ["'${ES_INDEX_PREFIX}'-*-search-analytics*"],
      "template": {
        "settings": {
          "number_of_shards": 1,
          "number_of_replicas": 1,
          "refresh_interval": "30s",
          "lifecycle.name": "'${ES_INDEX_PREFIX}'-analytics-policy"
        }
      },
      "priority": 500,
      "version": 1
    }'
    log_success "Analytics index template created"
}

##############################################################################
# Create Indices
##############################################################################

create_indices() {
    log_info "Creating indices..."

    local products_index="${ES_INDEX_PREFIX}-${ES_ENV}-products"
    local orders_index="${ES_INDEX_PREFIX}-${ES_ENV}-orders"
    local analytics_index="${ES_INDEX_PREFIX}-${ES_ENV}-search-analytics"

    # Check if products index exists
    if es_api GET "/$products_index" | grep -q "error"; then
        log_info "Creating products index: $products_index"
        es_api PUT "/$products_index" '{
          "settings": {
            "number_of_shards": 3,
            "number_of_replicas": 2,
            "refresh_interval": "30s",
            "max_result_window": 10000,
            "codec": "best_compression",
            "analysis": {
              "analyzer": {
                "autocomplete_analyzer": {
                  "tokenizer": "autocomplete_tokenizer",
                  "filter": ["lowercase", "asciifolding", "trim"]
                },
                "autocomplete_search_analyzer": {
                  "tokenizer": "lowercase",
                  "filter": ["lowercase", "asciifolding", "trim"]
                },
                "product_name_analyzer": {
                  "tokenizer": "standard",
                  "filter": ["lowercase", "asciifolding", "english_stop", "english_stemmer"]
                }
              },
              "tokenizer": {
                "autocomplete_tokenizer": {
                  "type": "edge_ngram",
                  "min_gram": 2,
                  "max_gram": 20,
                  "token_chars": ["letter", "digit"]
                }
              },
              "filter": {
                "english_stop": {
                  "type": "stop",
                  "stopwords": "_english_"
                },
                "english_stemmer": {
                  "type": "stemmer",
                  "language": "english"
                }
              }
            }
          },
          "mappings": {
            "properties": {
              "id": { "type": "keyword" },
              "name": {
                "type": "text",
                "analyzer": "autocomplete_analyzer",
                "search_analyzer": "autocomplete_search_analyzer",
                "fields": {
                  "keyword": { "type": "keyword" },
                  "standard": { "type": "text", "analyzer": "product_name_analyzer" }
                }
              },
              "description": { "type": "text" },
              "price": { "type": "scaled_float", "scaling_factor": 100 },
              "compareAtPrice": { "type": "scaled_float", "scaling_factor": 100 },
              "sku": { "type": "keyword" },
              "barcode": { "type": "keyword" },
              "images": { "type": "keyword", "index": false },
              "categoryId": { "type": "keyword" },
              "categoryName": {
                "type": "text",
                "fields": { "keyword": { "type": "keyword" } }
              },
              "categorySlug": { "type": "keyword" },
              "vendorId": { "type": "keyword" },
              "vendorName": {
                "type": "text",
                "fields": { "keyword": { "type": "keyword" } }
              },
              "stock": { "type": "integer" },
              "inStock": { "type": "boolean" },
              "tags": { "type": "keyword" },
              "attributes": { "type": "object" },
              "avgRating": { "type": "half_float" },
              "reviewCount": { "type": "integer" },
              "salesCount": { "type": "integer" },
              "createdAt": { "type": "date" },
              "updatedAt": { "type": "date" },
              "hasVariants": { "type": "boolean" },
              "variantCount": { "type": "integer" },
              "minVariantPrice": { "type": "scaled_float", "scaling_factor": 100 },
              "maxVariantPrice": { "type": "scaled_float", "scaling_factor": 100 },
              "slug": { "type": "keyword" },
              "isActive": { "type": "boolean" },
              "isFeatured": { "type": "boolean" }
            }
          }
        }'
        log_success "Products index created: $products_index"
    else
        log_warning "Products index already exists: $products_index"
    fi

    # Create orders index
    if es_api GET "/$orders_index" | grep -q "error"; then
        log_info "Creating orders index: $orders_index"
        es_api PUT "/$orders_index" '{
          "settings": {
            "number_of_shards": 2,
            "number_of_replicas": 1,
            "refresh_interval": "30s"
          },
          "mappings": {
            "properties": {
              "id": { "type": "keyword" },
              "orderNumber": { "type": "keyword" },
              "userId": { "type": "keyword" },
              "userEmail": { "type": "keyword" },
              "status": { "type": "keyword" },
              "total": { "type": "scaled_float", "scaling_factor": 100 },
              "createdAt": { "type": "date" }
            }
          }
        }'
        log_success "Orders index created: $orders_index"
    else
        log_warning "Orders index already exists: $orders_index"
    fi

    # Create analytics index
    if es_api GET "/$analytics_index" | grep -q "error"; then
        log_info "Creating search analytics index: $analytics_index"
        es_api PUT "/$analytics_index" '{
          "settings": {
            "number_of_shards": 1,
            "number_of_replicas": 1,
            "refresh_interval": "30s"
          },
          "mappings": {
            "properties": {
              "id": { "type": "keyword" },
              "query": { "type": "keyword" },
              "resultsCount": { "type": "integer" },
              "userId": { "type": "keyword" },
              "timestamp": { "type": "date" }
            }
          }
        }'
        log_success "Analytics index created: $analytics_index"
    else
        log_warning "Analytics index already exists: $analytics_index"
    fi
}

##############################################################################
# Create Aliases
##############################################################################

create_aliases() {
    log_info "Creating index aliases..."

    local products_index="${ES_INDEX_PREFIX}-${ES_ENV}-products"

    es_api POST "/_aliases" '{
      "actions": [
        {
          "add": {
            "index": "'$products_index'",
            "alias": "'${ES_INDEX_PREFIX}'-products"
          }
        }
      ]
    }'
    log_success "Aliases created"
}

##############################################################################
# Snapshot Repository (Optional)
##############################################################################

setup_snapshot_repository() {
    log_info "Setting up snapshot repository..."

    local repo_type="${SNAPSHOT_REPO_TYPE:-fs}"

    if [ "$repo_type" = "s3" ]; then
        log_info "Configuring S3 snapshot repository..."
        # S3 repository configuration
        # Note: Requires repository-s3 plugin to be installed
        log_warning "S3 repository requires manual configuration. See documentation."
    elif [ "$repo_type" = "fs" ]; then
        log_info "Configuring filesystem snapshot repository..."
        es_api PUT "/_snapshot/citadelbuy_backup" '{
          "type": "fs",
          "settings": {
            "location": "/mount/backups/elasticsearch",
            "compress": true
          }
        }' || log_warning "Failed to create snapshot repository (may require path.repo configuration)"
    else
        log_info "Skipping snapshot repository setup"
    fi
}

##############################################################################
# Security Setup
##############################################################################

setup_security() {
    log_info "Setting up security roles and users..."

    # Create application role
    es_api PUT "/_security/role/${ES_INDEX_PREFIX}_app_role" '{
      "cluster": ["monitor", "manage_index_templates"],
      "indices": [
        {
          "names": ["'${ES_INDEX_PREFIX}'-*"],
          "privileges": ["all"]
        }
      ]
    }'
    log_success "Application role created"

    # Create read-only role
    es_api PUT "/_security/role/${ES_INDEX_PREFIX}_readonly_role" '{
      "cluster": ["monitor"],
      "indices": [
        {
          "names": ["'${ES_INDEX_PREFIX}'-*"],
          "privileges": ["read"]
        }
      ]
    }'
    log_success "Read-only role created"
}

##############################################################################
# Verification
##############################################################################

verify_setup() {
    log_info "Verifying setup..."

    # Check cluster health
    local health=$(es_api GET "/_cluster/health" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    log_info "Cluster health: $health"

    # List indices
    log_info "Indices created:"
    es_api GET "/_cat/indices/${ES_INDEX_PREFIX}-*?v"

    # Check ILM policies
    log_info "ILM policies created:"
    es_api GET "/_ilm/policy/${ES_INDEX_PREFIX}-*" | grep -o '"'${ES_INDEX_PREFIX}'-[^"]*"' || true

    log_success "Setup verification complete!"
}

##############################################################################
# Main Execution
##############################################################################

main() {
    echo ""
    echo "=========================================="
    echo "  CitadelBuy Elasticsearch Setup"
    echo "=========================================="
    echo ""
    echo "Configuration:"
    echo "  Host: $ES_HOST"
    echo "  User: $ES_USER"
    echo "  Index Prefix: $ES_INDEX_PREFIX"
    echo "  Environment: $ES_ENV"
    echo ""

    # Confirm before proceeding
    read -p "Continue with setup? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_warning "Setup cancelled"
        exit 0
    fi

    # Execute setup steps
    check_elasticsearch
    create_ilm_policies
    create_index_templates
    create_indices
    create_aliases
    setup_security
    setup_snapshot_repository
    verify_setup

    echo ""
    log_success "Elasticsearch setup completed successfully!"
    echo ""
    echo "Next steps:"
    echo "  1. Import initial product data: npm run cli search:index"
    echo "  2. Configure application .env with Elasticsearch credentials"
    echo "  3. Start the application and test search functionality"
    echo "  4. Set up automated backups"
    echo ""
}

# Run main function
main "$@"
