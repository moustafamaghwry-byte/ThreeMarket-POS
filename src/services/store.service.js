// ============================================================
// ThreeMarket POS - Store Service
// Stores basic store/branch info shown on receipts.
// Editable manually via data/store.json for now.
// Will later be editable from the Settings page.
// ============================================================

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "../../data");
const STORE_FILE = path.join(DATA_DIR, "store.json");

const DEFAULT_STORE_INFO = {
    name: "THREE MARKET",
    tagline: "RETAIL & POS SYSTEM",
    branch: "Super Market Branch",
    phone: "0100 XXX XXXX",
    address: "Cairo, Egypt",
    logo: "",
    footerText: "THANK YOU FOR SHOPPING",
    voidPermission: "admin_only",
    voidScope: "last_sale_only"
};

function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

function getStoreInfo() {
    ensureDataDir();

    if (!fs.existsSync(STORE_FILE)) {
        fs.writeFileSync(STORE_FILE, JSON.stringify(DEFAULT_STORE_INFO, null, 4), "utf-8");
        return DEFAULT_STORE_INFO;
    }

    try {
        const data = fs.readFileSync(STORE_FILE, "utf-8");
        return { ...DEFAULT_STORE_INFO, ...JSON.parse(data) };
    } catch (error) {
        console.error("[Store] Load error:", error);
        return DEFAULT_STORE_INFO;
    }
}

function updateStoreInfo(updates) {
    ensureDataDir();

    const current = getStoreInfo();
    const updated = { ...current, ...updates };

    try {
        fs.writeFileSync(STORE_FILE, JSON.stringify(updated, null, 4), "utf-8");
        return { success: true, store: updated };
    } catch (error) {
        console.error("[Store] Save error:", error);
        return { success: false, message: "Failed to save store info." };
    }
}

module.exports = {
    getStoreInfo,
    updateStoreInfo
};