// ============================================================
// ThreeMarket POS - Sale Service
// Records completed sales and provides reporting.
// Supports Cash, Card, Other and Split Payments.
// VAT is read from persistent application settings.
// Each sale stores a VAT snapshot so old invoices never change.
// ============================================================

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const settingsService = require("./settings.service");

// ============================================================
// Configuration
// ============================================================

const DATA_DIR = path.join(__dirname, "../../data");
const SALES_FILE = path.join(DATA_DIR, "sales.json");

// ============================================================
// Helpers
// ============================================================

function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

function loadSales() {
    ensureDataDir();

    if (!fs.existsSync(SALES_FILE)) {
        return [];
    }

    try {
        const data = fs.readFileSync(SALES_FILE, "utf-8");
        const parsed = JSON.parse(data);

        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error("[Sale] Load error:", error);
        return [];
    }
}

function saveSales(sales) {
    ensureDataDir();

    try {
        fs.writeFileSync(
            SALES_FILE,
            JSON.stringify(sales, null, 4),
            "utf-8"
        );

        return true;
    } catch (error) {
        console.error("[Sale] Save error:", error);
        return false;
    }
}

function getNextInvoiceNumber(sales) {
    const maxNumber = sales.reduce((max, sale) => {
        return sale.invoiceNumber &&
            sale.invoiceNumber > max
            ? sale.invoiceNumber
            : max;
    }, 0);

    return maxNumber + 1;
}

function formatInvoiceNumber(num) {
    return `INV-${String(num).padStart(6, "0")}`;
}

// ============================================================
// VAT Settings
// Reads the persistent VAT configuration.
// IMPORTANT:
// VAT is calculated here on the backend so the final sale
// cannot depend on a hard-coded 14% value in the renderer.
// ============================================================

function getCurrentTaxSettings() {
    const DEFAULT_SETTINGS = {
        vatEnabled: false,
        vatRate: 14
    };

    try {
        if (
            settingsService &&
            typeof settingsService.getTaxSettings === "function"
        ) {
            const result = settingsService.getTaxSettings();

            // Support both:
            // { vatEnabled, vatRate }
            // and
            // { success: true, settings: { vatEnabled, vatRate } }
            const settings = result?.settings || result || {};

            const vatEnabled = Boolean(
                settings.vatEnabled
            );

            let vatRate = Number(
                settings.vatRate
            );

            if (!Number.isFinite(vatRate)) {
                vatRate = DEFAULT_SETTINGS.vatRate;
            }

            vatRate = Math.max(
                0,
                Math.min(vatRate, 100)
            );

            return {
                vatEnabled,
                vatRate
            };
        }
    } catch (error) {
        console.error(
            "[Sale] Failed to load VAT settings:",
            error
        );
    }

    return {
        ...DEFAULT_SETTINGS
    };
}

// ============================================================
// Calculate Sale Totals
// VAT is calculated after discount.
// Example:
// Subtotal = 1000
// Discount = 100
// Taxable = 900
// VAT 14% = 126
// Total = 1026
// ============================================================

function calculateSaleTotals(
    subtotal,
    discount
) {
    const taxSettings = getCurrentTaxSettings();

    const safeSubtotal = Math.max(
        0,
        Number(subtotal) || 0
    );

    const safeDiscount = Math.max(
        0,
        Math.min(
            Number(discount) || 0,
            safeSubtotal
        )
    );

    const taxableAmount =
        safeSubtotal -
        safeDiscount;

    const vatAmount =
        taxSettings.vatEnabled
            ? taxableAmount *
              (taxSettings.vatRate / 100)
            : 0;

    const total =
        taxableAmount +
        vatAmount;

    return {
        subtotal: Number(
            safeSubtotal.toFixed(2)
        ),
        discount: Number(
            safeDiscount.toFixed(2)
        ),
        taxableAmount: Number(
            taxableAmount.toFixed(2)
        ),
        tax: Number(
            vatAmount.toFixed(2)
        ),
        total: Number(
            total.toFixed(2)
        ),
        vatEnabled:
            taxSettings.vatEnabled,
        vatRate:
            taxSettings.vatRate
    };
}

// ============================================================
// Validate Split Payment
// ============================================================

