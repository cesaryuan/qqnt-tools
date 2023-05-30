import type { ComponentInternalInstance, RendererNode } from "vue";
import { BasePlugin, log } from "./base";
import PluginMessageLikeTelegram from "./plugins/PluginMessageLikeTelegram";

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
            if (el.__vue__) {
                el.__vue__.add(app);
            } else {
                el.__vue__ = new WeakSet([app]);
            }
        }
        return vueHooked;
    })();

    window.onQQPageLoaded = function() {
        log("hashchange", location.hash);
        if (location.hash == "#/blank") {
            return;
        }
        // 一旦切换到其他页面，就说明这个Window加载完成了，就可以根据url加载插件了
        window.onQQPageLoaded = undefined;
        if(location.hash == "#/main/message") {
            import("./plugins/PluginMessageLikeTelegram").then((module) => {
                log("LoadPlugin", "PluginMessageLikeTelegram");
                new module.default().load();
            });
            import("./plugins/ShowMsgTime").then((module) => {
                log("LoadPlugin", "ShowMsgTime");
                new module.default().load();
            });
        } else if (location.hash == "#/setting/settings/common") {
            // import("./plugins/Setting").then((module) => {
            //     new module.default().load();
            // });
        }
    };
}
try {
    main();
}
catch (e) {
    console.error(e);
}

