#!/usr/bin/env python3
"""
MiniERP - Notifiche Scadenze via Email
Eseguire giornalmente su PythonAnywhere come scheduled task.
"""

import sqlite3
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta

# ===== CONFIGURAZIONE =====
# Cambia questi valori con i tuoi dati

# Email mittente (Gmail)
SMTP_EMAIL = 'guerranicola76@gmail.com'
# App Password di Gmail (NON la password normale!)
# Genera da: Google Account → Sicurezza → Verifica in 2 passaggi → Password per le app
SMTP_PASSWORD = os.environ.get('GMAIL_APP_PASSWORD', 'INSERISCI_APP_PASSWORD_QUI')

# Email destinatario (può essere la stessa)
NOTIFY_EMAIL = 'guerranicola76@gmail.com'

# Percorso database (cambia per PythonAnywhere)
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'erp.sqlite')

# Quanti giorni prima della scadenza avvisare
DAYS_BEFORE = 3
# ==========================


def get_deadlines():
    """Recupera fatture scadute e in scadenza nei prossimi N giorni."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    today = datetime.now().strftime('%Y-%m-%d')
    future = (datetime.now() + timedelta(days=DAYS_BEFORE)).strftime('%Y-%m-%d')
    
    # Fatture scadute (due_date < oggi, non pagate)
    cursor.execute("""
        SELECT invoice_number, client_name, due_date, total 
        FROM invoices 
        WHERE status NOT IN ('Pagata', 'Annullata') 
        AND due_date IS NOT NULL AND due_date < ?
        ORDER BY due_date ASC
    """, (today,))
    overdue = [dict(row) for row in cursor.fetchall()]
    
    # Fatture in scadenza nei prossimi N giorni
    cursor.execute("""
        SELECT invoice_number, client_name, due_date, total 
        FROM invoices 
        WHERE status NOT IN ('Pagata', 'Annullata') 
        AND due_date IS NOT NULL AND due_date >= ? AND due_date <= ?
        ORDER BY due_date ASC
    """, (today, future))
    upcoming = [dict(row) for row in cursor.fetchall()]
    
    conn.close()
    return overdue, upcoming


def format_currency(val):
    return f"€ {val:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')


def build_email_html(overdue, upcoming):
    """Costruisce il corpo HTML della email."""
    html = """
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 20px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 22px;">📋 MiniERP - Riepilogo Scadenze</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0 0; font-size: 14px;">{date}</p>
        </div>
        <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
    """.format(date=datetime.now().strftime('%d/%m/%Y alle %H:%M'))
    
    if overdue:
        total_overdue = sum(d['total'] for d in overdue)
        html += f"""
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
            <h2 style="color: #dc2626; margin: 0 0 10px 0; font-size: 16px;">🔴 Fatture SCADUTE ({len(overdue)})</h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr style="border-bottom: 1px solid #fecaca;">
                    <th style="text-align: left; padding: 5px;">Fattura</th>
                    <th style="text-align: left; padding: 5px;">Cliente</th>
                    <th style="text-align: left; padding: 5px;">Scadenza</th>
                    <th style="text-align: right; padding: 5px;">Importo</th>
                </tr>
        """
        for d in overdue:
            days_late = (datetime.now() - datetime.strptime(d['due_date'], '%Y-%m-%d')).days
            html += f"""
                <tr>
                    <td style="padding: 5px; font-weight: bold;">{d['invoice_number']}</td>
                    <td style="padding: 5px;">{d['client_name']}</td>
                    <td style="padding: 5px; color: #dc2626;">⚠️ {days_late} giorni fa</td>
                    <td style="padding: 5px; text-align: right; font-weight: bold;">{format_currency(d['total'])}</td>
                </tr>
            """
        html += f"""
                <tr style="border-top: 2px solid #dc2626;">
                    <td colspan="3" style="padding: 5px; font-weight: bold; color: #dc2626;">TOTALE SCADUTO</td>
                    <td style="padding: 5px; text-align: right; font-weight: bold; color: #dc2626;">{format_currency(total_overdue)}</td>
                </tr>
            </table>
        </div>
        """
    
    if upcoming:
        total_upcoming = sum(d['total'] for d in upcoming)
        html += f"""
        <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
            <h2 style="color: #d97706; margin: 0 0 10px 0; font-size: 16px;">🟡 In Scadenza entro {DAYS_BEFORE} giorni ({len(upcoming)})</h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr style="border-bottom: 1px solid #fde68a;">
                    <th style="text-align: left; padding: 5px;">Fattura</th>
                    <th style="text-align: left; padding: 5px;">Cliente</th>
                    <th style="text-align: left; padding: 5px;">Scadenza</th>
                    <th style="text-align: right; padding: 5px;">Importo</th>
                </tr>
        """
        for d in upcoming:
            due_date = datetime.strptime(d['due_date'], '%Y-%m-%d')
            days_left = (due_date - datetime.now()).days + 1
            html += f"""
                <tr>
                    <td style="padding: 5px; font-weight: bold;">{d['invoice_number']}</td>
                    <td style="padding: 5px;">{d['client_name']}</td>
                    <td style="padding: 5px; color: #d97706;">⏳ tra {days_left} giorni</td>
                    <td style="padding: 5px; text-align: right; font-weight: bold;">{format_currency(d['total'])}</td>
                </tr>
            """
        html += f"""
                <tr style="border-top: 2px solid #d97706;">
                    <td colspan="3" style="padding: 5px; font-weight: bold; color: #d97706;">TOTALE IN SCADENZA</td>
                    <td style="padding: 5px; text-align: right; font-weight: bold; color: #d97706;">{format_currency(total_upcoming)}</td>
                </tr>
            </table>
        </div>
        """
    
    if not overdue and not upcoming:
        html += """
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 15px; text-align: center;">
            <p style="color: #16a34a; font-size: 16px; margin: 0;">✅ Nessuna scadenza urgente!</p>
        </div>
        """
    
    html += """
        <p style="color: #94a3b8; font-size: 12px; margin-top: 20px; text-align: center;">
            Inviato automaticamente da MiniERP · Design & Creation di Nicola Guerra
        </p>
        </div>
    </div>
    """
    return html


def send_email(overdue, upcoming):
    """Invia la email di notifica."""
    if not overdue and not upcoming:
        print("Nessuna scadenza da notificare.")
        return
    
    msg = MIMEMultipart('alternative')
    msg['Subject'] = f"📋 MiniERP Scadenze: {len(overdue)} scadute, {len(upcoming)} in arrivo"
    msg['From'] = SMTP_EMAIL
    msg['To'] = NOTIFY_EMAIL
    
    html_body = build_email_html(overdue, upcoming)
    msg.attach(MIMEText(html_body, 'html'))
    
    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.sendmail(SMTP_EMAIL, NOTIFY_EMAIL, msg.as_string())
        print(f"✅ Email inviata a {NOTIFY_EMAIL}")
        print(f"   Scadute: {len(overdue)}, In scadenza: {len(upcoming)}")
    except Exception as e:
        print(f"❌ Errore invio email: {e}")


if __name__ == '__main__':
    print(f"Controllo scadenze - {datetime.now().strftime('%d/%m/%Y %H:%M')}")
    print(f"Database: {DB_PATH}")
    overdue, upcoming = get_deadlines()
    print(f"Trovate: {len(overdue)} scadute, {len(upcoming)} in scadenza entro {DAYS_BEFORE} giorni")
    send_email(overdue, upcoming)
