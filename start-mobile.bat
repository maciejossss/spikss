@echo off
echo ========================================
echo    📱 URUCHAMIANIE MOBILE SERVER
echo ========================================
echo.

echo 🛑 Zatrzymuję stare procesy Node.js...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul

echo 🔥 Uruchamiam serwer mobilny na porcie 3000...
echo.
echo ℹ️  Aplikacja mobilna będzie dostępna pod adresem:
echo    👉 http://localhost:3000
echo.
echo ℹ️  Aby zatrzymać serwer, naciśnij Ctrl+C
echo.

node mobile-server.js

echo.
echo 🛑 Serwer mobilny został zatrzymany
pause 