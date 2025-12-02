# 🐘 PostgreSQL Setup & Migration Guide

## 🎯 Quick Setup

### **Step 1: Update DATABASE_URL**

Edit `.env` file and set your PostgreSQL password:

```env
DATABASE_URL="postgresql://postgres:YOUR_ACTUAL_PASSWORD@localhost:5432/postgres"
```

### **Step 2: Run All Migrations**

```powershell
# Set environment variable
$env:DATABASE_URL = "postgresql://postgres:YOUR_PASSWORD@localhost:5432/postgres"

# Run migrations in order
psql $env:DATABASE_URL -f prisma/migrations/20250104_evidence_log.sql
psql $env:DATABASE_URL -f prisma/migrations/20250104_gdpr_privacy.sql
psql $env:DATABASE_URL -f prisma/migrations/050_uptime_slo.sql
psql $env:DATABASE_URL -f prisma/migrations/030_vendor_risk.sql
psql $env:DATABASE_URL -f prisma/migrations/040_dora_reporting.sql
```

---

## 📋 Alternative: Run Migrations One by One

### **1. Evidence Log (Immutable Audit Trail)**
```powershell
psql -U postgres -d postgres -f prisma/migrations/20250104_evidence_log.sql
```

**Creates:**
- `security.evidence_log` table with hash-chain
- Trigger for automatic hash calculation
- Partitioning by month
- Write-once enforcement

### **2. GDPR Privacy**
```powershell
psql -U postgres -d postgres -f prisma/migrations/20250104_gdpr_privacy.sql
```

**Creates:**
- `privacy.dsar_requests` - Data Subject Access Requests
- `privacy.ropa` - Record of Processing Activities
- `privacy.retention_policies` - Data retention rules
- `privacy.breach_notifications` - GDPR Article 33
- `privacy.pseudonymization_log` - Erasure audit trail
- `privacy.pseudo()` function - Pseudonymization

### **3. Uptime SLO Tracking**
```powershell
psql -U postgres -d postgres -f prisma/migrations/050_uptime_slo.sql
```

**Creates:**
- `system_uptime_metrics` - Uptime data points
- `system_uptime_last_30_days` - Materialized view
- `slo_incidents` - SLO violation tracking
- `calculate_uptime()` function
- `check_slo_compliance()` function

### **4. Vendor Risk Management**
```powershell
psql -U postgres -d postgres -f prisma/migrations/030_vendor_risk.sql
```

**Creates:**
- `vendor_assessments` - Third-party risk tracking
- `vendor_incidents` - Vendor security incidents
- `vendor_documents` - SOC2 reports, certifications
- `vendor_access_log` - Vendor system access audit
- `calculate_vendor_risk_score()` function

### **5. DORA Compliance**
```powershell
psql -U postgres -d postgres -f prisma/migrations/040_dora_reporting.sql
```

**Creates:**
- `dora_ict_incidents` - ICT incident tracking
- `dora_testing_activities` - Required testing (Article 17)
- `dora_third_party_providers` - Third-party registry
- `dora_compliance_status` - Compliance assessment
- `check_dora_reporting_deadline()` function

---

## 🔍 Verify Migrations

### **Check if tables exist:**
```sql
-- Check evidence log
SELECT COUNT(*) FROM security.evidence_log;

-- Check GDPR tables
SELECT COUNT(*) FROM privacy.dsar_requests;

-- Check uptime metrics
SELECT COUNT(*) FROM system_uptime_metrics;

-- Check vendor assessments
SELECT COUNT(*) FROM vendor_assessments;

-- Check DORA incidents
SELECT COUNT(*) FROM dora_ict_incidents;
```

### **Check schemas:**
```sql
SELECT schema_name FROM information_schema.schemata 
WHERE schema_name IN ('security', 'privacy');
```

### **List all tables:**
```sql
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_schema IN ('security', 'privacy', 'public')
ORDER BY table_schema, table_name;
```

---

## 🚀 After Migration: Update Evidence Collector

Once PostgreSQL migrations are complete, use the PostgreSQL version of the evidence collector:

```powershell
# Set DATABASE_URL
$env:DATABASE_URL = "postgresql://postgres:YOUR_PASSWORD@localhost:5432/postgres"

# Run collector
python scripts/collect_evidence.py
```

**Note:** The original `collect_evidence.py` is designed for PostgreSQL with the proper SQL syntax.

---

## 🔧 Troubleshooting

### **Issue: Password Authentication Failed**
```powershell
# Option 1: Use pgAdmin credentials
$env:DATABASE_URL = "postgresql://postgres:your_pgadmin_password@localhost:5432/postgres"

# Option 2: Connect without password (if trust auth enabled)
psql -U postgres -d postgres -f migration_file.sql
```

### **Issue: Database doesn't exist**
```sql
-- Create nexora database
CREATE DATABASE nexora;

-- Then update DATABASE_URL
DATABASE_URL="postgresql://postgres:PASSWORD@localhost:5432/nexora"
```

### **Issue: Permission denied**
```sql
-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE postgres TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA security TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA privacy TO postgres;
```

### **Issue: Schema doesn't exist**
The migrations create the schemas automatically. If you see this error, the migration didn't run completely. Re-run it.

---

## 📊 Migration Order (Important!)

**Run in this exact order:**

1. ✅ `20250104_evidence_log.sql` - Creates `security` schema
2. ✅ `20250104_gdpr_privacy.sql` - Creates `privacy` schema
3. ✅ `050_uptime_slo.sql` - Uses `public` schema
4. ✅ `030_vendor_risk.sql` - Uses `public` schema
5. ✅ `040_dora_reporting.sql` - Uses `public` schema

**Why this order?**
- Evidence log and GDPR create their own schemas
- Other migrations depend on `public` schema
- No dependencies between migrations

---

## ✅ Success Checklist

After running all migrations, verify:

- [ ] `security.evidence_log` table exists
- [ ] `privacy.dsar_requests` table exists
- [ ] `system_uptime_metrics` table exists
- [ ] `vendor_assessments` table exists
- [ ] `dora_ict_incidents` table exists
- [ ] All functions created successfully
- [ ] No error messages in psql output
- [ ] Evidence collector runs without errors

---

## 🎯 Quick Command Reference

```powershell
# Set DATABASE_URL (do this once per session)
$env:DATABASE_URL = "postgresql://postgres:YOUR_PASSWORD@localhost:5432/postgres"

# Run all migrations
Get-ChildItem prisma/migrations/*.sql | ForEach-Object { 
    Write-Host "Running: $($_.Name)" -ForegroundColor Yellow
    psql $env:DATABASE_URL -f $_.FullName
}

# Test evidence collection
python scripts/collect_evidence.py

# Test compliance dashboard (after starting server)
curl http://localhost:8080/api/v1/compliance/status
```

---

## 📞 Need Help?

If you encounter issues:

1. Check PostgreSQL is running: `psql --version`
2. Verify connection: `psql -U postgres -d postgres -c "SELECT version();"`
3. Check logs for errors
4. Ensure DATABASE_URL is correct in `.env`

---

**Ready to proceed? Update your DATABASE_URL and run the migrations!**
