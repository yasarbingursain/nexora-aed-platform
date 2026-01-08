# NEXORA DEVOPS/DEVSECOPS/CLOUD INFRASTRUCTURE REVIEW
## Enterprise-Grade ECR Deployment Readiness & AWS Configuration Analysis

**Review Date:** January 3, 2026  
**Scope:** Docker images, deployment automation, AWS Terraform, CI/CD pipelines, migration strategy  
**Methodology:** Line-by-line code review with concrete evidence and zero AI fluff

---

## EXECUTIVE SUMMARY: DEPLOYMENT BLOCKERS IDENTIFIED

**STATUS: NOT READY FOR ECR DEPLOYMENT** ❌

### Critical Blockers (Must Fix Before First Deploy)
1. **Deploy script Dockerfile paths are WRONG** - Script expects `infrastructure/aws/docker/Dockerfile.*` but actual files are at repo root and `backend/`
2. **ML service port mismatch** - Dockerfile exposes 8000, Terraform expects 8000, Python config defaults to 8000 ✅ (ACTUALLY ALIGNED)
3. **Frontend health endpoint EXISTS** - `/api/healthz/route.ts` is present ✅
4. **Next.js build-time config is CORRECT** - Dockerfile uses ARGs properly ✅
5. **Terraform remote state is COMMENTED OUT** - Team will have state conflicts
6. **No automated DB migrations** - Manual Prisma migrate is unsafe
7. **CI/CD uses static IAM keys** - Not OIDC, security risk
8. **GitHub Actions Dockerfile paths are WRONG** - Same issue as deploy.sh

### Port Configuration Analysis
- **Frontend:** Docker=3000, Terraform=3000, Health=/api/healthz ✅ ALIGNED
- **Backend:** Docker=8080, Terraform=8080, Health=/health ✅ ALIGNED  
- **ML Service:** Docker=8000, Terraform=8000, Python=8000, Health=/health ✅ ALIGNED

---

## 1. DOCKERFILE REVIEW: ECR READINESS

### 1.1 Frontend Dockerfile (`Dockerfile.frontend`)

**Location:** `c:\Users\Yaser\Desktop\Nexora-main v1.2\Dockerfile.frontend`

#### ✅ STRENGTHS (Enterprise-Grade)
```dockerfile
# Line 34-41: Build-time config injection (CORRECT pattern)
ARG NEXT_PUBLIC_API_URL=http://localhost:8080
ARG NEXT_PUBLIC_WS_URL=ws://localhost:8080
ARG NEXT_PUBLIC_ENVIRONMENT=production

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_ENVIRONMENT=$NEXT_PUBLIC_ENVIRONMENT
```
**Analysis:** This is the CORRECT pattern for Next.js. Build args are passed at build time and baked into the static bundle. Terraform/deploy script must pass these via `--build-arg`.

```dockerfile
# Line 59-60: Non-root user (security hardening)
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
```
**Analysis:** ✅ Follows least-privilege principle. Container runs as UID 1001, not root.

```dockerfile
# Line 85-86: Health check configured
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/healthz || exit 1
```
**Analysis:** ✅ Health endpoint `/api/healthz` exists at `app/api/healthz/route.ts` and returns JSON with status/timestamp/version.

```dockerfile
# Line 71-72: Standalone output (optimized for Docker)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
```
**Analysis:** ✅ Uses Next.js standalone output (configured in `next.config.js` line 4), reduces image size by ~80%.

#### ⚠️ GAPS
- **No explicit EXPOSE for port 3000** - Line 78 exposes it, but should be documented
- **wget dependency** - Alpine base doesn't include wget by default; health check will fail unless wget is installed in deps stage

**RECOMMENDATION:** Add `RUN apk add --no-cache wget` in the runner stage before USER directive.

---

### 1.2 Backend Dockerfile (`backend/Dockerfile`)

**Location:** `c:\Users\Yaser\Desktop\Nexora-main v1.2\backend\Dockerfile`

#### ✅ STRENGTHS
```dockerfile
# Line 20-21: Prisma client generation (critical for ORM)
RUN npx prisma generate
```
**Analysis:** ✅ Generates Prisma client at build time, required for database access.

