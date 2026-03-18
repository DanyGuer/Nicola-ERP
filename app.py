import sqlite3
import uuid
import datetime
import os
from functools import wraps
from flask import Flask, render_template, request, jsonify, g, session, redirect, url_for
from werkzeug.security import check_password_hash, generate_password_hash

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'nicola-erp-secret-key-2024-cambiamiinproduzione')
DATABASE = 'erp.sqlite'


# ============================================
#   DB HELPERS
# ============================================

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA foreign_keys = ON")
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def init_db():
    with app.app_context():
        db = get_db()
        with open('schema.sql', mode='r') as f:
            db.cursor().executescript(f.read())
        db.commit()

def generate_id():
    return str(uuid.uuid4())

def generate_offer_number():
    year = datetime.datetime.now().year
    db = get_db()
    cursor = db.execute(
        "SELECT offer_number FROM offers WHERE offer_number LIKE ? ORDER BY offer_number DESC LIMIT 1",
        (f"{year}/%",)
    )
    row = cursor.fetchone()
    if row:
        last_num = int(row['offer_number'].split('/')[1])
        next_num = last_num + 1
    else:
        next_num = 1
    return f"{year}/{str(next_num).zfill(5)}"

def generate_invoice_number():
    year = datetime.datetime.now().year
    db = get_db()
    cursor = db.execute(
        "SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY invoice_number DESC LIMIT 1",
        (f"FT-{year}/%",)
    )
    row = cursor.fetchone()
    if row:
        last_num = int(row['invoice_number'].split('/')[1])
        next_num = last_num + 1
    else:
        next_num = 1
    return f"FT-{year}/{str(next_num).zfill(5)}"


# ============================================
#   AUTENTICAZIONE
# ============================================

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('logged_in'):
            # Per le API restituisce 401, per le pagine fa redirect
            if request.path.startswith('/api/'):
                return jsonify({'error': 'Non autorizzato'}), 401
            return redirect(url_for('login_page'))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/sw.js')
def service_worker():
    return app.send_static_file('sw.js'), 200, {'Content-Type': 'application/javascript', 'Service-Worker-Allowed': '/'}

@app.route('/login', methods=['GET'])
def login_page():
    if session.get('logged_in'):
        return redirect(url_for('index'))
    return render_template('login.html', error=None)

@app.route('/login', methods=['POST'])
def login_post():
    username = request.form.get('username', '').strip()
    password = request.form.get('password', '')
    db = get_db()
    user = db.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
    if user and check_password_hash(user['password_hash'], password):
        session['logged_in'] = True
        session['username'] = username
        session.permanent = True
        return redirect(url_for('index'))
    return render_template('login.html', error='Username o password errati.')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login_page'))


# ============================================
#   ROUTE PAGINE
# ============================================

@app.route('/')
@login_required
def index():
    return render_template('index.html', username=session.get('username', 'admin'))

@app.route('/app')
@login_required
def mobile_app():
    return render_template('mobile.html')


# ============================================
#   API: DEADLINE ALERTS
# ============================================

@app.route('/api/deadline-alerts', methods=['GET'])
@login_required
def deadline_alerts():
    db = get_db()
    today = datetime.datetime.now().strftime('%Y-%m-%d')
    week_later = (datetime.datetime.now() + datetime.timedelta(days=7)).strftime('%Y-%m-%d')
    
    # Fatture scadute
    overdue = db.execute("""
        SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total 
        FROM invoices 
        WHERE status NOT IN ('Pagata', 'Annullata') 
        AND due_date IS NOT NULL AND due_date < ?
    """, (today,)).fetchone()
    
    # Fatture in scadenza entro 7 giorni
    upcoming = db.execute("""
        SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total 
        FROM invoices 
        WHERE status NOT IN ('Pagata', 'Annullata') 
        AND due_date IS NOT NULL AND due_date >= ? AND due_date <= ?
    """, (today, week_later)).fetchone()
    
    return jsonify({
        'overdue_count': overdue['count'],
        'overdue_total': overdue['total'],
        'upcoming_count': upcoming['count'],
        'upcoming_total': upcoming['total']
    })


# ============================================
#   API: CLIENTS
# ============================================

@app.route('/api/clients', methods=['GET'])
@login_required
def get_clients():
    db = get_db()
    cursor = db.execute('SELECT * FROM clients ORDER BY name')
    return jsonify([dict(row) for row in cursor.fetchall()])

