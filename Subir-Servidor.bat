@echo off
echo =======================================================
echo SUBIENDO EL SERVIDOR A GOOGLE CLOUD
echo =======================================================
echo.
powershell.exe -ExecutionPolicy Bypass -Command "npx -y firebase-tools@latest deploy --only functions,firestore:rules"
echo.
echo =======================================================
echo SI VES "Deploy complete!", ESTA LISTO.
echo =======================================================
pause
