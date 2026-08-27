import { loadTranslations, toggleLanguage, getTranslation } from "./i18n.js";
import { loadAppShell } from "./component-loader.js";
import { initializeNavigation, applyRoleBasedAccess, checkRedirectLoop } from "./navigation.js";
import permissionsConfig from "../config/permissions.config.json";

// متغيّر لحفظ HTML الخاص بالـ Dashboard لاسترجاعه عند العودة إليها
let initialDashboardHTML = "";

function todayDateString() {
    return new Date().toISOString().slice(0, 10);
}

function yesterdayDateString() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
}

async function refreshTopProducts(from, to) {
    try {
        const topProducts = await window.api.getTopProductsInRange(from, to);
        renderTopProducts(topProducts);
    } catch (error) {
        console.error("[DASHBOARD] Failed to load top products:", error);
    }
}

function initializeTopProductsRange() {
    const rangeSelect = document.getElementById("topProductsRange");
    const customInputs = document.getElementById("customRangeInputs");
    const fromInput = document.getElementById("rangeFrom");
    const toInput = document.getElementById("rangeTo");

    if (!rangeSelect) return;

    const today = todayDateString();
    if (fromInput) {
        fromInput.value = today;
        fromInput.max = today;
    }
    if (toInput) {
        toInput.value = today;
        toInput.max = today;
    }

    rangeSelect.addEventListener("change", () => {
        const value = rangeSelect.value;

        if (value === "custom") {
            if (customInputs) customInputs.style.display = "flex";
            if (fromInput && toInput) refreshTopProducts(fromInput.value, toInput.value);
            return;
        }

        if (customInputs) customInputs.style.display = "none";

        if (value === "today") {
            refreshTopProducts(todayDateString(), todayDateString());
        } else if (value === "yesterday") {
            refreshTopProducts(yesterdayDateString(), yesterdayDateString());
        }
    });

    fromInput?.addEventListener("change", () => {
        if (rangeSelect.value === "custom") refreshTopProducts(fromInput.value, toInput.value);
    });

    toInput?.addEventListener("change", () => {
        if (rangeSelect.value === "custom") refreshTopProducts(fromInput.value, toInput.value);
    });
}

async function loadDashboardStats() {
    try {
        const [summary, products, topProducts] = await Promise.all([
            window.api.getTodaySummary(),
            window.api.getProducts(),
            window.api.getTopProductsInRange(todayDateString(), todayDateString())
        ]);

        const todaySalesEl = document.getElementById("todaySales");
        const todayTransactionsEl = document.getElementById("todayTransactions");
        const totalProductsEl = document.getElementById("totalProducts");
        const lowStockEl = document.getElementById("lowStock");

        if (todaySalesEl) todaySalesEl.textContent = (summary.totalSales || 0).toFixed(2);
        if (todayTransactionsEl) todayTransactionsEl.textContent = summary.totalTransactions || 0;

        const productList = Array.isArray(products) ? products : [];
        const lowStockCount = productList.filter(
            p => Number(p.quantity) <= Number(p.minStock)
        ).length;

        if (totalProductsEl) totalProductsEl.textContent = productList.length;
        if (lowStockEl) lowStockEl.textContent = lowStockCount;

        const lowStockCard = document.getElementById("lowStockCard");
        if (lowStockCard) {
            lowStockCard.addEventListener("click", () => {
                sessionStorage.setItem("productsFilter", "lowStock");
                window.location.href = "/pages/products.html";
            });
        }

        updateTrendLabel(todaySalesEl, summary.totalTransactions > 0);
        updateTrendLabel(todayTransactionsEl, summary.totalTransactions > 0);
        updateTrendLabel(totalProductsEl, productList.length > 0);
        updateTrendLabel(lowStockEl, true);
        renderTopProducts(topProducts);

    } catch (error) {
        console.error("[DASHBOARD] Failed to load stats:", error);
    }
}

