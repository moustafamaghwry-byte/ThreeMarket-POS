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
    return authService.login(
        credentials.username,
        credentials.password
    );
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});