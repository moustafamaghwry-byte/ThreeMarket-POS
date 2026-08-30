// ============================================================
// ThreeMarket POS - Database Migrations
// Handles versioned SQLite database schema migrations.
// ============================================================

const fs = require("fs");
const path = require("path");

const {
    getDatabase
} = require("./database");

// ============================================================
// Migration 001
// Creates the initial database schema for a new database.
// ============================================================

function migration001InitialSchema(db) {
    const schemaPath = path.join(
        __dirname,
        "schema.sql"
    );

    if (!fs.existsSync(schemaPath)) {
        throw new Error(
            `[Database] Schema file not found: ${schemaPath}`
        );
    }

    const schema = fs.readFileSync(
        schemaPath,
        "utf8"
    );

    db.exec(schema);
}

// ============================================================
// Check whether a table exists.
// ============================================================

function tableExists(db, tableName) {
    const row = db
        .prepare(`
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
            AND name = ?
        `)
        .get(tableName);

    return Boolean(row);
}

// ============================================================
// Check whether a column exists in a table.
// ============================================================

function columnExists(db, tableName, columnName) {
    const columns = db
        .prepare(`PRAGMA table_info(${tableName})`)
        .all();

    return columns.some(
        column => column.name === columnName
    );
}

// ============================================================
// Ensure migration tracking table exists.
// ============================================================

function initializeMigrationTable(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    `);
}

// ============================================================
// Check whether a migration has already been applied.
// ============================================================

function isMigrationApplied(db, version) {
    const row = db
        .prepare(`
            SELECT version
            FROM schema_migrations
            WHERE version = ?
        `)
        .get(version);

    return Boolean(row);
}

// ============================================================
// Record a successfully applied migration.
// ============================================================

function recordMigration(db, version, name) {
    db.prepare(`
        INSERT INTO schema_migrations (
            version,
            name
        )
        VALUES (?, ?)
    `).run(
        version,
        name
    );
}

// ============================================================
// Migration 002
// Upgrades the existing Products table.
// ============================================================

function migration002UpgradeProducts(db) {

    console.log(
        "[Database] Upgrading products table..."
    );

    if (!tableExists(db, "products")) {
        throw new Error(
            "[Database] Products table does not exist."
        );
    }

    // --------------------------------------------------------
    // Add missing columns.
    // --------------------------------------------------------

    if (!columnExists(db, "products", "sku")) {
        db.exec(`
            ALTER TABLE products
            ADD COLUMN sku TEXT
        `);
    }

    if (!columnExists(db, "products", "unit")) {
        db.exec(`
            ALTER TABLE products
            ADD COLUMN unit TEXT NOT NULL DEFAULT 'pcs'
        `);
    }

    if (!columnExists(db, "products", "price_retail")) {
        db.exec(`
            ALTER TABLE products
            ADD COLUMN price_retail REAL NOT NULL DEFAULT 0
        `);
    }

    if (!columnExists(db, "products", "price_wholesale")) {
        db.exec(`
            ALTER TABLE products
            ADD COLUMN price_wholesale REAL NOT NULL DEFAULT 0
        `);
    }

    if (!columnExists(db, "products", "uom")) {
        db.exec(`
            ALTER TABLE products
            ADD COLUMN uom TEXT NOT NULL DEFAULT 'pcs'
        `);
    }

    if (!columnExists(db, "products", "uom_ratio")) {
        db.exec(`
            ALTER TABLE products
            ADD COLUMN uom_ratio REAL NOT NULL DEFAULT 1
        `);
    }

    // --------------------------------------------------------
    // Create indexes after ensuring columns exist.
    // --------------------------------------------------------

    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_products_sku
        ON products(sku);
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_products_barcode
        ON products(barcode);
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_products_name
        ON products(name);
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_products_category
        ON products(category);
    `);

    console.log(
        "[Database] Products table upgrade completed."
    );
}
// ============================================================
// Migration 003
// Imports existing products from data/products.json into SQLite.
// The JSON file remains untouched as a backup/source.
// ============================================================

