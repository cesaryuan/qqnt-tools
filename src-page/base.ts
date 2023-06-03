import type { ComponentInternalInstance } from "vue";
let globalLogger = new Logger("QQNT-Tools");
export const __DEV__ = import.meta.env.DEV ?? false;

export function log(...args: any[]) {
    globalLogger.log("QQNT-Tools", ...args);
}

export function logTrace(args: any[], additional: any[], color: string) {
    console.groupCollapsed(`%cQQNT-Tools %c${args[0]}`, "color: #ff00ff", `color: ${color}`, ...args.slice(1));
    // console.info();
    console.trace(...additional);
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

class Logger {
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

export abstract class BasePlugin extends EventTarget implements QQPlugin {
    abstract readonly name: string;
    abstract readonly description: string;
    abstract readonly version: string;
    abstract readonly match: string | RegExp;
    readonly logger = new Logger(this.name);
    // static _vueHooked: WeakMap<Element, ComponentInternalInstance[]>;
    abstract readonly load(): void;
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