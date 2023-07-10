import * as electron from "electron";
const log = console.log.bind(console, "[ExposePreloadTools - Preload]");

type OpenExternalWindowData = {
    "MsgRecordWindow": {
        /**
         * 要打开的聊天记录窗口的QQ群号或QQ号
         * 群号：836800970
         * QQ号：u_Zzq9GWChvLRElz--ixXNTw
         */
        peerUid: string,
        /**
         * 昵称，可选
         */
        peerName?: string,
        /**
         * 1: 好友
         * 2: 群
         */
        chatType: number,
    }
}
    
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
    qqIPC: {
        openUrl: (url: string) => Promise<void>;
        openExternalWindow: (windowName: "MsgRecordWindow", data: OpenExternalWindowData["MsgRecordWindow"]) => Promise<void>;
    }
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

function waitCallBack(guid: string): Promise<any> {
    return new Promise((resolve, reject) => {
        let listen = (event, msgHeader: QQ.IpcMsgHeader, data) => {
            if (msgHeader.callbackId === guid) {
                if (msgHeader.promiseStatue === "full") {
                    resolve(data);
                } else {
                    reject([msgHeader, data]);
                }
                electron.ipcRenderer.removeListener("IPC_DOWN_2", listen);
            }
        }
        electron.ipcRenderer.on("IPC_DOWN_2", listen);
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
        qqIPC: {
            openUrl: (url: string) => {
                let guid = Math.random().toString(36).slice(2);
                electron.ipcRenderer.send("IPC_UP_2", {
                    eventName: "ns-BusinessApi-2",
                    type: "request",
                    callbackId: guid,
                }, ["openUrl", { url: url }]);
                return waitCallBack(guid)
            },
            openExternalWindow: (windowName, data) => {
                let guid = Math.random().toString(36).slice(2);
                electron.ipcRenderer.send("IPC_UP_2", {
                    eventName: "ns-WindowApi-2",
                    type: "request",
                    callbackId: guid,
                }, ["openExternalWindow", windowName, data]);
                return waitCallBack(guid);
            }
        }
    } as PreloadTools);
} catch (e) {
    log("Error", e);
}

export {};
