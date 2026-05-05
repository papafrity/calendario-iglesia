@echo off
echo =======================================================
echo INICIANDO CONFIGURACION DE FIREBASE PARA NOTIFICACIONES
echo =======================================================
echo.
echo Paso 1: Iniciando sesion en Google...
powershell.exe -ExecutionPolicy Bypass -Command "firebase login"
echo.
echo Paso 2: Creando servidor local...
powershell.exe -ExecutionPolicy Bypass -Command "firebase init functions"
echo.
echo =======================================================
echo PROCESO FINALIZADO
echo =======================================================
pause
