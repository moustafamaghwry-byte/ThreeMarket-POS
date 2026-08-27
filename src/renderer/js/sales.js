// ============================================================
// ThreeMarket POS - Sales Page
// Complete sales workflow with persistent VAT settings,
// split payments, held orders, barcode scanning and receipts.
// ============================================================

import { loadTranslations, toggleLanguage, getTranslation } from "./i18n.js";
import { loadAppShell } from "./component-loader.js";
import { initializeNavigation, applyRoleBasedAccess, checkRedirectLoop } from "./navigation.js";
import permissionsConfig from "../config/permissions.config.json";

// ============================================================
// State
// ============================================================

let allProducts = [];
let cart = [];
let discountType = "percent";
let storeInfo = null;

let vatEnabled = false;
let vatRate = 14;

let lastReceiptHTML = "";
let heldOrders = JSON.parse(
    localStorage.getItem("tm_held_orders") || "[]"
);

let splitPayments = [];
let isSplitPayment = false;

// ============================================================
// Initialization
// ============================================================

async function initializeSales() {
    console.log("[SALES] Starting initialization...");

    try {
        const session = await window.api.getSession();

        if (!session) {
            window.location.href = "/";
            return;
        }

        if (session.role === "administrator") {
            session.role = "admin";
        }

        await loadAppShell();

        const rolePerms =
            session.permissions ||
            permissionsConfig.rolePresets[session.role] ||
            {};

        if (!rolePerms.sales || rolePerms.sales === "none") {
            const fallback =
                permissionsConfig.allPages.find(
                    page =>
                        rolePerms[page] &&
                        rolePerms[page] !== "none"
                ) || "dashboard";

            if (checkRedirectLoop()) {
                return;
            }

            window.location.href =
                `/pages/${fallback}.html`;

            return;
        }

        const usernameEl =
            document.getElementById("currentUsername");

        const roleEl =
            document.getElementById("currentRole");

        if (usernameEl) {
            usernameEl.textContent = session.username;
        }

        if (roleEl) {
            roleEl.textContent = session.role;
        }

        await loadTranslations();

        // Load global VAT configuration before calculating totals.
        await loadTaxSettings();

        initializeNavigation();
        applyRoleBasedAccess(session);

        document
            .getElementById("languageButton")
            ?.addEventListener("click", async () => {
                await toggleLanguage();

                renderCatalog(allProducts);
                updateCartDisplay();

                if (isSplitPayment) {
                    updateSplitPaymentDisplay();
                }
            });

        document
            .getElementById("logoutButton")
            ?.addEventListener("click", async () => {
                await window.api.logout();
                window.location.href = "/";
            });

        try {
            storeInfo =
                await window.api.getStoreInfo();
        } catch (error) {
            console.error(
                "[SALES] Failed to load store info:",
                error
            );

            storeInfo = null;
        }

        await loadProducts();

        setupEventListeners();

        updateHeldCount();

        console.log(
            "[SALES] VAT:",
            vatEnabled ? "ON" : "OFF",
            "Rate:",
            vatRate
        );

        console.log(
            "[SALES] Initialization completed."
        );

    } catch (error) {
        console.error(
            "[SALES] Initialization error:",
            error
        );
    }
}

// ============================================================
// VAT Settings
// Loads persistent VAT settings from Electron.
// ============================================================

async function loadTaxSettings() {
    try {
        if (
            !window.api ||
            typeof window.api.getTaxSettings !== "function"
        ) {
            console.error(
                "[SALES] getTaxSettings API is unavailable."
            );

            vatEnabled = false;
            vatRate = 14;
            return;
        }

        const result =
            await window.api.getTaxSettings();

        console.log(
            "[SALES] Tax settings:",
            result
        );

        if (
            result?.success &&
            result.settings
        ) {
            vatEnabled =
                Boolean(
                    result.settings.vatEnabled
                );

            vatRate =
                Number(
                    result.settings.vatRate
                );

            if (!Number.isFinite(vatRate)) {
                vatRate = 14;
            }

            vatRate =
                Math.max(
                    0,
                    Math.min(vatRate, 100)
                );

        } else {
            vatEnabled = false;
            vatRate = 14;
        }

    } catch (error) {
        console.error(
            "[SALES] Failed to load VAT settings:",
            error
        );

        vatEnabled = false;
        vatRate = 14;
    }
}

// ============================================================
// Products
// ============================================================

async function loadProducts() {
    try {
        const result =
            await window.api.getProducts();

        allProducts =
            (
                Array.isArray(result)
                    ? result
                    : []
            ).filter(
                product =>
                    product.active !== false
            );

        renderCatalog(allProducts);

    } catch (error) {
        console.error(
            "[SALES] Failed to load products:",
            error
        );

        allProducts = [];
    }
}

// ============================================================
// Product Catalog
// ============================================================

function renderCatalog(productList) {
    const grid =
        document.getElementById(
            "catalogGrid"
        );

    if (!grid) {
        return;
    }

    grid.innerHTML = "";

    productList.forEach(product => {
        const item =
            document.createElement("div");

        item.className =
            "catalog-item";

        item.dataset.id =
            product.id;

        item.innerHTML = `
            <div class="catalog-item-name">
                ${escapeHtml(product.name)}
            </div>

            <div class="catalog-item-meta">
                ${escapeHtml(product.sku || "")}
                ·
                ${getTranslation("sales.qty")}:
                ${product.quantity}
                ${product.uom || "pcs"}
            </div>

            <div class="catalog-item-price">
                ${Number(product.price).toFixed(2)}
                <span style="font-size:11px;opacity:.7;">
                    / ${product.uom || "pcs"}
                </span>
            </div>
        `;

        item.addEventListener(
            "click",
            () => addToCart(product)
        );

        grid.appendChild(item);
    });
}

// ============================================================
// Cart
// ============================================================

function addToCart(product) {
    const existing =
        cart.find(
            item =>
                item.id === product.id
        );

    const currentQty =
        existing
            ? existing.qty
            : 0;

    const availableStock =
        Number(product.quantity);

    if (
        currentQty + 1 >
        availableStock
    ) {
        alert(
            `${getTranslation(
                "sales.outOfStock"
            )}: ${product.name} ` +
            `(${getTranslation(
                "sales.available"
            )}: ${availableStock})`
        );

        return;
    }

    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: Number(product.price),
            qty: 1,
            uom: product.uom || "pcs"
        });
    }

    updateCartDisplay();
}

