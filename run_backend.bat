@echo off
title Question Paper Generator - Backend Server
cd /d "%~dp0backend"
echo ===================================================
echo Starting QP-Studio Backend (FastAPI + SQLite)
echo Swagger Docs: http://127.0.0.1:8000/docs
echo ===================================================
set PYTHONPATH=%~dp0backend
py -3.14 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
pause
