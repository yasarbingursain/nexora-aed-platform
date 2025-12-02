# Nexora Admin API Endpoint Testing Script
# Run this after starting the backend server to verify all admin endpoints

Write-Host "🚀 Nexora Admin API Endpoint Testing" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$BASE_URL = "http://localhost:8080/api/v1"
$TOKEN = Read-Host "Enter your admin JWT token"

if ([string]::IsNullOrWhiteSpace($TOKEN)) {
    Write-Host "❌ Error: Token is required" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $TOKEN"
    "Content-Type" = "application/json"
}

# Test function
function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Url,
        [object]$Body = $null
    )
    
    Write-Host "Testing: $Name" -ForegroundColor Yellow
    Write-Host "  Method: $Method" -ForegroundColor Gray
    Write-Host "  URL: $Url" -ForegroundColor Gray
    
    try {
        if ($Method -eq "GET") {
            $response = Invoke-RestMethod -Uri $Url -Method $Method -Headers $headers -ErrorAction Stop
        } else {
            $bodyJson = $Body | ConvertTo-Json -Depth 10
            $response = Invoke-RestMethod -Uri $Url -Method $Method -Headers $headers -Body $bodyJson -ErrorAction Stop
        }
        
        Write-Host "  ✅ SUCCESS" -ForegroundColor Green
        Write-Host "  Response: $($response | ConvertTo-Json -Depth 2 -Compress)" -ForegroundColor Gray
        Write-Host ""
        return $true
    }
    catch {
        Write-Host "  ❌ FAILED" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        return $false
    }
}

# Track results
$results = @{
    passed = 0
    failed = 0
    total = 0
}

Write-Host "📊 Testing Admin Endpoints..." -ForegroundColor Cyan
Write-Host ""

# Test 1: Get Organizations
$results.total++
if (Test-Endpoint -Name "Get Organizations" -Method "GET" -Url "$BASE_URL/admin/organizations?page=1&limit=10") {
    $results.passed++
} else {
    $results.failed++
}

# Test 2: Get System Metrics
$results.total++
if (Test-Endpoint -Name "Get System Metrics" -Method "GET" -Url "$BASE_URL/admin/metrics") {
    $results.passed++
} else {
    $results.failed++
}

# Test 3: Get System Health
$results.total++
if (Test-Endpoint -Name "Get System Health" -Method "GET" -Url "$BASE_URL/admin/system-health") {
    $results.passed++
} else {
    $results.failed++
}

# Test 4: Get Billing Overview
$results.total++
if (Test-Endpoint -Name "Get Billing Overview" -Method "GET" -Url "$BASE_URL/admin/billing") {
    $results.passed++
} else {
    $results.failed++
}

# Test 5: Get All Users
$results.total++
if (Test-Endpoint -Name "Get All Users" -Method "GET" -Url "$BASE_URL/admin/users?page=1&limit=10") {
    $results.passed++
} else {
    $results.failed++
}

# Test 6: Get Security Events
$results.total++
if (Test-Endpoint -Name "Get Security Events" -Method "GET" -Url "$BASE_URL/admin/security-events?page=1&limit=10") {
    $results.passed++
} else {
    $results.failed++
}

# Test 7: Get Audit Logs
$results.total++
if (Test-Endpoint -Name "Get Audit Logs" -Method "GET" -Url "$BASE_URL/admin/audit-logs?page=1&limit=10") {
    $results.passed++
} else {
    $results.failed++
}

# Test 8: Create Organization (optional - will create actual data)
Write-Host "⚠️  Skipping Create Organization test (would create actual data)" -ForegroundColor Yellow
Write-Host ""

# Summary
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "📊 Test Summary" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Total Tests: $($results.total)" -ForegroundColor White
Write-Host "Passed: $($results.passed)" -ForegroundColor Green
Write-Host "Failed: $($results.failed)" -ForegroundColor Red
Write-Host ""

if ($results.failed -eq 0) {
    Write-Host "✅ All tests passed! Admin backend is working correctly." -ForegroundColor Green
} else {
    Write-Host "❌ Some tests failed. Check the errors above." -ForegroundColor Red
}

Write-Host ""
Write-Host "💡 Tips:" -ForegroundColor Cyan
Write-Host "  - Make sure backend server is running on port 8080" -ForegroundColor Gray
Write-Host "  - Verify your JWT token is valid and not expired" -ForegroundColor Gray
Write-Host "  - Check that your user has 'admin' or 'super_admin' role" -ForegroundColor Gray
Write-Host "  - Review backend logs for detailed error messages" -ForegroundColor Gray