// ============================================================
// Change Quantity
// ============================================================

function changeQty(id, delta) {
    const item =
        cart.find(
            i => i.id === id
        );

    if (!item) {
        return;
    }

    if (delta > 0) {
        const product =
            allProducts.find(
                p => p.id === id
            );

        const availableStock =
            product
                ? Number(product.quantity)
                : Infinity;

        if (
            item.qty + delta >
            availableStock
        ) {
            alert(
                `${getTranslation(
                    "sales.outOfStock"
                )}: ${item.name} ` +
                `(${getTranslation(
                    "sales.available"
                )}: ${availableStock})`
            );

            return;
        }
    }

    item.qty += delta;

    if (item.qty <= 0) {
        cart =
            cart.filter(
                i => i.id !== id
            );
    }

    updateCartDisplay();
}

// ============================================================
// Remove Item
// ============================================================

function removeFromCart(id) {
    cart =
        cart.filter(
            item => item.id !== id
        );

    updateCartDisplay();
}

// ============================================================
// Clear Cart
// ============================================================

function clearCart() {
    cart = [];

    const discountInput =
        document.getElementById(
            "discountValue"
        );

    if (discountInput) {
        discountInput.value = "0";
    }

    updateCartDisplay();
}

// ============================================================
// Calculate Totals
// VAT is calculated only when enabled in Settings.
// ============================================================

function calculateTotals() {
    const subtotal =
        cart.reduce(
            (sum, item) =>
                sum +
                item.price *
                item.qty,
            0
        );

    const discountInput =
        document.getElementById(
            "discountValue"
        );

    const rawDiscount =
        discountInput
            ? parseFloat(
                normalizeNumberInput(
                    discountInput.value
                )
            ) || 0
            : 0;

    let discountAmount =
        discountType === "percent"
            ? subtotal *
              (rawDiscount / 100)
            : rawDiscount;

    discountAmount =
        Math.max(
            0,
            Math.min(
                discountAmount,
                subtotal
            )
        );

    const taxableAmount =
        subtotal -
        discountAmount;

    // Apply VAT only when enabled.
    const tax =
        vatEnabled
            ? taxableAmount *
              (vatRate / 100)
            : 0;

    const total =
        taxableAmount +
        tax;

    return {
        subtotal,
        discountAmount,
        taxableAmount,
        tax,
        total,
        vatEnabled,
        vatRate
    };
}

// ============================================================
// Update Cart Display
// ============================================================

function updateCartDisplay() {
    const cartItemsEl =
        document.getElementById(
            "cartItems"
        );

    const cartEmptyEl =
        document.getElementById(
            "cartEmpty"
        );

    const checkoutBtn =
        document.getElementById(
            "checkoutBtn"
        );

    if (!cartItemsEl) {
        return;
    }

    if (!cart.length) {
        cartItemsEl.innerHTML = "";

        if (cartEmptyEl) {
            cartEmptyEl.style.display =
                "flex";
        }

        if (checkoutBtn) {
            checkoutBtn.disabled =
                true;
        }

    } else {
        if (cartEmptyEl) {
            cartEmptyEl.style.display =
                "none";
        }

        if (checkoutBtn) {
            checkoutBtn.disabled =
                false;
        }

        cartItemsEl.innerHTML =
            cart.map(item => `
                <div
                    class="cart-item"
                    data-id="${item.id}"
                >
                    <div class="cart-item-info">
                        <div class="cart-item-name">
                            ${escapeHtml(item.name)}
                        </div>

                        <div class="cart-item-price">
                            ${item.price.toFixed(2)}
                            ${getTranslation(
                                "sales.each"
                            )}
                            ·
                            ${item.uom || "pcs"}
                        </div>
                    </div>

                    <div class="cart-item-qty">
                        <button
                            type="button"
                            class="qty-btn"
                            data-action="dec"
                            data-id="${item.id}"
                        >
                            −
                        </button>

                        <span class="qty-value">
                            ${item.qty}
                        </span>

                        <button
                            type="button"
                            class="qty-btn"
                            data-action="inc"
                            data-id="${item.id}"
                        >
                            +
                        </button>
                    </div>

                    <div class="cart-item-total">
                        ${(item.price * item.qty).toFixed(2)}
                    </div>

                    <button
                        type="button"
                        class="cart-item-remove"
                        data-action="remove"
                        data-id="${item.id}"
                    >
                        ×
                    </button>
                </div>
            `).join("");
    }

    const {
        subtotal,
        discountAmount,
        tax,
        total
    } = calculateTotals();

    const subtotalEl =
        document.getElementById(
            "subtotal"
        );

    const taxEl =
        document.getElementById(
            "tax"
        );

    const totalEl =
        document.getElementById(
            "total"
        );

    const checkoutTotalEl =
        document.getElementById(
            "checkoutTotal"
        );

    if (subtotalEl) {
        subtotalEl.textContent =
            subtotal.toFixed(2);
    }

    if (taxEl) {
        taxEl.textContent =
            tax.toFixed(2);
    }

    if (totalEl) {
        totalEl.textContent =
            total.toFixed(2);
    }

    if (checkoutTotalEl) {
        checkoutTotalEl.textContent =
            total.toFixed(2);
    }

    const discountRow =
        document.getElementById(
            "discountRow"
        );

    const discountAmountEl =
        document.getElementById(
            "discountAmount"
        );

    if (
        discountRow &&
        discountAmountEl
    ) {
        if (discountAmount > 0) {
            discountRow.style.display =
                "flex";

            discountAmountEl.textContent =
                `-${discountAmount.toFixed(2)}`;
        } else {
            discountRow.style.display =
                "none";
        }
    }

    // Keep split payment display synchronized.
    if (isSplitPayment) {
        updateSplitPaymentDisplay();
    }
}

// ============================================================
// Event Listeners
// ============================================================

