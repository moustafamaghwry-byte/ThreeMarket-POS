// ============================================================
// ThreeMarket POS - Returns Service
// Handles sales returns with persistent JSON storage.
// Automatically creates data/returns.json when missing.
// ============================================================

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");


// ============================================================
// Configuration
// ============================================================

const DATA_DIR = path.join(__dirname, "../../data");
const RETURNS_FILE = path.join(DATA_DIR, "returns.json");


// ============================================================
// Ensure Data Directory
// ============================================================

function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, {
            recursive: true
        });

        console.log("[Returns] Data directory created.");
    }
}


// ============================================================
// Ensure Returns File
// Creates returns.json automatically if it does not exist.
// ============================================================

function ensureReturnsFile() {
    ensureDataDir();

    if (!fs.existsSync(RETURNS_FILE)) {
        fs.writeFileSync(
            RETURNS_FILE,
            "[]",
            "utf-8"
        );

        console.log(
            "[Returns] returns.json created:"
        );

        console.log(
            RETURNS_FILE
        );
    }
}


// ============================================================
// Load Returns
// ============================================================

function loadReturns() {
    ensureReturnsFile();

    try {
        const data = fs.readFileSync(
            RETURNS_FILE,
            "utf-8"
        );

        if (!data.trim()) {
            return [];
        }

        const parsed = JSON.parse(data);

        return Array.isArray(parsed)
            ? parsed
            : [];
    } catch (error) {
        console.error(
            "[Returns] Load error:",
            error
        );

        return [];
    }
}


// ============================================================
// Save Returns
// ============================================================

function saveReturns(returns) {
    ensureReturnsFile();

    try {
        fs.writeFileSync(
            RETURNS_FILE,
            JSON.stringify(
                returns,
                null,
                4
            ),
            "utf-8"
        );

        return true;
    } catch (error) {
        console.error(
            "[Returns] Save error:",
            error
        );

        return false;
    }
}


// ============================================================
// Find Sale
// ============================================================

function findSale(identifier) {
    const saleService =
        require("./sale.service");

    const sales =
        saleService.getAllSales();

    if (!Array.isArray(sales)) {
        return null;
    }

    const search =
        String(identifier || "")
            .trim()
            .toLowerCase();

    if (!search) {
        return null;
    }

    return sales.find(sale => {
        return (
            String(
                sale.invoiceLabel || ""
            ).toLowerCase() === search ||

            String(
                sale.invoiceNumber || ""
            ).toLowerCase() === search ||

            String(
                sale.id || ""
            ).toLowerCase() === search
        );
    }) || null;
}


// ============================================================
// Get Sale For Return
// Attaches available-for-return quantity to each item.
// ============================================================

function getSaleForReturn(identifier) {

    const sale = findSale(identifier);

    if (!sale) {
        return {
            success: false,
            message:
                "Invoice not found."
        };
    }

    if (sale.voided) {
        return {
            success: false,
            message:
                "This sale has already been voided."
        };
    }

    // --------------------------------------------------------
    // Attach available-for-return quantity to each item.
    // --------------------------------------------------------

    const items = (sale.items || []).map(item => {

        const sold =
            Number(item.qty) || 0;

        const alreadyReturned =
            getReturnedQuantity(
                sale.id,
                item.id
            );

        return {
            ...item,

            qty: sold,

            alreadyReturned,

            availableForReturn:
                Math.max(
                    0,
                    sold - alreadyReturned
                )
        };
    });

    // --------------------------------------------------------
    // Detect fully-returned invoices.
    // --------------------------------------------------------

    const fullyReturned =
        items.length > 0 &&
        items.every(
            item =>
                item.availableForReturn === 0
        );

    return {
        success: true,

        fullyReturned,

        sale: {
            ...sale,
            items
        }
    };
}


// ============================================================
// Get Previous Returns For Sale
// ============================================================

function getReturnsBySale(saleId) {
    const returns =
        loadReturns();

    return returns.filter(
        item =>
            item.saleId === saleId
    );
}


// ============================================================
// Calculate Already Returned Quantity
// ============================================================

function getReturnedQuantity(
    saleId,
    productId
) {
    const returns =
        getReturnsBySale(
            saleId
        );

    return returns.reduce(
        (total, returnRecord) => {
            if (
                returnRecord.status ===
                    "cancelled"
            ) {
                return total;
            }

            const item =
                returnRecord.items?.find(
                    returnItem =>
                        returnItem.productId ===
                        productId
                );

            return (
                total +
                Number(
                    item?.quantity || 0
                )
            );
        },
        0
    );
}


// ============================================================
// Calculate Return
// ============================================================

