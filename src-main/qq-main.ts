import electron, { ipcRenderer } from "electron";
import fs from "fs";
import path from "path";
import Module from "module";
import { EventEmitter } from "stream";
import type { PreloadTools } from "../src-common/model";
import asar from "asar";
import util from 'util'
const chii = require("chii");
const net = require("net");

function extractAsar(asarFile: string, destDir: string) {
    asar.extractAll(asarFile, destDir);
}
function createDirIfNotExists(file: string) {
    let parentDir = path.dirname(file);
    if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir);
    }
    return file;
}
function decryptApplication(){
    const { globSync } = require("glob");
    console.log(globSync, module.paths);
    
    let versionDir = path.join(__dirname, "./versions");
    if (!fs.existsSync(versionDir)) {
        fs.mkdirSync(versionDir);
    }
    const asarFile = globSync(`E:/MySoftware/QQNT/resources/app/versions/*/application.asar`)[0]
    const baseDir = path.dirname(asarFile).replaceAll("\\", "/");
    const unpackDir = `${baseDir}/application_unpack`;
    const tempDecryptDir = `${baseDir}/application_temp`;
    const decryptDir = `${baseDir}/application`;
    fs.rmSync(unpackDir, { recursive: true, force: true });
    fs.rmSync(tempDecryptDir, { recursive: true, force: true });
    fs.rmSync(decryptDir, { recursive: true, force: true });
    extractAsar(asarFile, unpackDir);
    const files = globSync(unpackDir + `/**`, { nodir: true });
    console.log(`find ${files.length} files in ${unpackDir}`);
    for (let file of files) {
        let content = fs.readFileSync(file.replace("application_unpack", "application"));
        fs.writeFileSync(createDirIfNotExists(file.replace("application_unpack", "application_temp")), content);
    }
    fs.renameSync(tempDecryptDir, decryptDir);
}

async function openDevTools(window: electron.BrowserWindow, port: number) {
    const targets_url = `http://localhost:${port}/targets`;
    const targets = await (await fetch(targets_url)).json();
    console.log("targets", targets, "targets_url", targets_url);
    const current_url = window.webContents.getURL();
    for (const target of targets.targets.reverse()) {
        if (target.url != current_url) {
            continue;
        }
        const params = `?ws=localhost:${port}/client/qqnt_tools?target=${target.id}`;
        const devtools_url = `http://localhost:${port}/front_end/chii_app.html${params}`;
        const devtools_window = new electron.BrowserWindow();
        devtools_window.loadURL(devtools_url);
        return;
    }
}

