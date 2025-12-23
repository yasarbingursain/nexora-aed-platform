#!/bin/bash
# =============================================================================
# Nexora AWS Deployment Script
# =============================================================================
# Usage: ./deploy.sh <environment> <action> [service]
# Examples:
#   ./deploy.sh dev deploy all
#   ./deploy.sh dev deploy backend
#   ./deploy.sh prod migrate
#   ./deploy.sh dev logs backend
# =============================================================================

set -euo pipefail

# Configuration
ENVIRONMENT="${1:-}"
ACTION="${2:-}"
SERVICE="${3:-all}"
AWS_REGION="${AWS_REGION:-us-east-1}"
PROJECT_NAME="nexora"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

usage() {
    echo "Usage: $0 <environment> <action> [service]"
    echo ""
    echo "Environments: dev, staging, prod"
    echo ""
    echo "Actions:"
    echo "  deploy <service>  - Build and deploy service(s)"
    echo "  migrate           - Run database migrations"
    echo "  logs <service>    - Tail service logs"
    echo "  status            - Show deployment status"
    echo "  rollback <service>- Rollback to previous task definition"
    echo "  exec <service>    - Open shell in running container"
    echo ""
    echo "Services: all, frontend, backend, ml-service, malgenx"
    exit 1
}

# Validate inputs
[[ -z "$ENVIRONMENT" || -z "$ACTION" ]] && usage
[[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]] && log_error "Invalid environment: $ENVIRONMENT" && exit 1

NAME_PREFIX="${PROJECT_NAME}-${ENVIRONMENT}"
CLUSTER_NAME="${NAME_PREFIX}-cluster"

# Check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites..."
    
    command -v aws &>/dev/null || { log_error "AWS CLI not installed"; exit 1; }
    command -v docker &>/dev/null || { log_error "Docker not installed"; exit 1; }
    
    aws sts get-caller-identity &>/dev/null || { log_error "AWS credentials not configured"; exit 1; }
    
    log_info "Prerequisites OK"
}

get_account_id() {
    aws sts get-caller-identity --query Account --output text
}

get_ecr_url() {
    local service=$1
    echo "$(get_account_id).dkr.ecr.${AWS_REGION}.amazonaws.com/${NAME_PREFIX}-${service}"
}

ecr_login() {
    log_step "Logging into ECR..."
    aws ecr get-login-password --region ${AWS_REGION} | \
        docker login --username AWS --password-stdin \
        "$(get_account_id).dkr.ecr.${AWS_REGION}.amazonaws.com"
}

build_and_push() {
    local service=$1
    local dockerfile="infrastructure/aws/docker/Dockerfile.${service}"
    local ecr_url=$(get_ecr_url $service)
    local git_sha=$(git rev-parse --short HEAD 2>/dev/null || echo "local")
    local timestamp=$(date +%Y%m%d%H%M%S)
    
    log_step "Building ${service}..."
    
    # Build with cache
    docker build \
        --cache-from "${ecr_url}:latest" \
        -t "${ecr_url}:${git_sha}" \
        -t "${ecr_url}:${timestamp}" \
        -t "${ecr_url}:latest" \
        -f "${dockerfile}" .
    
    log_step "Pushing ${service} to ECR..."
    docker push "${ecr_url}:${git_sha}"
    docker push "${ecr_url}:${timestamp}"
    docker push "${ecr_url}:latest"
    
    log_info "${service} pushed: ${ecr_url}:${git_sha}"
}

update_ecs_service() {
    local service=$1
    local ecs_service="${NAME_PREFIX}-${service}"
    
    log_step "Updating ECS service ${ecs_service}..."
    
    aws ecs update-service \
        --cluster "${CLUSTER_NAME}" \
        --service "${ecs_service}" \
        --force-new-deployment \
        --region "${AWS_REGION}" \
        --no-cli-pager
    
    log_step "Waiting for ${ecs_service} to stabilize..."
    aws ecs wait services-stable \
        --cluster "${CLUSTER_NAME}" \
        --services "${ecs_service}" \
        --region "${AWS_REGION}"
    
    log_info "${ecs_service} deployment complete"
}

deploy_service() {
    local service=$1
    build_and_push "$service"
    update_ecs_service "$service"
}

deploy_all() {
    for svc in frontend backend ml-service malgenx; do
        deploy_service "$svc"
    done
}

