// ============================================================
// ThreeMarket POS - Electron Main Process
// This file manages the Electron application window,
// authentication, sessions, navigation, and product IPC.
// ============================================================
const productService =
    require("../src/services/product.service");

const {
    app,
    BrowserWindow,
    ipcMain
} = require("electron");

const path = require("path");


// ============================================================
// Application Services
// These services contain the business logic used by
// the Electron main process.
// ============================================================

const authService =
    require("../src/services/auth.service");

const sessionService =
    require("../src/services/session.service");

const productService =
    require("../src/services/product.service");


// ============================================================
// Create Main Application Window
// Creates the Electron BrowserWindow and loads the
// renderer application from the Vite development server.
// ============================================================

function createWindow() {

    const win = new BrowserWindow({

        width: 1400,

        height: 900,

        minWidth: 1200,

        minHeight: 700,

        autoHideMenuBar: true,


        // ----------------------------------------------------
        // Renderer Security Configuration
        // Context isolation keeps the renderer isolated from
        // Node.js APIs. Node integration remains disabled.
        // ----------------------------------------------------

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
    // Load the renderer application.
    // Vite serves the application during development.
    // --------------------------------------------------------

    win.loadURL(
        "http://localhost:5173/"
    );

}


// ============================================================
// Authentication IPC
// Handles login requests coming from the renderer process.
// ============================================================

ipcMain.handle(
    "auth:login",
    async (event, credentials) => {

        const result =
            authService.login(
                credentials.username,
                credentials.password
            );


        // ----------------------------------------------------
        // Create a session after successful authentication.
        // ----------------------------------------------------

        if (result.success) {

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

    }
);


// ============================================================
// Session IPC
// Handles retrieving the current logged-in session.
// ============================================================

ipcMain.handle(
    "session:get",
    () => {

        return sessionService.getSession();

    }
);


// ============================================================
// Session Logout IPC
// Clears the current user session.
// ============================================================

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
// Dashboard Navigation IPC
// Provides a backend-controlled way to navigate to
// the Dashboard page.
// ============================================================

ipcMain.handle(
    "navigate:dashboard",
    (event) => {

        const win =
            BrowserWindow.fromWebContents(
                event.sender
            );


        win.loadURL(
            "http://localhost:5173/pages/dashboard.html"
        );


        return {

            success: true

        };

    }
);


// ============================================================
// Product IPC - Get All Products
// Returns all products from the Product Service.
// ============================================================

ipcMain.handle(
    "products:getAll",
    () => {

        return productService.getAllProducts();

    }
);


// ============================================================
// Product IPC - Create Product
// Creates a new product using the Product Service.
// ============================================================

ipcMain.handle(
    "products:create",
    (event, productData) => {

        return productService.createProduct(
            productData
        );

    }
);


// ============================================================
// Product IPC - Update Product
// Updates an existing product using its ID.
// ============================================================

ipcMain.handle(
    "products:update",
    (event, data) => {

        return productService.updateProduct(
            data.id,
            data.productData
        );

    }
);


// ============================================================
// Product IPC - Delete Product
// Deletes a product using its ID.
// ============================================================

ipcMain.handle(
    "products:delete",
    (event, id) => {

        return productService.deleteProduct(
            id
        );

    }
);


// ============================================================
// Product IPC - Search Products
// Searches products by name, SKU, barcode,
// or category.
// ============================================================

ipcMain.handle(
    "products:search",
    (event, searchTerm) => {

        return productService.searchProducts(
            searchTerm
        );

    }
);


// ============================================================
// Product IPC - Low Stock Products
// Returns products that reached or dropped below
// their configured minimum stock level.
// ============================================================

ipcMain.handle(
    "products:lowStock",
    () => {

        return productService.getLowStockProducts();

    }
);


// ============================================================
// Product IPC - Product Count
// Returns the total number of products.
// This will later be used by the Dashboard statistics.
// ============================================================

ipcMain.handle(
    "products:count",
    () => {

        return productService.getProductCount();

    }
);

// ============================================================
// Product IPC Handlers
// Exposes product operations to the renderer process.
// ============================================================


// ============================================================
// Get Products
// Returns all products from the product service.
// ============================================================

ipcMain.handle(
    "products:getAll",
    () => {

        return productService.getAllProducts();

    }
);


// ============================================================
// Create Product
// Creates a new product through the product service.
// ============================================================

ipcMain.handle(
    "products:create",
    (event, productData) => {

        return productService.createProduct(
            productData
        );

    }
);
// ============================================================
// Application Ready
// Creates the main application window after Electron
// has finished initializing.
// ============================================================

app.whenReady().then(
    createWindow
);


// ============================================================
// Application Shutdown
// Keeps the standard Electron behavior on macOS while
// closing the application normally on Windows/Linux.
// ============================================================

app.on(
    "window-all-closed",
    () => {

        if (process.platform !== "darwin") {

            app.quit();

        }

    }
);