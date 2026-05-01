#!/usr/bin/env pwsh
# ─────────────────────────────────────────────────────────────
#  WindowWorld Deploy Script
#  Rebuilds the frontend dist AND pushes to git (Railway auto-deploys)
#  Usage:  .\deploy.ps1 "your commit message"
# ─────────────────────────────────────────────────────────────

param(
  [string]$Message = "chore: rebuild and deploy"
)

Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  WindowWorld Deploy — $(Get-Date -Format 'hh:mm tt')" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ── Step 1: Build frontend ──────────────────────────────────
Write-Host "1/3  Building frontend dist..." -ForegroundColor Yellow
Set-Location apps/web
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Build failed. Aborting." -ForegroundColor Red
    exit 1
}
Set-Location ../..
Write-Host "     ✓ Frontend built" -ForegroundColor Green

# ── Step 2: Stage everything (src changes + new dist) ───────
Write-Host "2/3  Staging all changes..." -ForegroundColor Yellow
git add -A
Write-Host "     ✓ Staged" -ForegroundColor Green

# ── Step 3: Commit + Push to GitHub → triggers Railway deploy
Write-Host "3/3  Committing and pushing..." -ForegroundColor Yellow
git commit -m $Message
git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Push failed." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✓ Deployed!  Railway is building now (~2 min)" -ForegroundColor Green
Write-Host "  Local:  http://localhost:3000" -ForegroundColor Green
Write-Host "  Prod:   https://windowworld.bridgebox.ai" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