run_migrations() {
    log_step "Running database migrations..."
    
    local task_def="${NAME_PREFIX}-backend"
    local subnets=$(aws ec2 describe-subnets \
        --filters "Name=tag:Name,Values=*${NAME_PREFIX}*private*" \
        --query 'Subnets[*].SubnetId' \
        --output text | tr '\t' ',')
    local security_group=$(aws ec2 describe-security-groups \
        --filters "Name=tag:Name,Values=${NAME_PREFIX}-ecs-tasks-sg" \
        --query 'SecurityGroups[0].GroupId' \
        --output text)
    
    local task_arn=$(aws ecs run-task \
        --cluster "${CLUSTER_NAME}" \
        --task-definition "${task_def}" \
        --launch-type FARGATE \
        --network-configuration "awsvpcConfiguration={subnets=[${subnets}],securityGroups=[${security_group}],assignPublicIp=DISABLED}" \
        --overrides '{"containerOverrides":[{"name":"backend","command":["npx","prisma","migrate","deploy"]}]}' \
        --region "${AWS_REGION}" \
        --query 'tasks[0].taskArn' \
        --output text)
    
    log_info "Migration task started: ${task_arn}"
    log_step "Waiting for migration to complete..."
    
    aws ecs wait tasks-stopped \
        --cluster "${CLUSTER_NAME}" \
        --tasks "${task_arn}" \
        --region "${AWS_REGION}"
    
    local exit_code=$(aws ecs describe-tasks \
        --cluster "${CLUSTER_NAME}" \
        --tasks "${task_arn}" \
        --query 'tasks[0].containers[0].exitCode' \
        --output text)
    
    if [[ "$exit_code" == "0" ]]; then
        log_info "Migration completed successfully"
    else
        log_error "Migration failed with exit code: ${exit_code}"
        exit 1
    fi
}

show_status() {
    log_step "Deployment Status for ${ENVIRONMENT}"
    echo ""
    
    aws ecs describe-services \
        --cluster "${CLUSTER_NAME}" \
        --services "${NAME_PREFIX}-frontend" "${NAME_PREFIX}-backend" "${NAME_PREFIX}-ml-service" "${NAME_PREFIX}-malgenx" \
        --query 'services[*].{Service:serviceName,Status:status,Running:runningCount,Desired:desiredCount,Pending:pendingCount}' \
        --output table \
        --region "${AWS_REGION}"
}

tail_logs() {
    local service=$1
    local log_group="/ecs/${NAME_PREFIX}/${service}"
    
    log_step "Tailing logs for ${service}..."
    aws logs tail "${log_group}" --follow --region "${AWS_REGION}"
}

rollback_service() {
    local service=$1
    local ecs_service="${NAME_PREFIX}-${service}"
    
    log_step "Rolling back ${ecs_service}..."
    
    # Get previous task definition
    local current_td=$(aws ecs describe-services \
        --cluster "${CLUSTER_NAME}" \
        --services "${ecs_service}" \
        --query 'services[0].taskDefinition' \
        --output text \
        --region "${AWS_REGION}")
    
    local td_family=$(echo "$current_td" | cut -d'/' -f2 | cut -d':' -f1)
    local current_rev=$(echo "$current_td" | cut -d':' -f7)
    local prev_rev=$((current_rev - 1))
    
    if [[ $prev_rev -lt 1 ]]; then
        log_error "No previous revision to rollback to"
        exit 1
    fi
    
    local prev_td="${td_family}:${prev_rev}"
    
    aws ecs update-service \
        --cluster "${CLUSTER_NAME}" \
        --service "${ecs_service}" \
        --task-definition "${prev_td}" \
        --region "${AWS_REGION}" \
        --no-cli-pager
    
    log_info "Rolled back to ${prev_td}"
}

exec_into_container() {
    local service=$1
    local ecs_service="${NAME_PREFIX}-${service}"
    
    local task_arn=$(aws ecs list-tasks \
        --cluster "${CLUSTER_NAME}" \
        --service-name "${ecs_service}" \
        --query 'taskArns[0]' \
        --output text \
        --region "${AWS_REGION}")
    
    if [[ "$task_arn" == "None" ]]; then
        log_error "No running tasks for ${ecs_service}"
        exit 1
    fi
    
    log_step "Connecting to ${service}..."
    aws ecs execute-command \
        --cluster "${CLUSTER_NAME}" \
        --task "${task_arn}" \
        --container "${service}" \
        --interactive \
        --command "/bin/sh" \
        --region "${AWS_REGION}"
}

# Main
main() {
    check_prerequisites
    
    case "$ACTION" in
        deploy)
            ecr_login
            if [[ "$SERVICE" == "all" ]]; then
                deploy_all
            else
                deploy_service "$SERVICE"
            fi
            ;;
        migrate)
            run_migrations
            ;;
        status)
            show_status
            ;;
        logs)
            tail_logs "$SERVICE"
            ;;
        rollback)
            rollback_service "$SERVICE"
            ;;
        exec)
            exec_into_container "$SERVICE"
            ;;
        *)
            log_error "Unknown action: $ACTION"
            usage
            ;;
    esac
    
    log_info "Done!"
}

main