```dockerfile
# Line 33-34: Non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nexora
```
**Analysis:** ✅ Runs as UID 1001, not root.

```dockerfile
# Line 52-54: Health check using Node.js HTTP
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"
```
**Analysis:** ✅ Health endpoint `/health` exists in `backend/src/routes/health.routes.ts` and returns comprehensive status.

```dockerfile
# Line 48: Port 8080 exposed
EXPOSE 8080
```
**Analysis:** ✅ Matches Terraform `local.ports.backend = 8080` (line 33 of `locals.tf`).

#### ⚠️ GAPS
- **No build args for secrets** - All secrets must come from Secrets Manager at runtime (which Terraform does correctly)
- **Logs directory created but not volume-mounted** - Line 43 creates logs dir but ECS uses CloudWatch, so this is redundant

---

### 1.3 ML Service Dockerfile (`backend/ml-service/Dockerfile`)

**Location:** `c:\Users\Yaser\Desktop\Nexora-main v1.2\backend\ml-service\Dockerfile`

#### ✅ STRENGTHS
```dockerfile
# Line 48: Port 8000 exposed
EXPOSE 8000
```
**Analysis:** ✅ Matches Terraform `local.ports.ml = 8000` (line 34 of `locals.tf`).

```dockerfile
# Line 19-20: Non-root user
RUN groupadd -r mlservice && useradd -r -g mlservice mlservice
```
**Analysis:** ✅ Runs as non-root user `mlservice`.

```dockerfile
# Line 51-52: Health check with curl
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health/ || exit 1
```
**Analysis:** ✅ Health endpoint `/health` exists in `backend/ml-service/src/api/health.py` (line 12: `router = APIRouter(prefix="/health")`).

```dockerfile
# Line 66: Production command with gunicorn
CMD ["gunicorn", "main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "-b", "0.0.0.0:8000"]
```
**Analysis:** ✅ Uses gunicorn with uvicorn workers for production, binds to port 8000.

#### ✅ PORT VERIFICATION
**Python config:** `backend/ml-service/src/config/__init__.py` line 14:
```python
api_port: int = 8000
```
**main.py:** Line 169-170:
```python
uvicorn.run(
    "main:app",
    host=settings.api_host,
    port=settings.api_port,  # Defaults to 8000
```

**VERDICT:** ✅ ML service port is **FULLY ALIGNED** at 8000 across Docker, Terraform, and application code.

---

## 2. DEPLOYMENT SCRIPT REVIEW: CRITICAL PATH MISMATCH

### 2.1 deploy.sh Analysis (`infrastructure/aws/scripts/deploy.sh`)

**Location:** `c:\Users\Yaser\Desktop\Nexora-main v1.2\infrastructure\aws\scripts\deploy.sh`

#### ❌ BLOCKER: Dockerfile Path Mismatch

**Line 88:**
```bash
local dockerfile="infrastructure/aws/docker/Dockerfile.${service}"
```

**Line 101:**
```bash
docker build \
    --cache-from "${ecr_url}:latest" \
    -t "${ecr_url}:${git_sha}" \
    -t "${ecr_url}:${timestamp}" \
    -t "${ecr_url}:latest" \
    -f "${dockerfile}" .
```

**PROBLEM:** Script expects Dockerfiles at:
- `infrastructure/aws/docker/Dockerfile.frontend`
- `infrastructure/aws/docker/Dockerfile.backend`
- `infrastructure/aws/docker/Dockerfile.ml-service`

**REALITY:** Actual Dockerfile locations:
- `Dockerfile.frontend` (repo root)
- `backend/Dockerfile`
- `backend/ml-service/Dockerfile`

**IMPACT:** `docker build` will fail with "Dockerfile not found" error. Deploy script is **completely broken**.

#### ❌ BLOCKER: Missing Build Context Mapping

**Line 101:** Uses `.` as build context for all services.

**PROBLEM:** 
- Backend Dockerfile expects context at `./backend` (copies `package.json` from context root)
- ML service Dockerfile expects context at `./backend/ml-service`
- Frontend can use repo root context ✅

**IMPACT:** Backend and ML builds will fail with "COPY failed: file not found" errors.

