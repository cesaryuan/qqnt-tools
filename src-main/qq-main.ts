// log with prefix
const prefix = "[HOOK] ";
var log = function (...args: any[]) {
    var args: any[] = Array.prototype.slice.call(arguments);
    args.unshift(prefix);
    console.log.apply(console, args);
};

import electron from "electron";
import fs from "fs";
import path from "path";
import Module from "module";
import { EventEmitter } from "stream";
// Module.prototype = new Proxy(Module.prototype, {
//     get: function(target, propKey, receiver) {
//         log('Module get ', propKey)
//         return Reflect.get(target, propKey, receiver);
//     },
//     set: function(target, propKey, value, receiver) {
//         log('Module set ', propKey)
//         return Reflect.set(target, propKey, value, receiver);
//     }
// });

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
    callAndOnchange(callback: (path: string) => void) {
        this.on('change', callback);
        callback(this.filePath);
    }
}
let qqPageJSWatcher = new FileWatcher(path.resolve(__dirname, "qq-page.js"));
let qqPageCSSWatcher = new FileWatcher(path.resolve(__dirname, "css/inject.css"));
let proxyBrowserWindow = new Proxy(electron.BrowserWindow, {
    construct: function (target, argumentsList, newTarget) {
        let injectCSSMap = new Map<string, string>();
        log("BrowserWindow construct", argumentsList);
        Object.assign(argumentsList[0].webPreferences, {
            devTools: true,
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
            // todo: 不知道为什么，frame.executeJavaScript 没作用，所以只能用 window.webContents.executeJavaScript
            qqPageJSWatcher.callAndOnchange(async (filePath) => {
                log('qq-page.js changed', filePath);
                let result = await window.webContents.executeJavaScript(fs.readFileSync(filePath, "utf-8").trim().replace(/export \{\};/, ""));
                log("executeJavaScript", result);
            });
            
            qqPageCSSWatcher.callAndOnchange(async (filePath) => {
                let css = fs.readFileSync(filePath, "utf-8").trim();
                if (injectCSSMap.has(filePath)) {
                    window.webContents.removeInsertedCSS(injectCSSMap.get(filePath)!);
                    injectCSSMap.delete(filePath);
                }
                let key = await window.webContents.insertCSS(css);
                injectCSSMap.set(filePath, key);
            });
        });
        window.webContents.on("did-navigate-in-page", async (event, url, isMainFrame, frameProcessId, frameRoutingId) => {
            log("did-navigate-in-page", url);
            await window.webContents.executeJavaScript('window?.onQQPageLoaded?.();'); // 通知 qq-page.js 重新执行 'window.onhashchange();
            let urlHash = new URL(url).hash;
            if (urlHash === "#/setting/settings/common") {
            }
        });
        window.webContents.emit = new Proxy(window.webContents.emit, {
            apply: function (target, thisArg, argumentsList: [string, ...any[]]) {
                if(argumentsList[0] !== 'input-event' && !argumentsList[0].includes('ipc-')) {
                    let url = window.webContents.getURL();
                    log("webContents", window.webContents.id, "emit", argumentsList[0], "url", url);
                }
                return Reflect.apply(target, thisArg, argumentsList);
            },
        });
        return window;
        return new Proxy(window, {
            get: function (target, propKey, receiver) {
                log("BrowserWindow get ", propKey);
                return Reflect.get(target, propKey);
            },
            set: function (target, propKey, value, receiver) {
                log("BrowserWindow set ", propKey);
                return Reflect.set(target, propKey, value);
            },
        });
    },
    apply: function (target, thisArg, argumentsList) {
        log("BrowserWindow apply");
        return Reflect.apply(target, thisArg, argumentsList);
    },
});
Module.prototype.require = new Proxy(Module.prototype.require, {
    apply: function (target, thisArg, argumentsList) {
        log("Require ", argumentsList[0]);
        if (argumentsList[0] == "electron") {
            return new Proxy(electron, {
                get: function (target, propKey, receiver) {
                    // note: 之所以不在前面直接修改 electron.BrowserWindow，是因为 electron.BrowserWindow 的 descriptor 的 configurable 为 false 且 set 为 undefined，所以无法修改
                    if (propKey === "BrowserWindow") {
                        return proxyBrowserWindow;
                    }
                    return Reflect.get(target, propKey, receiver);
                }
            });
        }
        return Reflect.apply(target, thisArg, argumentsList);
    }
});
