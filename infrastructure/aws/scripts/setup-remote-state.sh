#!/bin/bash
# =============================================================================
# Setup Terraform Remote State Backend
# =============================================================================
# Run this ONCE before first terraform init
# =============================================================================

set -euo pipefail

AWS_REGION="${AWS_REGION:-us-east-1}"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
BUCKET_NAME="nexora-terraform-state-${ACCOUNT_ID}"
DYNAMODB_TABLE="nexora-terraform-locks"

echo "Setting up Terraform remote state..."
echo "Account ID: ${ACCOUNT_ID}"
echo "Region: ${AWS_REGION}"
echo "S3 Bucket: ${BUCKET_NAME}"
echo "DynamoDB Table: ${DYNAMODB_TABLE}"
echo ""

# Create S3 bucket
echo "Creating S3 bucket..."
if aws s3api head-bucket --bucket "${BUCKET_NAME}" 2>/dev/null; then
    echo "Bucket already exists"
else
    aws s3api create-bucket \
        --bucket "${BUCKET_NAME}" \
        --region "${AWS_REGION}" \
        --create-bucket-configuration LocationConstraint="${AWS_REGION}" 2>/dev/null || \
    aws s3api create-bucket \
        --bucket "${BUCKET_NAME}" \
        --region "${AWS_REGION}"
    
    # Enable versioning
    aws s3api put-bucket-versioning \
        --bucket "${BUCKET_NAME}" \
        --versioning-configuration Status=Enabled
    
    # Enable encryption
    aws s3api put-bucket-encryption \
        --bucket "${BUCKET_NAME}" \
        --server-side-encryption-configuration '{
            "Rules": [{
                "ApplyServerSideEncryptionByDefault": {
                    "SSEAlgorithm": "aws:kms"
                },
                "BucketKeyEnabled": true
            }]
        }'
    
    # Block public access
    aws s3api put-public-access-block \
        --bucket "${BUCKET_NAME}" \
        --public-access-block-configuration '{
            "BlockPublicAcls": true,
            "IgnorePublicAcls": true,
            "BlockPublicPolicy": true,
            "RestrictPublicBuckets": true
        }'
    
    echo "S3 bucket created and configured"
fi

# Create DynamoDB table
echo "Creating DynamoDB table..."
if aws dynamodb describe-table --table-name "${DYNAMODB_TABLE}" --region "${AWS_REGION}" 2>/dev/null; then
    echo "DynamoDB table already exists"
else
    aws dynamodb create-table \
        --table-name "${DYNAMODB_TABLE}" \
        --attribute-definitions AttributeName=LockID,AttributeType=S \
        --key-schema AttributeName=LockID,KeyType=HASH \
        --billing-mode PAY_PER_REQUEST \
        --region "${AWS_REGION}"
    
    echo "Waiting for table to be active..."
    aws dynamodb wait table-exists --table-name "${DYNAMODB_TABLE}" --region "${AWS_REGION}"
    
    echo "DynamoDB table created"
fi

echo ""
echo "=========================================="
echo "Remote state backend setup complete!"
echo "=========================================="
echo ""
echo "Update your versions.tf backend configuration:"
echo ""
echo 'backend "s3" {'
echo "  bucket         = \"${BUCKET_NAME}\""
echo '  key            = "nexora/terraform.tfstate"'
echo "  region         = \"${AWS_REGION}\""
echo '  encrypt        = true'
echo "  dynamodb_table = \"${DYNAMODB_TABLE}\""
echo '}'
echo ""
echo "Then run: terraform init -migrate-state"
