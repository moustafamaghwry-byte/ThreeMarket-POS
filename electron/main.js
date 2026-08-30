// ============================================================
// ThreeMarket POS - Electron Main Process
// Handles application lifecycle, IPC communication,
// authentication, products, sales, returns, settings,
// users, store configuration and cash drawer.
// ============================================================
// ============================================================
// Product Migration Validation
// ============================================================

const {
    validateProducts
} = require("../src/database/validate-products");

const {
    app,
    BrowserWindow,
    ipcMain
} = require("electron");

const path = require("path");

// ============================================================
// SQLite Database
// ============================================================

const {
    initializeDatabase,
    closeDatabase
} = require("../src/database/database");

const {
    runMigrations
} = require("../src/database/migrations");

// ============================================================
// Initialize ThreeMarket POS database.
// ============================================================

// ============================================================
// Initialize ThreeMarket POS database.
// ============================================================

// ============================================================
// Initialize ThreeMarket POS database.
// Runs migrations and validates migrated product data.
// ============================================================

function initializeAppDatabase() {
    const userDataPath = app.getPath("userData");

    console.log(
        `[Database] Electron userData path: ${userDataPath}`
    );

    initializeDatabase(userDataPath);

    // Run all pending database migrations.
    runMigrations();

    // Validate products after migrations complete.
    validateProducts();
}

// ============================================================
// Services
// ============================================================

const returnsService =
    require("../src/services/returns.service");

const storeService =
    require("../src/services/store.service");

const authService =
    require("../src/services/auth.service");

const sessionService =
    require("../src/services/session.service");

const productService =
    require("../src/services/product.service");

const saleService =
    require("../src/services/sale.service");

const settingsService =
    require("../src/services/settings.service");

// ============================================================
// Permission Helper
// Admin and Administrator have full access.
// Other users need the required page permission.
// ============================================================

function requireWritePermission(page) {

    const session =
        sessionService.getSession();

    // --------------------------------------------------------
    // User must be authenticated.
    // --------------------------------------------------------

    if (!session) {

        return {
            allowed: false,

            error: {
                success: false,
                message:
                    "Not authenticated."
            }
        };
    }

    // --------------------------------------------------------
    // Administrators always have full access.
    // --------------------------------------------------------

    if (
        session.role === "admin" ||
        session.role === "administrator"
    ) {

        return {
            allowed: true
        };
    }

    // --------------------------------------------------------
    // Check normal user permissions.
    // --------------------------------------------------------

    const permissions =
        session.permissions || {};

    if (
        permissions[page] !== "write"
    ) {

        return {
            allowed: false,

            error: {
                success: false,
                message:
                    "You do not have permission to perform this action."
            }
        };
    }

    return {
        allowed: true
    };
}

// ============================================================
// Create Main Window
// ============================================================

function createWindow() {

    const win =
        new BrowserWindow({

            width: 1400,
            height: 900,

            minWidth: 1200,
            minHeight: 700,

            autoHideMenuBar: true,

            show: false,

            webPreferences: {

                preload:
                    path.join(
                        __dirname,
                        "preload.js"
                    ),

                contextIsolation: true,

                nodeIntegration: false
            }
        });

    // --------------------------------------------------------
    // Show window after the page has loaded.
    // --------------------------------------------------------

    win.once(
        "ready-to-show",
        () => {

            win.show();

            win.focus();
        }
    );

    // --------------------------------------------------------
    // Production / Development loading.
    // --------------------------------------------------------

    if (
        process.env.NODE_ENV ===
        "production"
    ) {

        win.loadFile(
            path.join(
                __dirname,
                "../dist/index.html"
            )
        );

    } else {

        win.loadURL(
            "http://localhost:5173/"
        );
    }
}

// ============================================================
// Authentication
// ============================================================

ipcMain.handle(
    "auth:login",
    async (_event, credentials) => {

        try {

            const result =
                authService.login(
                    credentials.username,
                    credentials.password
                );

            // ------------------------------------------------
            // Create application session after successful login.
            // ------------------------------------------------

            if (
                result.success
            ) {

                const session =
                    sessionService.createSession(
                        result.user
                    );

                return {
                    success: true,
                    user: session
                };
            }

            return result;

        } catch (error) {

            console.error(
                "[IPC] auth:login failed:",
                error
            );

            return {
                success: false,
                message:
                    "Login failed."
            };
        }
    }
);

// ============================================================
// Session
// ============================================================