function setupEventListeners() {
    document
        .getElementById("catalogGrid")
        ?.addEventListener(
            "click",
            () => {
                setTimeout(
                    () => {
                        document
                            .getElementById(
                                "barcodeInput"
                            )
                            ?.focus();
                    },
                    50
                );
            }
        );

    document
        .getElementById(
            "barcodeInput"
        )
        ?.focus();

    document
        .getElementById("cartItems")
        ?.addEventListener(
            "click",
            event => {
                const btn =
                    event.target.closest(
                        "[data-action]"
                    );

                if (!btn) {
                    return;
                }

                const id =
                    btn.dataset.id;

                const action =
                    btn.dataset.action;

                if (action === "inc") {
                    changeQty(id, 1);
                }

                if (action === "dec") {
                    changeQty(id, -1);
                }

                if (action === "remove") {
                    removeFromCart(id);
                }
            }
        );

    document
        .getElementById(
            "clearCartBtn"
        )
        ?.addEventListener(
            "click",
            clearCart
        );

    document
        .getElementById(
            "voidLastSaleBtn"
        )
        ?.addEventListener(
            "click",
            handleVoidLastSale
        );

    document
        .getElementById(
            "holdOrderBtn"
        )
        ?.addEventListener(
            "click",
            holdCurrentOrder
        );

    document
        .getElementById(
            "heldOrdersToggle"
        )
        ?.addEventListener(
            "click",
            () => {
                const panel =
                    document.getElementById(
                        "heldOrdersPanel"
                    );

                if (!panel) {
                    return;
                }

                panel.style.display =
                    panel.style.display === "none"
                        ? "block"
                        : "none";

                renderHeldOrders();
            }
        );

    document
        .getElementById(
            "closeHeldPanel"
        )
        ?.addEventListener(
            "click",
            () => {
                const panel =
                    document.getElementById(
                        "heldOrdersPanel"
                    );

                if (panel) {
                    panel.style.display =
                        "none";
                }
            }
        );

    document
        .getElementById(
            "heldOrdersList"
        )
        ?.addEventListener(
            "click",
            event => {
                const item =
                    event.target.closest(
                        ".held-order-item"
                    );

                if (item) {
                    resumeHeldOrder(
                        Number(
                            item.dataset.id
                        )
                    );
                }
            }
        );

    document
        .getElementById(
            "catalogSearch"
        )
        ?.addEventListener(
            "input",
            event => {
                const term =
                    event.target.value
                        .trim()
                        .toLowerCase();

                const filtered =
                    allProducts.filter(
                        product =>
                            product.name
                                .toLowerCase()
                                .includes(term) ||
                            (
                                product.sku ||
                                ""
                            )
                                .toLowerCase()
                                .includes(term) ||
                            (
                                product.category ||
                                ""
                            )
                                .toLowerCase()
                                .includes(term)
                    );

                renderCatalog(
                    filtered
                );
            }
        );

    document
        .getElementById(
            "barcodeInput"
        )
        ?.addEventListener(
            "keydown",
            event => {
                if (event.key !== "Enter") {
                    return;
                }

                const value =
                    event.target.value.trim();

                if (!value) {
                    return;
                }

                const product =
                    allProducts.find(
                        p =>
                            p.barcode === value ||
                            p.sku === value
                    );

                if (product) {
                    addToCart(product);
                    playBeep(true);
                } else {
                    playBeep(false);

                    showBarcodeError(
                        getTranslation(
                            "sales.barcodeNotFound"
                        )
                    );
                }

                event.target.value = "";
            }
        );

    document
        .getElementById(
            "discountValue"
        )
        ?.addEventListener(
            "input",
            event => {
                const cleaned =
                    normalizeNumberInput(
                        event.target.value
                    );

                if (
                    cleaned !==
                    event.target.value
                ) {
                    event.target.value =
                        cleaned;
                }

                updateCartDisplay();
            }
        );

    document
        .querySelectorAll(
            ".discount-type-btn"
        )
        .forEach(button => {
            button.addEventListener(
                "click",
                () => {
                    document
                        .querySelectorAll(
                            ".discount-type-btn"
                        )
                        .forEach(btn =>
                            btn.classList.remove(
                                "active"
                            )
                        );

                    button.classList.add(
                        "active"
                    );

                    discountType =
                        button.dataset.type;

                    updateCartDisplay();
                }
            );
        });

    document
        .getElementById(
            "checkoutBtn"
        )
        ?.addEventListener(
            "click",
            openCheckoutModal
        );

    document
        .getElementById(
            "closeCheckoutModal"
        )
        ?.addEventListener(
            "click",
            closeCheckoutModal
        );

    document
        .getElementById(
            "cancelCheckoutBtn"
        )
        ?.addEventListener(
            "click",
            closeCheckoutModal
        );

    document
        .getElementById(
            "confirmCheckoutBtn"
        )
        ?.addEventListener(
            "click",
            confirmCheckout
        );

    document
        .getElementById(
            "toggleSplitBtn"
        )
        ?.addEventListener(
            "click",
            toggleSplitPayment
        );

    document
        .getElementById(
            "addPaymentBtn"
        )
        ?.addEventListener(
            "click",
            addSplitPaymentRow
        );

    document
        .querySelectorAll(
            ".pay-method"
        )
        .forEach(button => {
            button.addEventListener(
                "click",
                () => {
                    document
                        .querySelectorAll(
                            ".pay-method"
                        )
                        .forEach(btn =>
                            btn.classList.remove(
                                "active"
                            )
                        );

                    button.classList.add(
                        "active"
                    );

                    const cashWrap =
                        document.getElementById(
                            "cashReceivedWrap"
                        );

                    if (cashWrap) {
                        cashWrap.style.display =
                            button.dataset.method ===
                            "cash"
                                ? "block"
                                : "none";
                    }

                    if (
                        button.dataset.method !==
                        "cash"
                    ) {
                        const cashInput =
                            document.getElementById(
                                "cashReceived"
                            );

                        if (cashInput) {
                            cashInput.value =
                                "";
                        }

                        const changeDisplay =
                            document.getElementById(
                                "changeDisplay"
                            );

                        if (changeDisplay) {
                            changeDisplay.style.display =
                                "none";
                        }
                    }
                }
            );
        });

    document
        .querySelectorAll(
            ".quick-cash-btn"
        )
        .forEach(button => {
            button.addEventListener(
                "click",
                () => {
                    const total =
                        calculateTotals().total;

                    const action =
                        button.dataset.action;

                    const input =
                        document.getElementById(
                            "cashReceived"
                        );

                    if (!input) {
                        return;
                    }

                    if (
                        action === "exact"
                    ) {
                        input.value =
                            total.toFixed(2);
                    }

                    updateChangeDisplay();
                }
            );
        });

    document
        .getElementById(
            "cashReceived"
        )
        ?.addEventListener(
            "input",
            event => {
                const cleaned =
                    normalizeNumberInput(
                        event.target.value
                    );

                event.target.value =
                    cleaned;

                updateChangeDisplay();
            }
        );

    document
        .getElementById(
            "closeReceiptModal"
        )
        ?.addEventListener(
            "click",
            closeReceiptModal
        );

    document
        .getElementById(
            "newSaleBtn"
        )
        ?.addEventListener(
            "click",
            closeReceiptModal
        );

    document
        .getElementById(
            "printReceiptBtn"
        )
        ?.addEventListener(
            "click",
            () => {
                window.print();
            }
        );

    document
        .getElementById(
            "reprintBtn"
        )
        ?.addEventListener(
            "click",
            () => {
                if (!lastReceiptHTML) {
                    return;
                }

                const paper =
                    document.getElementById(
                        "receiptPaper"
                    );

                if (!paper) {
                    return;
                }

                paper.innerHTML =
                    lastReceiptHTML;

                window.print();
            }
        );
}

