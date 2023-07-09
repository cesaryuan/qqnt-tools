const electron = require("electron");
const log = console.log.bind(console, "[ExposePreloadTools - Main]");

export function onLoad() {
    electron.ipcMain.on("send-to-renderer", (event, arg) => {
        for (let window of electron.BrowserWindow.getAllWindows()) {
            let url = window.webContents.getURL();
            if (url.includes(arg.targetUrl)) {
                window.webContents.send(arg.event, arg.data);
                log("send-to-renderer", arg.event, arg.data);
            }
        }
    });
}