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
        let called = false;
        const observer = new MutationObserver((mutations) => {
            const el = document.querySelector(selector);
            if (el) {
                observer.disconnect();
                if (!called) {
                    called = true;
                    callback(el);
                }
            }
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

export function htmlStringToElement(html: string) {
    let template = document.createElement("template");
    template.innerHTML = html;
    return template.content.firstChild as HTMLElement;
}