@echo off
start cmd /k "npx serve -l 3000"
timeout /t 3 >nul
start http://localhost:3000
