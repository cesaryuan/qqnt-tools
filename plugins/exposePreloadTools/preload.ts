import * as electron from "electron";
const log = console.log.bind(console, "[ExposePreloadTools - Preload]");

interface PreloadTools {
    ipcRenderer: Pick<typeof electron.ipcRenderer, "on" | "send" | "removeListener">;
    /**
     * 接收消息格式
     * `ipcRenderer.on(event, (_, data) => {})`
     * @param targetUrl 如果某个窗口的url包含targetUrl，就会发送消息
     * @param event
     * @param data
     * @returns
     */
    sendToRenderer: (targetUrl: string, event: string, data: any) => void;
}

declare global {
    interface Window {
        _preloadTools: PreloadTools;
    }
}

function sendToRenderer(targetUrl: string, event: string, data: any) {
    electron.ipcRenderer.send("send-to-renderer", {
        targetUrl,
        event,
        data,
    });
}

try {
    electron.contextBridge.exposeInMainWorld("_preloadTools", {
        // ipcRenderer: electron.ipcRenderer, // 不能直接暴露，原型修改被丢弃
        ipcRenderer: {
            // 错误的写法，由于安全原因，不能直接暴露
            // on: electron.ipcRenderer.on,
            on: (channel: string, listener: (event: any, ...args: any[]) => void) => {
                log("ipcRenderer on", channel);
                electron.ipcRenderer.on(channel, listener);
            },
            send: (channel: string, ...args: any[]) => {
                log("ipcRenderer send", channel);
                electron.ipcRenderer.send(channel, ...args);
            },
            removeListener: (channel: string, listener: (...args: any[]) => void) => {
                log("ipcRenderer removeListener", channel);
                electron.ipcRenderer.removeListener(channel, listener);
            },
        },
        sendToRenderer,
    } as PreloadTools);
} catch (e) {
    log("Error", e);
}

export {};