#### ❌ BLOCKER: No Build Args for Frontend

**Lines 96-101:** No `--build-arg` flags passed to docker build.

**PROBLEM:** Frontend Dockerfile expects:
- `NEXT_PUBLIC_API_URL` (line 34)
- `NEXT_PUBLIC_WS_URL` (line 35)
- `NEXT_PUBLIC_ENVIRONMENT` (line 36)

**IMPACT:** Frontend will build with localhost defaults, breaking API calls in production.

---

### 2.2 Migration Automation Gap

**Lines 145-188:** `run_migrations()` function exists ✅

**STRENGTHS:**
- Uses ECS run-task with Fargate
- Overrides container command to `npx prisma migrate deploy`
- Waits for task completion and checks exit code
- Fails deployment if migration fails

**GAPS:**
- No pre-migration backup trigger
- No rollback strategy if migration succeeds but deployment fails
- Not integrated into deploy flow (must be called manually)

---

## 3. TERRAFORM CONFIGURATION REVIEW

### 3.1 Port Configuration Verification

**File:** `infrastructure/aws/terraform/locals.tf` lines 30-37

```hcl
ports = {
  frontend = 3000
  backend  = 8080
  ml       = 8000
  postgres = 5432
  redis    = 6379
}
```

**Cross-reference with ECS task definitions:**

**Frontend (ecs.tf:126):**
```hcl
containerPort = local.ports.frontend  # 3000
```
**Health check (ecs.tf:147):**
```hcl
command = ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:${local.ports.frontend}/api/healthz || exit 1"]
```
✅ **ALIGNED**

**Backend (ecs.tf:224):**
```hcl
containerPort = local.ports.backend  # 8080
```
**Health check (ecs.tf:280):**
```hcl
command = ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:${local.ports.backend}/health || exit 1"]
```
✅ **ALIGNED**

**ML Service (ecs.tf:376):**
```hcl
containerPort = local.ports.ml  # 8000
```
**Health check (ecs.tf:395):**
```hcl
command = ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:${local.ports.ml}/health || exit 1"]
```
✅ **ALIGNED**

---

### 3.2 Frontend Environment Variable Injection

**File:** `infrastructure/aws/terraform/ecs.tf` lines 131-135

```hcl
environment = [
  { name = "NODE_ENV", value = "production" },
  { name = "NEXT_PUBLIC_ENVIRONMENT", value = var.environment },
  { name = "NEXT_PUBLIC_API_URL", value = var.domain_name != "" ? "https://api.${var.domain_name}" : "https://${aws_lb.main.dns_name}" }
]
```

**PROBLEM:** ❌ **RUNTIME INJECTION OF BUILD-TIME VARIABLES**

Next.js compiles `NEXT_PUBLIC_*` variables at **build time**, not runtime. Setting them in ECS task definition environment has **zero effect** on the compiled JavaScript bundle.

**IMPACT:** Frontend will use the default values from Dockerfile ARGs (localhost:8080), not the ALB DNS or domain name.

**CORRECT PATTERN:** Pass build args during `docker build`:
```bash
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://${ALB_DNS} \
  --build-arg NEXT_PUBLIC_WS_URL=wss://${ALB_DNS} \
  -f Dockerfile.frontend .
```

---

### 3.3 Image Tag Strategy

**All task definitions use:**
```hcl
image = "${aws_ecr_repository.frontend.repository_url}:latest"
```

**Lines 199-200 (frontend service):**
```hcl
lifecycle {
  ignore_changes = [desired_count, task_definition]
}
```

**PROBLEM:** ❌ **TERRAFORM IGNORES TASK DEFINITION CHANGES**

With `ignore_changes = [task_definition]`, Terraform will never update the ECS service when you push a new `:latest` image. You must manually run `aws ecs update-service --force-new-deployment`.

**IMPACT:** Terraform apply will not deploy new images. CI/CD must use AWS CLI directly.

**RECOMMENDATION:** Either:
1. Remove `ignore_changes` and use `var.image_tag` (git SHA) in image URIs, OR
2. Keep `ignore_changes` and document that deploys are CLI-driven, not Terraform-driven

---

### 3.4 Terraform State Backend

