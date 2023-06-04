import type { ComponentInternalInstance } from "vue";

export const __DEV__ = window.__DEV_MODE__;

class Logger {
    static globalLogger = new Logger("QQNT-Tools");
    constructor(private name: string) {}
    log(...args: any[]) {
        console.log(`[${this.name}]`, ...args);
    }
    info(...args: any[]) {
        console.info(`[${this.name}]`, ...args);
    }
    warn(...args: any[]) {
        console.warn(`[${this.name}]`, ...args);
    }
    error(...args: any[]) {
        console.error(`[${this.name}]`, ...args);
    }
}

export function log(...args: any[]) {
    Logger.globalLogger.log(...args);
}

export function logTrace(args: any[], {additional, color}: {additional?: () => void, color?: string} = {}) {
    console.groupCollapsed(`%c[QQNT-Tools] %c${args[0]}`, "color: #ff00ff", `color: ${color}`, ...args.slice(1));
    // console.info();
    additional && additional();
    console.trace();
    console.groupEnd();
}

export function sendToRenderer(targetUrl: string, event: string, data: any) {
    log("send-to-renderer", targetUrl, event, data);
    window._preloadTools.ipcRenderer.send("send-to-renderer", {
        targetUrl,
        event,
        data,
    });
}

export async function waitForElement(selector: string, timeout = 5000) {
    return new Promise<Element>((resolve, reject) => {
        const el = document.querySelector(selector);
        let callback = resolve;
        if (el) {
            callback(el);
        } else {
            let called = false;
            let timer = setTimeout(() => {
                if (!called) {
                    observer.disconnect();
                    reject(new Error(`waitForElement timeout: ${selector}`));
                }
            }, timeout);
            const observer = new MutationObserver((mutations) => {
                const el = document.querySelector(selector);
                if (el) {
                    observer.disconnect();
                    if (!called) {
                        called = true;
                        timer && clearTimeout(timer);
                        callback(el);
                    }
                }
            });
            observer.observe(document.documentElement, { childList: true, subtree: true });
        }
    });
}

export abstract class BasePlugin extends EventTarget implements QQPlugin {
    abstract readonly name: string;
    abstract readonly description: string;
    abstract readonly version: string;
    abstract readonly match: string | RegExp;
    readonly logger = new Logger(this.name);
    // static _vueHooked: WeakMap<Element, ComponentInternalInstance[]>;
    abstract readonly load(): Promise<void>;
    unload(): void {
        this.dispatchEvent(new CustomEvent("unload"));
    }
}

export function htmlStringToElement(html: string) {
    let template = document.createElement("template");
    template.innerHTML = html;
    return template.content.firstChild as HTMLElement;
}

export interface VueComponent extends ComponentInternalInstance {
    bum: (() => void)[];
    ctx: any;
}

export function sleep(time: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, time);
    });
}
let objColorMap = new WeakMap<any, string>();     
export function uniqueColor(obj: any) {
    if (!objColorMap.has(obj)) {
        objColorMap.set(obj, `#${Math.floor(Math.random() * 0xffffff).toString(16).padEnd(6, "0")}`);
    }
    return objColorMap.get(obj)!;
}
