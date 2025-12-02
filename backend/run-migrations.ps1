# Run Database Migrations
# Applies security and GDPR compliance migrations

Write-Host "=== Nexora Database Migrations ===" -ForegroundColor Cyan
Write-Host ""

# Check if DATABASE_URL is set
if (-not $env:DATABASE_URL) {
    Write-Host "ERROR: DATABASE_URL environment variable not set" -ForegroundColor Red
    Write-Host "Example: `$env:DATABASE_URL = 'postgresql://user:pass@localhost:5432/nexora'" -ForegroundColor Yellow
    exit 1
}

Write-Host "Database URL: $env:DATABASE_URL" -ForegroundColor Green
Write-Host ""

# Check if psql is available
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlPath) {
    Write-Host "ERROR: psql command not found. Please install PostgreSQL client tools." -ForegroundColor Red
    exit 1
}

# Migration files
$migrations = @(
    "prisma\migrations\20250104_evidence_log.sql",
    "prisma\migrations\20250104_gdpr_privacy.sql"
)

# Run each migration
foreach ($migration in $migrations) {
    if (Test-Path $migration) {
        Write-Host "Running migration: $migration" -ForegroundColor Yellow
        
        try {
            psql $env:DATABASE_URL -f $migration
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✓ Migration completed: $migration" -ForegroundColor Green
            } else {
                Write-Host "✗ Migration failed: $migration" -ForegroundColor Red
                Write-Host "Exit code: $LASTEXITCODE" -ForegroundColor Red
            }
        } catch {
            Write-Host "✗ Error running migration: $migration" -ForegroundColor Red
            Write-Host $_.Exception.Message -ForegroundColor Red
        }
        
        Write-Host ""
    } else {
        Write-Host "✗ Migration file not found: $migration" -ForegroundColor Red
        Write-Host ""
    }
}

Write-Host "=== Migration Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Verify migrations: psql `$env:DATABASE_URL -c '\dt security.*'" -ForegroundColor White
Write-Host "2. Verify migrations: psql `$env:DATABASE_URL -c '\dt privacy.*'" -ForegroundColor White
Write-Host "3. Test evidence chain: curl -X POST http://localhost:3000/api/v1/evidence/verify" -ForegroundColor White
