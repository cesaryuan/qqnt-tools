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
let proxyBrowserWindow = new Proxy(electron.BrowserWindow, {
    construct: function (target, argumentsList, newTarget) {
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
            let url = window.webContents.getURL();
            log("frame-created", url);
            // todo: 不知道为什么，frame.executeJavaScript 没作用，所以只能用 window.webContents.executeJavaScript
            let r = await window.webContents.executeJavaScript(fs.readFileSync(path.resolve(__dirname, "qq-page.js"), "utf-8").trim().replace(/export \{\};/, ""));
            console.log("executeJavaScript", r);
            window.webContents.insertCSS(fs.readFileSync(path.resolve(__dirname, "inject.css"), "utf-8").trim()); 
        });
        window.webContents.emit = new Proxy(window.webContents.emit, {
            apply: function (target, thisArg, argumentsList: [string, ...any[]]) {
                if(argumentsList[0] !== 'input-event' && !argumentsList[0].includes('ipc-')) {
                    log("webContents emit ", window.webContents.id, argumentsList[0]);
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
