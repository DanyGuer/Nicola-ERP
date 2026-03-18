@echo off
echo ================================================
echo   SBLOCCO RETE PER MINI ERP
echo ================================================
echo.
echo Questo script apre la porta 5000 nel Firewall di Windows
echo per permettere agli altri PC di connettersi.
echo.
echo Richiede permessi di Amministratore.
echo Se fallisce, fai click destro su questo file e scegli
echo "Esegui come amministratore".
echo.
pause

echo.
echo Apertura porta 5000 TCP...
netsh advfirewall firewall add rule name="MiniERP Accesso" dir=in action=allow protocol=TCP localport=5000
echo.

if %errorlevel% equ 0 (
    echo [OK] Regola aggiunta con successo!
    echo Ora gli altri PC dovrebbero riuscire a connettersi.
) else (
    echo [ERRORE] Impossibile aggiungere la regola.
    echo HAI ESEGUITO COME AMMINISTRATORE?
    echo Fai click destro sul file -^> Esegui come amministratore
)

echo.
pause
