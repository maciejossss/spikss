Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   🚀 URUCHAMIANIE DESKTOP APP" -ForegroundColor Cyan  
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "🛑 Zatrzymuję stare procesy Node.js..." -ForegroundColor Yellow
try {
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Get-Process -Name "electron" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
} catch {
    # Ignoruj błędy jeśli procesy nie istnieją
}

Write-Host "📁 Przechodzę do katalogu desktop..." -ForegroundColor Blue
Set-Location -Path "desktop"

Write-Host "🔥 Uruchamiam aplikację desktop..." -ForegroundColor Green
Write-Host ""
Write-Host "ℹ️  Jeśli pojawi się błąd 'Port in use', naciśnij Ctrl+C i uruchom ponownie" -ForegroundColor Gray
Write-Host "ℹ️  Aplikacja powinna otworzyć się automatycznie w nowym oknie" -ForegroundColor Gray
Write-Host ""

try {
    npm run dev
} catch {
    Write-Host ""
    Write-Host "❌ Wystąpił błąd podczas uruchamiania" -ForegroundColor Red
    Write-Host "💡 Spróbuj uruchomić ponownie lub sprawdź czy Node.js jest zainstalowany" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🛑 Aplikacja została zatrzymana" -ForegroundColor Red
Read-Host "Naciśnij Enter aby zamknąć..." 