function migration003ImportProducts(db) {

    const productsPath = path.join(
        __dirname,
        "../../data/products.json"
    );

    if (!fs.existsSync(productsPath)) {
        throw new Error(
            `[Database] Products JSON file not found: ${productsPath}`
        );
    }

    console.log(
        "[Database] Reading products.json..."
    );

    const products = JSON.parse(
        fs.readFileSync(
            productsPath,
            "utf8"
        )
    );

    if (!Array.isArray(products)) {
        throw new Error(
            "[Database] products.json must contain an array."
        );
    }

    console.log(
        `[Database] Found ${products.length} products in JSON.`
    );

    const insertProduct = db.prepare(`
        INSERT INTO products (
            id,
            sku,
            barcode,
            name,
            category,
            price,
            cost,
            quantity,
            min_stock,
            unit,
            active,
            price_retail,
            price_wholesale,
            uom,
            uom_ratio,
            created_at,
            updated_at
        )
        VALUES (
            @id,
            @sku,
            @barcode,
            @name,
            @category,
            @price,
            @cost,
            @quantity,
            @min_stock,
            @unit,
            @active,
            @price_retail,
            @price_wholesale,
            @uom,
            @uom_ratio,
            @created_at,
            @updated_at
        )
    `);

    const insertMany = db.transaction((items) => {

        for (const product of items) {

            if (!product.id) {
                throw new Error(
                    "[Database] Product is missing id."
                );
            }

            if (!product.name) {
                throw new Error(
                    `[Database] Product ${product.id} is missing name.`
                );
            }

            insertProduct.run({
                id: product.id,

                // Empty SKU/barcode values become NULL.
                // This prevents duplicate empty-string conflicts.
                sku: product.sku || null,

                barcode: product.barcode || null,

                name: product.name,

                category: product.category || null,

                price: Number(product.price) || 0,

                cost: Number(product.cost) || 0,

                quantity: Number(product.quantity) || 0,

                min_stock: Number(product.minStock) || 0,

                unit: product.unit || "pcs",

                active: product.active ? 1 : 0,

                price_retail:
                    Number(
                        product.priceRetail ?? product.price
                    ) || 0,

                price_wholesale:
                    Number(
                        product.priceWholesale
                    ) || 0,

                uom: product.uom || "pcs",

                uom_ratio:
                    Number(product.uomRatio) || 1,

                created_at:
                    product.createdAt ||
                    new Date().toISOString(),

                updated_at:
                    product.updatedAt || null
            });
        }
    });

    insertMany(products);

    console.log(
        `[Database] Imported ${products.length} products successfully.`
    );
}
// ============================================================
// Run all required migrations.
// ============================================================

function runMigrations() {

    const db = getDatabase();

    initializeMigrationTable(db);

 const migrations = [
    {
        version: 1,
        name: "Initial Database Schema",
        run: migration001InitialSchema
    },
    {
        version: 2,
        name: "Upgrade Products Table",
        run: migration002UpgradeProducts
    },
    {
        version: 3,
        name: "Import Products From JSON",
        run: migration003ImportProducts
    }
];

    console.log(
        "[Database] Checking migrations..."
    );

    for (const migration of migrations) {

        if (isMigrationApplied(
            db,
            migration.version
        )) {
            console.log(
                `[Database] Migration ${migration.version} already applied.`
            );

            continue;
        }

        console.log(
            `[Database] Applying migration ${migration.version}: ${migration.name}`
        );

        const transaction = db.transaction(() => {

            migration.run(db);

            recordMigration(
                db,
                migration.version,
                migration.name
            );
        });

        transaction();

        console.log(
            `[Database] Migration ${migration.version} completed successfully.`
        );
    }

    console.log(
        "[Database] All migrations completed."
    );
}

module.exports = {
    runMigrations
};