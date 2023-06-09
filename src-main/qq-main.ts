import electron, { ipcRenderer } from "electron";
import fs from "fs";
import path from "path";
import Module from "module";
import { EventEmitter } from "stream";
import type { PreloadTools } from "../src-common/model";
function main() {
    const __DEV__ = process.env.NODE_ENV === "development";
    const prefix = "[HOOK] ";
    function log(...args: any[]) {
        var args: any[] = Array.prototype.slice.call(arguments);
        args.unshift(prefix);
        console.log.apply(console, args);
    };
    function hashString(str: string) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        // return hexString
        return (hash >>> 0).toString(16);
    }

    log("development mode:", __DEV__);
    class FileWatcher extends EventEmitter {
        constructor(filePath: string) {
            super();
            this.filePath = filePath;
            this.watch();
        }
        filePath: string;
        watcher: fs.FSWatcher | null = null;
        watch() {
            if (this.watcher) {
                this.watcher.close();
            }
            fs.watch(this.filePath, (eventType, filename) => {
                if (eventType === 'change') {
                    this.emit('change', this.filePath);
                }
            });
        }
        callAndOnchange(callback: (path: string) => void, dispose: {
            emitter: EventEmitter,
            event: string,
        }) {
            this.on('change', callback);
            dispose.emitter.on(dispose.event, () => {
                this.off('change', callback);
            });
            callback(this.filePath);
        }
    }
    let qqPageJSWatcher = new FileWatcher(path.resolve(__dirname, "qq-page.js"));
    let qqPageCSSWatcher = new FileWatcher(path.resolve(__dirname, "css/inject.css"));
    const customCSSPath = path.resolve(__dirname, "css/custom.css");
    if (!fs.existsSync(customCSSPath)) {
        fs.writeFileSync(customCSSPath, "");
    }
    let qqCustomCSSWatcher = new FileWatcher(customCSSPath);
    const myPreloadJS = HookPreload.toString() + "\n" + HookPreload.name + "();";
    electron.ipcMain.on("send-to-renderer", (event, arg) => {
        for (let window of electron.BrowserWindow.getAllWindows()) {
            let url = window.webContents.getURL();
            if (url.includes(arg.targetUrl)) {
                log("send-to-renderer", arg.event, arg.data);
                window.webContents.send(arg.event, arg.data);
            }
        }
    });
    let proxyBrowserWindow = new Proxy(electron.BrowserWindow, {
        construct: function (target, argumentsList, newTarget) {
            let injectCSSMap = new Map<string, string>();
            log("BrowserWindow construct", argumentsList);
            let preload = argumentsList[0].webPreferences.preload;
            if (!preload.includes("qqnt-tools")) { // 判断preload是否已经被hook过
                let oldPreloadJS = fs.readFileSync(preload, "utf-8");
                let newPreloadJS = myPreloadJS + "\n" + oldPreloadJS;
                preload = path.resolve(__dirname, `preload-qqnt-tools-${hashString(newPreloadJS)}.js`);
                fs.writeFileSync(preload, newPreloadJS);
            }
            Object.assign(argumentsList[0].webPreferences, {
                devTools: true,
                preload,
            });
            let window: electron.BrowserWindow = Reflect.construct(target, argumentsList, newTarget);
            window.webContents.on("before-input-event", (event, input) => {
                // Windows/Linux hotkeys
                if (process.platform !== "darwin") {
                    if (input.key === "F12") {
                        window.webContents.openDevTools();
                        event.preventDefault();
                    }
                }
            }); 
            window.webContents.on("frame-created", async (event, {frame}) => {
                // let url = window.webContents.getURL();
                // log("frame-created", url);
                // window.webContents.openDevTools();
                window.webContents.executeJavaScript(`window.__DEV_MODE__ = ${__DEV__};`);
                // todo: 不知道为什么，frame.executeJavaScript 没作用，所以只能用 window.webContents.executeJavaScript
                qqPageJSWatcher.callAndOnchange(async (filePath) => {
                    log('qq-page.js changed', filePath);
                    let result = await window.webContents.executeJavaScript(fs.readFileSync(filePath, "utf-8").trim().replace(/export \{\};/, ""));
                    log("executeJavaScript", result);
                }, { emitter: window.webContents, event: "destroyed" });
                
                qqPageCSSWatcher.callAndOnchange(async (filePath) => {
                    log('inject.css changed', filePath);
                    let css = fs.readFileSync(filePath, "utf-8").trim();
                    if (injectCSSMap.has(filePath)) {
                        window.webContents.removeInsertedCSS(injectCSSMap.get(filePath)!);
                        injectCSSMap.delete(filePath);
                    }
                    let key = await window.webContents.insertCSS(css);
                    injectCSSMap.set(filePath, key);
                }, { emitter: window.webContents, event: "destroyed" });

                qqCustomCSSWatcher?.callAndOnchange(async (filePath) => {
                    log('custom.css changed', filePath);
                    let css = fs.readFileSync(filePath, "utf-8").trim();
                    if (injectCSSMap.has(filePath)) {
                        window.webContents.removeInsertedCSS(injectCSSMap.get(filePath)!);
                        injectCSSMap.delete(filePath);
                    }
                    let key = await window.webContents.insertCSS(css);
                    injectCSSMap.set(filePath, key);
                }, { emitter: window.webContents, event: "destroyed" });
            });
            window.webContents.on("did-navigate-in-page", async (event, url, isMainFrame, frameProcessId, frameRoutingId) => {
                await window.webContents.executeJavaScript('window?.onQQPageLoaded?.();'); // 通知 qq-page.js 重新执行 'window.onhashchange();
            });
            __DEV__ && (window.webContents.emit = new Proxy(window.webContents.emit, {
                apply: function (target, thisArg, argumentsList: [string, ...any[]]) {
                    if(!['input-event', 'console-message'].includes(argumentsList[0]) && !argumentsList[0].includes('ipc-')) {
                        let url = window.webContents.getURL();
                        log("webContents", window.webContents.id, "emit", argumentsList[0], "url", url);
                    }
                    return Reflect.apply(target, thisArg, argumentsList);
                },
            }));
            return window;
        }
    });
    let proxyIpcMain = new Proxy(electron.ipcMain, {
        get: function (target, propKey, receiver) {
            log("ipcMain get ", propKey);
            let value = Reflect.get(target, propKey, receiver);
            if (typeof value === "function") {
                return new Proxy(value, {
                    apply: function (target, thisArg, argumentsList) {
                        log("ipcMain", propKey, argumentsList);
                        return Reflect.apply(target, thisArg, argumentsList);
                    },
                });
            }
            return value;
        },
    });
    let proxyProtocol = new Proxy(electron.protocol, {
        get: function (target, propKey, receiver) {
            log("protocol get ", propKey);
            let value = Reflect.get(target, propKey, receiver);
            if (typeof value === "function") {
                return new Proxy(value, {
                    apply: function (target, thisArg, argumentsList) {
                        log("protocol", propKey, argumentsList);
                        return Reflect.apply(target, thisArg, argumentsList);
                    },
                });
            }
            return value;
        },
    });
    Module.prototype.require = new Proxy(Module.prototype.require, {
        apply: function (target, thisArg, argumentsList) {
            log("Require ", argumentsList[0]);
            if (argumentsList[0] == "electron") {
                return new Proxy(electron, {
                    get: function (target, propKey, receiver) {
                        // note: 之所以不在前面直接修改 electron.BrowserWindow，
                        // 是因为 electron.BrowserWindow 的 descriptor 的 configurable 为 false 且 set 为 undefined，所以无法修改
                        if (propKey === "BrowserWindow") {
                            return proxyBrowserWindow;
                        } 
                        else if (propKey === "ipcMain" && __DEV__) {
                            return proxyIpcMain;
                        } 
                        else if (propKey === "protocol" && __DEV__) {
                            return proxyProtocol;
                        }
                        return Reflect.get(target, propKey, receiver);
                    }
                });
            }
            return Reflect.apply(target, thisArg, argumentsList);
        }
    });
}
main()

