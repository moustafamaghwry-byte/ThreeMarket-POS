// ============================================================
// ThreeMarket POS - Electron Preload API
// Secure bridge between Renderer and Electron Main Process.
// ============================================================

const {
    contextBridge,
    ipcRenderer
} = require("electron");

contextBridge.exposeInMainWorld("api", {

    // ========================================================
    // Authentication
    // ========================================================

    login: (username, password) =>
        ipcRenderer.invoke(
            "auth:login",
            {
                username,
                password
            }
        ),

    // ========================================================
    // Session
    // ========================================================

    getSession: () =>
        ipcRenderer.invoke(
            "session:get"
        ),

    logout: () =>
        ipcRenderer.invoke(
            "session:logout"
        ),

    // ========================================================
    // Navigation
    // ========================================================

    navigateToDashboard: () =>
        ipcRenderer.invoke(
            "navigate:dashboard"
        ),

    navigateToHistory: () =>
        ipcRenderer.invoke(
            "navigate:history"
        ),

    // ========================================================
    // Products
    // ========================================================

    getProducts: () =>
        ipcRenderer.invoke(
            "products:getAll"
        ),

    createProduct: (productData) =>
        ipcRenderer.invoke(
            "products:create",
            productData
        ),

    updateProduct: (id, updates) =>
        ipcRenderer.invoke(
            "products:update",
            {
                id,
                updates
            }
        ),

    deleteProduct: (id) =>
        ipcRenderer.invoke(
            "products:delete",
            id
        ),

    // ========================================================
    // Store Information
    // ========================================================

    getStoreInfo: () =>
        ipcRenderer.invoke(
            "store:getInfo"
        ),

    updateStoreInfo: (updates) =>
        ipcRenderer.invoke(
            "store:update",
            updates
        ),

    // ========================================================
    // VAT / Tax Settings
    // ========================================================

    getTaxSettings: () =>
        ipcRenderer.invoke(
            "settings:get-tax"
        ),

    saveTaxSettings: (settings) =>
        ipcRenderer.invoke(
            "settings:save-tax",
            settings
        ),

    // ========================================================
    // Sales
    // ========================================================

    createSale: (saleData) =>
        ipcRenderer.invoke(
            "sales:create",
            saleData
        ),

    getAllSales: () =>
        ipcRenderer.invoke(
            "sales:getAll"
        ),

    getTodaySummary: () =>
        ipcRenderer.invoke(
            "sales:getTodaySummary"
        ),

    getTopProductsInRange: (
        from,
        to
    ) =>
        ipcRenderer.invoke(
            "sales:getTopProductsInRange",
            {
                from,
                to
            }
        ),

    voidLastSale: () =>
        ipcRenderer.invoke(
            "sales:voidLastSale"
        ),

    getLastActiveSale: () =>
        ipcRenderer.invoke(
            "sales:getLastActiveSale"
        ),

    // ========================================================
    // Returns
    // ========================================================
    // The renderer uses getSaleForReturn().
    // This maps directly to the returns:getSaleForReturn IPC handler.
    // ========================================================

    getSaleForReturn: (identifier) =>
        ipcRenderer.invoke(
            "returns:getSaleForReturn",
            identifier
        ),

    calculateReturn: (
        saleId,
        items
    ) =>
        ipcRenderer.invoke(
            "returns:calculate",
            {
                saleId,
                items
            }
        ),

    createReturn: (
        returnData
    ) =>
        ipcRenderer.invoke(
            "returns:create",
            returnData
        ),

    getAllReturns: () =>
        ipcRenderer.invoke(
            "returns:getAll"
        ),

    getSaleReturns: (
        saleIdentifier
    ) =>
        ipcRenderer.invoke(
            "returns:getSaleReturns",
            saleIdentifier
        ),

    // ========================================================
    // Cash Drawer
    // ========================================================

    openCashDrawer: () =>
        ipcRenderer.invoke(
            "cashDrawer:open"
        ),

    // ========================================================
    // Users
    // ========================================================

    getAllUsers: () =>
        ipcRenderer.invoke(
            "users:getAll"
        ),

    createUser: (
        userData
    ) =>
        ipcRenderer.invoke(
            "users:create",
            userData
        ),

    updateUser: (
        id,
        updates
    ) =>
        ipcRenderer.invoke(
            "users:update",
            {
                id,
                updates
            }
        ),

    deleteUser: (
        id
    ) =>
        ipcRenderer.invoke(
            "users:delete",
            id
        )
});

// ============================================================
// Preload Ready Log
// ============================================================

console.log(
    "[Preload] ThreeMarket POS API loaded successfully."
);