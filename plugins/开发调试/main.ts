import Module = require("module");
import electron = require("electron");
import util = require("util")

const log = console.log.bind(console, "[Cesar - Main]");
const __DEV__ = process.env.NODE_ENV === "development";


const getHandler: (name: string) => ProxyHandler<any> = (module) => ({
    get: function (target, propKey, receiver) {
        let value = Reflect.get(target, propKey, receiver);
        // log(name + "." + propKey.toString(), ":", value);
        if (typeof value === "function") {
            return new Proxy(value, {
                apply: function (target, thisArg, argumentsList) {
                    let value = Reflect.apply(target, thisArg, argumentsList);
                    // 直接log Module会导致无限递归
                    log(
                        `${module}.${propKey.toString()}(`, 
                        argumentsList.map(item => item instanceof Module ? item.id : item), 
                        ")",
                        // "===", value
                    );
                    return value;
                },
                construct: function (target, argumentsList, newTarget) {
                    let obj = Reflect.construct(target, argumentsList, newTarget);
                    if(propKey === "Script") {
                        argumentsList[0] = argumentsList[0].trim();
                    }
                    log(`new ${module}.${propKey.toString()}()`, argumentsList);
                    return obj;
                }
            });
        } else {
            log(`${module}.${propKey.toString()} ===`);
        }
        return value;
    }
});

export function onLoad() {
    // Object.assign(util.inspect.defaultOptions, {
    //     showHidden: false,
    //     depth: 0,
    //     colors: true,
    //     compact: 3,
    //     maxStringLength: 80,
    // });
}

declare global {
    interface Object {
        __logGreen: [string, any, string]
        __logRed: [string, any, string]
        __logYellow: [string, any, string]
    }
}

Object.defineProperty(Object.prototype, "__logGreen", {
    get: function () {
        if (this instanceof String)
            return ["\x1B[32m" + this.toString() + "\x1B[39m"]
        return ["\x1B[32m", this, "\x1B[39m"]
    },
});
Object.defineProperty(Object.prototype, "__logRed", {
    get: function () {
        if (this instanceof String)
            return ["\x1B[31m" + this.toString() + "\x1B[39m"]
        return ["\x1B[31m", this, "\x1B[39m"]
    },
});
Object.defineProperty(Object.prototype, "__logYellow", {
    get: function () {
        if (this instanceof String)
            return ["\x1B[33m" + this.toString() + "\x1B[39m"]
        return ["\x1B[33m", this, "\x1B[39m"]
    },
});


let callBackIdMap = new Map<string, string>();
function handleQQIPCMessage(direction: "renderer-to-main" | "main-to-renderer", args: any[]) {
    const NOT_SHOW_DATA_ACTIONLIST = [
        "nodeIKernelRecentContactListener/onRecentContactListChanged",
        "nodeIKernelRecentContactListener/onFirstScreenRecentContactListChanged",
        "nodeIKernelBuddyListener/onBuddyListChange",
        "nodeIKernelProfileListener/onStatusUpdate",
        "nodeIKernelProfileListener/onProfileDetailInfoChanged",
        "nodeIKernelProfileListener/onProfileSimpleChanged",
        "nodeIKernelMsgService/requestTianshuAdv",
        "readFile",
        "nodeIKernelMsgService/fetchStatusMgrInfo",
        "getArkVersionManageMapFromMain",
        "nodeIKernelGroupListener/onGroupListUpdate", // 群列表更新
        "onNumSettingChanged",
        "onThemeInfoChange",
        "getThemeInitInfo"
    ]
    try{
        let [{type, eventName, callbackId, ..._}, DATA] = args;
        if (eventName.startsWith("ns-LoggerApi-")) {
            return;
        }
        if (type === "request") {
            if (direction === "main-to-renderer") {
                let [{cmdName, cmdType, payload}] = DATA;
                if (!(cmdName && cmdType)) {
                    log(direction, type, ...eventName.__logGreen, ...DATA.__logYellow);
                    return;
                }
                if (callbackId && callbackId.length > 0) {
                    callBackIdMap.set(callbackId, cmdName);
                }
                if (NOT_SHOW_DATA_ACTIONLIST.includes(cmdName)) {
                    payload = "Too long to show";
                }
                log(direction, type, ...eventName.__logGreen, "cmdName:", ...cmdName.__logGreen, "cmdType:", ...cmdType.__logGreen, "payload:", ...payload.__logYellow);
            }
            else {
                let [action = "", data = ""] = DATA;
                if (callbackId && callbackId.length > 0) {
                    callBackIdMap.set(callbackId, action);
                }
                if (NOT_SHOW_DATA_ACTIONLIST.includes(action)) {
                    data = "Too long to show";
                }
                log(direction, type, ...eventName.__logGreen, "action:", ...action.__logGreen, "data:", ...data.__logYellow);
            }
        } else if (type === "response") {
            let action = callBackIdMap.get(callbackId);
            if (NOT_SHOW_DATA_ACTIONLIST.includes(action!)) {
                DATA = "Too long to show";
            }
            DATA = DATA ?? "";
            log(direction, type, ...eventName.__logGreen, "responseAction:", ...action!.__logGreen, "data:", ...DATA.__logYellow);
        } else {
            log(direction, type, ...eventName.__logRed, ...DATA.__logRed);
        }
    } catch (e) {
        log(..."****ERROR****".__logRed, e, direction, ...args.__logRed);
    }
}
enum ConsoleMessageLevel {
    verbose = 0,
    info = 1,
    warning = 2,
    error = 3,
}
export function onBrowserWindowCreated(window: electron.BrowserWindow, plugin) {
    let url = window.webContents.getURL();
    let fragment = url.split("#")[1] ?? url.split("/").pop();
    window.webContents.on("console-message", (event, level, message, line, sourceId) => {
        console.log(`[RenderConsole-${fragment}]`, ConsoleMessageLevel[level] + ":", message, line, sourceId);
    });
    window.webContents.emit = new Proxy(window.webContents.emit, {
        apply: function (target, thisArg, argumentsList) {
            let [event, ...listenerArgs] = argumentsList;
            let result = Reflect.apply(target, thisArg, argumentsList);
            if(['input-event'].includes(event)) {
                return result;
            }
            if (event === "ipc-message" || event === "ipc-message-sync") {
                type argsType = [event: any, channel: string, ...args: any[]];
                let [_, channel, ...args] = listenerArgs as argsType;
                if (channel.startsWith("IPC_UP_")) {
                    handleQQIPCMessage("renderer-to-main", args);
                    return result;
                } else {
                    log("webContents", window.webContents.id, "ipcRenderer.send(channel:", channel, "args:", args, ")");
                }
            }
            else if (event === "-ipc-message") {
                // log("webContents", window.webContents.id, event, "listenerArgs:", listenerArgs.slice(1));
                return result;
            }
            else {
                log("webContents", window.webContents.id, "emit", event);
            }
            return result;
        },
    });
    window.webContents.send = new Proxy(window.webContents.send, {
        apply: function (target, thisArg, argumentsList) {
            let [channel, ...args] = argumentsList;
            let result = Reflect.apply(target, thisArg, argumentsList);
            // log("webContents", window.webContents.id, "send(channel:", channel, "args:", args, ")");
            if(channel.startsWith("IPC_DOWN_")) {
                handleQQIPCMessage("main-to-renderer", args);
            } else {
                log("webContents", window.webContents.id, "send(channel:", channel, "args:", args, ")");
            }
            return result;
        },
    });
}