function HookPreload(){
    function log(...args: any[]) {
        console.groupCollapsed(`%cQQNT-Tools`, "color: #ff00ff", ...args);
        console.trace();
        console.groupEnd();
    }
    const electron = require('electron');

    if ('__DEV_MODE__' in window && (window as any).__DEV_MODE__) {
        let proxyContextBridge = new Proxy(electron.contextBridge, {
            get: function (target, propKey, receiver) {
                log("contextBridge get ", propKey);
                let value = Reflect.get(target, propKey, receiver);
                if (typeof value === "function") {
                    return new Proxy(value, {
                        apply: function (target, thisArg, argumentsList) {
                            log("contextBridge", propKey, argumentsList);
                            return Reflect.apply(target, thisArg, argumentsList);
                        },
                    });
                }
                return value;
            },
        });
        module.require = new Proxy(module.require, {
            apply: function (target, thisArg, argumentsList) {
                let value = Reflect.apply(target, thisArg, argumentsList);
                ['vm', 'v8'].includes(argumentsList[0]) || log("Require", argumentsList[0], value);
                if (argumentsList[0] == "electron") {
                    return new Proxy(electron, {
                        get: function (target, propKey, receiver) {
                            if (propKey === "contextBridge") {
                                return proxyContextBridge;
                            } 
                            return Reflect.get(target, propKey, receiver);
                        }
                    });
                }
                return Reflect.apply(target, thisArg, argumentsList);
            }
        });
    }
    electron.contextBridge.exposeInMainWorld('_preloadTools', {
        // ipcRenderer: electron.ipcRenderer, // 不能直接暴露，原型修改被丢弃
        ipcRenderer: {
            // 错误的写法，由于安全原因，不能直接暴露
            // on: electron.ipcRenderer.on,
            on: (channel: string, listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void) => {
                log('ipcRenderer on', channel);
                electron.ipcRenderer.on(channel, listener);
            },
            send: (channel: string, ...args: any[]) => {
                log('ipcRenderer send', channel);
                electron.ipcRenderer.send(channel, ...args);
            },
            removeListener: (channel: string, listener: (...args: any[]) => void) => {
                log('ipcRenderer removeListener', channel);
                electron.ipcRenderer.removeListener(channel, listener);
            }
        },
    } as PreloadTools)
}
