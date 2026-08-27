// ============================================================
// ThreeMarket POS - Product Service
// Handles product CRUD with JSON file persistence.
// ============================================================

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ============================================================
// Configuration
// ============================================================

const DATA_DIR = path.join(__dirname, "../../data");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");

// ============================================================
// Helpers
// ============================================================

function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

function loadProducts() {
    ensureDataDir();
    if (!fs.existsSync(PRODUCTS_FILE)) return [];

    try {
        const data = fs.readFileSync(PRODUCTS_FILE, "utf-8");
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error("[Product] Load error:", error);
        return [];
    }
}

function saveProducts(products) {
    ensureDataDir();
    try {
        fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 4), "utf-8");
        return true;
    } catch (error) {
        console.error("[Product] Save error:", error);
        return false;
    }
}

// ============================================================
// Get All Products
// ============================================================

function getAllProducts() {
    return loadProducts();
}

// ============================================================
// Get Product By ID
// ============================================================

function getProductById(id) {
    const products = getAllProducts();
    return products.find((p) => p.id === id) || null;
}

// ============================================================
// Create Product
// ============================================================

function createProduct(productData) {
    const name = productData.name?.trim();
    if (!name) {
        return {
            success: false,
            message: "Product name is required."
        };
    }

    const priceVal = productData.priceRetail ?? productData.price;
    const price = Number(priceVal);

    if (priceVal === undefined || priceVal === "" || Number.isNaN(price) || price < 0) {
        return {
            success: false,
            message: "Please enter a valid product price."
        };
    }

    const products = loadProducts();
    if (productData.sku) {
        const skuExists = products.some(
            (p) => p.sku && p.sku.toLowerCase() === productData.sku.trim().toLowerCase()
        );

        if (skuExists) {
            return {
                success: false,
                message: "SKU already exists."
            };
        }
    }

    const newProduct = {
        id: crypto.randomUUID(),
        sku: productData.sku?.trim() || "",
        barcode: productData.barcode?.trim() || "",
        name: name,
        category: productData.category?.trim() || "",
        price: price,
        priceRetail: price,
        priceWholesale: Number(productData.priceWholesale) || 0,
        cost: Number(productData.cost) || 0,
        quantity: Number(productData.quantity) || 0,
        minStock: Number(productData.minStock) || 0,
        uom: productData.uom || productData.unit || "pcs",
        uomRatio: Number(productData.uomRatio) || 1,
        active: productData.active !== false,
        createdAt: new Date().toISOString()
    };

    products.push(newProduct);

    if (!saveProducts(products)) {
        return {
            success: false,
            message: "Failed to save product."
        };
    }

    console.log("[Product] Created:", newProduct.name);

    return {
        success: true,
        product: newProduct
    };
}

// ============================================================
// Update Product
// ============================================================

function updateProduct(id, updates) {
    const products = loadProducts();
    const index = products.findIndex((p) => p.id === id);

    if (index === -1) {
        return {
            success: false,
            message: "Product not found."
        };
    }

    const updatedRetail = updates.priceRetail ?? updates.price ?? products[index].priceRetail ?? products[index].price;

    products[index] = {
        ...products[index],
        ...updates,
        price: Number(updatedRetail) || 0,
        priceRetail: Number(updatedRetail) || 0,
        priceWholesale: Number(updates.priceWholesale ?? products[index].priceWholesale) || 0,
        uom: updates.uom || updates.unit || products[index].uom || "pcs",
        uomRatio: Number(updates.uomRatio ?? products[index].uomRatio) || 1,
        id: products[index].id,
        updatedAt: new Date().toISOString()
    };

    if (!saveProducts(products)) {
        return {
            success: false,
            message: "Failed to update product."
        };
    }

    return {
        success: true,
        product: products[index]
    };
}

// ============================================================
// Delete Product
// ============================================================

function deleteProduct(id) {
    const products = loadProducts();
    const filtered = products.filter((p) => p.id !== id);

    if (filtered.length === products.length) {
        return {
            success: false,
            message: "Product not found."
        };
    }

    if (!saveProducts(filtered)) {
        return {
            success: false,
            message: "Failed to delete product."
        };
    }

    return {
        success: true,
        message: "Product deleted successfully."
    };
}

// ============================================================
// Export
// ============================================================

module.exports = {
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct
};