@echo off
TITLE INDENT CLINIC - LANZADOR
SETLOCAL EnableDelayedExpansion

echo ==========================================
echo       BIENVENIDO A INDENT CLINIC          
echo ==========================================
echo.

:: --- 1. Verificar Node.js ---
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] No se encontro Node.js en el sistema.
    echo Por favor, instale Node.js desde https://nodejs.org/
    pause
    exit /b 1
)
echo [OK] Node.js detectado.

:: --- 2. Iniciar Backend ---
echo [INFO] Iniciando Backend en una nueva ventana...
cd /d "d:\SOFT-MEDIC\Antigravity\INDENT CLINIC\indent-clinic-backend-main"
start "Backend - Indent Clinic" cmd /c "npm run start:dev"

:: Esperar un poco para que el backend empiece a levantar
timeout /t 5 /nobreak >nul

:: --- 3. Iniciar Frontend ---
echo [INFO] Iniciando Frontend en una nueva ventana...
cd /d "d:\SOFT-MEDIC\Antigravity\INDENT CLINIC\indent-clinic-frontend-main"
start "Frontend - Indent Clinic" cmd /c "npm run dev"

:: --- 4. Abrir Navegador ---
echo [INFO] Abriendo aplicacion en el navegador...
timeout /t 3 /nobreak >nul
start http://localhost:5173

echo.
echo ==========================================
echo    LA APLICACION SE ESTA INICIANDO...     
echo    No cierre las ventanas de comandos.     
echo ==========================================
echo.
pause
