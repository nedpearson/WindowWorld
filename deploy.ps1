param(
  [string]$Message = "chore: rebuild and deploy"
)

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  WindowWorld Deploy - $(Get-Date -Format 'hh:mm tt')" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Build frontend
Write-Host "[1/3] Building frontend dist..." -ForegroundColor Yellow
Push-Location apps/web
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Build failed. Aborting." -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location
Write-Host "       Done - frontend built." -ForegroundColor Green

# Step 2: Stage everything (src + new dist)
Write-Host "[2/3] Staging all changes..." -ForegroundColor Yellow
git add -A
Write-Host "       Done - staged." -ForegroundColor Green

# Step 3: Commit + Push -> Railway auto-deploys
Write-Host "[3/3] Committing and pushing to GitHub..." -ForegroundColor Yellow
git commit -m $Message
git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Push failed." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  DEPLOYED! Railway is building now (~2 min)" -ForegroundColor Green
Write-Host "  Local : http://localhost:3000" -ForegroundColor Green
Write-Host "  Prod  : https://windowworld.bridgebox.ai" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
