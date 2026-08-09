const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

const authService = require("../src/services/auth.service");
const sessionService = require("../src/services/session.service");

function createWindow() {
    const win = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        autoHideMenuBar: true,

        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    win.loadURL("http://localhost:5173/");
}

ipcMain.handle("auth:login", async (event, credentials) => {

    const result = authService.login(
        credentials.username,
        credentials.password
    );

    if (result.success) {

        const session =
            sessionService.createSession(result.user);

        return {
            success: true,
            user: session
        };
    }

    return result;
});

ipcMain.handle("session:get", () => {
    return sessionService.getSession();
});

ipcMain.handle("session:logout", () => {
    sessionService.clearSession();

    return {
        success: true
    };
});

ipcMain.handle("navigate:dashboard", (event) => {

    const win =
        BrowserWindow.fromWebContents(event.sender);

    win.loadURL(
        "http://localhost:5173/pages/dashboard.html"
    );

    return {
        success: true
    };
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {

    if (process.platform !== "darwin") {
        app.quit();
    }
});