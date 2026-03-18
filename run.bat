@echo off
cls
echo ================================================
echo   MiniERP - SERVER AVVIATO
echo   Design ^& Creation di Nicola Guerra
echo ================================================
echo.
echo Inizializzazione Database...
python init_data.py >nul 2>&1
echo [OK] Database pronto
echo.
echo ------------------------------------------------
echo   PER ACCEDERE DA UN ALTRO PC (VEDI TUTTO):
echo   (Scrivi questo nel browser dell'altro PC)
python show_ip.py
echo ------------------------------------------------
echo.
echo ------------------------------------------------
echo   PER IL TELEFONO (SOLO AGENDA/APP):
echo   Aggiungi /app alla fine. Esempio:
echo   http://192.168.x.x:5000/app
echo ------------------------------------------------
echo.
echo   IMPORTANTE:
echo   - Tieni questa finestra APERTA
echo   - Se Windows chiede permessi Firewall, clicca "CONSENTI"
echo   - Credenziali Login: admin / admin
echo.
start http://localhost:5000
python app.py
pause
