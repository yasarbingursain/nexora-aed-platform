# Nexora ML FastAPI Service Startup Script
Write-Host "Starting Nexora ML Service..." -ForegroundColor Cyan

# Check if virtual environment exists
if (-not (Test-Path "venv")) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Yellow
    python -m venv venv
}

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& .\venv\Scripts\Activate.ps1

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt

# Start the service on port 8002
Write-Host "`nStarting ML FastAPI service on port 8002..." -ForegroundColor Green
python -m uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload
