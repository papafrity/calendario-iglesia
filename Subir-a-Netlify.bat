@echo off
echo =======================================================
echo PREPARANDO ARCHIVOS PARA SUBIR A NETLIFY
echo =======================================================
echo.

set "TEMP_DIR=%USERPROFILE%\Desktop\subir-a-netlify"

:: Limpiar carpeta temporal si ya existe
if exist "%TEMP_DIR%" rmdir /s /q "%TEMP_DIR%"
mkdir "%TEMP_DIR%"
mkdir "%TEMP_DIR%\images"

:: Copiar solo los archivos del sitio web (sin node_modules ni functions)
copy "index.html" "%TEMP_DIR%\"
copy "styles.css" "%TEMP_DIR%\"
copy "app.js" "%TEMP_DIR%\"
copy "lang.js" "%TEMP_DIR%\"
copy "scriptures.js" "%TEMP_DIR%\"
copy "sw.js" "%TEMP_DIR%\"
copy "manifest.json" "%TEMP_DIR%\"
xcopy "images\*" "%TEMP_DIR%\images\" /s /e /y

echo.
echo =======================================================
echo LISTO! Se creo la carpeta en tu Escritorio:
echo %TEMP_DIR%
echo.
echo Ahora:
echo 1. Abre app.netlify.com en tu navegador
echo 2. Ve a tu proyecto y a la pestana "Deploys"
echo 3. ARRASTRA la carpeta "subir-a-netlify" del Escritorio
echo    hacia la zona de Drag and Drop
echo 4. Espera unos segundos y LISTO!
echo =======================================================
echo.

:: Abrir la carpeta automaticamente
explorer "%TEMP_DIR%"
start https://app.netlify.com

pause
