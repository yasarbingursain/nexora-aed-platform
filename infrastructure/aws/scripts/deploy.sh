#!/bin/bash
# =============================================================================
# Nexora AWS Deployment Script
# =============================================================================
# Usage: ./deploy.sh [environment] [service]
# Examples:
#   ./deploy.sh dev all          # Deploy all services to dev
#   ./deploy.sh dev frontend     # Deploy only frontend to dev
#   ./deploy.sh prod backend     # Deploy only backend to prod
# =============================================================================

set -e

# Configuration
ENVIRONMENT=${1:-dev}
SERVICE=${2:-all}
AWS_REGION=${AWS_REGION:-us-east-1}
PROJECT_NAME="nexora"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install it first."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured. Run 'aws configure' first."
        exit 1
    fi
    
    log_info "Prerequisites check passed."
}

# Get AWS account ID
get_account_id() {
    aws sts get-caller-identity --query Account --output text
}

# Get ECR repository URL
get_ecr_url() {
    local service=$1
    echo "$(get_account_id).dkr.ecr.${AWS_REGION}.amazonaws.com/${PROJECT_NAME}-${ENVIRONMENT}-${service}"
}

# Login to ECR
ecr_login() {
    log_info "Logging into ECR..."
    aws ecr get-login-password --region ${AWS_REGION} | \
        docker login --username AWS --password-stdin \
        "$(get_account_id).dkr.ecr.${AWS_REGION}.amazonaws.com"
}

# Build and push Docker image
build_and_push() {
    local service=$1
    local dockerfile=$2
    local context=$3
    local ecr_url=$(get_ecr_url $service)
    local tag="${ecr_url}:latest"
    local version_tag="${ecr_url}:$(git rev-parse --short HEAD 2>/dev/null || echo 'local')"
    
    log_info "Building ${service}..."
    docker build -t ${tag} -t ${version_tag} -f ${dockerfile} ${context}
    
    log_info "Pushing ${service} to ECR..."
    docker push ${tag}
    docker push ${version_tag}
    
    log_info "${service} pushed successfully."
}

# Update ECS service
update_ecs_service() {
    local service=$1
    local cluster="${PROJECT_NAME}-${ENVIRONMENT}-cluster"
    local ecs_service="${PROJECT_NAME}-${ENVIRONMENT}-${service}"
    
    log_info "Updating ECS service ${ecs_service}..."
    aws ecs update-service \
        --cluster ${cluster} \
        --service ${ecs_service} \
        --force-new-deployment \
        --region ${AWS_REGION} \
        --no-cli-pager
    
    log_info "Waiting for service ${ecs_service} to stabilize..."
    aws ecs wait services-stable \
        --cluster ${cluster} \
        --services ${ecs_service} \
        --region ${AWS_REGION}
    
    log_info "${ecs_service} deployment complete."
}

# Deploy frontend
deploy_frontend() {
    log_info "Deploying frontend..."
    build_and_push "frontend" "infrastructure/aws/docker/Dockerfile.frontend" "."
    update_ecs_service "frontend"
}

# Deploy backend
deploy_backend() {
    log_info "Deploying backend..."
    build_and_push "backend" "infrastructure/aws/docker/Dockerfile.backend" "."
    update_ecs_service "backend"
}

# Deploy ML service
deploy_ml_service() {
    log_info "Deploying ML service..."
    build_and_push "ml-service" "infrastructure/aws/docker/Dockerfile.ml-service" "."
    update_ecs_service "ml-service"
}

# Deploy MalGenX service
deploy_malgenx() {
    log_info "Deploying MalGenX service..."
    build_and_push "malgenx" "infrastructure/aws/docker/Dockerfile.malgenx" "."
    update_ecs_service "malgenx"
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    local cluster="${PROJECT_NAME}-${ENVIRONMENT}-cluster"
    local task_def="${PROJECT_NAME}-${ENVIRONMENT}-backend"
    local subnets=$(aws ec2 describe-subnets \
        --filters "Name=tag:Name,Values=*${PROJECT_NAME}-${ENVIRONMENT}*private*" \
        --query 'Subnets[*].SubnetId' \
        --output text | tr '\t' ',')
    local security_group=$(aws ec2 describe-security-groups \
        --filters "Name=tag:Name,Values=${PROJECT_NAME}-${ENVIRONMENT}-ecs-tasks-sg" \
        --query 'SecurityGroups[0].GroupId' \
        --output text)
    
    # Run migration task
    aws ecs run-task \
        --cluster ${cluster} \
        --task-definition ${task_def} \
        --launch-type FARGATE \
        --network-configuration "awsvpcConfiguration={subnets=[${subnets}],securityGroups=[${security_group}],assignPublicIp=DISABLED}" \
        --overrides '{"containerOverrides":[{"name":"backend","command":["npx","prisma","migrate","deploy"]}]}' \
        --region ${AWS_REGION} \
        --no-cli-pager
    
    log_info "Migration task started. Check ECS console for status."
}

# Main deployment logic
main() {
    log_info "Starting deployment to ${ENVIRONMENT} environment..."
    log_info "Service: ${SERVICE}"
    
    check_prerequisites
    ecr_login
    
    case ${SERVICE} in
        all)
            deploy_frontend
            deploy_backend
            deploy_ml_service
            deploy_malgenx
            ;;
        frontend)
            deploy_frontend
            ;;
        backend)
            deploy_backend
            ;;
        ml-service)
            deploy_ml_service
            ;;
        malgenx)
            deploy_malgenx
            ;;
        migrate)
            run_migrations
            ;;
        *)
            log_error "Unknown service: ${SERVICE}"
            echo "Available services: all, frontend, backend, ml-service, malgenx, migrate"
            exit 1
            ;;
    esac
    
    log_info "Deployment complete!"
}

main
