import { loadTranslations, toggleLanguage } from "./i18n.js";
import { loadAppShell } from "./component-loader.js";
import { initializeNavigation, applyRoleBasedAccess, checkRedirectLoop } from "./navigation.js";
import permissionsConfig from "../config/permissions.config.json";

let storeInfo = null;

// ============================================================
// VAT Settings State
// Keeps the currently loaded application VAT configuration.
// ============================================================

let taxSettings = {
    vatEnabled: true,
    vatRate: 14
};

async function initializeSettings() {
    try {
        const session = await window.api.getSession();

        if (!session) {
            window.location.href = "/";
            return;
        }

        if (session.role === "administrator") session.role = "admin";

        await loadAppShell();

        const rolePerms = session.permissions || permissionsConfig.rolePresets[session.role] || {};

        if (!rolePerms.settings || rolePerms.settings === "none") {
            const fallback = permissionsConfig.allPages.find(p => rolePerms[p] && rolePerms[p] !== "none") || "dashboard";
            if (checkRedirectLoop()) return;
            window.location.href = `/pages/${fallback}.html`;
            return;
        }

        const usernameEl = document.getElementById("currentUsername");
        const roleEl = document.getElementById("currentRole");
        if (usernameEl) usernameEl.textContent = session.username;
        if (roleEl) roleEl.textContent = session.role;

        await loadTranslations();
        initializeNavigation();
        applyRoleBasedAccess(session);

        document.getElementById("languageButton")?.addEventListener("click", toggleLanguage);
        document.getElementById("logoutButton")?.addEventListener("click", async () => {
            await window.api.logout();
            window.location.href = "/";
        });

        initializeTabs();
        await loadStoreInfo();
        initializeStoreForm();
        initializeBillingForm();
        initializeVatSettings();

        console.log("Settings page initialized");

    } catch (error) {
        console.error("Settings initialization error:", error);
    }
}

function initializeTabs() {
    const tabs = document.querySelectorAll(".settings-tab");
    console.log("Tabs found:", tabs.length);
    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");

            document.querySelectorAll(".settings-panel").forEach(panel => panel.classList.remove("active"));
            document.getElementById(`panel-${tab.dataset.tab}`)?.classList.add("active");
        });
    });
}

async function loadStoreInfo() {
    try {
        storeInfo = await window.api.getStoreInfo();
        populateForms(storeInfo);
    } catch (error) {
        console.error("Failed to load store info:", error);
    }
}

function populateForms(info) {
    document.getElementById("storeName").value = info.name || "";
    document.getElementById("storeTagline").value = info.tagline || "";
    document.getElementById("storeBranch").value = info.branch || "";
    document.getElementById("storePhone").value = info.phone || "";
    document.getElementById("storeAddress").value = info.address || "";
    document.getElementById("storeLogo").value = info.logo || "";

    document.getElementById("footerText").value = info.footerText || "";
    document.getElementById("voidPermission").value = info.voidPermission || "admin_only";
    document.getElementById("voidScope").value = info.voidScope || "last_sale_only";
}

function initializeStoreForm() {
    const form = document.getElementById("storeForm");
    form?.addEventListener("submit", async (e) => {
        e.preventDefault();

        const updates = {
            name: document.getElementById("storeName").value.trim(),
            tagline: document.getElementById("storeTagline").value.trim(),
            branch: document.getElementById("storeBranch").value.trim(),
            phone: document.getElementById("storePhone").value.trim(),
            address: document.getElementById("storeAddress").value.trim(),
            logo: document.getElementById("storeLogo").value.trim()
        };

        await saveStoreInfo(updates, "storeFormMessage");
    });
}

function initializeBillingForm() {
    const form = document.getElementById("billingForm");
    form?.addEventListener("submit", async (e) => {
        e.preventDefault();

        const updates = {
            footerText: document.getElementById("footerText").value.trim(),
            voidPermission: document.getElementById("voidPermission").value,
            voidScope: document.getElementById("voidScope").value
        };

        await saveStoreInfo(updates, "billingFormMessage");
    });
}