ipcMain.handle(
    "session:get",
    () => {

        return sessionService.getSession();
    }
);

ipcMain.handle(
    "session:logout",
    () => {

        sessionService.clearSession();

        return {
            success: true
        };
    }
);

// ============================================================
// Navigation
// ============================================================

ipcMain.handle(
    "navigate:dashboard",
    (event) => {

        const win =
            BrowserWindow.fromWebContents(
                event.sender
            );

        // ----------------------------------------------------
        // Make sure the BrowserWindow still exists.
        // ----------------------------------------------------

        if (!win) {

            return {
                success: false,
                message:
                    "Application window not found."
            };
        }

        // ----------------------------------------------------
        // Production build.
        // ----------------------------------------------------

        if (
            process.env.NODE_ENV ===
            "production"
        ) {

            win.loadFile(
                path.join(
                    __dirname,
                    "../dist/pages/dashboard.html"
                )
            );

        } else {

            // ------------------------------------------------
            // Development server.
            // ------------------------------------------------

            win.loadURL(
                "http://localhost:5173/pages/dashboard.html"
            );
        }

        return {
            success: true
        };
    }
);

// ============================================================
// Navigate to History Page
// Loads the History page in production or development mode.
// ============================================================

ipcMain.handle(
    "navigate:history",
    (event) => {

        const win =
            BrowserWindow.fromWebContents(
                event.sender
            );

        // ----------------------------------------------------
        // Make sure the BrowserWindow still exists.
        // ----------------------------------------------------

        if (!win) {

            return {
                success: false
            };
        }

        // ----------------------------------------------------
        // Production build.
        // ----------------------------------------------------

        if (
            process.env.NODE_ENV ===
            "production"
        ) {

            win.loadFile(
                path.join(
                    __dirname,
                    "../dist/pages/history.html"
                )
            );

        } else {

            // ------------------------------------------------
            // Development server.
            // ------------------------------------------------

            win.loadURL(
                "http://localhost:5173/pages/history.html"
            );
        }

        return {
            success: true
        };
    }
);

// ============================================================
// Products
// ============================================================

ipcMain.handle(
    "products:getAll",
    () => {

        return productService.getAllProducts();
    }
);

ipcMain.handle(
    "products:create",
    (_event, productData) => {

        const check =
            requireWritePermission(
                "products"
            );

        if (!check.allowed) {

            return check.error;
        }

        return productService.createProduct(
            productData
        );
    }
);

ipcMain.handle(
    "products:update",
    (_event, { id, updates }) => {

        const check =
            requireWritePermission(
                "products"
            );

        if (!check.allowed) {

            return check.error;
        }

        return productService.updateProduct(
            id,
            updates
        );
    }
);

ipcMain.handle(
    "products:delete",
    (_event, id) => {

        const check =
            requireWritePermission(
                "products"
            );

        if (!check.allowed) {

            return check.error;
        }

        return productService.deleteProduct(
            id
        );
    }
);

// ============================================================
// Store Settings
// ============================================================

ipcMain.handle(
    "store:getInfo",
    () => {

        return storeService.getStoreInfo();
    }
);

ipcMain.handle(
    "store:update",
    (_event, updates) => {

        const check =
            requireWritePermission(
                "settings"
            );

        if (!check.allowed) {

            return check.error;
        }

        return storeService.updateStoreInfo(
            updates
        );
    }
);

// ============================================================
// VAT / Tax Settings
// Application-wide persistent VAT configuration.
// VAT is stored through settings.service.js.
// ============================================================

ipcMain.handle(
    "settings:get-tax",
    async () => {

        try {

            const settings =
                settingsService.getTaxSettings();

            console.log(
                "[IPC] settings:get-tax",
                settings
            );

            return {
                success: true,

                settings: {

                    vatEnabled:
                        Boolean(
                            settings?.vatEnabled
                        ),

                    vatRate:
                        Number(
                            settings?.vatRate
                        ) || 0
                }
            };

        } catch (error) {

            console.error(
                "[IPC] settings:get-tax failed:",
                error
            );

            return {
                success: false,

                message:
                    "Failed to load tax settings.",

                settings: {

                    vatEnabled: false,

                    vatRate: 14
                }
            };
        }
    }
);