function validateSplitPayment(
    payments,
    total
) {
    if (
        !Array.isArray(payments) ||
        payments.length === 0
    ) {
        return {
            success: false,
            message:
                "Split payment requires at least one payment method."
        };
    }

    const validMethods = [
        "cash",
        "card",
        "other"
    ];

    for (const payment of payments) {
        if (
            !validMethods.includes(
                payment.method
            )
        ) {
            return {
                success: false,
                message:
                    `Invalid payment method: ${payment.method}`
            };
        }

        const amount =
            Number(payment.amount);

        if (
            !Number.isFinite(amount) ||
            amount <= 0
        ) {
            return {
                success: false,
                message:
                    "Invalid split payment amount."
            };
        }
    }

    const paidTotal =
        payments.reduce(
            (sum, payment) =>
                sum +
                Number(payment.amount),
            0
        );

    const cashTotal =
        payments
            .filter(
                payment =>
                    payment.method === "cash"
            )
            .reduce(
                (sum, payment) =>
                    sum +
                    Number(payment.amount),
                0
            );

    const nonCashTotal =
        payments
            .filter(
                payment =>
                    payment.method !== "cash"
            )
            .reduce(
                (sum, payment) =>
                    sum +
                    Number(payment.amount),
                0
            );

    if (
        paidTotal <
        total - 0.01
    ) {
        return {
            success: false,
            message:
                `Insufficient payment. Remaining: ${(total - paidTotal).toFixed(2)}`
        };
    }

    const requiredCash =
        Math.max(
            total -
            nonCashTotal,
            0
        );

    const change =
        Math.max(
            cashTotal -
            requiredCash,
            0
        );

    if (
        paidTotal >
        total + 0.01 &&
        cashTotal <= 0
    ) {
        return {
            success: false,
            message:
                "Overpayment is only allowed when cash is included."
        };
    }

    return {
        success: true,
        paidTotal,
        cashTotal,
        nonCashTotal,
        requiredCash,
        change
    };
}

// ============================================================
// Create Sale
// IMPORTANT:
// The VAT sent by sales.js is NOT trusted.
// The backend calculates VAT from persistent Settings.
// ============================================================

function createSale(saleData) {
    const {
        items,
        subtotal,
        discount,
        paymentMethod,
        cashReceived,
        userId,
        username
    } = saleData;

    // --------------------------------------------------------
    // Basic validation
    // --------------------------------------------------------

    if (
        !Array.isArray(items) ||
        items.length === 0
    ) {
        return {
            success: false,
            message:
                "Sale must include at least one item."
        };
    }

    // --------------------------------------------------------
    // Calculate the final totals from Settings
    // --------------------------------------------------------

    const calculatedTotals =
        calculateSaleTotals(
            subtotal,
            discount
        );

    const finalSubtotal =
        calculatedTotals.subtotal;

    const finalDiscount =
        calculatedTotals.discount;

    const finalTaxableAmount =
        calculatedTotals.taxableAmount;

    const finalTax =
        calculatedTotals.tax;

    const finalTotal =
        calculatedTotals.total;

    // --------------------------------------------------------
    // Validate payment
    // --------------------------------------------------------

    let validatedChange = 0;

    let validatedCashReceived =
        cashReceived != null
            ? Number(cashReceived)
            : null;

    if (
        paymentMethod === "split"
    ) {
        const validation =
            validateSplitPayment(
                saleData.payments,
                finalTotal
            );

        if (!validation.success) {
            return validation;
        }

        validatedChange =
            validation.change;

        validatedCashReceived =
            validation.cashTotal > 0
                ? validation.cashTotal
                : null;
    }

    else if (
        paymentMethod === "cash"
    ) {
        if (
            !Number.isFinite(
                validatedCashReceived
            )
        ) {
            return {
                success: false,
                message:
                    "Invalid cash received amount."
            };
        }

        if (
            validatedCashReceived <
            finalTotal
        ) {
            return {
                success: false,
                message:
                    `Insufficient cash. Remaining: ${(finalTotal - validatedCashReceived).toFixed(2)}`
            };
        }

        validatedChange =
            Math.max(
                validatedCashReceived -
                finalTotal,
                0
            );
    }

    else if (
        paymentMethod === "card" ||
        paymentMethod === "other"
    ) {
        validatedCashReceived = null;
        validatedChange = 0;
    }

    else {
        return {
            success: false,
            message:
                `Invalid payment method: ${paymentMethod}`
        };
    }

    // --------------------------------------------------------
    // Verify stock
    // --------------------------------------------------------

    const productService =
        require("./product.service");

    const allProducts =
        productService.getAllProducts();

    for (const item of items) {
        const product =
            allProducts.find(
                p =>
                    p.id === item.id
            );

        if (!product) {
            return {
                success: false,
                message:
                    `Product not found: ${item.name}`
            };
        }

        if (
            Number(product.quantity) <
            Number(item.qty)
        ) {
            return {
                success: false,
                message:
                    `Not enough stock for ${item.name}. Available: ${product.quantity}`
            };
        }
    }

    // --------------------------------------------------------
    // Invoice
    // --------------------------------------------------------

    const sales =
        loadSales();

    const invoiceNumber =
        getNextInvoiceNumber(
            sales
        );

    // --------------------------------------------------------
    // Normalize payments
    // --------------------------------------------------------

    const normalizedPayments =
        Array.isArray(
            saleData.payments
        )
            ? saleData.payments
                .filter(
                    payment =>
                        Number(
                            payment.amount
                        ) > 0
                )
                .map(
                    payment => ({
                        method:
                            payment.method,
                        amount:
                            Number(
                                Number(
                                    payment.amount
                                ).toFixed(2)
                            )
                    })
                )
            : null;

    // --------------------------------------------------------
    // Create Sale Record
    //
    // VAT snapshot is stored here.
    // This protects historical invoices if VAT settings
    // are changed later.
    // --------------------------------------------------------

    const newSale = {
        id:
            crypto.randomUUID(),

        invoiceNumber,

        invoiceLabel:
            formatInvoiceNumber(
                invoiceNumber
            ),

        items,

        subtotal:
            finalSubtotal,

        discount:
            finalDiscount,

        taxableAmount:
            finalTaxableAmount,

        // ----------------------------------------------------
        // VAT Snapshot
        // ----------------------------------------------------

        vatEnabled:
            calculatedTotals.vatEnabled,

        vatRate:
            calculatedTotals.vatRate,

        tax:
            finalTax,

        vatAmount:
            finalTax,

        total:
            finalTotal,

        paymentMethod:
            paymentMethod || "cash",

        cashReceived:
            validatedCashReceived,

        change:
            Number(
                validatedChange.toFixed(2)
            ),

        payments:
            normalizedPayments,

        userId:
            userId || null,

        username:
            username || null,

        note:
            saleData.note ||
            null,

        createdAt:
            new Date().toISOString()
    };

    // --------------------------------------------------------
    // Save sale
    // --------------------------------------------------------

    sales.push(
        newSale
    );

    if (
        !saveSales(
            sales
        )
    ) {
        return {
            success: false,
            message:
                "Failed to save sale."
        };
    }

    // --------------------------------------------------------
    // Deduct stock
    // --------------------------------------------------------

    items.forEach(
        item => {
            const product =
                allProducts.find(
                    p =>
                        p.id === item.id
                );

            if (product) {
                const newQuantity =
                    Number(
                        product.quantity
                    ) -
                    Number(
                        item.qty
                    );

                const updateResult =
                    productService.updateProduct(
                        item.id,
                        {
                            quantity:
                                Math.max(
                                    newQuantity,
                                    0
                                )
                        }
                    );

                if (
                    !updateResult.success
                ) {
                    console.error(
                        `[Sale] Failed to update stock for ${item.name} after sale ${newSale.id}`
                    );
                }
            }
        }
    );

    console.log(
        "[Sale] Sale created:",
        {
            invoice:
                newSale.invoiceLabel,
            subtotal:
                newSale.subtotal,
            discount:
                newSale.discount,
            vatEnabled:
                newSale.vatEnabled,
            vatRate:
                newSale.vatRate,
            vatAmount:
                newSale.vatAmount,
            total:
                newSale.total
        }
    );

    return {
        success: true,
        sale: newSale
    };
}

// ============================================================
// Get All Sales
// ============================================================

function getAllSales() {
    return loadSales();
}

// ============================================================
// Get Today's Summary
// ============================================================

