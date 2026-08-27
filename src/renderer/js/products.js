import { loadTranslations, toggleLanguage, getTranslation, updatePageText } from "./i18n.js";
import { loadAppShell } from "./component-loader.js";
import { initializeNavigation, applyRoleBasedAccess, checkRedirectLoop } from "./navigation.js";
import permissionsConfig from "../config/permissions.config.json";

let products = [];
let editingProductId = null;
let canWriteProducts = false;

async function initializeProducts() {
    try {
        const session = await window.api.getSession();

        if (!session) {
            window.location.href = "/";
            return;
        }

        if (session.role === "administrator") session.role = "admin";

        await loadAppShell();

        // Dynamically load modal if container exists
        const modalContainer = document.getElementById("modal-container");
        if (modalContainer) {
            const response = await fetch("/components/modal.html");
            const html = await response.text();
            modalContainer.innerHTML = html;
            // Re-run translations after modal loads
            updatePageText();
        }

        const rolePerms = session.permissions || permissionsConfig.rolePresets[session.role] || {};

        if (!rolePerms.products || rolePerms.products === "none") {
            const fallback = permissionsConfig.allPages.find(p => rolePerms[p] && rolePerms[p] !== "none") || "sales";
            if (checkRedirectLoop()) return;
            window.location.href = `/pages/${fallback}.html`;
            return;
        }

        canWriteProducts = rolePerms.products === "write";

        const usernameEl = document.getElementById("currentUsername");
        const roleEl = document.getElementById("currentRole");
        if (usernameEl) usernameEl.textContent = session.username;
        if (roleEl) roleEl.textContent = session.role;

        await loadTranslations();
        initializeNavigation();
        applyRoleBasedAccess(session);

        const langBtn = document.getElementById("languageButton");
        if (langBtn) {
            langBtn.addEventListener("click", async () => {
                await toggleLanguage();
                renderProducts(products);
            });
        }

        const logoutBtn = document.getElementById("logoutButton");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", async () => {
                const result = await window.api.logout();
                if (result.success) window.location.href = "/";
            });
        }

        await loadProducts();
        initializeSearch();
        initializeProductModal();

        console.log("Products page initialized");

    } catch (error) {
        console.error("Products initialization error:", error);
    }
}

async function loadProducts() {
    try {
        const result = await window.api.getProducts();
        products = Array.isArray(result) ? result : [];

        const filter = sessionStorage.getItem("productsFilter");
        if (filter === "lowStock") {
            sessionStorage.removeItem("productsFilter");
            const lowStockProducts = products.filter(
                p => Number(p.quantity) <= Number(p.minStock)
            );
            renderProducts(lowStockProducts);

            const searchInput = document.getElementById("productSearch");
            if (searchInput) searchInput.placeholder = "Showing low stock items only — clear search to see all";
        } else {
            renderProducts(products);
        }
    } catch (error) {
        console.error("Failed to load products:", error);
        products = [];
    }
}