**File:** `infrastructure/aws/terraform/versions.tf` lines 27-33

```hcl
# backend "s3" {
#   bucket         = "nexora-terraform-state-ACCOUNT_ID"
#   key            = "nexora/terraform.tfstate"
#   region         = "us-east-1"
#   encrypt        = true
#   dynamodb_table = "nexora-terraform-locks"
# }
```

**STATUS:** ❌ **COMMENTED OUT**

**IMPACT:** 
- Terraform state is stored locally in `terraform.tfstate`
- Multiple team members will have conflicting state
- No state locking, risk of concurrent apply corruption
- State file contains secrets (RDS passwords, etc.) in plaintext on laptops

**BLOCKER FOR TEAM/PRODUCTION USE**

---

## 4. CI/CD PIPELINE REVIEW

### 4.1 GitHub Actions Workflow (`aws-deploy.yml`)

**Location:** `.github/workflows/aws-deploy.yml`

#### ❌ BLOCKER: Same Dockerfile Path Issue

**Lines 125, 164, 200, 236:**
```yaml
file: infrastructure/aws/docker/Dockerfile.frontend
file: infrastructure/aws/docker/Dockerfile.backend
file: infrastructure/aws/docker/Dockerfile.ml-service
file: infrastructure/aws/docker/Dockerfile.malgenx
```

**PROBLEM:** Same as deploy.sh - these paths don't exist.

**IMPACT:** All GitHub Actions builds will fail immediately.

---

#### ❌ SECURITY: Static IAM Credentials

**Lines 110-112, 149-151, 185-187, 221-223:**
```yaml
aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

**PROBLEM:** Uses long-lived IAM user credentials stored in GitHub Secrets.

**RISK:**
- If secrets are leaked, attacker has full AWS access until keys are rotated
- No automatic expiration
- Harder to audit (can't distinguish human vs CI actions in CloudTrail)

**ENTERPRISE STANDARD:** Use GitHub OIDC with IAM role assumption (no static keys).

---

#### ✅ STRENGTHS

**Lines 76-84:** Trivy security scanning
```yaml
- name: Run Trivy vulnerability scanner
  uses: aquasecurity/trivy-action@master
  with:
    scan-type: 'fs'
    severity: 'CRITICAL,HIGH'
    exit-code: '1'
    ignore-unfixed: true
  continue-on-error: ${{ needs.setup.outputs.environment == 'dev' }}
```
**Analysis:** ✅ Blocks prod deploys on CRITICAL/HIGH vulns, allows dev to proceed (reasonable).

**Lines 130-132:** Build args for frontend
```yaml
build-args: |
  NEXT_PUBLIC_API_URL=${{ secrets.API_URL }}
  NEXT_PUBLIC_ENVIRONMENT=${{ needs.setup.outputs.environment }}
```
**Analysis:** ✅ Correctly passes build args (though Dockerfile path is wrong).

**Lines 293-301:** Service stabilization wait
```yaml
aws ecs wait services-stable \
  --cluster ${{ env.PROJECT_NAME }}-${{ needs.setup.outputs.environment }}-cluster \
  --services \
    ${{ env.PROJECT_NAME }}-${{ needs.setup.outputs.environment }}-frontend \
    ${{ env.PROJECT_NAME }}-${{ needs.setup.outputs.environment }}-backend
