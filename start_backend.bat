@echo off
title Exam Invigilation Scheduler Backend
echo ========================================================
echo Starting FastAPI Backend (Port 8000)
echo ========================================================
cd /d "%~dp0backend"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause
