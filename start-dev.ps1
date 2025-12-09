Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   System Serwisowy - Uruchamianie" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Definition
$desktopPath = Join-Path $scriptPath "desktop"

Set-Location $desktopPath

# Load local environment variables (DATABASE_URL, etc.)
$envFile = Join-Path $desktopPath ".env.local"
if (Test-Path $envFile) {
    $envLines = Get-Content $envFile | Where-Object { $_ -match '^\s*DATABASE_URL\s*=' }
    if ($envLines.Count -gt 0) {
        foreach ($line in $envLines) {
            if ($line -match '^\s*DATABASE_URL\s*=\s*(.+)$') {
                $env:DATABASE_URL = $Matches[1].Trim()
                Write-Host "Environment: DATABASE_URL loaded from .env.local" -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "⚠️  .env.local nie zawiera wpisu DATABASE_URL – diagnostyka Railway będzie niedostępna." -ForegroundColor Yellow
    }
} else {
    Write-Host "ℹ️  Utwórz plik desktop/.env.local z linijką DATABASE_URL=postgresql://..." -ForegroundColor Yellow
}

Write-Host "[1/2] Sprawdzanie zależności..." -ForegroundColor Yellow
if (!(Test-Path "node_modules")) {
    Write-Host "Instalowanie zależności..." -ForegroundColor Green
    npm install
}

Write-Host "[2/2] Uruchamianie serwera..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Serwer będzie dostępny na: " -NoNewline
Write-Host "http://localhost:5173" -ForegroundColor Green
Write-Host "Naciśnij Ctrl+C aby zatrzymać serwer" -ForegroundColor Gray
Write-Host ""

try {
    npm run dev:vue
} catch {
    Write-Host "Błąd podczas uruchamiania serwera" -ForegroundColor Red
    Read-Host "Naciśnij Enter aby zamknąć"
} 