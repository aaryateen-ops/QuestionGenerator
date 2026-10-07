@echo off
title AI Question Paper Generator - Launcher
echo ==========================================================
echo Starting AI-Powered Intelligent Question Paper Generator
echo Backend:  http://127.0.0.1:8000/docs
echo Frontend: http://localhost:5173
echo ==========================================================
start "QP Backend Server" "%~dp0run_backend.bat"
timeout /t 3 /nobreak >nul
start "QP Frontend Studio" "%~dp0run_frontend.bat"
echo System started successfully in separate consoles!
