"use strict";
function log(...args) {
    console.log("QQNT-Tools", ...args);
}
function logError(...args) {
    console.error("QQNT-Tools", ...args);
}
function waitForElement(selector, callback) {
    const el = document.querySelector(selector);
    if (el) {
        callback(el);
    }
    else {
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
class BasePlugin {
    constructor() {
        this.name = "BasePlugin";
        this.description = "BasePlugin";
        this.version = "1.0.0";
    }
    load() { }
    unload() { }
}
var PluginMessageLikeTelegram = class MessageMergeLikeTelegram extends BasePlugin {
    constructor() {
        super(...arguments);
        this.name = "MessageMergeLikeTelegram";
        this.description = "合并相同用户发送的消息";
        this.version = "1.0.0";
        this.observer = null;
    }
    load() {
        this.unload();
        waitForElement(".ml-list", (mlList) => {
            const config = { childList: true, subtree: true };
            this.observer = new MutationObserver((mutationsList, observer) => {
                for (const mutation of mutationsList) {
                    if (mutation.type === "childList") {
                        this.mergeMessage(mlList);
                        break;
                    }
                }
            });
            // 开始观察目标节点
            this.observer.observe(mlList, config);
        });
    }
    unload() {
        this.observer?.disconnect();
    }
    mergeMessage(mlList) {
        let lastMsg;
        for (let item of [...mlList.children].reverse().map((i) => i)) {
            let messageDiv = item.querySelector(".message");
            let messageContainer = messageDiv?.querySelector(".message-container");
            if (!messageDiv || !messageContainer) {
                throw new Error("messageDiv not found");
            }
            let messageProps = BasePlugin._vueHooked.get(messageDiv)?.props;
            item.messageProps = messageProps;
            let uid = messageProps?.msgRecord?.senderUid;
            // add uid to item attribute
            item.setAttribute("data-uid", uid ?? "");
            item.setAttribute("data-time", new Date(Number.parseInt(messageProps?.msgRecord?.msgTime ?? "0") * 1000).toLocaleString());
            if (uid && uid === lastMsg?.senderUid &&
                !item.querySelector(".message__timestamp") && // 没有时间戳，有的话说明和上一条消息相隔时间很久，不需要合并
                lastMsg?.recallTime === "0" // 上一条消息不是撤回消息
            ) {
                let usernameEle = messageContainer.querySelector(".user-name");
                if (usernameEle)
                    usernameEle.style.display = "none";
                messageContainer.querySelector(".avatar-span").style.display = "none";
                messageContainer.style.paddingTop = "0px";
            }
            lastMsg = messageProps?.msgRecord;
        }
    }
};
function main() {
    if (window.__RUNED__) {
        log("Already runned");
        return;
    }
    log("Start");
    window.__RUNED__ = true;
    BasePlugin._vueHooked = (function () {
        // ==UserScript==
        // @name         Hook Vue3 app
        // @version      1.0.3
        // @description  通过劫持Proxy方法，逆向还原Vue3 app元素到DOM
        // @author       DreamNya
        // @license      MIT
        // @namespace https://greasyfork.org/users/809466
        // ==/UserScript==
        const $window = window;
        const realLog = $window.console.log; //反劫持console.log（大部分网站都会劫持console.log）
        // const realProxy = $window.Proxy; //劫持Proxy
        let vueUnhooked = new WeakSet(); //以WeakSet存储已获取到但未未劫持的app对象，作为debug用变量，正常情况WeakSet应为空
        let vueHooked = new WeakMap(); //以WeakMap存储已劫持的app对象，DOM元素为key，app对象为value
        $window.Proxy = new Proxy($window.Proxy, {
            construct(target, args, newTarget) {
                let app = args[0]._;
                if (app?.uid >= 0) {
                    //判断app
                    let el = app.vnode.el;
                    if (el) {
                        recordVue(el, app); //记录到WeakMap
                        // recordDOM(el, app); //挂载到DOM
                        watch_isUnmounted(app); //观察销毁
                    }
                    else {
                        //realLog(app,el)
                        vueUnhooked.add(app); //记录未劫持的app
                        //realLog(vueUnhooked,app)
                        watchEl(app.vnode); //不存在el则观察el
                    }
                }
                return Reflect.construct(target, args, newTarget);
            },
        });
        function watchEl(vnode) {
            //观察el 变动时还原到DOM
            let value = vnode.el;
            let hooked = false;
            Object.defineProperty(vnode, "el", {
                get() {
                    return value;
                },
                set(newValue) {
                    value = newValue;
                    if (!hooked && this.el) {
                        hooked = true;
                        recordVue(this.el, this.component);
                        // recordDOM(this.el, this.component);
                        watch_isUnmounted(this.component);
                        // realLog(this.component,"已还原")
                    }
                },
            });
        }
        function watch_isUnmounted(app) {
            //观察isUnmounted 变动时销毁引用
            let value = app.isUnmounted;
            let unhooked = false;
            Object.defineProperty(app, "isUnmounted", {
                get() {
                    return value;
                },
                set(newValue) {
                    value = newValue;
                    if (!unhooked && this.isUnmounted) {
                        unhooked = true;
                        //realLog(this,"已删除")
                        let el = this.vnode.el;
                        if (el) {
                            let DOMvalue = el.__vue__; //删除DOMelement.__vue__挂载
                            if (DOMvalue) {
                                if (Array.isArray(DOMvalue)) {
                                    let index = DOMvalue.findIndex((i) => i == this);
                                    index > -1 && DOMvalue.splice(index, 1);
                                    el.__vue__ = DOMvalue.length > 1 ? DOMvalue : DOMvalue[0];
                                }
                                else {
                                    if (DOMvalue == this) {
                                        el.__vue__ = void 0;
                                    }
                                }
                            }
                            let WMvalue = vueHooked.get(el); //删除WeakMap存储
                            if (WMvalue) {
                                if (Array.isArray(WMvalue)) {
                                    let index = WMvalue.findIndex((i) => i == this);
                                    index > -1 && WMvalue.splice(index, 1);
                                    vueHooked.set(el, WMvalue.length > 1 ? WMvalue : WMvalue[0]);
                                }
                                else {
                                    if (WMvalue == this) {
                                        vueHooked.delete(el);
                                    }
                                }
                            }
                        }
                    }
                },
            });
        }
        function recordVue(el, app) {
            //将app记录到WeakMap中
            vueUnhooked.delete(app);
            if (vueHooked.has(el)) {
                let value = vueHooked.get(el);
                if (Array.isArray(value)) {
                    if (value.findIndex((i) => i == app) == -1) {
                        vueHooked.set(el, vueHooked.get(el).push(app));
                    }
                }
                else {
                    if (value != app) {
                        vueHooked.set(el, [value, app]);
                    }
                }
            }
            else {
                vueHooked.set(el, app);
            }
        }
        function recordDOM(el, app) {
            //将app挂载到DOMelement.__vue__
            if (el.__vue__) {
                let value = el.__vue__;
                if (Array.isArray(value)) {
                    if (value.findIndex((i) => i == app) == -1) {
                        el.__vue__ = value.push(app);
                    }
                }
                else {
                    if (value != app) {
                        el.__vue__ = [value, app];
                    }
                }
            }
            else {
                el.__vue__ = app;
            }
        }
        return vueHooked;
    })();
    for (const plugin of window.PluginsEnabled ?? []) {
        plugin.unload();
    }
    window.PluginsEnabled = [
        new PluginMessageLikeTelegram()
    ];
    for (const plugin of window.PluginsEnabled) {
        plugin.load();
    }
}
main();
