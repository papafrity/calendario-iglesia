@echo off
echo =======================================================
echo CREANDO APP ENGINE DESDE LA TERMINAL
echo =======================================================
echo.
echo Selecciona la region mas cercana a ti:
echo   1. us-central (Estados Unidos)
echo   2. southamerica-east1 (Brasil/Sudamerica)
echo   3. europe-west1 (Europa)
echo.
set /p REGION="Escribe el numero (1, 2 o 3): "

if "%REGION%"=="1" set GCLOUD_REGION=us-central
if "%REGION%"=="2" set GCLOUD_REGION=southamerica-east1
if "%REGION%"=="3" set GCLOUD_REGION=europe-west1

echo.
echo Intentando crear App Engine en la region: %GCLOUD_REGION%
echo.
powershell.exe -ExecutionPolicy Bypass -Command "npx -y firebase-tools apps:create WEB calendario-web 2>$null; Write-Host 'Paso 1 listo'"
echo.
echo Ahora intenta subir el servidor de nuevo con Subir-Servidor.bat
echo.
pause
