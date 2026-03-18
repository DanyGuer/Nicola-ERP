-- Tabella Clienti (CRM)
CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL, -- 'private' o 'company'
    name TEXT NOT NULL,
    vat TEXT,
    cf TEXT,
    address TEXT,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Prodotti (Inventory)
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    description TEXT NOT NULL,
    unit TEXT NOT NULL,
    price REAL NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Offerte (Sales)
CREATE TABLE IF NOT EXISTS offers (
    id TEXT PRIMARY KEY,
    offer_number TEXT NOT NULL,
    client_id TEXT NOT NULL,
    client_name TEXT NOT NULL,
    client_address TEXT,
    client_vat_cf TEXT,
    date TEXT NOT NULL,
    execution_time TEXT,
    worksite_address TEXT,
    
    pricing_mode TEXT DEFAULT 'itemized',
    lump_sum_amount REAL,
    discount REAL DEFAULT 0,
    
    subtotal REAL DEFAULT 0,
    vat_rate REAL DEFAULT 22,
    vat_amount REAL DEFAULT 0,
    total REAL DEFAULT 0,
    
    payment_method TEXT,
    payment_terms TEXT,
    legal_terms TEXT,
    notes TEXT,
    
    status TEXT DEFAULT 'Bozza',
    
    custom_logo_url TEXT,
    project_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(client_id) REFERENCES clients(id),
    FOREIGN KEY(project_id) REFERENCES projects(id)
);

-- Tabella Articoli Offerta (Dettaglio)
CREATE TABLE IF NOT EXISTS offer_items (
    id TEXT PRIMARY KEY,
    offer_id TEXT NOT NULL,
    product_id TEXT,
    product_code TEXT,
    description TEXT,
    unit TEXT,
    quantity REAL,
    unit_price REAL,
    total REAL,
    FOREIGN KEY(offer_id) REFERENCES offers(id) ON DELETE CASCADE
);

-- Tabella Fornitori
CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    vat TEXT,
    cf TEXT,
    address TEXT,
    email TEXT,
    phone TEXT,
    category TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Fatture
CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    invoice_number TEXT NOT NULL,
    offer_id TEXT,
    client_id TEXT NOT NULL,
    client_name TEXT NOT NULL,
    client_address TEXT,
    client_vat_cf TEXT,
    date TEXT NOT NULL,
    due_date TEXT,
    
    subtotal REAL DEFAULT 0,
    vat_rate REAL DEFAULT 22,
    vat_amount REAL DEFAULT 0,
    total REAL DEFAULT 0,
    
    payment_method TEXT,
    notes TEXT,
    status TEXT DEFAULT 'Emessa', -- Emessa, Pagata, Scaduta, Annullata
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(offer_id) REFERENCES offers(id),
    FOREIGN KEY(client_id) REFERENCES clients(id)
);

-- Tabella Voci Fattura
CREATE TABLE IF NOT EXISTS invoice_items (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL,
    description TEXT,
    quantity REAL,
    unit TEXT,
    unit_price REAL,
    total REAL,
    FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- Tabella Cantieri / Progetti
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    client_id TEXT,
    client_name TEXT,
    address TEXT,
    start_date TEXT,
    end_date TEXT,
    budget REAL DEFAULT 0,
    status TEXT DEFAULT 'Pianificato', -- Pianificato, In Corso, Completato, Chiuso
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(client_id) REFERENCES clients(id)
);

-- Tabella Spese
CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL, -- Materiali, Trasporto, Manodopera, Utenze, Altro
    supplier_id TEXT,
    supplier_name TEXT,
    project_id TEXT,
    project_name TEXT,
    payment_method TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY(project_id) REFERENCES projects(id)
);

-- Tabella Calendario / Eventi
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    date TEXT NOT NULL,
    time TEXT,
    end_date TEXT,
    type TEXT DEFAULT 'Appuntamento', -- Sopralluogo, Consegna, Appuntamento, Scadenza, Altro
    project_id TEXT,
    project_name TEXT,
    client_id TEXT,
    client_name TEXT,
    completed INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES projects(id),
    FOREIGN KEY(client_id) REFERENCES clients(id)
);

-- Tabella Utenti (Login)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
