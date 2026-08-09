const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
    login: (username, password) =>
        ipcRenderer.invoke("auth:login", {
            username,
            password
        }),

    getSession: () =>
        ipcRenderer.invoke("session:get"),

    logout: () =>
        ipcRenderer.invoke("session:logout")
});