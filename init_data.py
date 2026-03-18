import sqlite3
import uuid

DATABASE = 'erp.sqlite'

def generate_id():
    return str(uuid.uuid4())

def init_data():
    conn = sqlite3.connect(DATABASE)
    c = conn.cursor()
    
    # Create tables if not exist
    with open('schema.sql', 'r') as f:
        c.executescript(f.read())
        
    # Check if data exists
    c.execute('SELECT count(*) FROM clients')
    if c.fetchone()[0] == 0:
        print("Inserting dummy data...")

        # CLIENTS
        clients = [
            ('private', 'Antonio Rossi', 'RSSNTN80A01H501U', None, 'Via Prof. G. Iannone, Palo del Colle', 'antonio.rossi@email.com', '+39 333 1234567'),
            ('private', 'Piero Acquaro', 'CQRPR76M12L219K', None, 'Via Fontana Vecchia 10, Bari', 'piero.acquaro@email.com', '+39 333 9876543'),
            ('company', 'Costruzioni SRL', None, '01234567890', 'Via Roma 1, Milano', 'info@costruzioni.it', '02 1234567')
        ]
        
        for cl in clients:
            c.execute('INSERT INTO clients (id, type, name, cf, vat, address, email, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                      (generate_id(), cl[0], cl[1], cl[2], cl[3], cl[4], cl[5], cl[6]))

        # PRODUCTS
        products = [
            ('PITT-INT', 'Tinteggiatura pareti con ducotone silossanico lavabile bianco (3 mani)', 'mq', 12.00),
            ('RAS-STUC', 'Stuccatura e rasatura con stucco in pasta pareti divisorie', 'mq', 15.00),
            ('CART-FISS', 'Carteggiatura con levigatrice e applicazione fissativo aggrappante', 'mq', 4.50),
            ('PITT-EXT', 'Tinteggiatura facciate con quarzo o idrosilossanica esterna', 'mq', 18.00),
            ('RIP-CEM', 'Ripristino con materiale base cementizio resinoso', 'cad', 50.00),
            ('PONT', 'Nolo e montaggio Trabattello in acciaio con scale', 'corpo', 250.00),
        ]
        
        for p in products:
            c.execute('INSERT INTO products (id, code, description, unit, price) VALUES (?, ?, ?, ?, ?)',
                      (generate_id(), p[0], p[1], p[2], p[3]))

    # Crea l'utente admin se non esiste (viene eseguito SEMPRE all'avvio)
    c.execute("SELECT id FROM users WHERE username = 'admin'")
    if not c.fetchone():
        from werkzeug.security import generate_password_hash
        admin_id = str(uuid.uuid4())
        admin_hash = generate_password_hash('admin')
        c.execute("INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)", 
                  (admin_id, 'admin', admin_hash))
        print("Utente admin creato (admin/admin)")

    conn.commit()
    conn.close()
    print("Database pronto.")

if __name__ == '__main__':
    init_data()
