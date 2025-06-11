@echo off
echo Starting Backend Server on Port 3001...
set PATH=%PATH%;C:\Program Files\nodejs
set PORT=3001
set NODE_ENV=development
"C:\Program Files\nodejs\node.exe" src/app.js
pause 