// ============================================================
// Held Orders
// ============================================================

function updateHeldCount() {
    const count =
        document.getElementById(
            "heldCount"
        );

    if (count) {
        count.textContent =
            heldOrders.length;
    }
}

function renderHeldOrders() {
    const list =
        document.getElementById(
            "heldOrdersList"
        );

    if (!list) {
        return;
    }

    if (!heldOrders.length) {
        list.innerHTML = `
            <li
                style="
                    color:var(--text-tertiary);
                    font-size:12px;
                    text-align:center;
                    padding:12px;
                "
            >
                ${getTranslation(
                    "sales.hold.noHeldOrders"
                )}
            </li>
        `;

        return;
    }

    list.innerHTML =
        heldOrders.map(
            held => {
                const total =
                    held.items.reduce(
                        (sum, item) =>
                            sum +
                            item.price *
                            item.qty,
                        0
                    );

                return `
                    <li
                        class="held-order-item"
                        data-id="${held.id}"
                    >
                        <div class="held-order-info">
                            <strong>
                                ${escapeHtml(
                                    held.name
                                )}
                            </strong>

                            <small>
                                ${held.items.length}
                                ${getTranslation(
                                    "sales.qty"
                                )}
                                ·
                                ${new Date(
                                    held.createdAt
                                ).toLocaleTimeString()}
                            </small>
                        </div>

                        <span class="held-order-total">
                            ${total.toFixed(2)}
                        </span>
                    </li>
                `;
            }
        ).join("");
}

function holdCurrentOrder() {
    if (!cart.length) {
        return;
    }

    const name =
        prompt(
            getTranslation(
                "sales.hold.customerName"
            )
        ) ||
        getTranslation(
            "sales.hold.heldOrders"
        );

    const discountInput =
        document.getElementById(
            "discountValue"
        );

    const held = {
        id: Date.now(),
        name,
        items:
            cart.map(
                item => ({
                    ...item
                })
            ),
        discountType,
        discountValue:
            discountInput
                ? discountInput.value
                : "0",
        createdAt:
            new Date().toISOString()
    };

    heldOrders.push(held);

    localStorage.setItem(
        "tm_held_orders",
        JSON.stringify(
            heldOrders
        )
    );

    clearCart();

    renderHeldOrders();
    updateHeldCount();

    alert(
        `${getTranslation(
            "sales.hold.orderHeld"
        )}: ${held.name}`
    );
}

function resumeHeldOrder(id) {
    const held =
        heldOrders.find(
            order =>
                order.id === id
        );

    if (!held) {
        return;
    }

    if (
        cart.length &&
        !confirm(
            getTranslation(
                "sales.hold.replaceCart"
            )
        )
    ) {
        return;
    }

    cart =
        held.items.map(
            item => ({
                ...item
            })
        );

    discountType =
        held.discountType;

    const discountInput =
        document.getElementById(
            "discountValue"
        );

    if (discountInput) {
        discountInput.value =
            held.discountValue;
    }

    document
        .querySelectorAll(
            ".discount-type-btn"
        )
        .forEach(
            button => {
                button.classList.toggle(
                    "active",
                    button.dataset.type ===
                    discountType
                );
            }
        );

    heldOrders =
        heldOrders.filter(
            order =>
                order.id !== id
        );

    localStorage.setItem(
        "tm_held_orders",
        JSON.stringify(
            heldOrders
        )
    );

    renderHeldOrders();
    updateHeldCount();
    updateCartDisplay();

    const panel =
        document.getElementById(
            "heldOrdersPanel"
        );

    if (panel) {
        panel.style.display =
            "none";
    }
}

// ============================================================
// Split Payment
// ============================================================

function toggleSplitPayment() {
    isSplitPayment =
        !isSplitPayment;

    const splitSection =
        document.getElementById(
            "splitPaymentSection"
        );

    const singleMethods =
        document.getElementById(
            "singlePaymentMethods"
        );

    const quickCash =
        document.getElementById(
            "quickCashGrid"
        );

    const cashWrap =
        document.getElementById(
            "cashReceivedWrap"
        );

    const changeDisplay =
        document.getElementById(
            "changeDisplay"
        );

    const toggleBtn =
        document.getElementById(
            "toggleSplitBtn"
        );

    if (isSplitPayment) {
        splitSection?.classList.add(
            "active"
        );

        if (singleMethods) {
            singleMethods.style.display =
                "none";
        }

        if (quickCash) {
            quickCash.style.display =
                "none";
        }

        if (cashWrap) {
            cashWrap.style.display =
                "none";
        }

        if (changeDisplay) {
            changeDisplay.style.display =
                "none";
        }

        if (toggleBtn) {
            toggleBtn.textContent =
                getTranslation(
                    "sales.checkout.disableSplit"
                );
        }

        if (!splitPayments.length) {
            addSplitPaymentRow();
        }

        updateSplitPaymentDisplay();

    } else {
        splitSection?.classList.remove(
            "active"
        );

        if (singleMethods) {
            singleMethods.style.display =
                "grid";
        }

        if (quickCash) {
            quickCash.style.display =
                "flex";
        }

        const activeMethod =
            document.querySelector(
                ".pay-method.active"
            );

        if (cashWrap) {
            cashWrap.style.display =
                activeMethod?.dataset.method ===
                "cash"
                    ? "block"
                    : "none";
        }

        if (toggleBtn) {
            toggleBtn.textContent =
                getTranslation(
                    "sales.checkout.enableSplit"
                );
        }

        splitPayments = [];

        const list =
            document.getElementById(
                "splitPaymentsList"
            );

        if (list) {
            list.innerHTML = "";
        }

        updateChangeDisplay();
    }
}

