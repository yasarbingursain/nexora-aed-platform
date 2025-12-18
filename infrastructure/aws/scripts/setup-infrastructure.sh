#!/bin/bash
# =============================================================================
# Nexora AWS Infrastructure Setup Script
# =============================================================================
# This script initializes the AWS infrastructure using Terraform
# Usage: ./setup-infrastructure.sh [environment]
# =============================================================================

set -e

ENVIRONMENT=${1:-dev}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="${SCRIPT_DIR}/../terraform"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v terraform &> /dev/null; then
        log_error "Terraform is not installed."
        echo "Install from: https://developer.hashicorp.com/terraform/downloads"
        exit 1
    fi
    
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed."
        exit 1
    fi
    
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured."
        exit 1
    fi
    
    log_info "Prerequisites check passed."
}

# Initialize Terraform
init_terraform() {
    log_info "Initializing Terraform..."
    cd "${TERRAFORM_DIR}"
    terraform init -upgrade
}

# Validate Terraform configuration
validate_terraform() {
    log_info "Validating Terraform configuration..."
    cd "${TERRAFORM_DIR}"
    terraform validate
}

# Plan infrastructure changes
plan_infrastructure() {
    log_info "Planning infrastructure changes..."
    cd "${TERRAFORM_DIR}"
    
    if [ -f "terraform.tfvars" ]; then
        terraform plan -var-file="terraform.tfvars" -out=tfplan
    else
        log_warn "terraform.tfvars not found. Using defaults."
        terraform plan -out=tfplan
    fi
}

# Apply infrastructure changes
apply_infrastructure() {
    log_info "Applying infrastructure changes..."
    cd "${TERRAFORM_DIR}"
    terraform apply tfplan
}

# Show outputs
show_outputs() {
    log_info "Infrastructure outputs:"
    cd "${TERRAFORM_DIR}"
    terraform output
}

# Main
main() {
    log_info "Setting up Nexora AWS infrastructure for ${ENVIRONMENT}..."
    
    check_prerequisites
    init_terraform
    validate_terraform
    plan_infrastructure
    
    echo ""
    read -p "Do you want to apply these changes? (yes/no): " confirm
    
    if [ "$confirm" = "yes" ]; then
        apply_infrastructure
        show_outputs
        log_info "Infrastructure setup complete!"
    else
        log_warn "Infrastructure changes not applied."
    fi
}

main
