#!/bin/bash

# ================================
# Terraform Deployment Script
# Cross-Border Commerce Platform
# ================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ ${1}${NC}"
}

print_success() {
    echo -e "${GREEN}✓ ${1}${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ ${1}${NC}"
}

print_error() {
    echo -e "${RED}✗ ${1}${NC}"
}

# Function to check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check Terraform
    if ! command -v terraform &> /dev/null; then
        print_error "Terraform not found. Please install Terraform >= 1.6.0"
        exit 1
    fi
    
    TERRAFORM_VERSION=$(terraform version -json | jq -r '.terraform_version')
    print_success "Terraform $TERRAFORM_VERSION installed"
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI not found. Please install AWS CLI"
        exit 1
    fi
    
    print_success "AWS CLI installed"
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured. Run 'aws configure'"
        exit 1
    fi
    
    AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
    print_success "AWS credentials configured (Account: $AWS_ACCOUNT)"
}

# Function to select environment
select_environment() {
    print_info "Select environment:"
    echo "1) dev"
    echo "2) test"
    echo "3) prod"
    read -p "Enter choice [1-3]: " choice
    
    case $choice in
        1) ENVIRONMENT="dev";;
        2) ENVIRONMENT="test";;
        3) ENVIRONMENT="prod";;
        *) 
            print_error "Invalid choice"
            exit 1
            ;;
    esac
    
    print_success "Environment: $ENVIRONMENT"
}

# Function to initialize Terraform
init_terraform() {
    print_info "Initializing Terraform for $ENVIRONMENT environment..."
    
    cd "environments/$ENVIRONMENT" || exit 1
    
    if [ ! -f "terraform.tfvars" ]; then
        print_error "terraform.tfvars not found in environments/$ENVIRONMENT/"
        exit 1
    fi
    
    terraform init -backend-config="key=$ENVIRONMENT/terraform.tfstate"
    
    print_success "Terraform initialized"
}

# Function to validate configuration
validate_terraform() {
    print_info "Validating Terraform configuration..."
    
    terraform validate
    
    if [ $? -eq 0 ]; then
        print_success "Configuration is valid"
    else
        print_error "Configuration validation failed"
        exit 1
    fi
}

# Function to plan deployment
plan_deployment() {
    print_info "Planning deployment..."
    
    terraform plan -var-file=terraform.tfvars -out=tfplan
    
    if [ $? -eq 0 ]; then
        print_success "Plan created successfully"
    else
        print_error "Plan failed"
        exit 1
    fi
    
    # Show summary
    terraform show -json tfplan | jq -r '.resource_changes[] | "\(.change.actions[0]): \(.address)"' | sort | uniq -c
}

# Function to apply deployment
apply_deployment() {
    print_warning "This will modify infrastructure in $ENVIRONMENT environment"
    read -p "Are you sure you want to continue? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        print_info "Deployment cancelled"
        exit 0
    fi
    
    print_info "Applying deployment..."
    
    terraform apply tfplan
    
    if [ $? -eq 0 ]; then
        print_success "Deployment completed successfully"
    else
        print_error "Deployment failed"
        exit 1
    fi
}

# Function to show outputs
show_outputs() {
    print_info "Deployment outputs:"
    echo ""
    terraform output -json | jq -r 'to_entries[] | "\(.key): \(.value.value)"'
    echo ""
}

# Function to run smoke tests
run_smoke_tests() {
    print_info "Running smoke tests..."
    
    API_URL=$(terraform output -raw api_domain 2>/dev/null || echo "")
    
    if [ -z "$API_URL" ]; then
        print_warning "API URL not found, skipping smoke tests"
        return
    fi
    
    print_info "Testing $API_URL/health"
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health" || echo "000")
    
    if [ "$HTTP_CODE" = "200" ]; then
        print_success "API health check passed"
    else
        print_warning "API health check returned $HTTP_CODE"
    fi
}

# Main deployment flow
main() {
    echo "================================"
    echo "Terraform Deployment Script"
    echo "Commerce Platform"
    echo "================================"
    echo ""
    
    check_prerequisites
    echo ""
    
    select_environment
    echo ""
    
    init_terraform
    echo ""
    
    validate_terraform
    echo ""
    
    plan_deployment
    echo ""
    
    apply_deployment
    echo ""
    
    show_outputs
    
    run_smoke_tests
    echo ""
    
    print_success "Deployment completed!"
    echo ""
    print_info "Next steps:"
    echo "  1. Verify services are running: terraform output"
    echo "  2. Check AWS Console for resources"
    echo "  3. Monitor CloudWatch logs"
    echo "  4. Test application endpoints"
}

# Handle script arguments
case "${1:-deploy}" in
    deploy)
        main
        ;;
    plan)
        check_prerequisites
        select_environment
        init_terraform
        validate_terraform
        plan_deployment
        ;;
    init)
        check_prerequisites
        select_environment
        init_terraform
        ;;
    destroy)
        check_prerequisites
        select_environment
        cd "environments/$ENVIRONMENT" || exit 1
        print_warning "This will DESTROY all infrastructure in $ENVIRONMENT!"
        read -p "Type 'destroy' to confirm: " confirm
        if [ "$confirm" = "destroy" ]; then
            terraform destroy -var-file=terraform.tfvars
        else
            print_info "Destroy cancelled"
        fi
        ;;
    *)
        echo "Usage: $0 {deploy|plan|init|destroy}"
        exit 1
        ;;
esac