function main() {
    // common part
    const port = (() => {
        const server = net.createServer();
        server.listen(0);
        const { port } = server.address();
        server.close();
        return port;
    })();
    chii.start({ port });
    electron.ipcMain.handle(
        "qqnt_tools.chii_devtools.ready",
        (event, message) => port
    )
    const __DEV__ = process.env.NODE_ENV === "development";
    const prefix = "[HOOK]";
    Object.assign(util.inspect.defaultOptions, {
        showHidden: false,
        depth: 0,
        colors: true,
        compact: 3,
        maxStringLength: 80,
    });
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
    electron.ipcMain.on("send-to-renderer", (event, arg) => {
        for (let window of electron.BrowserWindow.getAllWindows()) {
            let url = window.webContents.getURL();
            if (url.includes(arg.targetUrl)) {
                log("send-to-renderer", arg.event, arg.data);
                window.webContents.send(arg.event, arg.data);
            }
        }
    });
    electron.ipcMain.on("cesar-log", (event, ...args) => {
        log(...args);
    });
    
    // qq part
    // decryptApplication();
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
    const myPreloadJS = HookPreload.toString() + "\n" + HookPreload.name + `(${__DEV__});`;

    let proxyBrowserWindow = new Proxy(electron.BrowserWindow, {
        construct: function (target, argumentsList, newTarget) {
            // common part
            log("BrowserWindow construct", argumentsList);
            argumentsList[0].webPreferences.devTools = true;

            // qq part
            let injectCSSMap = new Map<string, string>();
            let preload = argumentsList[0].webPreferences.preload;
            if (preload && !preload.includes("qqnt-tools")) { // 判断preload是否已经被hook过
                let oldPreloadJS = fs.readFileSync(preload, "utf-8");
                let newPreloadJS = myPreloadJS + "\n" + oldPreloadJS;
                preload = path.resolve(__dirname, `preload-qqnt-tools-${hashString(newPreloadJS)}.js`);
                fs.writeFileSync(preload, newPreloadJS);
            }
            Object.assign(argumentsList[0].webPreferences, {
                preload,
            });

            // common part
            let window: electron.BrowserWindow = Reflect.construct(target, argumentsList, newTarget);
            window.webContents.on("before-input-event", async (event, input) => {
                // Windows/Linux hotkeys
                // log("before-input-event", input);
                if (process.platform !== "darwin") {
                    if (input.key === "F12") {
                        await openDevTools(window, port);
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
            });

            // qq part
            window.webContents.on("frame-created", async (event, {frame}) => {
                // todo: 不知道为什么，frame.executeJavaScript 没作用，所以只能用 window.webContents.executeJavaScript
                await window.webContents.executeJavaScript(`
                function injectChiiDevtools(port) {
                    const before_script = document.querySelector("#chii_devtools");
                    if (before_script) {
                        before_script.remove();
                    }
                    const url = \`http://localhost:${port}/target.js\`;
                    const script = document.createElement("script");
                    script.defer = "defer";
                    script.src = url;
                    script.id = "chii_devtools";
                    document.head.appendChild(script);
                }
                window._preloadTools.chii_devtools().then((port) => {
                    injectChiiDevtools(port);
                    navigation.addEventListener("navigatesuccess", () => {
                        injectChiiDevtools(port);
                    });
                });
                `).catch((e) => { log("executeJavaScript error", e); });
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

    // common part
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
    Module.prototype.require = new Proxy(Module.prototype.require, {
        apply: function (requireTarget, thisArg: Module, argumentsList) {
            let [id] = argumentsList; 
            log("Require", id);
            if (id === "electron") {
                return new Proxy(electron, {
                    get: function (target, propKey, receiver) {
                        // note: 之所以不在前面直接修改 electron.BrowserWindow，
                        // 是因为 electron.BrowserWindow 的 descriptor 的 configurable 为 false 且 set 为 undefined，所以无法修改
                        if (propKey === "BrowserWindow") {
                            return proxyBrowserWindow;
                        } else if (__DEV__ && ["protocol"].includes(propKey.toString())) {
                            return new Proxy(Reflect.get(target, propKey, receiver), getHandler("electron." + propKey.toString()));
                        }
                        return Reflect.get(target, propKey, receiver);
                    }
                });
            }
            let value: Module = Reflect.apply(requireTarget, thisArg, argumentsList);
            // 日志太多了
            if (!__DEV__ || ["", 'fs'].includes(id)) {
                return value;
            } else
                return new Proxy(value, getHandler(id));
        }
    });
}
main()

function mock() {
    electron.app.on("ready", async () => {
        let electron = Module.prototype.require("electron");
        let window: Electron.BrowserWindow = new electron.BrowserWindow({
            width: 800,
            height: 600,
            webPreferences: {
                devTools: true,
                nodeIntegration: true,
                contextIsolation: false,
            },
        });
        window.loadURL("https://im.qq.com/pcqq/");
        window.webContents.on("dom-ready", async () => {
            window.webContents.openDevTools();
        });
        window.webContents.on("before-input-event", async (event, input) => {
            if (input.type === "keyDown" && input.key === "F12") {
                console.log("F12");
                window.webContents.openDevTools();
            }
        });
        window.focus();
    });
}
function HookPreload(__DEV__: boolean = false) {
    const electron = require('electron');
    let log = (...args: any[]) => {
        try{
            electron.ipcRenderer.send("cesar-log", "[Render Preload]", ...args);
        } catch(e) {
            electron.ipcRenderer.send("cesar-log", "[Render Preload] Error", ...args);
        }
        console.log("[Preload]", ...args);
    }
    try {
        function arrayToRepr(arr: any[]) {
            return arr.map(item => {
                if (typeof item === "object") {
                    return JSON.stringify(item, (key, value) => {
                        if(typeof value === "object" && key !== "") {
                            return value.toString();
                        }
                        return value;
                    });
                } else if (typeof item === "string") {
                    return item;
                } else {
                    return item;
                }
            })
        }
        const getHandler: (name: string) => ProxyHandler<any> = (module) => ({
            get: function (target, propKey, receiver) {
                let value = Reflect.get(target, propKey, receiver);
                if (typeof value === "function") {
                    return new Proxy(value, {
                        apply: function (target, thisArg, argumentsList) {
                            let value = Reflect.apply(target, thisArg, argumentsList);
                            log(`${module}.${propKey.toString()}()`, arrayToRepr(argumentsList));
                            return value;
                        },
                        construct: function (target, argumentsList, newTarget) {
                            log(`new ${module}.${propKey.toString()}()`, arrayToRepr(argumentsList));
                            return Reflect.construct(target, argumentsList, newTarget);
                        }
                    });
                } else {
                    log(`${module}.${propKey.toString()}`);
                }
                return value;
            }
        });
        if (__DEV__) {
            module.require = new Proxy(module.require, {
                apply: function (target, thisArg, argumentsList) {
                    let value = Reflect.apply(target, thisArg, argumentsList);
                    let id = argumentsList[0];
                    ['vm', 'v8'].includes(id) || log("require", id);
                    if (['electron'].includes(id)) {
                        return new Proxy(electron, {
                            get: function (target, propKey, receiver) {
                                let value =  Reflect.get(target, propKey, receiver);
                                if (propKey === "contextBridge") {
                                    return new Proxy(value, getHandler("contextBridge"));;
                                } 
                                return value;
                            }
                        });
                    }
                    return new Proxy(value, getHandler(id));
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
            chii_devtools: () => electron.ipcRenderer.invoke(
                "qqnt_tools.chii_devtools.ready"
            )
        } as PreloadTools)
    } catch (e) {
        log("Error", e);
    }
}
