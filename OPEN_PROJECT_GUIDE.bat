@echo off
setlocal
title Question Paper Generator - Professor Presentation Guide
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\launch.ps1" -Mode guide
if errorlevel 1 (
    echo.
    echo Unable to open the guide automatically.
    echo You can open PROJECT_GUIDE.html directly in your web browser.
    pause
    exit /b 1
)
exit /b 0
