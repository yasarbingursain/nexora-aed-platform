# =============================================================================
# Nexora AWS Deployment Script (PowerShell)
# =============================================================================
# Usage: .\deploy.ps1 -Environment dev -Service all
# =============================================================================

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("dev", "staging", "prod")]
    [string]$Environment = "dev",
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("all", "frontend", "backend", "ml-service", "malgenx", "migrate")]
    [string]$Service = "all"
)

$ErrorActionPreference = "Stop"

# Configuration
$AWS_REGION = if ($env:AWS_REGION) { $env:AWS_REGION } else { "us-east-1" }
$PROJECT_NAME = "nexora"

function Write-Info { param($Message) Write-Host "[INFO] $Message" -ForegroundColor Green }
function Write-Warn { param($Message) Write-Host "[WARN] $Message" -ForegroundColor Yellow }
function Write-Err { param($Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }

function Test-Prerequisites {
    Write-Info "Checking prerequisites..."
    
    if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
        Write-Err "AWS CLI is not installed."
        exit 1
    }
    
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Err "Docker is not installed."
        exit 1
    }
    
    try {
        aws sts get-caller-identity | Out-Null
    } catch {
        Write-Err "AWS credentials not configured. Run 'aws configure' first."
        exit 1
    }
    
    Write-Info "Prerequisites check passed."
}

function Get-AccountId {
    return (aws sts get-caller-identity --query Account --output text)
}

function Get-EcrUrl {
    param($ServiceName)
    $accountId = Get-AccountId
    return "$accountId.dkr.ecr.$AWS_REGION.amazonaws.com/$PROJECT_NAME-$Environment-$ServiceName"
}

function Connect-Ecr {
    Write-Info "Logging into ECR..."
    $accountId = Get-AccountId
    $password = aws ecr get-login-password --region $AWS_REGION
    $password | docker login --username AWS --password-stdin "$accountId.dkr.ecr.$AWS_REGION.amazonaws.com"
}

function Build-AndPush {
    param(
        $ServiceName,
        $Dockerfile,
        $Context
    )
    
    $ecrUrl = Get-EcrUrl -ServiceName $ServiceName
    $tag = "${ecrUrl}:latest"
    
    try {
        $gitHash = git rev-parse --short HEAD 2>$null
    } catch {
        $gitHash = "local"
    }
    $versionTag = "${ecrUrl}:$gitHash"
    
    Write-Info "Building $ServiceName..."
    docker build -t $tag -t $versionTag -f $Dockerfile $Context
    
    Write-Info "Pushing $ServiceName to ECR..."
    docker push $tag
    docker push $versionTag
    
    Write-Info "$ServiceName pushed successfully."
}

function Update-EcsService {
    param($ServiceName)
    
    $cluster = "$PROJECT_NAME-$Environment-cluster"
    $ecsService = "$PROJECT_NAME-$Environment-$ServiceName"
    
    Write-Info "Updating ECS service $ecsService..."
    aws ecs update-service `
        --cluster $cluster `
        --service $ecsService `
        --force-new-deployment `
        --region $AWS_REGION `
        --no-cli-pager
    
    Write-Info "Waiting for service $ecsService to stabilize..."
    aws ecs wait services-stable `
        --cluster $cluster `
        --services $ecsService `
        --region $AWS_REGION
    
    Write-Info "$ecsService deployment complete."
}

function Deploy-Frontend {
    Write-Info "Deploying frontend..."
    Build-AndPush -ServiceName "frontend" -Dockerfile "infrastructure/aws/docker/Dockerfile.frontend" -Context "."
    Update-EcsService -ServiceName "frontend"
}

function Deploy-Backend {
    Write-Info "Deploying backend..."
    Build-AndPush -ServiceName "backend" -Dockerfile "infrastructure/aws/docker/Dockerfile.backend" -Context "."
    Update-EcsService -ServiceName "backend"
}

function Deploy-MlService {
    Write-Info "Deploying ML service..."
    Build-AndPush -ServiceName "ml-service" -Dockerfile "infrastructure/aws/docker/Dockerfile.ml-service" -Context "."
    Update-EcsService -ServiceName "ml-service"
}

function Deploy-Malgenx {
    Write-Info "Deploying MalGenX service..."
    Build-AndPush -ServiceName "malgenx" -Dockerfile "infrastructure/aws/docker/Dockerfile.malgenx" -Context "."
    Update-EcsService -ServiceName "malgenx"
}

# Main
Write-Info "Starting deployment to $Environment environment..."
Write-Info "Service: $Service"

Test-Prerequisites
Connect-Ecr

switch ($Service) {
    "all" {
        Deploy-Frontend
        Deploy-Backend
        Deploy-MlService
        Deploy-Malgenx
    }
    "frontend" { Deploy-Frontend }
    "backend" { Deploy-Backend }
    "ml-service" { Deploy-MlService }
    "malgenx" { Deploy-Malgenx }
    default {
        Write-Err "Unknown service: $Service"
        exit 1
    }
}

Write-Info "Deployment complete!"
