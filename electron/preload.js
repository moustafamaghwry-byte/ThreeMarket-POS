const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
    login: (username, password) =>
        ipcRenderer.invoke("auth:login", {
            username,
            password
        })
});