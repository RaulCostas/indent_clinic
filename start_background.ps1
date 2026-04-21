$backendDir = "$PSScriptRoot\indent-clinic-backend-main"
$frontendDir = "$PSScriptRoot\indent-clinic-frontend-main"
$pidDir = "$PSScriptRoot"

# Start Backend with Logging
$backend = Start-Process -FilePath "npm.cmd" -ArgumentList "run start:dev" -WorkingDirectory $backendDir -WindowStyle Hidden -PassThru -RedirectStandardOutput "$pidDir\backend_output.log" -RedirectStandardError "$pidDir\backend_error.log"
$backend.Id | Out-File "$pidDir\backend.pid" -Force -Encoding ascii

# Esperar 20 segundos para que NestJS compile y levante base de datos
Start-Sleep -Seconds 20

# Start Frontend with Logging
$frontend = Start-Process -FilePath "npm.cmd" -ArgumentList "run dev" -WorkingDirectory $frontendDir -WindowStyle Hidden -PassThru -RedirectStandardOutput "$pidDir\frontend_output.log" -RedirectStandardError "$pidDir\frontend_error.log"
$frontend.Id | Out-File "$pidDir\frontend.pid" -Force -Encoding ascii

# Esperar 5 segundos
Start-Sleep -Seconds 5

# Open Browser
# Start-Process "http://localhost:5173"