async function saveStoreInfo(updates, messageElId) {
    try {
        const result = await window.api.updateStoreInfo(updates);

        if (!result.success) {
            showMessage(messageElId, result.message || "Failed to save settings.", false);
            return;
        }

        storeInfo = result.store;
        showMessage(messageElId, "Settings saved successfully.", true);

    } catch (error) {
        console.error("Save settings error:", error);
        showMessage(messageElId, "An unexpected error occurred.", false);
    }
}

function showMessage(elId, text, isSuccess) {
    const el = document.getElementById(elId);
    if (!el) return;

    el.textContent = text;
    el.className = `settings-message ${isSuccess ? "is-success" : "is-error"}`;
    el.style.display = "block";

    setTimeout(() => {
        el.style.display = "none";
    }, 3000);
}

// ============================================================
// Load VAT Settings
// Retrieves the application VAT configuration from Electron.
// ============================================================

async function loadVatSettings() {
    try {
        const result = await window.api.getTaxSettings();

        if (!result?.success) {
            throw new Error(result?.message || "Failed to load VAT settings.");
        }

        taxSettings = {
            vatEnabled: result.settings?.vatEnabled === true,
            vatRate: Number(result.settings?.vatRate) || 0
        };

        const enabledInput = document.getElementById("vatEnabled");
        const rateInput = document.getElementById("vatRate");

        if (enabledInput) {
            enabledInput.checked = taxSettings.vatEnabled;
        }

        if (rateInput) {
            rateInput.value = taxSettings.vatRate;
        }

        updateVatRateState();

    } catch (error) {
        console.error("[SETTINGS] Failed to load VAT settings:", error);
        showVatSettingsMessage(error.message || "Failed to load VAT settings.");
    }
}

// ============================================================
// Update VAT Rate State
// Disables the VAT rate input when VAT itself is disabled.
// ============================================================

function updateVatRateState() {
    const enabledInput = document.getElementById("vatEnabled");
    const rateInput = document.getElementById("vatRate");

    if (!enabledInput || !rateInput) {
        return;
    }

    rateInput.disabled = !enabledInput.checked;
}

// ============================================================
// Save VAT Settings
// Validates the form and saves the configuration.
// ============================================================

async function saveVatSettings() {
    const enabledInput = document.getElementById("vatEnabled");
    const rateInput = document.getElementById("vatRate");

    if (!enabledInput || !rateInput) {
        return;
    }

    const vatEnabled = enabledInput.checked;
    let vatRate = Number(rateInput.value);

    if (!Number.isFinite(vatRate)) {
        vatRate = 0;
    }

    if (vatRate < 0 || vatRate > 100) {
        showVatSettingsMessage("VAT rate must be between 0 and 100.");
        return;
    }

    try {
        const result = await window.api.saveTaxSettings({
            vatEnabled,
            vatRate
        });

        if (!result?.success) {
            throw new Error(result?.message || "Failed to save VAT settings.");
        }

        taxSettings = {
            vatEnabled: result.settings.vatEnabled,
            vatRate: Number(result.settings.vatRate) || 0
        };

        showVatSettingsMessage("VAT settings saved successfully.", true);

    } catch (error) {
        console.error("[SETTINGS] Failed to save VAT settings:", error);
        showVatSettingsMessage(error.message || "Failed to save VAT settings.");
    }
}

// ============================================================
// VAT Settings Message
// Displays success or error messages inside the settings page.
// ============================================================

function showVatSettingsMessage(message, success = false) {
    const element = document.getElementById("vatSettingsMessage");

    if (!element) {
        return;
    }

    element.textContent = message;
    element.style.display = "block";
    element.style.background = success ? "#dcfce7" : "#fee2e2";
    element.style.color = success ? "#166534" : "#991b1b";

    setTimeout(() => {
        element.style.display = "none";
    }, 3000);
}

// ============================================================
// Initialize VAT Settings
// Connects controls and loads persisted settings.
// ============================================================

function initializeVatSettings() {
    document.getElementById("vatEnabled")?.addEventListener("change", updateVatRateState);
    document.getElementById("saveVatSettingsBtn")?.addEventListener("click", saveVatSettings);

    loadVatSettings();
}

document.addEventListener("DOMContentLoaded", initializeSettings);