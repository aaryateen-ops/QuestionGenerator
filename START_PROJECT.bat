@echo off
setlocal
title Question Paper Generator - Launch Software
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\launch.ps1" -Mode app %*
if errorlevel 1 (
    echo.
    echo Project could not be started. Read the message above.
    echo Server logs are available in the .logs folder.
    pause
    exit /b 1
)
exit /b 0
