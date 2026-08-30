// ============================================================
// ThreeMarket POS - Product Migration Validator
// Compares products.json against the SQLite products table.
// ============================================================

const fs = require("fs");
const path = require("path");

const {
    getDatabase
} = require("./database");

// ============================================================
// Normalize values before comparison.
// ============================================================

function normalize(value) {
    if (value === undefined || value === null) {
        return null;
    }

    return value;
}

// ============================================================
// Validate imported products.
// ============================================================

function validateProducts() {

    const db = getDatabase();

    const productsPath = path.join(
        __dirname,
        "../../data/products.json"
    );

    if (!fs.existsSync(productsPath)) {
        throw new Error(
            `[Validation] Products JSON not found: ${productsPath}`
        );
    }

    const jsonProducts = JSON.parse(
        fs.readFileSync(
            productsPath,
            "utf8"
        )
    );

    const sqliteProducts = db
        .prepare(`
            SELECT
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
            FROM products
            ORDER BY id
        `)
        .all();

    console.log(
        `[Validation] JSON products: ${jsonProducts.length}`
    );

    console.log(
        `[Validation] SQLite products: ${sqliteProducts.length}`
    );

    if (
        jsonProducts.length !==
        sqliteProducts.length
    ) {
        throw new Error(
            "[Validation] Product count mismatch."
        );
    }

    const sqliteMap = new Map(
        sqliteProducts.map(product => [
            product.id,
            product
        ])
    );

    const errors = [];

    for (const jsonProduct of jsonProducts) {

        const sqliteProduct =
            sqliteMap.get(jsonProduct.id);

        if (!sqliteProduct) {
            errors.push(
                `Missing product in SQLite: ${jsonProduct.id}`
            );

            continue;
        }

        const comparisons = [
            ["sku", jsonProduct.sku || null, sqliteProduct.sku],
            ["barcode", jsonProduct.barcode || null, sqliteProduct.barcode],
            ["name", jsonProduct.name, sqliteProduct.name],
            ["category", jsonProduct.category || null, sqliteProduct.category],
            ["price", Number(jsonProduct.price) || 0, sqliteProduct.price],
            ["cost", Number(jsonProduct.cost) || 0, sqliteProduct.cost],
            ["quantity", Number(jsonProduct.quantity) || 0, sqliteProduct.quantity],
            ["minStock", Number(jsonProduct.minStock) || 0, sqliteProduct.min_stock],
            ["unit", jsonProduct.unit || "pcs", sqliteProduct.unit],
            ["active", jsonProduct.active ? 1 : 0, sqliteProduct.active],
            [
                "priceRetail",
                Number(jsonProduct.priceRetail ?? jsonProduct.price) || 0,
                sqliteProduct.price_retail
            ],
            [
                "priceWholesale",
                Number(jsonProduct.priceWholesale) || 0,
                sqliteProduct.price_wholesale
            ],
            ["uom", jsonProduct.uom || "pcs", sqliteProduct.uom],
            [
                "uomRatio",
                Number(jsonProduct.uomRatio) || 1,
                sqliteProduct.uom_ratio
            ],
            [
                "createdAt",
                jsonProduct.createdAt,
                sqliteProduct.created_at
            ],
            [
                "updatedAt",
                jsonProduct.updatedAt || null,
                sqliteProduct.updated_at
            ]
        ];

        for (const [
            field,
            expected,
            actual
        ] of comparisons) {

            if (
                normalize(expected) !==
                normalize(actual)
            ) {
                errors.push(
                    `Product ${jsonProduct.id} - ${field}: ` +
                    `JSON=${expected} SQLite=${actual}`
                );
            }
        }
    }

    if (errors.length > 0) {

        console.error(
            "[Validation] FAILED"
        );

        for (const error of errors) {
            console.error(
                `[Validation] ${error}`
            );
        }

        throw new Error(
            `[Validation] Found ${errors.length} mismatch(es).`
        );
    }

    console.log(
        "[Validation] Product count matches."
    );

    console.log(
        "[Validation] Product IDs match."
    );

    console.log(
        "[Validation] Product data matches."
    );

    console.log(
        "[Validation] SUCCESS - Products migrated correctly."
    );

    return true;
}

module.exports = {
    validateProducts
};