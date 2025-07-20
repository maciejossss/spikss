#!/usr/bin/env pwsh

Write-Host "🚀 RAILWAY DEPLOYMENT SCRIPT" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Green

# Sprawdź czy git jest zainstalowany
Write-Host "`n🔍 Sprawdzam Git..." -ForegroundColor Yellow
try {
    $gitVersion = git --version
    Write-Host "✅ $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Git nie jest zainstalowany!" -ForegroundColor Red
    Write-Host "Zainstaluj Git: https://git-scm.com/download/win" -ForegroundColor Yellow
    exit 1
}

# Sprawdź aktualny folder
$currentPath = Get-Location
Write-Host "`n📁 Aktualny folder: $currentPath" -ForegroundColor Cyan

# Sprawdź czy to root serwis
if (-not (Test-Path "desktop") -or -not (Test-Path "mobile")) {
    Write-Host "❌ Uruchom z głównego folderu serwis!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Poprawny folder serwis" -ForegroundColor Green

# Sprawdź czy są pliki Railway
$railwayFiles = @("server.js", "package.json", "railway.toml", "database", "routes", "public")
$missingFiles = @()

foreach ($file in $railwayFiles) {
    if (-not (Test-Path $file)) {
        $missingFiles += $file
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host "❌ Brakuje plików Railway: $($missingFiles -join ', ')" -ForegroundColor Red
    Write-Host "Uruchom najpierw przygotowanie plików!" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Wszystkie pliki Railway gotowe" -ForegroundColor Green

# Sprawdź repo
Write-Host "`n🔍 Sprawdzam GitHub repo..." -ForegroundColor Yellow
if (Test-Path ".git") {
    try {
        $remoteUrl = git remote get-url origin
        Write-Host "📍 Remote URL: $remoteUrl" -ForegroundColor Cyan
        
        if ($remoteUrl -match "maciejossss/spikss") {
            Write-Host "✅ Połączony z spikss repo" -ForegroundColor Green
        } else {
            Write-Host "⚠️ Inne repo: $remoteUrl" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ Brak remote origin" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Nie jest to git repo!" -ForegroundColor Red
    Write-Host "`n🔧 INICJALIZACJA GIT REPO:" -ForegroundColor Yellow
    Write-Host "git init" -ForegroundColor White
    Write-Host "git remote add origin https://github.com/maciejossss/spikss.git" -ForegroundColor White
    Write-Host "git branch -M main" -ForegroundColor White
    return
}

# Sprawdź status
Write-Host "`n📊 Status repo:" -ForegroundColor Yellow
git status --porcelain | ForEach-Object {
    if ($_ -match "^\?\?") {
        Write-Host "📁 Nowy: $($_.Substring(3))" -ForegroundColor Green
    } elseif ($_ -match "^M") {
        Write-Host "✏️ Zmieniony: $($_.Substring(3))" -ForegroundColor Yellow
    }
}

Write-Host "`n🎯 GOTOWE DO DEPLOY!" -ForegroundColor Green
Write-Host "==================" -ForegroundColor Green

Write-Host "`n📋 URUCHOM TE KOMENDY:" -ForegroundColor Yellow
Write-Host "git add ." -ForegroundColor White
Write-Host "git commit -m `"Add Railway backend and mobile PWA`"" -ForegroundColor White
Write-Host "git push origin main" -ForegroundColor White

Write-Host "`n🚀 PO PUSH:" -ForegroundColor Cyan
Write-Host "1. Idź na Railway.app" -ForegroundColor White
Write-Host "2. Połącz z GitHub repo: maciejossss/spikss" -ForegroundColor White  
Write-Host "3. Railway automatycznie wykryje railway.toml" -ForegroundColor White
Write-Host "4. Deploy się zacznie!" -ForegroundColor White

Write-Host "`n📱 REZULTAT:" -ForegroundColor Magenta
Write-Host "Desktop: http://localhost:5173 (jak teraz)" -ForegroundColor White
Write-Host "Mobile: https://web-production-310c4.up.railway.app" -ForegroundColor White

Write-Host "`n💡 TIP: Ustaw POSTGRES_URL w Railway Environment Variables" -ForegroundColor Yellow 