// ============================================================
// Add Split Payment
// ============================================================

function addSplitPaymentRow() {
    const list =
        document.getElementById(
            "splitPaymentsList"
        );

    if (!list) {
        return;
    }

    const index =
        splitPayments.length;

    splitPayments.push({
        method: "cash",
        amount: 0
    });

    const row =
        document.createElement(
            "div"
        );

    row.className =
        "split-payment-row";

    row.dataset.index =
        index;

    row.innerHTML = `
        <select class="split-method">
            <option value="cash">
                ${getTranslation(
                    "sales.checkout.cash"
                )}
            </option>

            <option value="card">
                ${getTranslation(
                    "sales.checkout.card"
                )}
            </option>

            <option value="other">
                ${getTranslation(
                    "sales.checkout.other"
                )}
            </option>
        </select>

        <input
            type="text"
            inputmode="decimal"
            class="split-amount"
            placeholder="0.00"
            value=""
        />

        ${
            index > 0
                ? `
                    <button
                        type="button"
                        class="remove-payment-btn"
                    >
                        ×
                    </button>
                `
                : ""
        }
    `;

    list.appendChild(row);

    const methodSelect =
        row.querySelector(
            ".split-method"
        );

    const amountInput =
        row.querySelector(
            ".split-amount"
        );

    const removeBtn =
        row.querySelector(
            ".remove-payment-btn"
        );

    methodSelect?.addEventListener(
        "change",
        event => {
            const rowIndex =
                Number(
                    row.dataset.index
                );

            if (
                !splitPayments[
                    rowIndex
                ]
            ) {
                return;
            }

            splitPayments[
                rowIndex
            ].method =
                event.target.value;

            updateSplitPaymentDisplay();
        }
    );

    amountInput?.addEventListener(
        "input",
        event => {
            const cleaned =
                normalizeNumberInput(
                    event.target.value
                );

            event.target.value =
                cleaned;

            const rowIndex =
                Number(
                    row.dataset.index
                );

            if (
                !splitPayments[
                    rowIndex
                ]
            ) {
                return;
            }

            splitPayments[
                rowIndex
            ].amount =
                parseFloat(
                    cleaned
                ) || 0;

            updateSplitPaymentDisplay();
        }
    );

    removeBtn?.addEventListener(
        "click",
        () => {
            const rowIndex =
                Number(
                    row.dataset.index
                );

            splitPayments.splice(
                rowIndex,
                1
            );

            row.remove();

            document
                .querySelectorAll(
                    ".split-payment-row"
                )
                .forEach(
                    (paymentRow, i) => {
                        paymentRow.dataset.index =
                            i;
                    }
                );

            updateSplitPaymentDisplay();
        }
    );

    amountInput?.focus();
}

// ============================================================
// Split Payment Display
// ============================================================

function updateSplitPaymentDisplay() {
    const total =
        calculateTotals().total;

    const paidSoFar =
        splitPayments.reduce(
            (sum, payment) =>
                sum +
                Number(
                    payment.amount || 0
                ),
            0
        );

    const cashPaid =
        splitPayments
            .filter(
                payment =>
                    payment.method ===
                    "cash"
            )
            .reduce(
                (sum, payment) =>
                    sum +
                    Number(
                        payment.amount ||
                        0
                    ),
                0
            );

    const nonCashPaid =
        splitPayments
            .filter(
                payment =>
                    payment.method !==
                    "cash"
            )
            .reduce(
                (sum, payment) =>
                    sum +
                    Number(
                        payment.amount ||
                        0
                    ),
                0
            );

    const remaining =
        Math.max(
            total -
            paidSoFar,
            0
        );

    const requiredCash =
        Math.max(
            total -
            nonCashPaid,
            0
        );

    const change =
        Math.max(
            cashPaid -
            requiredCash,
            0
        );

    const splitTotalDue =
        document.getElementById(
            "splitTotalDue"
        );

    const splitPaidSoFar =
        document.getElementById(
            "splitPaidSoFar"
        );

    const remainingEl =
        document.getElementById(
            "splitRemaining"
        );

    const remainingRow =
        document.getElementById(
            "splitRemainingRow"
        );

    if (splitTotalDue) {
        splitTotalDue.textContent =
            total.toFixed(2);
    }

    if (splitPaidSoFar) {
        splitPaidSoFar.textContent =
            paidSoFar.toFixed(2);
    }

    if (
        !remainingEl ||
        !remainingRow
    ) {
        return;
    }

    if (
        paidSoFar >=
        total - 0.01
    ) {
        remainingRow.classList.add(
            "paid"
        );

        const labelSpan =
            remainingRow.querySelector(
                "span"
            );

        if (labelSpan) {
            labelSpan.textContent =
                change > 0
                    ? getTranslation(
                        "sales.checkout.change"
                    )
                    : getTranslation(
                        "sales.checkout.paid"
                    );
        }

        remainingEl.textContent =
            change.toFixed(2);

    } else {
        remainingRow.classList.remove(
            "paid"
        );

        const labelSpan =
            remainingRow.querySelector(
                "span"
            );

        if (labelSpan) {
            labelSpan.textContent =
                getTranslation(
                    "sales.checkout.remaining"
                );
        }

        remainingEl.textContent =
            remaining.toFixed(2);
    }
}

// ============================================================
// Checkout Modal
// ============================================================

function openCheckoutModal() {
    const modal =
        document.getElementById(
            "checkoutModal"
        );

    const cashInput =
        document.getElementById(
            "cashReceived"
        );

    const modalTotal =
        document.getElementById(
            "modalTotal"
        );

    if (modalTotal) {
        modalTotal.textContent =
            document.getElementById(
                "total"
            )?.textContent || "0.00";
    }

    const changeDisplay =
        document.getElementById(
            "changeDisplay"
        );

    if (changeDisplay) {
        changeDisplay.style.display =
            "none";
    }

    const saleNote =
        document.getElementById(
            "saleNote"
        );

    if (saleNote) {
        saleNote.value = "";
    }

    // Start checkout in normal single-payment mode.
    if (isSplitPayment) {
        toggleSplitPayment();
    }

    if (cashInput) {
        cashInput.value = "";
    }

    if (modal) {
        modal.style.display =
            "flex";
    }

    setTimeout(
        () => {
            const input =
                document.getElementById(
                    "cashReceived"
                );

            if (
                input &&
                !isSplitPayment
            ) {
                input.focus({
                    preventScroll: true
                });

                input.select();
            }
        },
        200
    );
}

