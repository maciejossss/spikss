@echo off
echo ========================================
echo    🚀 URUCHAMIANIE DESKTOP APP
echo ========================================
echo.

echo 🛑 Zatrzymuję stare procesy Node.js...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM electron.exe >nul 2>&1
timeout /t 2 >nul

echo 📁 Przechodzę do katalogu desktop...
cd desktop

echo 🔥 Uruchamiam aplikację desktop...
echo.
echo ℹ️  Jeśli pojawi się błąd "Port in use", naciśnij Ctrl+C i uruchom ponownie
echo ℹ️  Aplikacja powinna otworzyć się automatycznie w nowym oknie
echo.

npm run dev

echo.
echo 🛑 Aplikacja została zatrzymana
pause 