ipcMain.handle(
    "settings:save-tax",
    async (_event, taxSettings) => {

        // ----------------------------------------------------
        // Check settings write permission.
        // ----------------------------------------------------

        const check =
            requireWritePermission(
                "settings"
            );

        if (!check.allowed) {

            return check.error;
        }

        try {

            const vatEnabled =
                Boolean(
                    taxSettings?.vatEnabled
                );

            let vatRate =
                Number(
                    taxSettings?.vatRate
                );

            // ------------------------------------------------
            // Use 14% as default when the supplied value
            // is invalid.
            // ------------------------------------------------

            if (
                !Number.isFinite(
                    vatRate
                )
            ) {

                vatRate = 14;
            }

            // ------------------------------------------------
            // Keep VAT between 0% and 100%.
            // ------------------------------------------------

            vatRate =
                Math.max(
                    0,
                    Math.min(
                        vatRate,
                        100
                    )
                );

            const result =
                settingsService.saveTaxSettings(
                    {
                        vatEnabled,
                        vatRate
                    }
                );

            console.log(
                "[SETTINGS] VAT saved:",
                {
                    vatEnabled,
                    vatRate
                }
            );

            return result;

        } catch (error) {

            console.error(
                "[IPC] settings:save-tax failed:",
                error
            );

            return {
                success: false,

                message:
                    "Failed to save tax settings."
            };
        }
    }
);

// ============================================================
// Sales
// ============================================================

ipcMain.handle(
    "sales:create",
    (_event, saleData) => {

        const check =
            requireWritePermission(
                "sales"
            );

        if (!check.allowed) {

            return check.error;
        }

        return saleService.createSale(
            saleData
        );
    }
);

ipcMain.handle(
    "sales:getAll",
    () => {

        return saleService.getAllSales();
    }
);

ipcMain.handle(
    "sales:getTodaySummary",
    () => {

        return saleService.getTodaySummary();
    }
);

ipcMain.handle(
    "sales:getTopProductsInRange",
    (_event, { from, to }) => {

        return saleService.getTopProductsInRange(
            from,
            to
        );
    }
);

// ============================================================
// Returns
// Admins can always create returns.
// Other users require:
// permissions.returns === "write"
// ============================================================

ipcMain.handle(
    "returns:findSale",
    (_event, identifier) => {

        try {

            return returnsService.getSaleForReturn(
                identifier
            );

        } catch (error) {

            console.error(
                "[Returns] Find sale failed:",
                error
            );

            return {
                success: false,
                message:
                    "Failed to find sale."
            };
        }
    }
);

ipcMain.handle(
    "returns:getSaleForReturn",
    (_event, identifier) => {

        try {

            return returnsService.getSaleForReturn(
                identifier
            );

        } catch (error) {

            console.error(
                "[Returns] Get sale failed:",
                error
            );

            return {
                success: false,
                message:
                    "Failed to find sale."
            };
        }
    }
);

ipcMain.handle(
    "returns:calculate",
    (_event, { saleId, items }) => {

        try {

            return returnsService.calculateReturn(
                saleId,
                items
            );

        } catch (error) {

            console.error(
                "[Returns] Calculate failed:",
                error
            );

            return {
                success: false,
                message:
                    "Failed to calculate return."
            };
        }
    }
);

ipcMain.handle(
    "returns:create",
    (_event, returnData) => {

        // ----------------------------------------------------
        // Check Returns permission.
        // Admin automatically passes this check.
        // ----------------------------------------------------

        const check =
            requireWritePermission(
                "returns"
            );

        if (!check.allowed) {

            return check.error;
        }

        const session =
            sessionService.getSession();

        // ----------------------------------------------------
        // Make sure the user is still authenticated.
        // ----------------------------------------------------

        if (!session) {

            return {
                success: false,
                message:
                    "Not authenticated."
            };
        }

        try {

            const result =
                returnsService.createReturn({

                    ...returnData,

                    userId:
                        session.userId ||
                        null,

                    username:
                        session.username ||
                        null
                });

            console.log(
                "[Returns] Return created:",
                result
            );

            return result;

        } catch (error) {

            console.error(
                "[Returns] Create failed:",
                error
            );

            return {
                success: false,
                message:
                    "Failed to process return."
            };
        }
    }
);

ipcMain.handle(
    "returns:getAll",
    () => {

        try {

            return returnsService.getAllReturns();

        } catch (error) {

            console.error(
                "[Returns] Get all failed:",
                error
            );

            return [];
        }
    }
);