function closeCheckoutModal() {
    const modal =
        document.getElementById(
            "checkoutModal"
        );

    if (modal) {
        modal.style.display =
            "none";
    }
}

// ============================================================
// Cash Change
// ============================================================

function updateChangeDisplay() {
    const total =
        parseFloat(
            document.getElementById(
                "total"
            )?.textContent ||
            "0"
        ) || 0;

    const received =
        parseFloat(
            normalizeNumberInput(
                document.getElementById(
                    "cashReceived"
                )?.value ||
                "0"
            )
        ) || 0;

    const changeDisplay =
        document.getElementById(
            "changeDisplay"
        );

    const changeAmount =
        document.getElementById(
            "changeAmount"
        );

    if (
        received >= total &&
        received > 0
    ) {
        if (changeDisplay) {
            changeDisplay.style.display =
                "flex";
        }

        if (changeAmount) {
            changeAmount.textContent =
                (
                    received -
                    total
                ).toFixed(2);
        }

    } else {
        if (changeDisplay) {
            changeDisplay.style.display =
                "none";
        }
    }
}

// ============================================================
// Confirm Checkout
// ============================================================

async function confirmCheckout() {
    const {
        subtotal,
        discountAmount,
        tax,
        total,
        vatRate: appliedVatRate,
        vatEnabled: appliedVatEnabled
    } = calculateTotals();

    let paymentMethod;
    let cashReceived;
    let payments;

    if (isSplitPayment) {
        const paidSoFar =
            splitPayments.reduce(
                (sum, payment) =>
                    sum +
                    Number(
                        payment.amount || 0
                    ),
                0
            );

        if (
            paidSoFar <
            total - 0.01
        ) {
            alert(
                getTranslation(
                    "sales.checkout.insufficientSplit"
                )
            );

            return;
        }

        payments =
            splitPayments.filter(
                payment =>
                    Number(
                        payment.amount
                    ) > 0
            );

        paymentMethod =
            "split";

        cashReceived = null;

    } else {
        const activeMethodBtn =
            document.querySelector(
                ".pay-method.active"
            );

        paymentMethod =
            activeMethodBtn?.dataset.method ||
            "cash";

        const cashReceivedInput =
            document.getElementById(
                "cashReceived"
            );

        cashReceived =
            paymentMethod === "cash"
                ? parseFloat(
                    normalizeNumberInput(
                        cashReceivedInput?.value ||
                        "0"
                    )
                ) || 0
                : null;

        if (
            paymentMethod ===
                "cash" &&
            cashReceived <
                total
        ) {
            alert(
                getTranslation(
                    "sales.checkout.insufficientCash"
                )
            );

            return;
        }
    }

    let session = null;

    try {
        session =
            await window.api.getSession();
    } catch (error) {
        console.error(
            "[SALES] Failed to get session:",
            error
        );
    }

    const cartSnapshot =
        cart.map(
            item => ({
                ...item
            })
        );

    const saleNote =
        document.getElementById(
            "saleNote"
        )?.value || "";

    const saleData = {
        items:
            cartSnapshot.map(
                item => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    qty: item.qty
                })
            ),

        subtotal,

        discount:
            discountAmount,

        tax,

        total,

        // Save the VAT state/rate used by this sale.
        vatEnabled:
            appliedVatEnabled,

        vatRate:
            appliedVatRate,

        paymentMethod,

        cashReceived,

        payments,

        userId:
            session?.userId ||
            null,

        username:
            session?.username ||
            null,

        note:
            saleNote
    };

    try {
        const result =
            await window.api.createSale(
                saleData
            );

        if (
            !result ||
            !result.success
        ) {
            alert(
                result?.message ||
                getTranslation(
                    "sales.checkout.error"
                )
            );

            return;
        }

        try {
            const drawerResult =
                await window.api.openCashDrawer();

            if (
                !drawerResult?.success
            ) {
                console.warn(
                    "[SALES] Cash drawer was not opened:",
                    drawerResult?.message
                );
            }

        } catch (drawerError) {
            console.error(
                "[SALES] Cash drawer error:",
                drawerError
            );
        }

        closeCheckoutModal();

        const cashChange =
            cashReceived != null
                ? Math.max(
                    cashReceived -
                    total,
                    0
                )
                : 0;

        const splitChange =
            isSplitPayment
                ? calculateSplitChange(
                    total,
                    payments
                )
                : 0;

        showReceipt(
            result.sale,
            cartSnapshot,
            {
                subtotal,
                discountAmount,
                tax,
                total,
                paymentMethod,
                cashReceived,
                payments,
                change:
                    isSplitPayment
                        ? splitChange
                        : cashChange,
                vatEnabled:
                    appliedVatEnabled,
                vatRate:
                    appliedVatRate
            },
            session
        );

        clearCart();

        await loadProducts();

    } catch (error) {
        console.error(
            "[SALES] Checkout error:",
            error
        );

        alert(
            getTranslation(
                "sales.checkout.error"
            )
        );
    }
}

// ============================================================
// Calculate Split Change
// ============================================================

function calculateSplitChange(
    total,
    payments
) {
    if (!Array.isArray(payments)) {
        return 0;
    }

    const cashPaid =
        payments
            .filter(
                payment =>
                    payment.method ===
                    "cash"
            )
            .reduce(
                (sum, payment) =>
                    sum +
                    Number(
                        payment.amount ||
                        0
                    ),
                0
            );

    const nonCashPaid =
        payments
            .filter(
                payment =>
                    payment.method !==
                    "cash"
            )
            .reduce(
                (sum, payment) =>
                    sum +
                    Number(
                        payment.amount ||
                        0
                    ),
                0
            );

    const requiredCash =
        Math.max(
            total -
            nonCashPaid,
            0
        );

    return Math.max(
        cashPaid -
        requiredCash,
        0
    );
}

