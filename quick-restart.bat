@echo off
echo ===============================================
echo        SZYBKI RESTART SERWERA
echo ===============================================
echo.

echo 🛑 Zatrzymywanie wszystkich procesow Node.js...
taskkill /F /IM node.exe 2>nul
timeout /t 1 >nul

echo 🧹 Czyszczenie cache i pamięci...
set PATH=%PATH%;C:\Program Files\nodejs
"C:\Program Files\nodejs\node.exe" restart-server.js

echo.
echo ✅ Restart zakończony!
echo 📊 Sprawdź status: http://localhost:3001/health
echo.
pause 