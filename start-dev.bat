@echo off
echo ========================================
echo   System Serwisowy - Uruchamianie
echo ========================================
echo.

cd /d "%~dp0desktop"

echo [1/2] Sprawdzanie zależności...
if not exist "node_modules" (
    echo Instalowanie zależności...
    npm install
)

echo [2/2] Uruchamianie serwera...
echo.
echo Serwer będzie dostępny na: http://localhost:5173
echo Naciśnij Ctrl+C aby zatrzymać serwer
echo.

npm run dev:vue

pause 