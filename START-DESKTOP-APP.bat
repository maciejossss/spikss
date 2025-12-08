@echo off
chcp 65001 >nul
echo.
echo ========================================
echo    🚀 URUCHAMIANIE DESKTOP APP
echo ========================================
echo.

echo 🛑 Zatrzymuje stare procesy...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM electron.exe >nul 2>&1
timeout /t 2 >nul

echo 📁 Przechodze do katalogu desktop...
cd /d "%~dp0desktop"

if not exist "package.json" (
    echo ❌ BLAD: Nie znaleziono package.json w katalogu desktop
    echo 💡 Sprawdz czy jestes w katalogu C:\programy\serwis
    pause
    exit
)

echo 🔥 Uruchamiam aplikacje desktop...
echo.
echo ℹ️  Aplikacja powinna otworzyc sie automatycznie
echo ℹ️  Jesli pojawi sie blad "Port in use", zamknij i uruchom ponownie
echo ℹ️  Aby zatrzymac aplikacje nacisnij Ctrl+C
echo.

npm run dev

echo.
echo 🛑 Aplikacja zostala zatrzymana
pause 