@echo off
title Exam Invigilation Scheduler Frontend
echo ========================================================
echo Starting Vite Frontend (Port 3000)
echo ========================================================
cd /d "%~dp0frontend"
npm run dev
pause
