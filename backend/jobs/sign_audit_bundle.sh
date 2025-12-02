#!/bin/bash
# Daily Audit Bundle Signing
# Signs daily audit logs with cosign for tamper-evidence
# Run daily via cron: 0 2 * * * /path/jobs/sign_audit_bundle.sh

set -euo pipefail

# Configuration
DATE=$(date -u +%F)
ARTIFACTS_DIR="${ARTIFACTS_DIR:-./artifacts}"
DATABASE_URL="${DATABASE_URL}"
COSIGN_KEY="${COSIGN_KEY:-./cosign.key}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=== Daily Audit Bundle Signing ==="
echo "Date: ${DATE}"
echo "Artifacts: ${ARTIFACTS_DIR}"
echo ""

# Create artifacts directory
mkdir -p "${ARTIFACTS_DIR}"

# Export audit logs for the day
echo "📦 Exporting audit logs..."
AUDIT_FILE="${ARTIFACTS_DIR}/audit_${DATE}.csv"

psql "${DATABASE_URL}" -At -c "
  COPY (
    SELECT id, ts, org_id, user_id, action, resource, resource_id, 
           ip, lawful_basis, retention_until, 
           encode(prev_hash, 'hex') as prev_hash,
           encode(hash, 'hex') as hash
    FROM security.evidence_log
    WHERE ts::date = '${DATE}'
    ORDER BY id
  ) TO STDOUT WITH CSV HEADER
" > "${AUDIT_FILE}"

if [ ! -s "${AUDIT_FILE}" ]; then
    echo -e "${YELLOW}⚠️  No audit logs for ${DATE}${NC}"
    exit 0
fi

RECORD_COUNT=$(wc -l < "${AUDIT_FILE}")
echo -e "${GREEN}✓${NC} Exported ${RECORD_COUNT} records"

# Calculate SHA256 hash
echo "🔐 Calculating SHA256 hash..."
HASH_FILE="${ARTIFACTS_DIR}/audit_${DATE}.sha256"
sha256sum "${AUDIT_FILE}" > "${HASH_FILE}"
echo -e "${GREEN}✓${NC} Hash: $(cat ${HASH_FILE} | cut -d' ' -f1)"

# Sign with cosign
echo "✍️  Signing with cosign..."
SIG_FILE="${ARTIFACTS_DIR}/audit_${DATE}.sig"

if [ ! -f "${COSIGN_KEY}" ]; then
    echo -e "${RED}✗ Cosign key not found: ${COSIGN_KEY}${NC}"
    echo "Generate key with: cosign generate-key-pair"
    exit 1
fi

cosign sign-blob \
    --key "${COSIGN_KEY}" \
    --output-signature "${SIG_FILE}" \
    "${AUDIT_FILE}"

echo -e "${GREEN}✓${NC} Signature created: ${SIG_FILE}"

# Verify signature
echo "🔍 Verifying signature..."
cosign verify-blob \
    --key "${COSIGN_KEY}.pub" \
    --signature "${SIG_FILE}" \
    "${AUDIT_FILE}"

echo -e "${GREEN}✓${NC} Signature verified"

# Create metadata file
echo "📝 Creating metadata..."
METADATA_FILE="${ARTIFACTS_DIR}/audit_${DATE}.json"
cat > "${METADATA_FILE}" << EOF
{
  "date": "${DATE}",
  "record_count": ${RECORD_COUNT},
  "file": "audit_${DATE}.csv",
  "sha256": "$(cat ${HASH_FILE} | cut -d' ' -f1)",
  "signature": "audit_${DATE}.sig",
  "signed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "cosign_key": "$(basename ${COSIGN_KEY}).pub"
}
EOF

echo -e "${GREEN}✓${NC} Metadata: ${METADATA_FILE}"

# Optional: Upload to S3 or evidence bucket
if [ -n "${EVIDENCE_BUCKET:-}" ]; then
    echo "☁️  Uploading to evidence bucket..."
    
    if [[ "${EVIDENCE_BUCKET}" == s3://* ]]; then
        # AWS S3
        aws s3 cp "${AUDIT_FILE}" "${EVIDENCE_BUCKET}/audit/${DATE}/"
        aws s3 cp "${SIG_FILE}" "${EVIDENCE_BUCKET}/audit/${DATE}/"
        aws s3 cp "${HASH_FILE}" "${EVIDENCE_BUCKET}/audit/${DATE}/"
        aws s3 cp "${METADATA_FILE}" "${EVIDENCE_BUCKET}/audit/${DATE}/"
        echo -e "${GREEN}✓${NC} Uploaded to ${EVIDENCE_BUCKET}"
    else
        # Local directory
        mkdir -p "${EVIDENCE_BUCKET}/audit/${DATE}"
        cp "${AUDIT_FILE}" "${EVIDENCE_BUCKET}/audit/${DATE}/"
        cp "${SIG_FILE}" "${EVIDENCE_BUCKET}/audit/${DATE}/"
        cp "${HASH_FILE}" "${EVIDENCE_BUCKET}/audit/${DATE}/"
        cp "${METADATA_FILE}" "${EVIDENCE_BUCKET}/audit/${DATE}/"
        echo -e "${GREEN}✓${NC} Copied to ${EVIDENCE_BUCKET}"
    fi
fi

# Cleanup old artifacts (keep 90 days)
echo "🧹 Cleaning up old artifacts..."
find "${ARTIFACTS_DIR}" -name "audit_*.csv" -mtime +90 -delete
find "${ARTIFACTS_DIR}" -name "audit_*.sig" -mtime +90 -delete
find "${ARTIFACTS_DIR}" -name "audit_*.sha256" -mtime +90 -delete
find "${ARTIFACTS_DIR}" -name "audit_*.json" -mtime +90 -delete

echo ""
echo -e "${GREEN}✅ Audit bundle signed successfully${NC}"
echo "Files:"
echo "  - ${AUDIT_FILE}"
echo "  - ${SIG_FILE}"
echo "  - ${HASH_FILE}"
echo "  - ${METADATA_FILE}"