// ============================================================
// Void Last Sale
// ============================================================

async function handleVoidLastSale() {
    try {
        const lastSale =
            await window.api.getLastActiveSale();

        if (!lastSale) {
            alert(
                getTranslation(
                    "sales.noSaleToVoid"
                )
            );

            return;
        }

        const confirmMsg =
            `${getTranslation(
                "sales.confirmVoid"
            )} ${lastSale.invoiceLabel} — ` +
            `${Number(
                lastSale.total
            ).toFixed(2)}?`;

        if (!confirm(confirmMsg)) {
            return;
        }

        const result =
            await window.api.voidLastSale();

        if (!result.success) {
            alert(
                result.message ||
                getTranslation(
                    "common.error"
                )
            );

            return;
        }

        alert(
            `${getTranslation(
                "sales.saleVoided"
            )}: ${result.sale.invoiceLabel}`
        );

        await loadProducts();

    } catch (error) {
        console.error(
            "[SALES] Void sale error:",
            error
        );

        alert(
            getTranslation(
                "common.error"
            )
        );
    }
}

// ============================================================
// Receipt
// ============================================================

function showReceipt(
    sale,
    items,
    totals,
    session
) {
    const paperEl =
        document.getElementById(
            "receiptPaper"
        );

    const modal =
        document.getElementById(
            "receiptModal"
        );

    if (!paperEl || !modal) {
        return;
    }

    const invoiceLabel =
        sale?.invoiceLabel ||
        "—";

    const createdDate =
        sale?.createdAt
            ? new Date(
                sale.createdAt
            )
            : new Date();

    const dateStr =
        createdDate.toLocaleDateString();

    const timeStr =
        createdDate.toLocaleTimeString(
            [],
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );

    const cashierName =
        session?.username ||
        "—";

    const store =
        storeInfo || {
            name:
                "THREE MARKET",

            tagline:
                "RETAIL & POS SYSTEM",

            branch:
                "",

            phone:
                "",

            address:
                "",

            logo:
                "",

            footerText:
                getTranslation(
                    "sales.receipt.thankYou"
                )
        };

    const logoHtml =
        store.logo
            ? `
                <img
                    src="${escapeHtml(
                        store.logo
                    )}"
                    class="receipt-logo"
                    alt=""
                >
            `
            : "";

    const itemsHtml =
        items.map(
            item => `
                <div class="receipt-item-row">
                    <span class="receipt-col-item">
                        ${escapeHtml(
                            item.name
                        )}
                    </span>

                    <span class="receipt-col-qty">
                        ${item.qty}
                    </span>

                    <span class="receipt-col-total">
                        ${(item.price * item.qty).toFixed(2)}
                    </span>
                </div>
            `
        ).join("");

    const discountHtml =
        totals.discountAmount > 0
            ? `
                <div class="receipt-summary-row">
                    <span>
                        ${getTranslation(
                            "sales.discountApplied"
                        )}
                    </span>

                    <span>
                        ${totals.discountAmount.toFixed(2)}
                    </span>
                </div>
            `
            : "";

    // Hide VAT from the receipt when VAT is disabled.
    const vatHtml =
        totals.vatEnabled
            ? `
                <div class="receipt-summary-row">
                    <span>
                        ${getTranslation(
                            "sales.receipt.vat"
                        )}
                        (${Number(
                            totals.vatRate
                        ).toFixed(2)}%)
                    </span>

                    <span>
                        ${totals.tax.toFixed(2)}
                    </span>
                </div>
            `
            : "";

    let paymentDetailsHtml = "";

    if (
        totals.paymentMethod ===
            "split" &&
        Array.isArray(
            totals.payments
        )
    ) {
        paymentDetailsHtml =
            totals.payments.map(
                payment => `
                    <div class="receipt-summary-row">
                        <span>
                            ${escapeHtml(
                                getTranslation(
                                    `sales.checkout.${payment.method}`
                                )
                            )}
                        </span>

                        <span>
                            ${Number(
                                payment.amount
                            ).toFixed(2)}
                        </span>
                    </div>
                `
            ).join("");

        if (
            Number(
                totals.change || 0
            ) > 0
        ) {
            paymentDetailsHtml += `
                <div class="receipt-summary-row receipt-change-row">
                    <span>
                        ${getTranslation(
                            "sales.checkout.change"
                        )}
                    </span>

                    <span>
                        ${Number(
                            totals.change
                        ).toFixed(2)}
                    </span>
                </div>
            `;
        }

    } else if (
        totals.paymentMethod ===
            "cash" &&
        totals.cashReceived != null
    ) {
        paymentDetailsHtml = `
            <div class="receipt-summary-row">
                <span>
                    ${getTranslation(
                        "sales.receipt.paid"
                    )}
                </span>

                <span>
                    ${Number(
                        totals.cashReceived
                    ).toFixed(2)}
                </span>
            </div>

            <div class="receipt-summary-row">
                <span>
                    ${getTranslation(
                        "sales.checkout.change"
                    )}
                </span>

                <span>
                    ${Number(
                        totals.change || 0
                    ).toFixed(2)}
                </span>
            </div>
        `;
    }

    const noteHtml =
        sale?.note
            ? `
                <div
                    class="receipt-center-line"
                    style="
                        font-weight:600;
                        margin:4px 0;
                    "
                >
                    ${getTranslation(
                        "sales.checkout.saleNote"
                    )}:
                    ${escapeHtml(
                        sale.note
                    )}
                </div>
            `
            : "";

    paperEl.innerHTML = `
        ${logoHtml}

        <div class="receipt-store-name">
            ${escapeHtml(
                store.name
            )}
        </div>

        <div class="receipt-tagline">
            ${escapeHtml(
                store.tagline
            )}
        </div>

        <div class="receipt-dash-divider"></div>

        ${
            store.branch
                ? `
                    <div class="receipt-center-line">
                        ${escapeHtml(
                            store.branch
                        )}
                    </div>
                `
                : ""
        }

        ${
            store.phone
                ? `
                    <div class="receipt-center-line">
                        ${getTranslation(
                            "sales.receipt.tel"
                        )}:
                        ${escapeHtml(
                            store.phone
                        )}
                    </div>
                `
                : ""
        }

        ${
            store.address
                ? `
                    <div class="receipt-center-line">
                        ${escapeHtml(
                            store.address
                        )}
                    </div>
                `
                : ""
        }

        <div class="receipt-dash-divider"></div>

        <div class="receipt-center-line">
            ${getTranslation(
                "sales.receipt.invoice"
            )}
            #${escapeHtml(
                invoiceLabel
            )}
        </div>

        <div class="receipt-meta-line">
            <span>
                ${getTranslation(
                    "sales.receipt.date"
                )}:
            </span>

            <span>
                ${dateStr}
            </span>
        </div>

        <div class="receipt-meta-line">
            <span>
                ${getTranslation(
                    "sales.receipt.time"
                )}:
            </span>

            <span>
                ${timeStr}
            </span>
        </div>

        <div class="receipt-meta-line">
            <span>
                ${getTranslation(
                    "sales.receipt.cashier"
                )}:
            </span>

            <span>
                ${escapeHtml(
                    cashierName
                )}
            </span>
        </div>

        <div class="receipt-dash-divider"></div>

        <div class="receipt-item-row receipt-header-row">
            <span class="receipt-col-item">
                ${getTranslation(
                    "sales.receipt.item"
                )}
            </span>

            <span class="receipt-col-qty">
                ${getTranslation(
                    "sales.receipt.qty"
                )}
            </span>

            <span class="receipt-col-total">
                ${getTranslation(
                    "sales.receipt.itemTotal"
                )}
            </span>
        </div>

        <div class="receipt-dash-divider"></div>

        ${itemsHtml}

        <div class="receipt-dash-divider"></div>

        <div class="receipt-summary-row">
            <span>
                ${getTranslation(
                    "sales.subtotal"
                )}
            </span>

            <span>
                ${totals.subtotal.toFixed(2)}
            </span>
        </div>

        ${discountHtml}

        ${vatHtml}

        <div class="receipt-double-divider"></div>

        <div class="receipt-summary-row receipt-grand-total">
            <span>
                ${getTranslation(
                    "sales.total"
                )}
            </span>

            <span>
                ${totals.total.toFixed(2)}
            </span>
        </div>

        <div class="receipt-double-divider"></div>

        <div class="receipt-summary-row">
            <span>
                ${getTranslation(
                    "sales.receipt.payment"
                )}:
            </span>

            <span>
                ${
                    totals.paymentMethod ===
                    "split"
                        ? getTranslation(
                            "sales.checkout.split"
                        )
                        : totals.paymentMethod ===
                          "cash"
                            ? getTranslation(
                                "sales.checkout.cash"
                            )
                            : getTranslation(
                                "sales.checkout.card"
                            )
                }
            </span>
        </div>

        ${paymentDetailsHtml}

        ${noteHtml}

        <div class="receipt-dash-divider"></div>

        <div class="receipt-center-line receipt-footer-text">
            ${escapeHtml(
                store.footerText ||
                getTranslation(
                    "sales.receipt.thankYou"
                )
            )}
        </div>

        <div class="receipt-center-line">
            ${getTranslation(
                "sales.receipt.with"
            )}
            ${escapeHtml(
                store.name
            )}
        </div>

        <div class="receipt-center-line receipt-invoice-footer">
            ${escapeHtml(
                invoiceLabel
            )}
        </div>

        <div class="receipt-dash-divider"></div>

        <div class="receipt-center-line receipt-powered-by">
            ${getTranslation(
                "sales.receipt.poweredBy"
            )}
        </div>
    `;

    lastReceiptHTML =
        paperEl.innerHTML;

    const reprintBtn =
        document.getElementById(
            "reprintBtn"
        );

    if (reprintBtn) {
        reprintBtn.style.display =
            "inline-flex";
    }

    modal.style.display =
        "flex";
}

