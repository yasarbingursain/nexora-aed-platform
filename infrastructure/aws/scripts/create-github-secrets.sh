#!/bin/bash
# =============================================================================
# Create GitHub Actions Secrets
# =============================================================================
# Creates IAM access keys and outputs GitHub secrets to configure
# =============================================================================

set -euo pipefail

PROJECT_NAME="nexora"
ENVIRONMENT="${1:-dev}"
NAME_PREFIX="${PROJECT_NAME}-${ENVIRONMENT}"

echo "Creating GitHub Actions credentials for ${ENVIRONMENT}..."

# Get the IAM user
IAM_USER="${NAME_PREFIX}-github-actions"

# Check if user exists
if ! aws iam get-user --user-name "${IAM_USER}" &>/dev/null; then
    echo "Error: IAM user ${IAM_USER} does not exist."
    echo "Run 'terraform apply' first to create the infrastructure."
    exit 1
fi

# Delete existing access keys (max 2 per user)
existing_keys=$(aws iam list-access-keys --user-name "${IAM_USER}" --query 'AccessKeyMetadata[*].AccessKeyId' --output text)
for key in $existing_keys; do
    echo "Deleting existing access key: ${key}"
    aws iam delete-access-key --user-name "${IAM_USER}" --access-key-id "${key}"
done

# Create new access key
echo "Creating new access key..."
credentials=$(aws iam create-access-key --user-name "${IAM_USER}" --output json)

ACCESS_KEY_ID=$(echo "$credentials" | jq -r '.AccessKey.AccessKeyId')
SECRET_ACCESS_KEY=$(echo "$credentials" | jq -r '.AccessKey.SecretAccessKey')

# Get ALB DNS
ALB_DNS=$(aws elbv2 describe-load-balancers \
    --names "${NAME_PREFIX}-alb" \
    --query 'LoadBalancers[0].DNSName' \
    --output text 2>/dev/null || echo "ALB_NOT_FOUND")

echo ""
echo "=========================================="
echo "GitHub Secrets to Configure"
echo "=========================================="
echo ""
echo "Go to: GitHub Repo → Settings → Secrets and variables → Actions"
echo ""
echo "Add these repository secrets:"
echo ""
echo "AWS_ACCESS_KEY_ID:"
echo "${ACCESS_KEY_ID}"
echo ""
echo "AWS_SECRET_ACCESS_KEY:"
echo "${SECRET_ACCESS_KEY}"
echo ""
echo "API_URL:"
echo "https://${ALB_DNS}"
echo ""
echo "=========================================="
echo ""
echo "IMPORTANT: Save these credentials securely!"
echo "The secret access key cannot be retrieved again."