ipcMain.handle(
    "returns:getSaleReturns",
    (_event, saleIdentifier) => {

        try {

            return returnsService.getSaleReturns(
                saleIdentifier
            );

        } catch (error) {

            console.error(
                "[Returns] Get sale returns failed:",
                error
            );

            return [];
        }
    }
);

// ============================================================
// Void Last Sale
// ============================================================

ipcMain.handle(
    "sales:voidLastSale",
    () => {

        const session =
            sessionService.getSession();

        // ----------------------------------------------------
        // User must be authenticated.
        // ----------------------------------------------------

        if (!session) {

            return {
                success: false,
                message:
                    "Not authenticated."
            };
        }

        const storeInfo =
            storeService.getStoreInfo();

        // ----------------------------------------------------
        // Respect store-level void permission.
        // ----------------------------------------------------

        if (
            storeInfo.voidPermission ===
                "admin_only" &&
            session.role !== "admin" &&
            session.role !== "administrator"
        ) {

            return {
                success: false,
                message:
                    "Only administrators can void sales."
            };
        }

        return saleService.voidLastSale(
            session.userId,
            session.username
        );
    }
);

ipcMain.handle(
    "sales:getLastActiveSale",
    () => {

        return saleService.getLastActiveSale();
    }
);

// ============================================================
// Cash Drawer
// ============================================================

ipcMain.handle(
    "cashDrawer:open",
    async () => {

        try {

            // ------------------------------------------------
            // ESC/POS command for opening the cash drawer.
            // ------------------------------------------------

            const command =
                Buffer.from([
                    0x1B,
                    0x70,
                    0x00,
                    0x19,
                    0xFA
                ]);

            console.log(
                "[Cash Drawer] Open command:",
                command.toString("hex")
            );

            return {
                success: true,

                message:
                    "Cash drawer command prepared."
            };

        } catch (error) {

            console.error(
                "[Cash Drawer] Failed:",
                error
            );

            return {
                success: false,

                message:
                    "Failed to open cash drawer."
            };
        }
    }
);

// ============================================================
// Users
// ============================================================

ipcMain.handle(
    "users:getAll",
    () => {

        return authService.getAllUsers();
    }
);

ipcMain.handle(
    "users:create",
    (_event, userData) => {

        const check =
            requireWritePermission(
                "users"
            );

        if (!check.allowed) {

            return check.error;
        }

        return authService.createUser(
            userData
        );
    }
);

ipcMain.handle(
    "users:update",
    (_event, { id, updates }) => {

        const check =
            requireWritePermission(
                "users"
            );

        if (!check.allowed) {

            return check.error;
        }

        return authService.updateUser(
            id,
            updates
        );
    }
);

ipcMain.handle(
    "users:delete",
    (_event, id) => {

        const check =
            requireWritePermission(
                "users"
            );

        if (!check.allowed) {

            return check.error;
        }

        return authService.deleteUser(
            id
        );
    }
);

// ============================================================
// Application Lifecycle
// ============================================================

app.whenReady().then(() => {

    // --------------------------------------------------------
    // Initialize SQLite Database and Run Migrations
    // --------------------------------------------------------

    initializeAppDatabase();

    console.log(
        "============================================"
    );

    console.log(
        "ThreeMarket POS Main Process Started"
    );

    console.log(
        "Electron:",
        process.versions.electron
    );

    console.log(
        "Settings Service:",
        typeof settingsService.getTaxSettings
    );

    console.log(
        "Returns Service:",
        typeof returnsService.createReturn
    );

    console.log(
        "VAT IPC Handler Registered: settings:get-tax"
    );

    console.log(
        "Returns IPC Handler Registered"
    );

    console.log(
        "============================================"
    );

    // --------------------------------------------------------
    // Create the main application window.
    // --------------------------------------------------------

    createWindow();

    // --------------------------------------------------------
    // macOS:
    // Re-create the window when the application is activated.
    // --------------------------------------------------------

    app.on(
        "activate",
        () => {

            if (
                BrowserWindow
                    .getAllWindows()
                    .length === 0
            ) {

                createWindow();
            }
        }
    );
});

// ============================================================
// Close Application Lifecycle
// ============================================================

// ============================================================
// Close SQLite connection before application shutdown.
// ============================================================

app.on("before-quit", () => {
    closeDatabase();
});

app.on(
    "window-all-closed",
    () => {

        // ----------------------------------------------------
        // Keep application behavior standard on macOS.
        // ----------------------------------------------------

        if (
            process.platform !==
            "darwin"
        ) {

            app.quit();
        }
    }
);