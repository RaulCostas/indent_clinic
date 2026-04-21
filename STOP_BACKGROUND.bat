@echo off
TITLE Detener INDENT CLINIC en segundo plano
SETLOCAL EnableDelayedExpansion

set "PID_DIR=%~dp0"

echo ==========================================
echo    DETENIENDO INDENT CLINIC...           
echo ==========================================
echo.

if exist "%PID_DIR%\backend.pid" (
    set /p BACKEND_PID=<"%PID_DIR%\backend.pid"
    echo [INFO] Deteniendo Backend (PID !BACKEND_PID!)...
    taskkill /f /t /pid !BACKEND_PID! 2>nul
    del "%PID_DIR%\backend.pid"
) else (
    echo [INFO] No se encontro PID de Backend activo.
)

if exist "%PID_DIR%\frontend.pid" (
    set /p FRONTEND_PID=<"%PID_DIR%\frontend.pid"
    echo [INFO] Deteniendo Frontend (PID !FRONTEND_PID!)...
    taskkill /f /t /pid !FRONTEND_PID! 2>nul
    del "%PID_DIR%\frontend.pid"
) else (
    echo [INFO] No se encontro PID de Frontend activo.
)

echo.
echo [OK] Procesos detenidos.
timeout /t 3 >nul
