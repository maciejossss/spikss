@echo off
echo Starting Frontend Server...
set PATH=%PATH%;C:\Program Files\nodejs
cd frontend
"C:\Program Files\nodejs\npm.cmd" run dev
pause 