function calculateReturn(
    saleId,
    items
) {
    const saleService =
        require("./sale.service");

    const sales =
        saleService.getAllSales();

    const sale =
        sales.find(
            item =>
                item.id === saleId
        );

    if (!sale) {
        return {
            success: false,
            message:
                "Sale not found."
        };
    }

    if (sale.voided) {
        return {
            success: false,
            message:
                "Cannot return a voided sale."
        };
    }

    if (
        !Array.isArray(items) ||
        items.length === 0
    ) {
        return {
            success: false,
            message:
                "No return items selected."
        };
    }

    let subtotal = 0;

    const returnItems = [];

    for (const requested of items) {
        const saleItem =
            sale.items?.find(
                item =>
                    item.id ===
                    requested.productId ||
                    item.id ===
                    requested.id
            );

        if (!saleItem) {
            return {
                success: false,
                message:
                    "Product was not found in this invoice."
            };
        }

        const quantity =
            Number(
                requested.quantity ??
                requested.qty
            );

        if (
            !Number.isFinite(quantity) ||
            quantity <= 0
        ) {
            return {
                success: false,
                message:
                    `Invalid return quantity for ${saleItem.name}.`
            };
        }

        const alreadyReturned =
            getReturnedQuantity(
                sale.id,
                saleItem.id
            );

        const originalQuantity =
            Number(
                saleItem.qty
            );

        const remaining =
            Math.max(
                originalQuantity -
                alreadyReturned,
                0
            );

        if (
            quantity >
            remaining
        ) {
            return {
                success: false,
                message:
                    `saleItem.name:only{saleItem.name}: onlysaleItem.name:only{remaining} item(s) can be returned.`
            };
        }

        const price =
            Number(
                saleItem.price
            ) || 0;

        const lineTotal =
            price * quantity;

        subtotal += lineTotal;

        returnItems.push({
            productId:
                saleItem.id,

            name:
                saleItem.name,

            sku:
                saleItem.sku || "",

            barcode:
                saleItem.barcode || "",

            price,

            quantity,

            total:
                lineTotal
        });
    }

    // --------------------------------------------------------
    // Calculate VAT proportionally.
    // --------------------------------------------------------

    const originalSubtotal =
        Number(
            sale.subtotal
        ) || 0;

    const originalTax =
        Number(
            sale.tax
        ) || 0;

    let tax = 0;

    if (
        originalSubtotal > 0 &&
        originalTax > 0
    ) {
        tax =
            subtotal *
            (
                originalTax /
                originalSubtotal
            );
    }

    const total =
        subtotal + tax;

    return {
        success: true,

        saleId:
            sale.id,

        invoiceNumber:
            sale.invoiceNumber,

        invoiceLabel:
            sale.invoiceLabel,

        items:
            returnItems,

        subtotal:
            Number(
                subtotal.toFixed(2)
            ),

        tax:
            Number(
                tax.toFixed(2)
            ),

        total:
            Number(
                total.toFixed(2)
            )
    };
}


// ============================================================
// Create Return
// ============================================================

function createReturn(returnData) {
    const {
        saleId,
        items,
        reason,
        userId,
        username
    } = returnData || {};

    if (!saleId) {
        return {
            success: false,
            message:
                "Sale ID is required."
        };
    }

    const calculation =
        calculateReturn(
            saleId,
            items
        );

    if (!calculation.success) {
        return calculation;
    }

    const returns =
        loadReturns();

    const returnNumber =
        returns.reduce(
            (max, item) => {
                return Math.max(
                    max,
                    Number(
                        item.returnNumber
                    ) || 0
                );
            },
            0
        ) + 1;

    const returnRecord = {
        id:
            crypto.randomUUID(),

        returnNumber,

        returnLabel:
            `RET-${String(
                returnNumber
            ).padStart(6, "0")}`,

        saleId:
            calculation.saleId,

        invoiceNumber:
            calculation.invoiceNumber,

        invoiceLabel:
            calculation.invoiceLabel,

        items:
            calculation.items,

        subtotal:
            calculation.subtotal,

        tax:
            calculation.tax,

        total:
            calculation.total,

        reason:
            reason?.trim() || "",

        userId:
            userId || null,

        username:
            username || null,

        status:
            "completed",

        createdAt:
            new Date().toISOString()
    };

    returns.push(
        returnRecord
    );

    if (
        !saveReturns(
            returns
        )
    ) {
        return {
            success: false,
            message:
                "Failed to save return."
        };
    }

    // --------------------------------------------------------
    // Restore returned quantities to stock.
    // Reads each product once by ID (no full-file reloads).
    // --------------------------------------------------------

    const productService =
        require(
            "./product.service"
        );

    for (
        const item of
        calculation.items
    ) {
        const product =
            productService.getProductById(
                item.productId
            );

        if (!product) {
            console.error(
                "[Returns] Product not found while restoring stock:",
                item.productId
            );

            continue;
        }

        const currentQuantity =
            Number(
                product.quantity
            ) || 0;

        const returnedQuantity =
            Number(
                item.quantity
            ) || 0;

        const result =
            productService.updateProduct(
                item.productId,
                {
                    quantity:
                        currentQuantity +
                        returnedQuantity
                }
            );

        if (!result.success) {
            console.error(
                "[Returns] Failed to restore stock:",
                item.productId
            );
        }
    }

    console.log(
        "[Returns] Return created:",
        returnRecord.returnLabel
    );

    return {
        success: true,
        return:
            returnRecord
    };
}


// ============================================================
// Get All Returns
// ============================================================

function getAllReturns() {
    return loadReturns();
}


// ============================================================
// Get Returns For Sale
// ============================================================

function getSaleReturns(
    saleIdentifier
) {
    const sale =
        findSale(
            saleIdentifier
        );

    if (!sale) {
        return {
            success: false,
            message:
                "Sale not found."
        };
    }

    return {
        success: true,
        returns:
            getReturnsBySale(
                sale.id
            )
    };
}


// ============================================================
// Initialize Storage
// IMPORTANT:
// This runs as soon as returns.service.js is loaded.
// ============================================================

ensureReturnsFile();


// ============================================================
// Export
// ============================================================

module.exports = {
    getSaleForReturn,
    calculateReturn,
    createReturn,
    getAllReturns,
    getReturnsBySale,
    getSaleReturns
};
