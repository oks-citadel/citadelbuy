# ================================
# Development Environment Variables
# ================================

# Project Configuration
project_name = "commerce-platform"
environment  = "dev"
aws_region   = "us-east-1"
owner_email  = "devops@yourcompany.com"
cost_center  = "engineering"

# Network Configuration
vpc_cidr            = "10.0.0.0/16"
enable_nat_gateway  = true
enable_vpn_gateway  = false
allowed_cidr_blocks = ["0.0.0.0/0"]  # Restrict this in production

# Database Configuration
db_instance_class      = "db.t3.micro"
db_allocated_storage   = 20
db_engine_version      = "16.1"
db_name                = "commerce_dev"
db_username            = "admin"
db_backup_retention    = 7
db_multi_az            = false
db_deletion_protection = false  # Disabled for dev

# Redis Configuration
redis_node_type       = "cache.t3.micro"
redis_num_nodes       = 1
redis_engine_version  = "7.0"
redis_parameter_family = "redis7"

# S3 Storage
s3_enable_versioning = true
s3_enable_encryption = true
s3_lifecycle_rules = [
  {
    enabled         = true
    prefix          = "temp/"
    expiration_days = 7
  }
]

# ECS Configuration
ecs_container_insights = true

# Load Balancer
alb_deletion_protection = false  # Disabled for dev
alb_enable_http2       = true
alb_idle_timeout       = 60
ssl_certificate_arn    = ""  # Add your ACM certificate ARN
domain_name            = "dev.yourplatform.com"
create_route53_records = false  # Enable when domain is ready

# Backend Service
backend_image           = "your-registry/commerce-backend:latest"
backend_cpu             = 512
backend_memory          = 1024
backend_desired_count   = 1
backend_autoscaling_min = 1
backend_autoscaling_max = 3

# Frontend Service
frontend_image           = "your-registry/commerce-frontend:latest"
frontend_cpu             = 256
frontend_memory          = 512
frontend_desired_count   = 1
frontend_autoscaling_min = 1
frontend_autoscaling_max = 3

# Auto-scaling
enable_autoscaling     = true
autoscaling_target_cpu = 70

# Monitoring
log_retention_days = 7
alert_email        = "alerts-dev@yourcompany.com"

# Application
log_level = "debug"

# Feature Flags
enable_cdn    = false
enable_waf    = false
enable_backup = true

# Secrets (use environment variables or tfvars)
# stripe_secret_key = "sk_test_..." # Set via TF_VAR_stripe_secret_key
