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

export function onBrowserWindowCreated(window: electron.BrowserWindow, plugin) {
    let callBackIdMap = new Map<string, string>();
    window.webContents.emit = new Proxy(window.webContents.emit, {
        apply: function (target, thisArg, argumentsList) {
            let [event, ...listenerArgs] = argumentsList;
            let result = Reflect.apply(target, thisArg, argumentsList);
            if(['input-event'].includes(event)) {
                return result;
            }
            if (event === "ipc-message" || event === "ipc-message-sync") {
                type argsType = [event: electron.IpcMainEvent, channel: string, ...args: any[]];
                let [_, channel, ...args] = listenerArgs as argsType;
                if (channel.startsWith("IPC_UP_")) {
                    try{
                        let [{type, eventName, ...more}, DATA] = args;
                        if (eventName.startsWith("ns-LoggerApi-")) {
                            return result;
                        }
                        if (type === "request") {
                            let [action = "", data = ""] = DATA;
                            let callbackId = more.callbackId;
                            if (callbackId && callbackId.length > 0) {
                                callBackIdMap.set(callbackId, action);
                            }
                            log(channel, type, ...eventName.__logGreen, "action:", ...action.__logGreen, "data:", ...data.__logYellow);
                        } else if (type === "response") {
                            log(channel, type, ...eventName.__logGreen, ...DATA.__logYellow);
                        } else {
                            log(channel, type, ...eventName.__logRed, ...DATA.__logRed);
                        }
                    } catch (e) {
                        log(..."****ERROR****".__logRed, e, ...argumentsList.__logRed);
                    }
                    return result;
                }

                log("webContents", window.webContents.id, "ipcRenderer.send(channel:", channel, "args:", args, ")");
            }
            else if (event === "-ipc-message") {
                // log("webContents", window.webContents.id, event, "listenerArgs:", listenerArgs.slice(1));
                return result;
            }
            else if (event === "console-message") {
                let [_, level, message, line, sourceId] = listenerArgs;
                enum ConsoleMessageLevel {
                    verbose = 0,
                    info = 1,
                    warning = 2,
                    error = 3,
                }
                log("webContents", window.webContents.id, "console-message", ConsoleMessageLevel[level], message, line, sourceId);
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
                try {
                    let [{type, eventName, ...more}, DATA] = args;
                    if (type === "response") {
                        let callbackId = more.callbackId;
                        let action = callBackIdMap.get(callbackId);
                        log(channel, type, ...eventName.__logGreen, "responseTo:", ...action!.__logGreen);
                    } else {
                        log(channel, type, ...eventName.__logGreen);
                    }
                } catch (e) {
                    log(..."****ERROR****".__logRed, e, ...argumentsList.__logRed);
                }
            }
            return result;
        },
    });
}