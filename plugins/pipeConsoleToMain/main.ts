const electron = require("electron");

export function onLoad() {
    electron.ipcMain.on("cesar-log", (event, ...args) => {
        console.log(...args);
    });
}