@echo off
title Subiendo Calendario a GitHub
cls
echo =======================================================
echo     DESPLIEGUE RAPIDO A GITHUB PAGES (PWA OPTIMIZED)
echo =======================================================
echo.

cd /d "%~dp0"

echo [1/3] Limpiando archivos temporales...
if exist scratch rmdir /s /q scratch

echo.
echo [2/3] Preparando y Agregando todos los archivos...
git add .
:: Opcional: Si quieres ser específico para no subir carpetas de agentes
git reset .agents/
git reset .continue/
git reset scratch/

echo.
echo [3/3] Guardando y Subiendo cambios...
set FECHA=%date% %time:~0,5%
git commit -m "Optimizacion final PWA para PWABuilder - %FECHA%"
git push -f -u origin main

echo.
echo =======================================================
echo  SUBIDA EXITOSA!
echo =======================================================
echo.
echo  Tu pagina estara actualizada en 1 minuto en:
echo  https://papafrity.github.io/calendario-iglesia/
echo.
echo  IMPORTANTE: Una vez actualizada, dale a 'Refresh' en 
echo  PWABuilder. Deberias ver 45/45 o muy cerca.
echo =======================================================
echo.
pause
