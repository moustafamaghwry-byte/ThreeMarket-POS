-- ============================================================
-- ThreeMarket POS - SQLite Database Schema
-- Core database structure for the POS system.
-- ============================================================

PRAGMA foreign_keys = ON;

-- ============================================================
-- Users
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    username TEXT NOT NULL UNIQUE,

    password_hash TEXT NOT NULL,

    role TEXT NOT NULL DEFAULT 'cashier',

    is_active INTEGER NOT NULL DEFAULT 1,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username
ON users(username);

-- ============================================================
-- Products
-- ============================================================

CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,

    sku TEXT UNIQUE,

    barcode TEXT,

    name TEXT NOT NULL,

    category TEXT,

    price REAL NOT NULL DEFAULT 0,

    cost REAL NOT NULL DEFAULT 0,

    quantity REAL NOT NULL DEFAULT 0,

    min_stock REAL NOT NULL DEFAULT 0,

    unit TEXT NOT NULL DEFAULT 'pcs',

    active INTEGER NOT NULL DEFAULT 1,

    price_retail REAL NOT NULL DEFAULT 0,

    price_wholesale REAL NOT NULL DEFAULT 0,

    uom TEXT NOT NULL DEFAULT 'pcs',

    uom_ratio REAL NOT NULL DEFAULT 1,

    created_at TEXT NOT NULL,

    updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_products_sku
ON products(sku);

CREATE INDEX IF NOT EXISTS idx_products_barcode
ON products(barcode);

CREATE INDEX IF NOT EXISTS idx_products_name
ON products(name);

CREATE INDEX IF NOT EXISTS idx_products_category
ON products(category);
-- ============================================================
-- Sales
-- ============================================================

CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    invoice_number TEXT NOT NULL UNIQUE,

    user_id INTEGER NOT NULL,

    subtotal REAL NOT NULL DEFAULT 0,

    discount_amount REAL NOT NULL DEFAULT 0,

    vat_enabled INTEGER NOT NULL DEFAULT 0,

    vat_rate REAL NOT NULL DEFAULT 0,

    vat_amount REAL NOT NULL DEFAULT 0,

    total_amount REAL NOT NULL DEFAULT 0,

    payment_status TEXT NOT NULL DEFAULT 'paid',

    sale_status TEXT NOT NULL DEFAULT 'completed',

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_sales_invoice
ON sales(invoice_number);

CREATE INDEX IF NOT EXISTS idx_sales_created_at
ON sales(created_at);

CREATE INDEX IF NOT EXISTS idx_sales_user
ON sales(user_id);

-- ============================================================
-- Sale Items
-- ============================================================

CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    sale_id INTEGER NOT NULL,

    product_id INTEGER NOT NULL,

    product_name TEXT NOT NULL,

    barcode TEXT,

    quantity REAL NOT NULL,

    unit_price REAL NOT NULL,

    discount_amount REAL NOT NULL DEFAULT 0,

    vat_rate REAL NOT NULL DEFAULT 0,

    vat_amount REAL NOT NULL DEFAULT 0,

    line_total REAL NOT NULL,

    FOREIGN KEY (sale_id)
        REFERENCES sales(id)
        ON DELETE CASCADE,

    FOREIGN KEY (product_id)
        REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale
ON sale_items(sale_id);

CREATE INDEX IF NOT EXISTS idx_sale_items_product
ON sale_items(product_id);

-- ============================================================
-- Returns
-- ============================================================

CREATE TABLE IF NOT EXISTS returns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    return_number TEXT NOT NULL UNIQUE,

    sale_id INTEGER NOT NULL,

    user_id INTEGER NOT NULL,

    total_amount REAL NOT NULL DEFAULT 0,

    return_status TEXT NOT NULL DEFAULT 'completed',

    reason TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (sale_id)
        REFERENCES sales(id),

    FOREIGN KEY (user_id)
        REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_returns_sale
ON returns(sale_id);

CREATE INDEX IF NOT EXISTS idx_returns_created_at
ON returns(created_at);

-- ============================================================
-- Return Items
-- ============================================================

CREATE TABLE IF NOT EXISTS return_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    return_id INTEGER NOT NULL,

    sale_item_id INTEGER NOT NULL,

    product_id INTEGER NOT NULL,

    quantity REAL NOT NULL,

    unit_price REAL NOT NULL,

    line_total REAL NOT NULL,

    FOREIGN KEY (return_id)
        REFERENCES returns(id)
        ON DELETE CASCADE,

    FOREIGN KEY (sale_item_id)
        REFERENCES sale_items(id),

    FOREIGN KEY (product_id)
        REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_return_items_return
ON return_items(return_id);

CREATE INDEX IF NOT EXISTS idx_return_items_product
ON return_items(product_id);

-- ============================================================
-- Payments
-- ============================================================

CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    sale_id INTEGER NOT NULL,

    payment_method TEXT NOT NULL,

    amount REAL NOT NULL,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (sale_id)
        REFERENCES sales(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_payments_sale
ON payments(sale_id);

-- ============================================================
-- Inventory Movements
-- ============================================================

CREATE TABLE IF NOT EXISTS inventory_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    product_id INTEGER NOT NULL,

    movement_type TEXT NOT NULL,

    quantity REAL NOT NULL,

    reference_type TEXT,

    reference_id INTEGER,

    previous_quantity REAL NOT NULL,

    new_quantity REAL NOT NULL,

    user_id INTEGER,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (product_id)
        REFERENCES products(id),

    FOREIGN KEY (user_id)
        REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_product
ON inventory_movements(product_id);

CREATE INDEX IF NOT EXISTS idx_inventory_created_at
ON inventory_movements(created_at);

-- ============================================================
-- Audit Logs
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    user_id INTEGER,

    action TEXT NOT NULL,

    entity_type TEXT,

    entity_id INTEGER,

    details TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_audit_user
ON audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_created_at
ON audit_logs(created_at);