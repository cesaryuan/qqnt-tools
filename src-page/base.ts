import type { ComponentInternalInstance } from "vue";

export function log(...args: any[]) {
    console.log("QQNT-Tools", ...args);
}

export function logError(...args: any[]) {
    console.error("QQNT-Tools", ...args);
}

export function waitForElement(selector: string, callback: (el: Element) => void) {
    const el = document.querySelector(selector);

    if (el) {
        callback(el);
    } else {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length) {
                    const el = document.querySelector(selector);
                    if (el) {
                        observer.disconnect();
                        callback(el);
                    }
                }
            });
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
    }
}

export class BasePlugin implements QQPlugin {
    name = "BasePlugin";
    description = "BasePlugin";
    version = "1.0.0";
    static _vueHooked: WeakMap<Element, ComponentInternalInstance[]>;
    load() {}
    unload() {}
}