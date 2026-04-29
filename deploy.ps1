#!/usr/bin/env pwsh
# deploy.ps1 — Full build + commit + push for WindowWorld
# Run this from the repo root: .\deploy.ps1 "your commit message"
# Or with no args for a timestamped auto-message: .\deploy.ps1

param(
    [string]$Message = ""
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

Write-Host "`n🚀 WindowWorld Deploy Script`n" -ForegroundColor Cyan

# ── 1. Frontend build ─────────────────────────────────────────
Write-Host "📦 Building frontend (Vite)..." -ForegroundColor Yellow
Set-Location "$root\apps\web"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Frontend build failed" -ForegroundColor Red; exit 1 }
Write-Host "✅ Frontend built`n" -ForegroundColor Green

# ── 2. Back to root ───────────────────────────────────────────
Set-Location $root

# ── 3. Git stage everything ───────────────────────────────────
Write-Host "📝 Staging changes..." -ForegroundColor Yellow
git add -A
if ($LASTEXITCODE -ne 0) { Write-Host "❌ git add failed" -ForegroundColor Red; exit 1 }

# ── 4. Commit ─────────────────────────────────────────────────
if ($Message -eq "") {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm"
    $Message = "chore: deploy $ts"
}
Write-Host "💾 Committing: $Message" -ForegroundColor Yellow
git commit -m $Message
if ($LASTEXITCODE -ne 0) { Write-Host "⚠️  Nothing to commit (working tree clean)" -ForegroundColor Gray }

# ── 5. Push ───────────────────────────────────────────────────
Write-Host "🚢 Pushing to origin/main..." -ForegroundColor Yellow
git push
Write-Host "`n✅ Deployed! Railway will build and restart automatically.`n" -ForegroundColor Green
