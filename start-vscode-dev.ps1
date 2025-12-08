#!/usr/bin/env pwsh

Write-Host "🚀 VS CODE DEVELOPMENT ENVIRONMENT" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Green

# Sprawdź czy VS Code jest zainstalowany
Write-Host "`n🔍 Sprawdzam VS Code..." -ForegroundColor Yellow
try {
    $vscodeVersion = code --version
    Write-Host "✅ VS Code zainstalowany" -ForegroundColor Green
} catch {
    Write-Host "❌ VS Code nie jest zainstalowany!" -ForegroundColor Red
    Write-Host "Zainstaluj VS Code: https://code.visualstudio.com/" -ForegroundColor Yellow
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

# Sprawdź Git
Write-Host "`n🔍 Sprawdzam Git..." -ForegroundColor Yellow
try {
    $gitVersion = git --version
    Write-Host "✅ $gitVersion" -ForegroundColor Green
    
    $remoteUrl = git remote get-url origin
    Write-Host "📍 Remote: $remoteUrl" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Git nie jest zainstalowany!" -ForegroundColor Red
    Write-Host "Zainstaluj Git: https://git-scm.com/download/win" -ForegroundColor Yellow
}

# Otwórz VS Code
Write-Host "`n🚀 Otwieram VS Code..." -ForegroundColor Yellow
Start-Process code -ArgumentList "."

# Sprawdź Railway connection
Write-Host "`n🌐 Sprawdzam Railway connection..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://web-production-fc58d.up.railway.app/api/health" -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Railway API działa" -ForegroundColor Green
    } else {
        Write-Host "❌ Railway API nie odpowiada" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Railway API niedostępne" -ForegroundColor Red
}

# Sprawdź lokalną bazę danych
Write-Host "`n💾 Sprawdzam lokalną bazę danych..." -ForegroundColor Yellow
$dbPath = "$env:APPDATA\serwis-desktop\serwis.db"
if (Test-Path $dbPath) {
    $dbSize = (Get-Item $dbPath).Length
    Write-Host "✅ Lokalna baza danych: $([math]::Round($dbSize/1KB, 2)) KB" -ForegroundColor Green
} else {
    Write-Host "❌ Lokalna baza danych nie istnieje" -ForegroundColor Red
}

Write-Host "`n🎯 GOTOWE DO DEVELOPMENT!" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green

Write-Host "`n📋 NASTĘPNE KROKI:" -ForegroundColor Yellow
Write-Host "1. VS Code się otworzy" -ForegroundColor White
Write-Host "2. Zainstaluj rozszerzenia:" -ForegroundColor White
Write-Host "   - GitLens" -ForegroundColor Cyan
Write-Host "   - GitHub Pull Requests" -ForegroundColor Cyan
Write-Host "   - Git Graph" -ForegroundColor Cyan
Write-Host "   - Auto Rename Tag" -ForegroundColor Cyan
Write-Host "3. Uruchom desktop app:" -ForegroundColor White
Write-Host "   cd desktop && npm run dev" -ForegroundColor Cyan
Write-Host "4. Synchronizuj z Railway:" -ForegroundColor White
Write-Host "   node sync-desktop-railway.js" -ForegroundColor Cyan

Write-Host "`n💡 TIP: Użyj Ctrl+Shift+P w VS Code dla szybkich komend" -ForegroundColor Yellow
Write-Host "💡 TIP: GitLens pokaże historię zmian w kodzie" -ForegroundColor Yellow

Write-Host "`n🔗 PRZYDATNE LINKI:" -ForegroundColor Magenta
Write-Host "Railway Dashboard: https://railway.app" -ForegroundColor White
Write-Host "GitHub Repo: $remoteUrl" -ForegroundColor White
Write-Host "Desktop App: http://localhost:5173" -ForegroundColor White
Write-Host "Mobile App: https://web-production-fc58d.up.railway.app" -ForegroundColor White 