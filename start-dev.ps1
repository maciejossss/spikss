Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   System Serwisowy - Uruchamianie" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Definition
$desktopPath = Join-Path $scriptPath "desktop"

Set-Location $desktopPath

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