@app.route('/api/clients', methods=['POST'])
@login_required
def save_client():
    data = request.json
    db = get_db()
    if not data.get('id'):
        data['id'] = generate_id()
    db.execute('''
        INSERT OR REPLACE INTO clients (id, type, name, vat, cf, address, email, phone)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (data['id'], data['type'], data['name'], data.get('vat'), data.get('cf'), data['address'], data['email'], data['phone']))
    db.commit()
    return jsonify({'status': 'success', 'id': data['id']})

@app.route('/api/clients/<id>', methods=['DELETE'])
@login_required
def delete_client(id):
    db = get_db()
    db.execute('DELETE FROM clients WHERE id = ?', (id,))
    db.commit()
    return jsonify({'status': 'success'})

# ============================================
#   API: PRODUCTS
# ============================================

@app.route('/api/products', methods=['GET'])
@login_required
def get_products():
    db = get_db()
    cursor = db.execute('SELECT * FROM products ORDER BY description')
    return jsonify([dict(row) for row in cursor.fetchall()])

@app.route('/api/products', methods=['POST'])
@login_required
def save_product():
    data = request.json
    db = get_db()
    if not data.get('id'):
        data['id'] = generate_id()
    db.execute('''
        INSERT OR REPLACE INTO products (id, code, description, unit, price)
        VALUES (?, ?, ?, ?, ?)
    ''', (data['id'], data['code'], data['description'], data['unit'], data['price']))
    db.commit()
    return jsonify({'status': 'success', 'id': data['id']})

@app.route('/api/products/<id>', methods=['DELETE'])
@login_required
def delete_product(id):
    db = get_db()
    db.execute('DELETE FROM products WHERE id = ?', (id,))
    db.commit()
    return jsonify({'status': 'success'})

# ============================================
#   API: OFFERS
# ============================================

@app.route('/api/offers', methods=['GET'])
@login_required
def get_offers():
    db = get_db()
    cursor = db.execute('SELECT * FROM offers ORDER BY created_at DESC')
    offers = [dict(row) for row in cursor.fetchall()]
    for offer in offers:
        cursor_items = db.execute('SELECT * FROM offer_items WHERE offer_id = ?', (offer['id'],))
        offer['items'] = [dict(row) for row in cursor_items.fetchall()]
    return jsonify(offers)

@app.route('/api/offers', methods=['POST'])
@login_required
def save_offer():
    data = request.json
    db = get_db()
    if not data.get('id'):
        data['id'] = generate_id()
    
    offer_number = data.get('offerNumber')
    if not offer_number:
        existing = db.execute('SELECT offer_number FROM offers WHERE id = ?', (data['id'],)).fetchone()
        offer_number = existing['offer_number'] if existing else generate_offer_number()
    
    db.execute('''
        INSERT OR REPLACE INTO offers (
            id, offer_number, client_id, client_name, client_address, client_vat_cf, date, execution_time, worksite_address,
            pricing_mode, lump_sum_amount, discount, subtotal, vat_rate, vat_amount, total,
            payment_method, payment_terms, legal_terms, notes, status, custom_logo_url, project_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        data['id'], offer_number, data['clientId'], data['clientName'], data.get('clientAddress'), data.get('clientVatOrCf'),
        data['date'], data.get('executionTime'), data.get('worksiteAddress'),
        data.get('pricingMode', 'itemized'), data.get('lumpSumAmount'), data.get('discount', 0),
        data.get('subtotal', 0), data.get('vatRate', 22), data.get('vatAmount', 0), data.get('total', 0),
        data.get('paymentMethod'), data.get('paymentTerms'), data.get('legalTerms'), data.get('notes'),
        data.get('status', 'Bozza'), data.get('customLogoUrl'), data.get('projectId')
    ))
    
    db.execute('DELETE FROM offer_items WHERE offer_id = ?', (data['id'],))
    for item in data.get('items', []):
        if not item.get('id'):
            item['id'] = generate_id()
        db.execute('''
            INSERT INTO offer_items (id, offer_id, product_id, product_code, description, unit, quantity, unit_price, total)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (item['id'], data['id'], item.get('productId'), item.get('productCode'), item.get('description'),
              item.get('unit'), item.get('quantity'), item.get('unitPrice'), item.get('total')))
    
    db.commit()
    return jsonify({'status': 'success', 'id': data['id'], 'offer_number': offer_number})

@app.route('/api/offers/<id>/status', methods=['PUT'])
@login_required
def update_offer_status(id):
    data = request.json
    db = get_db()
    db.execute('UPDATE offers SET status = ? WHERE id = ?', (data['status'], id))
    db.commit()
    return jsonify({'status': 'success'})

@app.route('/api/offers/<id>', methods=['DELETE'])
@login_required
def delete_offer(id):
    db = get_db()
    db.execute('DELETE FROM offers WHERE id = ?', (id,))
    db.commit()
    return jsonify({'status': 'success'})

# ============================================
#   API: SUPPLIERS
# ============================================

@app.route('/api/suppliers', methods=['GET'])
@login_required
def get_suppliers():
    db = get_db()
    cursor = db.execute('SELECT * FROM suppliers ORDER BY name')
    return jsonify([dict(row) for row in cursor.fetchall()])

@app.route('/api/suppliers', methods=['POST'])
@login_required
def save_supplier():
    data = request.json
    db = get_db()
    if not data.get('id'):
        data['id'] = generate_id()
    db.execute('''
        INSERT OR REPLACE INTO suppliers (id, name, vat, cf, address, email, phone, category, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (data['id'], data['name'], data.get('vat'), data.get('cf'), data.get('address'),
          data.get('email'), data.get('phone'), data.get('category'), data.get('notes')))
    db.commit()
    return jsonify({'status': 'success', 'id': data['id']})

@app.route('/api/suppliers/<id>', methods=['DELETE'])
@login_required
def delete_supplier(id):
    db = get_db()
    db.execute('DELETE FROM suppliers WHERE id = ?', (id,))
    db.commit()
    return jsonify({'status': 'success'})

# ============================================
#   API: INVOICES
# ============================================

@app.route('/api/invoices', methods=['GET'])
@login_required
def get_invoices():
    db = get_db()
    cursor = db.execute('SELECT * FROM invoices ORDER BY created_at DESC')
    invoices = [dict(row) for row in cursor.fetchall()]
    for inv in invoices:
        cursor_items = db.execute('SELECT * FROM invoice_items WHERE invoice_id = ?', (inv['id'],))
        inv['items'] = [dict(row) for row in cursor_items.fetchall()]
    return jsonify(invoices)

@app.route('/api/invoices', methods=['POST'])
@login_required
def save_invoice():
    data = request.json
    db = get_db()
    if not data.get('id'):
        data['id'] = generate_id()
    
    invoice_number = data.get('invoiceNumber')
    if not invoice_number:
        existing = db.execute('SELECT invoice_number FROM invoices WHERE id = ?', (data['id'],)).fetchone()
        invoice_number = existing['invoice_number'] if existing else generate_invoice_number()
    
    db.execute('''
        INSERT OR REPLACE INTO invoices (
            id, invoice_number, offer_id, client_id, client_name, client_address, client_vat_cf,
            date, due_date, subtotal, vat_rate, vat_amount, total, payment_method, notes, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        data['id'], invoice_number, data.get('offerId'), data['clientId'], data['clientName'],
        data.get('clientAddress'), data.get('clientVatCf'),
        data['date'], data.get('dueDate'),
        data.get('subtotal', 0), data.get('vatRate', 22), data.get('vatAmount', 0), data.get('total', 0),
        data.get('paymentMethod'), data.get('notes'), data.get('status', 'Emessa')
    ))
    
    db.execute('DELETE FROM invoice_items WHERE invoice_id = ?', (data['id'],))
    for item in data.get('items', []):
        if not item.get('id'):
            item['id'] = generate_id()
        db.execute('''
            INSERT INTO invoice_items (id, invoice_id, description, quantity, unit, unit_price, total)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (item['id'], data['id'], item.get('description'), item.get('quantity'),
              item.get('unit'), item.get('unitPrice'), item.get('total')))
    
    db.commit()
    return jsonify({'status': 'success', 'id': data['id'], 'invoice_number': invoice_number})

@app.route('/api/invoices/<id>/status', methods=['PUT'])
@login_required
def update_invoice_status(id):
    data = request.json
    db = get_db()
    db.execute('UPDATE invoices SET status = ? WHERE id = ?', (data['status'], id))
    db.commit()
    return jsonify({'status': 'success'})

@app.route('/api/invoices/<id>', methods=['DELETE'])
@login_required
def delete_invoice(id):
    db = get_db()
    db.execute('DELETE FROM invoices WHERE id = ?', (id,))
    db.commit()
    return jsonify({'status': 'success'})

# ============================================
#   API: PROJECTS
# ============================================

@app.route('/api/projects', methods=['GET'])
@login_required
def get_projects():
    db = get_db()
    cursor = db.execute('SELECT * FROM projects ORDER BY created_at DESC')
    projects = [dict(row) for row in cursor.fetchall()]
    
    for project in projects:
        offers = db.execute('SELECT id, offer_number, total, status FROM offers WHERE project_id = ?', (project['id'],)).fetchall()
        project['offers'] = [dict(o) for o in offers]
        expenses = db.execute('SELECT SUM(amount) as total_expenses FROM expenses WHERE project_id = ?', (project['id'],)).fetchone()
        project['total_expenses'] = expenses['total_expenses'] or 0
        invoices = db.execute('''
            SELECT SUM(i.total) as total_invoiced FROM invoices i 
            JOIN offers o ON i.offer_id = o.id WHERE o.project_id = ?
        ''', (project['id'],)).fetchone()
        project['total_invoiced'] = invoices['total_invoiced'] or 0 if invoices else 0
    
    return jsonify(projects)

@app.route('/api/projects', methods=['POST'])
@login_required
def save_project():
    data = request.json
    db = get_db()
    if not data.get('id'):
        data['id'] = generate_id()
    db.execute('''
        INSERT OR REPLACE INTO projects (id, name, client_id, client_name, address, start_date, end_date, budget, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (data['id'], data['name'], data.get('clientId'), data.get('clientName'), data.get('address'),
          data.get('startDate'), data.get('endDate'), data.get('budget', 0), data.get('status', 'Pianificato'), data.get('notes')))
    db.commit()
    return jsonify({'status': 'success', 'id': data['id']})

@app.route('/api/projects/<id>', methods=['DELETE'])
@login_required
def delete_project(id):
    db = get_db()
    db.execute('DELETE FROM projects WHERE id = ?', (id,))
    db.commit()
    return jsonify({'status': 'success'})

# ============================================
#   API: EXPENSES
# ============================================

@app.route('/api/expenses', methods=['GET'])
@login_required
def get_expenses():
    db = get_db()
    cursor = db.execute('SELECT * FROM expenses ORDER BY date DESC')
    return jsonify([dict(row) for row in cursor.fetchall()])

@app.route('/api/expenses', methods=['POST'])
@login_required
def save_expense():
    data = request.json
    db = get_db()
    if not data.get('id'):
        data['id'] = generate_id()
    db.execute('''
        INSERT OR REPLACE INTO expenses (id, date, description, amount, category, supplier_id, supplier_name, project_id, project_name, payment_method, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (data['id'], data['date'], data['description'], data['amount'], data['category'],
          data.get('supplierId'), data.get('supplierName'), data.get('projectId'), data.get('projectName'),
          data.get('paymentMethod'), data.get('notes')))
    db.commit()
    return jsonify({'status': 'success', 'id': data['id']})

@app.route('/api/expenses/<id>', methods=['DELETE'])
@login_required
def delete_expense(id):
    db = get_db()
    db.execute('DELETE FROM expenses WHERE id = ?', (id,))
    db.commit()
    return jsonify({'status': 'success'})

# ============================================
#   API: EVENTS (Calendar)
# ============================================

@app.route('/api/events', methods=['GET'])
@login_required
def get_events():
    db = get_db()
    cursor = db.execute('SELECT * FROM events ORDER BY date ASC, time ASC')
    return jsonify([dict(row) for row in cursor.fetchall()])

@app.route('/api/events', methods=['POST'])
@login_required
def save_event():
    data = request.json
    db = get_db()
    if not data.get('id'):
        data['id'] = generate_id()
    db.execute('''
        INSERT OR REPLACE INTO events (id, title, description, date, time, end_date, type, project_id, project_name, client_id, client_name, completed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (data['id'], data['title'], data.get('description'), data['date'], data.get('time'),
          data.get('endDate'), data.get('type', 'Appuntamento'), data.get('projectId'), data.get('projectName'),
          data.get('clientId'), data.get('clientName'), data.get('completed', 0)))
    db.commit()
    return jsonify({'status': 'success', 'id': data['id']})

@app.route('/api/events/<id>', methods=['DELETE'])
@login_required
def delete_event(id):
    db = get_db()
    db.execute('DELETE FROM events WHERE id = ?', (id,))
    db.commit()
    return jsonify({'status': 'success'})

@app.route('/api/events/<id>/toggle', methods=['PUT'])
@login_required
def toggle_event(id):
    db = get_db()
    event = db.execute('SELECT completed FROM events WHERE id = ?', (id,)).fetchone()
    new_val = 0 if event['completed'] else 1
    db.execute('UPDATE events SET completed = ? WHERE id = ?', (new_val, id))
    db.commit()
    return jsonify({'status': 'success', 'completed': new_val})

# ============================================
#   API: DASHBOARD / REPORTS
# ============================================

@app.route('/api/reports/summary', methods=['GET'])
@login_required
def get_summary():
    db = get_db()
    
    total_offers = db.execute('SELECT count(*) as c FROM offers').fetchone()['c']
    pending_offers = db.execute("SELECT count(*) as c FROM offers WHERE status IN ('Bozza','Inviata')").fetchone()['c']
    accepted_offers = db.execute("SELECT count(*) as c FROM offers WHERE status = 'Accettata'").fetchone()['c']
    total_offers_value = db.execute("SELECT COALESCE(SUM(total),0) as t FROM offers WHERE status = 'Accettata'").fetchone()['t']
    
    total_invoices = db.execute('SELECT count(*) as c FROM invoices').fetchone()['c']
    paid_invoices = db.execute("SELECT count(*) as c FROM invoices WHERE status = 'Pagata'").fetchone()['c']
    unpaid_invoices = db.execute("SELECT count(*) as c FROM invoices WHERE status IN ('Emessa','Scaduta')").fetchone()['c']
    total_invoiced = db.execute("SELECT COALESCE(SUM(total),0) as t FROM invoices").fetchone()['t']
    total_paid = db.execute("SELECT COALESCE(SUM(total),0) as t FROM invoices WHERE status = 'Pagata'").fetchone()['t']
    
    active_projects = db.execute("SELECT count(*) as c FROM projects WHERE status = 'In Corso'").fetchone()['c']
    
    total_expenses = db.execute("SELECT COALESCE(SUM(amount),0) as t FROM expenses").fetchone()['t']
    
    expense_cats = db.execute("SELECT category, SUM(amount) as total FROM expenses GROUP BY category ORDER BY total DESC").fetchall()
    
    monthly_revenue = db.execute("""
        SELECT strftime('%Y-%m', date) as month, SUM(total) as revenue 
        FROM invoices WHERE status = 'Pagata'
        GROUP BY month ORDER BY month DESC LIMIT 12
    """).fetchall()
    
    top_clients = db.execute("""
        SELECT client_name, SUM(total) as total_value, count(*) as num_offers
        FROM offers WHERE status = 'Accettata'
        GROUP BY client_name ORDER BY total_value DESC LIMIT 5
    """).fetchall()
    
    today = datetime.date.today().isoformat()
    upcoming_events = db.execute("""
        SELECT * FROM events WHERE date >= ? AND completed = 0 ORDER BY date ASC LIMIT 5
    """, (today,)).fetchall()
    
    overdue_invoices = db.execute("""
        SELECT * FROM invoices WHERE status = 'Emessa' AND due_date < ? ORDER BY due_date ASC
    """, (today,)).fetchall()
    
    return jsonify({
        'offers': {'total': total_offers, 'pending': pending_offers, 'accepted': accepted_offers, 'total_value': total_offers_value},
        'invoices': {'total': total_invoices, 'paid': paid_invoices, 'unpaid': unpaid_invoices, 'total_invoiced': total_invoiced, 'total_paid': total_paid},
        'projects': {'active': active_projects},
        'expenses': {'total': total_expenses, 'by_category': [dict(r) for r in expense_cats]},
        'monthly_revenue': [dict(r) for r in monthly_revenue],
        'top_clients': [dict(r) for r in top_clients],
        'upcoming_events': [dict(r) for r in upcoming_events],
        'overdue_invoices': [dict(r) for r in overdue_invoices]
    })


# ============================================
#   API: GESTIONE UTENTI (cambio password)
# ============================================

@app.route('/api/change-password', methods=['POST'])
@login_required
def change_password():
    data = request.json
    current_password = data.get('currentPassword', '')
    new_password = data.get('newPassword', '')
    if len(new_password) < 4:
        return jsonify({'error': 'La password deve essere di almeno 4 caratteri'}), 400
    db = get_db()
    username = session.get('username')
    user = db.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
    if not user or not check_password_hash(user['password_hash'], current_password):
        return jsonify({'error': 'Password attuale errata'}), 403
    new_hash = generate_password_hash(new_password)
    db.execute('UPDATE users SET password_hash = ? WHERE username = ?', (new_hash, username))
    db.commit()
    return jsonify({'status': 'success'})


if __name__ == '__main__':
    with app.app_context():
        db = get_db()
        try:
            db.execute('SELECT 1 FROM clients LIMIT 1')
        except sqlite3.OperationalError:
            print("Initializing Database...")
            init_db()
    app.run(debug=True, host='0.0.0.0', port=5000)