// ============================================================
// Close Receipt
// ============================================================

function closeReceiptModal() {
    const modal =
        document.getElementById(
            "receiptModal"
        );

    if (modal) {
        modal.style.display =
            "none";
    }
}

// ============================================================
// Number Normalization
// ============================================================

function normalizeNumberInput(
    value
) {
    const arabicDigits =
        "٠١٢٣٤٥٦٧٨٩";

    let result =
        String(value).replace(
            /[٠-٩]/g,
            digit =>
                arabicDigits.indexOf(
                    digit
                )
        );

    result =
        result.replace(
            /[^\d.]/g,
            ""
        );

    const parts =
        result.split(".");

    if (parts.length > 2) {
        result =
            parts[0] +
            "." +
            parts
                .slice(1)
                .join("");
    }

    return result;
}

// ============================================================
// HTML Escape
// ============================================================

function escapeHtml(value) {
    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}

// ============================================================
// Barcode Beep
// ============================================================

function playBeep(
    success = true
) {
    try {
        const AudioContextClass =
            window.AudioContext ||
            window.webkitAudioContext;

        const ctx =
            new AudioContextClass();

        const oscillator =
            ctx.createOscillator();

        const gainNode =
            ctx.createGain();

        oscillator.connect(
            gainNode
        );

        gainNode.connect(
            ctx.destination
        );

        oscillator.frequency.value =
            success
                ? 880
                : 220;

        oscillator.type =
            "sine";

        gainNode.gain.setValueAtTime(
            0.15,
            ctx.currentTime
        );

        gainNode.gain.exponentialRampToValueAtTime(
            0.001,
            ctx.currentTime +
            0.15
        );

        oscillator.start(
            ctx.currentTime
        );

        oscillator.stop(
            ctx.currentTime +
            0.15
        );

    } catch (error) {
        console.warn(
            "[SALES] Beep failed:",
            error
        );
    }
}

// ============================================================
// Barcode Error
// ============================================================

function showBarcodeError(
    message
) {
    const wrap =
        document.querySelector(
            ".barcode-input-wrap"
        );

    if (!wrap) {
        return;
    }

    let errorEl =
        wrap.querySelector(
            ".barcode-error"
        );

    if (!errorEl) {
        errorEl =
            document.createElement(
                "div"
            );

        errorEl.className =
            "barcode-error";

        wrap.appendChild(
            errorEl
        );
    }

    errorEl.textContent =
        message;

    errorEl.classList.add(
        "is-visible"
    );

    clearTimeout(
        showBarcodeError._timeout
    );

    showBarcodeError._timeout =
        setTimeout(
            () => {
                errorEl.classList.remove(
                    "is-visible"
                );
            },
            2000
        );
}

// ============================================================
// Start
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    initializeSales
);