timeout-minutes: 15
```
**Analysis:** ✅ Waits for ECS deployment to stabilize before marking success.

---

## 5. AWS INFRASTRUCTURE SECURITY POSTURE

### 5.1 Security Groups (Already Reviewed)

**From previous review:** ECS task security group allows egress to `0.0.0.0/0`.

**Recommendation:** Restrict to:
- RDS SG on 5432
- ElastiCache SG on 6379
- VPC endpoints prefix list on 443
- Specific external IPs for OSINT APIs (if required)

---

### 5.2 Secrets Management ✅

**Terraform correctly uses:**
- AWS Secrets Manager for all credentials
- ECS task role to retrieve secrets at runtime
- KMS encryption for secrets at rest

**No hard-coded secrets in Terraform or Dockerfiles.** ✅

---

## 6. CONCRETE REMEDIATION PLAN

### PRIORITY 0: BLOCKERS (Fix Before Any Deploy Attempt)

#### B1. Fix deploy.sh Dockerfile Paths

**File:** `infrastructure/aws/scripts/deploy.sh`

**Replace lines 86-101 with:**

```bash
build_and_push() {
    local service=$1
    local ecr_url=$(get_ecr_url $service)
    local git_sha=$(git rev-parse --short HEAD 2>/dev/null || echo "local")
    local timestamp=$(date +%Y%m%d%H%M%S)
    
    # Map service to Dockerfile and context
    local dockerfile=""
    local context=""
    local build_args=""
    
    case "$service" in
        frontend)
            dockerfile="Dockerfile.frontend"
            context="."
            # Get ALB DNS or use domain
            local alb_dns=$(aws elbv2 describe-load-balancers \
                --names "${NAME_PREFIX}-alb" \
                --query 'LoadBalancers[0].DNSName' \
                --output text 2>/dev/null || echo "")
            local api_url="https://${alb_dns}"
            local ws_url="wss://${alb_dns}"
            build_args="--build-arg NEXT_PUBLIC_API_URL=${api_url} --build-arg NEXT_PUBLIC_WS_URL=${ws_url} --build-arg NEXT_PUBLIC_ENVIRONMENT=${ENVIRONMENT}"
            ;;
        backend)
            dockerfile="backend/Dockerfile"
            context="./backend"
            ;;
        ml-service)
            dockerfile="backend/ml-service/Dockerfile"
            context="./backend/ml-service"
            ;;
        *)
            log_error "Unknown service: $service"
            exit 1
            ;;
    esac
    
    log_step "Building ${service} from ${dockerfile} with context ${context}..."
    
    # Build with cache
    docker build \
        --cache-from "${ecr_url}:latest" \
        -t "${ecr_url}:${git_sha}" \
        -t "${ecr_url}:${timestamp}" \
        -t "${ecr_url}:latest" \
        -f "${dockerfile}" \
        ${build_args} \
        "${context}"
    
    log_step "Pushing ${service} to ECR..."
    docker push "${ecr_url}:${git_sha}"
    docker push "${ecr_url}:${timestamp}"
    docker push "${ecr_url}:latest"
    
    log_info "${service} pushed: ${ecr_url}:${git_sha}"
}
```

---

#### B2. Fix GitHub Actions Dockerfile Paths

**File:** `.github/workflows/aws-deploy.yml`

**Replace lines 121-134:**
```yaml
- name: Build and push Frontend image
  uses: docker/build-push-action@v5
  with:
    context: .
    file: Dockerfile.frontend
    push: true
    tags: |
      ${{ steps.login-ecr.outputs.registry }}/${{ env.PROJECT_NAME }}-${{ needs.setup.outputs.environment }}-frontend:${{ github.sha }}
      ${{ steps.login-ecr.outputs.registry }}/${{ env.PROJECT_NAME }}-${{ needs.setup.outputs.environment }}-frontend:latest
    build-args: |
      NEXT_PUBLIC_API_URL=${{ secrets.API_URL }}
      NEXT_PUBLIC_WS_URL=${{ secrets.WS_URL }}
      NEXT_PUBLIC_ENVIRONMENT=${{ needs.setup.outputs.environment }}
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

**Replace lines 160-170:**
```yaml
- name: Build and push Backend image
  uses: docker/build-push-action@v5
  with:
    context: ./backend
    file: backend/Dockerfile
    push: true
    tags: |
      ${{ steps.login-ecr.outputs.registry }}/${{ env.PROJECT_NAME }}-${{ needs.setup.outputs.environment }}-backend:${{ github.sha }}
      ${{ steps.login-ecr.outputs.registry }}/${{ env.PROJECT_NAME }}-${{ needs.setup.outputs.environment }}-backend:latest
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

**Replace lines 196-206:**
```yaml
- name: Build and push ML Service image
  uses: docker/build-push-action@v5
  with:
    context: ./backend/ml-service
    file: backend/ml-service/Dockerfile
    push: true
    tags: |
      ${{ steps.login-ecr.outputs.registry }}/${{ env.PROJECT_NAME }}-${{ needs.setup.outputs.environment }}-ml-service:${{ github.sha }}
      ${{ steps.login-ecr.outputs.registry }}/${{ env.PROJECT_NAME }}-${{ needs.setup.outputs.environment }}-ml-service:latest
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

