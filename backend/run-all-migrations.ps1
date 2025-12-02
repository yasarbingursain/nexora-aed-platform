# Run All PostgreSQL Migrations
# Execute all compliance migrations in correct order

Write-Host "=== Nexora Compliance Migrations ===" -ForegroundColor Cyan
Write-Host ""

# Check if DATABASE_URL is set
if (-not $env:DATABASE_URL) {
    Write-Host "ERROR: DATABASE_URL environment variable not set" -ForegroundColor Red
    Write-Host ""
    Write-Host "Set it with your PostgreSQL credentials:" -ForegroundColor Yellow
    Write-Host '  $env:DATABASE_URL = "postgresql://postgres:YOUR_PASSWORD@localhost:5432/postgres"' -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "Database URL: $env:DATABASE_URL" -ForegroundColor Green
Write-Host ""

# Migration files in order
$migrations = @(
    "prisma\migrations\20250104_evidence_log.sql",
    "prisma\migrations\20250104_gdpr_privacy.sql",
    "prisma\migrations\050_uptime_slo.sql",
    "prisma\migrations\030_vendor_risk.sql",
    "prisma\migrations\040_dora_reporting.sql"
)

$successCount = 0
$failCount = 0

# Run each migration
foreach ($migration in $migrations) {
    if (Test-Path $migration) {
        Write-Host "Running: $migration" -ForegroundColor Yellow
        
        try {
            psql $env:DATABASE_URL -f $migration
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  SUCCESS" -ForegroundColor Green
                $successCount++
            } else {
                Write-Host "  FAILED (exit code: $LASTEXITCODE)" -ForegroundColor Red
                $failCount++
            }
        } catch {
            Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
            $failCount++
        }
        
        Write-Host ""
    } else {
        Write-Host "  NOT FOUND: $migration" -ForegroundColor Red
        $failCount++
        Write-Host ""
    }
}

# Summary
Write-Host "=== Migration Summary ===" -ForegroundColor Cyan
Write-Host "  Successful: $successCount" -ForegroundColor Green
Write-Host "  Failed: $failCount" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Red" })
Write-Host ""

if ($failCount -eq 0) {
    Write-Host "ALL MIGRATIONS COMPLETED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Test evidence collection: python scripts/collect_evidence.py"
    Write-Host "  2. Start server: npm run dev"
    Write-Host "  3. Test API: curl http://localhost:8080/api/v1/compliance/status"
} else {
    Write-Host "SOME MIGRATIONS FAILED - Please check errors above" -ForegroundColor Red
}
