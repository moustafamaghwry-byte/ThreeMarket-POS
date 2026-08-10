// ============================================================
// ThreeMarket POS - Preload API
// Exposes secure application APIs to the renderer process.
// ============================================================

const {
    contextBridge,
    ipcRenderer
} = require("electron");


// ============================================================
// Expose Application API
// Provides authentication, session, navigation, and product
// operations without enabling Node.js integration in the
// renderer process.
// ============================================================

contextBridge.exposeInMainWorld(
    "api",
    {

        // ----------------------------------------------------
        // Authentication
        // ----------------------------------------------------

        login:
            (username, password) =>
                ipcRenderer.invoke(
                    "auth:login",
                    {
                        username,
                        password
                    }
                ),


        // ----------------------------------------------------
        // Session
        // ----------------------------------------------------

        getSession:
            () =>
                ipcRenderer.invoke(
                    "session:get"
                ),


        logout:
            () =>
                ipcRenderer.invoke(
                    "session:logout"
                ),


        // ----------------------------------------------------
        // Navigation
        // ----------------------------------------------------

        navigateToDashboard:
            () =>
                ipcRenderer.invoke(
                    "navigate:dashboard"
                ),


        // ----------------------------------------------------
        // Products
        // ----------------------------------------------------

        getProducts:
            () =>
                ipcRenderer.invoke(
                    "products:getAll"
                ),


        createProduct:
            (productData) =>
                ipcRenderer.invoke(
                    "products:create",
                    productData
                )

    }
);