function renderProducts(productList) {
    const tbody = document.getElementById("productsTableBody");
    const emptyState = document.getElementById("productsEmptyState");
    const tableContainer = document.getElementById("productsTableContainer");

    if (!tbody) return;

    tbody.innerHTML = "";

    if (!productList.length) {
        if (tableContainer) tableContainer.style.display = "none";
        if (emptyState) emptyState.style.display = "flex";
        return;
    }

    if (tableContainer) tableContainer.style.display = "block";
    if (emptyState) emptyState.style.display = "none";

    productList.forEach(product => {
        const row = document.createElement("tr");
        const lowStock = Number(product.quantity) <= Number(product.minStock);

        row.innerHTML = `
            <td>${escapeHtml(product.sku || "-")}</td>
            <td><strong>${escapeHtml(product.name)}</strong></td>
            <td>${escapeHtml(product.category || "-")}</td>
            <td>${Number(product.price || product.priceRetail || 0).toFixed(2)}</td>
            <td>${lowStock ? `<span class="low-stock-badge">${product.quantity}</span>` : product.quantity}</td>
            <td><span class="status-badge ${product.active !== false ? 'active' : 'inactive'}">${product.active !== false ? getTranslation('common.active') : getTranslation('common.inactive')}</span></td>
            <td>
                <div class="table-actions">
                    ${canWriteProducts ? `<button class="table-action-button edit" data-action="edit" data-id="${product.id}">${getTranslation('products.actionButtons.edit')}</button>` : ''}
                    ${canWriteProducts ? `<button class="table-action-button delete" data-action="delete" data-id="${product.id}">${getTranslation('products.actionButtons.delete')}</button>` : ''}
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });

    tbody.addEventListener("click", handleProductAction);
}

function handleProductAction(e) {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action;

    if (action === "edit") openEditProductModal(id);
    if (action === "delete") deleteProductHandler(id);
}

function initializeSearch() {
    const searchInput = document.getElementById("productSearch");
    if (!searchInput) return;

    searchInput.addEventListener("input", () => {
        const term = searchInput.value.trim().toLowerCase();

        if (!term) {
            renderProducts(products);
            return;
        }

        const filtered = products.filter(p =>
            (p.name || "").toLowerCase().includes(term) ||
            (p.sku || "").toLowerCase().includes(term) ||
            (p.barcode || "").toLowerCase().includes(term) ||
            (p.category || "").toLowerCase().includes(term)
        );

        renderProducts(filtered);
    });
}

function initializeProductModal() {
    const modal = document.getElementById("productModal");
    const addBtn = document.getElementById("addProductButton");
    const emptyAddBtn = document.getElementById("emptyAddProductButton");
    const closeBtn = document.getElementById("closeProductModal");
    const cancelBtn = document.getElementById("cancelProductButton");
    const form = document.getElementById("productForm");

    if (!canWriteProducts) {
        if (addBtn) addBtn.style.display = "none";
        if (emptyAddBtn) emptyAddBtn.style.display = "none";
    }

    addBtn?.addEventListener("click", () => openProductModal());
    emptyAddBtn?.addEventListener("click", () => openProductModal());
    closeBtn?.addEventListener("click", closeProductModal);
    cancelBtn?.addEventListener("click", closeProductModal);
    form?.addEventListener("submit", handleProductSubmit);

    modal?.addEventListener("click", (e) => {
        if (e.target === modal) closeProductModal();
    });
}

function openProductModal(product = null) {
    if (!canWriteProducts) return;

    editingProductId = product ? product.id : null;
    const modal = document.getElementById("productModal");
    const form = document.getElementById("productForm");
    const title = document.querySelector("#productModal .modal-header h2");
    const errorEl = document.getElementById("productFormError");

    if (!modal || !form) return;

    form.reset();
    if (errorEl) {
        errorEl.style.display = "none";
        errorEl.textContent = "";
    }

    if (product) {
        if (title) title.textContent = getTranslation("products.modal.editTitle");
        document.getElementById("productName").value = product.name || "";
        document.getElementById("productSku").value = product.sku || "";
        document.getElementById("productBarcode").value = product.barcode || "";
        document.getElementById("productCategory").value = product.category || "";

        if (document.getElementById("productPriceRetail")) document.getElementById("productPriceRetail").value = product.priceRetail ?? product.price ?? 0;
        if (document.getElementById("productPriceWholesale")) document.getElementById("productPriceWholesale").value = product.priceWholesale ?? 0;
        if (document.getElementById("productUom")) document.getElementById("productUom").value = product.uom || "pcs";
        if (document.getElementById("productUomRatio")) document.getElementById("productUomRatio").value = product.uomRatio || 1;

        document.getElementById("productQuantity").value = product.quantity ?? 0;
        document.getElementById("productMinStock").value = product.minStock ?? 0;
        document.getElementById("productActive").checked = product.active !== false;
    } else {
        if (title) title.textContent = getTranslation("products.modal.title");
        if (document.getElementById("productUom")) document.getElementById("productUom").value = "pcs";
        if (document.getElementById("productUomRatio")) document.getElementById("productUomRatio").value = 1;
    }

    modal.style.display = "flex";
}

function openEditProductModal(id) {
    const product = products.find(p => p.id === id);
    if (product) openProductModal(product);
}

function closeProductModal() {
    const modal = document.getElementById("productModal");
    if (modal) modal.style.display = "none";
    editingProductId = null;
}

async function handleProductSubmit(e) {
    e.preventDefault();

    const name = document.getElementById("productName").value.trim();
    const sku = document.getElementById("productSku").value.trim();
    const barcode = document.getElementById("productBarcode").value.trim();
    const category = document.getElementById("productCategory").value.trim();

    const priceRetailVal = document.getElementById("productPriceRetail")?.value || 0;
    const priceWholesaleVal = document.getElementById("productPriceWholesale")?.value || 0;
    const uomVal = document.getElementById("productUom")?.value || "pcs";
    const uomRatioVal = document.getElementById("productUomRatio")?.value || 1;

    const quantity = document.getElementById("productQuantity").value;
    const minStock = document.getElementById("productMinStock").value;
    const active = document.getElementById("productActive").checked;

    if (!name) {
        showProductError(getTranslation("products.errors.nameRequired"));
        return;
    }

    if (priceRetailVal === "" || Number(priceRetailVal) < 0) {
        showProductError(getTranslation("products.errors.priceRequired"));
        return;
    }

    const productData = {
        name,
        sku,
        barcode,
        category,
        price: Number(priceRetailVal),
        priceRetail: Number(priceRetailVal),
        priceWholesale: Number(priceWholesaleVal),
        quantity: Number(quantity) || 0,
        minStock: Number(minStock) || 0,
        uom: uomVal,
        uomRatio: Number(uomRatioVal) || 1,
        active
    };

    try {
        let result;
        if (editingProductId) {
            result = await window.api.updateProduct(editingProductId, productData);
        } else {
            result = await window.api.createProduct(productData);
        }

        if (!result.success) {
            showProductError(result.message || getTranslation("products.errors.saveFailed"));
            return;
        }

        await loadProducts();
        closeProductModal();

    } catch (error) {
        console.error("Save product error:", error);
        showProductError(getTranslation("products.errors.saveFailed"));
    }
}

function showProductError(msg) {
    const el = document.getElementById("productFormError");
    if (el) {
        el.textContent = msg;
        el.style.display = "block";
    }
}

async function deleteProductHandler(id) {
    if (!canWriteProducts) return;
    if (!confirm(getTranslation("products.confirmDelete"))) return;

    try {
        const result = await window.api.deleteProduct(id);
        if (result.success) {
            await loadProducts();
        } else {
            alert(result.message || getTranslation("products.errors.deleteFailed"));
        }
    } catch (error) {
        console.error("Delete product error:", error);
        alert(getTranslation("common.error"));
    }
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

document.addEventListener("DOMContentLoaded", initializeProducts);