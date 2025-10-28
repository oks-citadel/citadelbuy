# ================================
# Test Environment Variables
# ================================

# Project Configuration
project_name = "commerce-platform"
environment  = "test"
aws_region   = "us-east-1"
owner_email  = "devops@yourcompany.com"
cost_center  = "engineering"

# Network Configuration
vpc_cidr            = "10.1.0.0/16"
enable_nat_gateway  = true
enable_vpn_gateway  = false
allowed_cidr_blocks = ["10.0.0.0/8"]  # Internal only

# Database Configuration
db_instance_class      = "db.t3.small"
db_allocated_storage   = 50
db_engine_version      = "16.1"
db_name                = "commerce_test"
db_username            = "admin"
db_backup_retention    = 7
db_multi_az            = false
db_deletion_protection = false

# Redis Configuration
redis_node_type        = "cache.t3.small"
redis_num_nodes        = 1
redis_engine_version   = "7.0"
redis_parameter_family = "redis7"

# S3 Storage
s3_enable_versioning = true
s3_enable_encryption = true
s3_lifecycle_rules = [
  {
    enabled         = true
    prefix          = "temp/"
    expiration_days = 3
  }
]

# ECS Configuration
ecs_container_insights = true

# Load Balancer
alb_deletion_protection = false
alb_enable_http2        = true
alb_idle_timeout        = 60
ssl_certificate_arn     = ""  # Add your ACM certificate ARN
domain_name             = "test.yourplatform.com"
create_route53_records  = false

# Backend Service
backend_image           = "your-registry/commerce-backend:test"
backend_cpu             = 512
backend_memory          = 1024
backend_desired_count   = 2
backend_autoscaling_min = 2
backend_autoscaling_max = 5

# Frontend Service
frontend_image           = "your-registry/commerce-frontend:test"
frontend_cpu             = 256
frontend_memory          = 512
frontend_desired_count   = 2
frontend_autoscaling_min = 2
frontend_autoscaling_max = 5

# Auto-scaling
enable_autoscaling     = true
autoscaling_target_cpu = 70

# Monitoring
log_retention_days = 14
alert_email        = "alerts-test@yourcompany.com"

# Application
log_level = "info"

# Feature Flags
enable_cdn    = false
enable_waf    = false
enable_backup = true

# Secrets (use environment variables or tfvars)
# stripe_secret_key = "sk_test_..."