function renderTopProducts(topProducts) {
    const listEl = document.getElementById("topProductsList");
    if (!listEl) return;

    if (!Array.isArray(topProducts) || topProducts.length === 0) {
        listEl.innerHTML = `<li class="top-products-empty">${getTranslation("dashboard.noDataYet")}</li>`;
        return;
    }

    listEl.innerHTML = topProducts.map(p => `
        <li>
            <span class="product-name">${escapeHtml(p.name)}</span>
            <span class="product-qty">×${p.qty}</span>
        </li>
    `).join("");
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function updateTrendLabel(statValueEl, hasData) {
    if (!statValueEl) return;

    const trendEl = statValueEl.parentElement?.querySelector(".stat-trend span");
    if (!trendEl) return;

    trendEl.textContent = hasData ? getTranslation("dashboard.updated") : getTranslation("dashboard.noDataYet");
}

// ============================================================
// Page Router
// Handles switching between application pages without
// reloading the Electron BrowserWindow.
// ============================================================

export async function loadPage(page) {
    const pageContent = document.getElementById("page-content");

    if (!pageContent) {
        console.error("[Router] #page-content not found.");
        return;
    }

    // ========================================================
    // Sales History
    // ========================================================
    if (page === "sales-history") {
        try {
            const response = await fetch("/pages/history.html");

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const html = await response.text();
            pageContent.innerHTML = html;

            // Load History JavaScript
            const module = await import("/js/sales-history.js");
            if (typeof module.initSalesHistory === "function") {
                await module.initSalesHistory();
            }

            console.log("[Router] Sales History loaded.");

        } catch (error) {
            console.error("[Router] Failed to load Sales History:", error);
            pageContent.innerHTML = `
                <div class="page-error">
                    Failed to load Sales History.
                </div>
            `;
        }
        return;
    }

    // ========================================================
    // Dashboard
    // ========================================================
    if (page === "dashboard") {
        if (initialDashboardHTML) {
            pageContent.innerHTML = initialDashboardHTML;
            await loadDashboardStats();
            initializeTopProductsRange();
            console.log("[Router] Dashboard restored.");
        }
        return;
    }
}

async function initializeDashboard() {
    console.log("[DASHBOARD] Starting initialization...");

    try {
        const session = await window.api.getSession();
        console.log("[DASHBOARD] Session:", session);

        if (!session) {
            console.log("[DASHBOARD] No session, redirecting to login");
            window.location.href = "/";
            return;
        }

        if (session.role === "administrator") session.role = "admin";

        console.log("[DASHBOARD] Loading app shell...");
        await loadAppShell();
        console.log("[DASHBOARD] App shell loaded");

        // حفظ تصميم الواجهة الأساسي للـ Dashboard لاسترجاعه عند استخدام الـ Router
        const pageContent = document.getElementById("page-content");
        if (pageContent) {
            initialDashboardHTML = pageContent.innerHTML;
        }

        const currentPage = "dashboard";
        const role = session.role;
        const rolePerms = session.permissions || permissionsConfig.rolePresets[role] || {};
        console.log("[DASHBOARD] Role:", role, "| Current page:", currentPage);

        if (!rolePerms[currentPage] || rolePerms[currentPage] === "none") {
            const fallback = permissionsConfig.allPages.find(p => rolePerms[p] && rolePerms[p] !== "none") || "sales";

            if (checkRedirectLoop()) return;

            window.location.href = `/pages/${fallback}.html`;
            return;
        }

        const usernameEl = document.getElementById("currentUsername");
        const roleEl = document.getElementById("currentRole");
        const avatarEl = document.getElementById("userAvatar");

        if (usernameEl) usernameEl.textContent = session.username;
        if (roleEl) roleEl.textContent = session.role;
        if (avatarEl && session.username) {
            avatarEl.textContent = session.username.charAt(0).toUpperCase();
        }

        await loadTranslations();
        initializeNavigation();
        applyRoleBasedAccess(session);

        document.getElementById("languageButton")?.addEventListener("click", toggleLanguage);
        document.getElementById("logoutButton")?.addEventListener("click", async () => {
            await window.api.logout();
            window.location.href = "/";
        });

        await loadDashboardStats();
        initializeTopProductsRange();

        console.log("[DASHBOARD] ✅ Initialized successfully");

    } catch (error) {
        console.error("[DASHBOARD] ❌ Error:", error);
    }
}

document.addEventListener("DOMContentLoaded", initializeDashboard);