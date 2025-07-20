Write-Host "🔍 SZUKAM REPO SPIKSS..." -ForegroundColor Yellow

# Typowe lokalizacje GitHub Desktop
$possiblePaths = @(
    "$env:USERPROFILE\Documents\GitHub\spikss",
    "$env:USERPROFILE\GitHub\spikss", 
    "$env:USERPROFILE\Desktop\spikss",
    "$env:USERPROFILE\source\repos\spikss",
    "C:\GitHub\spikss",
    "D:\GitHub\spikss"
)

foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        Write-Host "✅ ZNALEZIONO: $path" -ForegroundColor Green
        
        # Sprawdź czy to git repo
        if (Test-Path "$path\.git") {
            Write-Host "✅ To jest git repo" -ForegroundColor Green
            
            Push-Location $path
            try {
                $remote = git remote get-url origin 2>$null
                if ($remote -match "spikss") {
                    Write-Host "✅ To właściwe repo spikss!" -ForegroundColor Green
                    Write-Host "📁 LOKALIZACJA REPO: $path" -ForegroundColor Cyan
                    
                    # Pokaż zawartość
                    Write-Host "`n📋 AKTUALNA ZAWARTOŚĆ:" -ForegroundColor Yellow
                    Get-ChildItem | ForEach-Object { Write-Host "  📄 $($_.Name)" }
                    
                    Pop-Location
                    Write-Host "`n🎯 UŻYJ TEJ ŚCIEŻKI DO KOPIOWANIA!" -ForegroundColor Green
                    return $path
                }
            } catch {
                # Git nie działa, ale folder istnieje
                Write-Host "⚠️ Git command nie działa, ale folder istnieje" -ForegroundColor Yellow
            }
            Pop-Location
        }
    }
}

Write-Host "`n❌ NIE ZNALEZIONO REPO SPIKSS" -ForegroundColor Red
Write-Host "💡 Sprawdź w GitHub Desktop gdzie jest sklonowane:" -ForegroundColor Yellow
Write-Host "   Repository > Show in Explorer" -ForegroundColor White 