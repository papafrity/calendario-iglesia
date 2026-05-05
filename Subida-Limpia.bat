@echo off
echo ==========================================
echo    REINICIANDO Y SUBIENDO A GITHUB PAGES
echo ==========================================

:: Borrar historial de git local para empezar de cero
echo 1. Limpiando historial local...
rd /s /q .git

:: Inicializar git de nuevo
echo 2. Inicializando nuevo repositorio...
git init

:: Añadir todos los archivos
echo 3. Preparando archivos...
git add .

:: Primer commit
echo 4. Creando commit de limpieza...
git commit -m "Despliegue limpio y completo"

:: Conectar al repositorio (ajusta la URL si es necesario)
echo 5. Conectando con GitHub...
git remote add origin https://github.com/papafrity/calendario-iglesia.git

:: Forzar subida a la rama main (main o master)
echo 6. Forzando subida a GitHub...
git push -f origin main

echo ==========================================
echo    ¡PROCESO COMPLETADO CON EXITO!
echo ==========================================
pause