function getTodaySummary() {
    const sales =
        loadSales();

    const today =
        new Date().toDateString();

    const todaySales =
        sales.filter(
            sale =>
                !sale.voided &&
                new Date(
                    sale.createdAt
                ).toDateString() ===
                today
        );

    const totalSales =
        todaySales.reduce(
            (sum, sale) =>
                sum +
                Number(
                    sale.total
                ),
            0
        );

    const totalVAT =
        todaySales.reduce(
            (sum, sale) =>
                sum +
                Number(
                    sale.vatAmount ??
                    sale.tax ??
                    0
                ),
            0
        );

    const totalTransactions =
        todaySales.length;

    return {
        totalSales:
            Number(
                totalSales.toFixed(2)
            ),

        totalVAT:
            Number(
                totalVAT.toFixed(2)
            ),

        totalTransactions
    };
}

// ============================================================
// Top Products
// ============================================================

function getTopProductsInRange(
    fromDateString,
    toDateString,
    limit = 5
) {
    const sales =
        loadSales();

    const today =
        new Date()
            .toISOString()
            .slice(0, 10);

    const fromDate =
        new Date(
            fromDateString ||
            today
        );

    const toDate =
        new Date(
            toDateString ||
            today
        );

    toDate.setHours(
        23,
        59,
        59,
        999
    );

    fromDate.setHours(
        0,
        0,
        0,
        0
    );

    const matchingSales =
        sales.filter(
            sale => {
                const saleDate =
                    new Date(
                        sale.createdAt
                    );

                return (
                    !sale.voided &&
                    saleDate >= fromDate &&
                    saleDate <= toDate
                );
            }
        );

    const productTotals = {};

    matchingSales.forEach(
        sale => {
            sale.items.forEach(
                item => {
                    if (
                        !productTotals[
                            item.id
                        ]
                    ) {
                        productTotals[
                            item.id
                        ] = {
                            id:
                                item.id,

                            name:
                                item.name,

                            qty: 0,

                            revenue: 0
                        };
                    }

                    productTotals[
                        item.id
                    ].qty +=
                        Number(
                            item.qty
                        );

                    productTotals[
                        item.id
                    ].revenue +=
                        Number(
                            item.qty
                        ) *
                        Number(
                            item.price
                        );
                }
            );
        }
    );

    return Object.values(
        productTotals
    )
        .sort(
            (a, b) =>
                b.qty -
                a.qty
        )
        .slice(
            0,
            limit
        );
}

// ============================================================
// Void Last Sale
// ============================================================

function voidLastSale(
    userId,
    username
) {
    const sales =
        loadSales();

    const activeSales =
        sales.filter(
            sale =>
                !sale.voided
        );

    if (
        activeSales.length === 0
    ) {
        return {
            success: false,
            message:
                "No sale to void."
        };
    }

    const lastSale =
        activeSales[
            activeSales.length - 1
        ];

    const index =
        sales.findIndex(
            sale =>
                sale.id ===
                lastSale.id
        );

    if (index === -1) {
        return {
            success: false,
            message:
                "Sale not found."
        };
    }

    // --------------------------------------------------------
    // Restore stock
    // --------------------------------------------------------

    const productService =
        require("./product.service");

    const allProducts =
        productService.getAllProducts();

    lastSale.items.forEach(
        item => {
            const product =
                allProducts.find(
                    p =>
                        p.id === item.id
                );

            if (product) {
                const restoredQuantity =
                    Number(
                        product.quantity
                    ) +
                    Number(
                        item.qty
                    );

                productService.updateProduct(
                    item.id,
                    {
                        quantity:
                            restoredQuantity
                    }
                );
            }
        }
    );

    // --------------------------------------------------------
    // Mark sale voided
    // --------------------------------------------------------

    sales[index] = {
        ...lastSale,

        voided: true,

        voidedAt:
            new Date().toISOString(),

        voidedBy:
            username ||
            null,

        voidedByUserId:
            userId ||
            null
    };

    if (
        !saveSales(
            sales
        )
    ) {
        return {
            success: false,
            message:
                "Failed to void sale."
        };
    }

    return {
        success: true,
        sale:
            sales[index]
    };
}

// ============================================================
// Get Last Active Sale
// ============================================================

function getLastActiveSale() {
    const sales =
        loadSales();

    const activeSales =
        sales.filter(
            sale =>
                !sale.voided
        );

    return activeSales.length > 0
        ? activeSales[
            activeSales.length - 1
        ]
        : null;
}

// ============================================================
// Export
// ============================================================

module.exports = {
    createSale,
    getAllSales,
    getTodaySummary,
    getTopProductsInRange,
    voidLastSale,
    getLastActiveSale
};