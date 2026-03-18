@echo off
echo ================================================
echo   MiniERP - INSTALLAZIONE AUTOMATICA
echo   Design ^& Creation di Nicola Guerra
echo ================================================
echo.

:: Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRORE] Python non trovato!
    echo.
    echo Devi installare Python:
    echo 1. Vai su https://www.python.org/downloads/
    echo 2. Scarica l'ultima versione
    echo 3. IMPORTANTE: spunta "Add Python to PATH" durante l'installazione
    echo 4. Riavvia il PC dopo l'installazione
    echo 5. Rilancia questo file
    echo.
    pause
    exit /b 1
)

echo [OK] Python trovato
echo.
echo Installazione dipendenze in corso...
echo.
pip install -r requirements.txt
echo.

if %errorlevel% neq 0 (
    echo [ERRORE] Installazione fallita.
    echo Prova a eseguire come Amministratore.
    pause
    exit /b 1
)

echo.
echo ================================================
echo   INSTALLAZIONE COMPLETATA!
echo ================================================
echo.
echo Per avviare l'ERP: doppio clic su "run.bat"
echo.
pause
