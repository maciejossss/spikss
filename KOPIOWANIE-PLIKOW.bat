@echo off
echo ========================================
echo   📁 KOPIOWANIE PLIKOW DO SPIKSS
echo ========================================
echo.

echo 🔄 Kopiuje server.js...
copy /Y "server.js" "spikss\server.js"

echo 🔄 Kopiuje package.json...  
copy /Y "package.json" "spikss\package.json"

echo 🔄 Kopiuje railway.toml...
copy /Y "railway.toml" "spikss\railway.toml"

echo 🔄 Kopiuje folder database...
xcopy /E /I /Y "database" "spikss\database"

echo 🔄 Kopiuje folder routes...
xcopy /E /I /Y "routes" "spikss\routes"

echo 🔄 Kopiuje folder public...
xcopy /E /I /Y "public" "spikss\public"

echo.
echo ✅ GOTOWE! Pliki skopiowane do spikss/
echo.
echo 📤 TERAZ MUSISZ:
echo 1. cd spikss
echo 2. git add .
echo 3. git commit -m "Fix Railway deployment with devices sync"
echo 4. git push origin main
echo.
pause 