---

#### B3. Add wget to Frontend Dockerfile

**File:** `Dockerfile.frontend`

**Add after line 60 (before USER directive):**
```dockerfile
# Install wget for health checks
RUN apk add --no-cache wget

USER nextjs
```

---

#### B4. Remove Runtime NEXT_PUBLIC_* from Terraform

**File:** `infrastructure/aws/terraform/ecs.tf`

**Replace lines 131-135:**
```hcl
environment = [
  { name = "NODE_ENV", value = "production" },
  { name = "PORT", value = "3000" },
  { name = "HOSTNAME", value = "0.0.0.0" }
]
```

**Rationale:** Next.js public vars must be set at build time, not runtime. Remove them from ECS task definition.

---

#### B5. Setup Terraform Remote State

**Prerequisites:**
```bash
# 1. Create S3 bucket
aws s3 mb s3://nexora-terraform-state-$(aws sts get-caller-identity --query Account --output text) --region us-east-1

# 2. Enable versioning
aws s3api put-bucket-versioning \
  --bucket nexora-terraform-state-$(aws sts get-caller-identity --query Account --output text) \
  --versioning-configuration Status=Enabled

# 3. Enable encryption
aws s3api put-bucket-encryption \
  --bucket nexora-terraform-state-$(aws sts get-caller-identity --query Account --output text) \
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

# 4. Create DynamoDB lock table
aws dynamodb create-table \
  --table-name nexora-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

**File:** `infrastructure/aws/terraform/versions.tf`

**Uncomment and update lines 27-33:**
```hcl
backend "s3" {
  bucket         = "nexora-terraform-state-REPLACE_WITH_ACCOUNT_ID"
  key            = "nexora/terraform.tfstate"
  region         = "us-east-1"
  encrypt        = true
  dynamodb_table = "nexora-terraform-locks"
}
```

**Then migrate state:**
```bash
cd infrastructure/aws/terraform
terraform init -migrate-state
```

---

#### B6. Integrate Migrations into Deploy Flow

**File:** `infrastructure/aws/scripts/deploy.sh`

**Update `deploy_all()` function (line 139):**
```bash
deploy_all() {
    # Run migrations first
    run_migrations
    
    # Then deploy services in order
    for svc in backend ml-service frontend; do
        deploy_service "$svc"
    done
}
```

**Rationale:** Backend must deploy after migrations succeed. Frontend last to avoid serving new UI against old API.

---

### PRIORITY 1: SECURITY HARDENING

#### S1. Migrate to GitHub OIDC

**Create IAM OIDC provider:**
```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

**Create IAM role with trust policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:YOUR_ORG/nexora:*"
        }
      }
    }
  ]
}
```

**Update GitHub Actions workflow:**
```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::ACCOUNT_ID:role/GitHubActionsDeployRole
    aws-region: ${{ env.AWS_REGION }}
```

**Remove:** `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` secrets.

---

## 7. DEPLOYMENT SEQUENCE (CORRECT ORDER)

Once blockers are fixed, follow this sequence:

```bash
# 1. Setup Terraform state backend (one-time)
cd infrastructure/aws/terraform
terraform init -migrate-state

# 2. Apply Terraform infrastructure
terraform plan -var environment=dev
terraform apply -var environment=dev

# 3. Build and push images with correct paths
cd ../../..
./infrastructure/aws/scripts/deploy.sh dev deploy all

# This will:
# - Build frontend from Dockerfile.frontend with ALB DNS build args
# - Build backend from backend/Dockerfile with context ./backend
# - Build ML from backend/ml-service/Dockerfile with context ./backend/ml-service
# - Push all to ECR with git SHA and latest tags
# - Run Prisma migrations via ECS one-off task
# - Deploy backend service (waits for stable)
# - Deploy ML service (waits for stable)
# - Deploy frontend service (waits for stable)

