function log(...args: any[]) {
    console.log("QQNT-Tools", ...args);
}

function logError(...args: any[]) {
    console.error("QQNT-Tools", ...args);
}

function waitForElement(selector: string, callback: (el: Element) => void) {
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

class BasePlugin implements QQPlugin {
    name = "BasePlugin";
    description = "BasePlugin";
    version = "1.0.0";
    static _vueHooked: WeakMap<Element, ComponentInternalInstance[]>;
    load() {}
    unload() {}
}

var PluginMessageLikeTelegram = class MessageMergeLikeTelegram extends BasePlugin {
    name = "MessageMergeLikeTelegram";
    description = "合并相同用户发送的消息";
    version = "1.0.0";
    observer: MutationObserver | null = null;
    load() {
        this.unload();
        waitForElement(".ml-list", (mlList) => {
            const config = { childList: true, subtree: true };
            this.observer = new MutationObserver((mutationsList, observer) => {
                for (const mutation of mutationsList) {
                    if (mutation.type === "childList") {
                        this.mergeMessage(mlList)
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
    mergeMessage(mlList: Element){
        let lastMsg: QQ.MsgRecord | undefined;
        for (let item of [...mlList.children].reverse().map((i) => i as HTMLElement)) {
            let messageDiv = item.querySelector(".message");
            let messageContainer = messageDiv?.querySelector(".message-container");
            if (!messageDiv) {
                throw new Error("messageDiv not found");
            }
            let messageProps: QQ.MessageProps = (BasePlugin._vueHooked.get(messageDiv) as ComponentInternalInstance[])[0]?.props as unknown as QQ.MessageProps;
            item.messageProps = messageProps;
            let uid = messageProps?.msgRecord?.senderUid;
            // add uid to item attribute
            item.setAttribute("data-uid", uid ?? "");
            item.setAttribute("data-time", new Date(Number.parseInt(messageProps?.msgRecord?.msgTime ?? "0") * 1000).toLocaleString())
            if (
                messageContainer && uid && uid === lastMsg?.senderUid &&
                !messageDiv.querySelector(".message__timestamp") && // 没有时间戳，有的话说明和上一条消息相隔时间很久，不需要合并
                lastMsg?.recallTime === "0" // 上一条消息不是撤回消息
            ) {
                let usernameEle = messageContainer.querySelector(
                    ".user-name"
                ) as HTMLElement;
                if (usernameEle) usernameEle.style.display = "none";
                messageContainer.querySelector(".avatar-span")!.style.display = "none";
                messageContainer.style.paddingTop = "0px";
            }
            lastMsg = messageProps?.msgRecord;
        }
    }
};
import type { ComponentInternalInstance, RendererNode } from "vue";

function main(){
    if(window.__RUNED__) {
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
        let vueHooked = new WeakMap<Element, ComponentInternalInstance[]>(); //以WeakMap存储已劫持的app对象，DOM元素为key，app对象为value
    
        $window.Proxy =  new Proxy($window.Proxy, {
            construct(target, args, newTarget) {
                let app: ComponentInternalInstance | null = args[0]?._;
                if (app?.uid && app.uid >= 0) {
                    //判断app
                    let el = app.vnode.el;
                    if (el) {
                        recordVue(el as Element, app); //记录到WeakMap
                        recordDOM(el as Element, app); //挂载到DOM
                        watch_isUnmounted(app); //观察销毁
                    } else {
                        //realLog(app,el)
                        vueUnhooked.add(app); //记录未劫持的app
                        //realLog(vueUnhooked,app)
                        watchEl(app.vnode); //不存在el则观察el
                    }
                }
                return Reflect.construct(target, args, newTarget);
            },
        });
    
        function watchEl(vnode: RendererNode) {
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
                        recordDOM(this.el, this.component);
                        watch_isUnmounted(this.component);
                        // realLog(this.component,"已还原")
                    }
                },
            });
        }
    
        function watch_isUnmounted(app: ComponentInternalInstance) {
            //观察isUnmounted 变动时销毁引用
            if (!app.bum) app.bum = [];
            app.bum.push(function () {
                let el = app.vnode.el as Element
                if (el) {
                    // realLog(app,"已删除__vue__")
                    let DOMvalue = el.__vue__; //删除DOMelement.__vue__挂载
                    if (DOMvalue) {
                        DOMvalue.delete(app);
                    }
                    let WMvalue = vueHooked.get(el); //删除WeakMap存储
                    if (WMvalue) {
                        let index = WMvalue.findIndex((i) => i == app);
                        index > -1 && WMvalue.splice(index, 1);
                        vueHooked.set(el, WMvalue);
                    }
                }
            });
        }
    
        function recordVue(el: Element, app: ComponentInternalInstance) {
            //将app记录到WeakMap中
            vueUnhooked.delete(app);
            let value = vueHooked.get(el);
            if (value) {
                if (value.findIndex((i) => i === app) == -1) {
                    value.push(app)
                }
            } else {
                vueHooked.set(el, [app]);
            }
        }
    
        function recordDOM(el: Element, app: ComponentInternalInstance) {
            //将app挂载到DOMelement.__vue__
            el.__vue__ = app as any as WeakSet<ComponentInternalInstance>;
            // if (el.__vue__) {
            //     el.__vue__.add(app);
            // } else {
            //     el.__vue__ = new WeakSet([app]);
            // }
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
try {
    main();
}
catch (e) {
    console.error(e);
}