# 4. Verify health
ALB_DNS=$(terraform output -raw alb_dns_name)
curl -sf https://${ALB_DNS}/health
curl -sf https://${ALB_DNS}/api/healthz
```

---

## 8. VERIFICATION CHECKLIST

Before marking infrastructure as "production-ready":

- [ ] Deploy script builds all three services without errors
- [ ] ECR repositories contain images with git SHA tags
- [ ] ECS services reach "RUNNING" state with 2/2 tasks healthy
- [ ] ALB health checks pass for all target groups
- [ ] Frontend loads in browser and makes successful API calls to backend
- [ ] Backend `/health` endpoint returns `healthy` status with all dependencies green
- [ ] ML service `/health` endpoint returns operational status
- [ ] Prisma migrations run successfully via ECS task
- [ ] CloudWatch Logs show application logs from all services
- [ ] Terraform state is in S3 with DynamoDB locking
- [ ] GitHub Actions workflow completes without Dockerfile path errors
- [ ] No static IAM keys in GitHub Secrets (OIDC only)
- [ ] ECS task security group egress is restricted (not 0.0.0.0/0)

---

## 9. COST ESTIMATE (Current Configuration)

**Dev Environment (as configured):**
- ECS Fargate: 3 services × 0.25 vCPU × 0.5GB × $0.04/hr ≈ $30/mo
- RDS t3.micro: $12/mo
- ElastiCache t3.micro: $12/mo
- NAT Gateway: 1 × $32/mo = $32/mo
- ALB: $16/mo + data transfer
- **Total: ~$100-120/mo**

**Prod Environment (recommended):**
- ECS Fargate: 6 tasks (2 per service) × 0.5 vCPU × 1GB × $0.04/hr ≈ $180/mo
- RDS t3.medium Multi-AZ: $96/mo
- ElastiCache t3.medium: $48/mo
- NAT Gateway: 2 × $32/mo = $64/mo
- ALB: $16/mo + data transfer
- WAF: $5/mo + $1/million requests
- **Total: ~$400-450/mo**

---

## 10. FINAL VERDICT

### Current State: ❌ NOT READY FOR ECR DEPLOYMENT

**Blocking Issues:**
1. Deploy script Dockerfile paths are incorrect (will fail immediately)
2. GitHub Actions Dockerfile paths are incorrect (CI/CD broken)
3. Frontend build-time config not passed correctly (will use localhost)
4. No Terraform remote state (team unsafe)
5. Migrations not integrated into deploy flow (manual, error-prone)

### After Fixes: ✅ PRODUCTION-READY INFRASTRUCTURE

**Strengths:**
- Dockerfiles are enterprise-grade with security hardening
- Port configurations are fully aligned across all layers
- Health endpoints exist and are correctly configured
- Terraform infrastructure is well-architected
- Secrets management is secure (Secrets Manager + KMS)
- Multi-AZ, auto-scaling, and circuit breakers configured

**Remaining Improvements (non-blocking):**
- Migrate to GitHub OIDC (security)
- Restrict ECS egress to known destinations (security)
- Add pre-migration backup automation (reliability)
- Enable VPC Flow Logs in staging (observability)

---

## APPENDIX: FILE REFERENCE INDEX

**Dockerfiles:**
- Frontend: `Dockerfile.frontend` (repo root)
- Backend: `backend/Dockerfile`
- ML Service: `backend/ml-service/Dockerfile`

**Deployment:**
- Deploy script: `infrastructure/aws/scripts/deploy.sh`
- GitHub Actions: `.github/workflows/aws-deploy.yml`

**Terraform:**
- Versions: `infrastructure/aws/terraform/versions.tf`
- Locals: `infrastructure/aws/terraform/locals.tf`
- ECS: `infrastructure/aws/terraform/ecs.tf`
- Variables: `infrastructure/aws/terraform/variables.tf`

**Health Endpoints:**
- Frontend: `app/api/healthz/route.ts`
- Backend: `backend/src/routes/health.routes.ts`
- ML Service: `backend/ml-service/src/api/health.py`

**Application Config:**
- Next.js: `next.config.js`
- ML Service: `backend/ml-service/src/config/__init__.py`
- ML Main: `backend/ml-service/main.py`

---

**END OF REVIEW**
