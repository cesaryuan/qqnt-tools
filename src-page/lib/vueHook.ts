import type { RendererNode } from "vue";
import { VueComponent, logTrace, log, __DEV__, uniqueColor } from "../base";


export function hookVue3App() {
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
    let vueHooked = new WeakMap<Element, VueComponent[]>(); //以WeakMap存储已劫持的app对象，DOM元素为key，app对象为value

    $window.Proxy =  new Proxy($window.Proxy, {
        construct(target, args, newTarget) {
            let app: VueComponent | null = args[0]?._;
            if (app?.uid && app.uid >= 0) {
                //判断app
                let el = app?.vnode?.el;
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

    function watch_isUnmounted(app: VueComponent) {
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

    function recordVue(el: Element, app: VueComponent) {
        if (el instanceof Text) {
            //如果是文本节点，获取父节点
            // log("获取到文本节点，已获取父节点", el, app);
            el = el.parentElement!;
        }
        //将app记录到WeakMap中
        vueUnhooked.delete(app);
        __DEV__ && proxyContext(app);
        let value = vueHooked.get(el);
        if (value) {
            if (value.findIndex((i) => i === app) == -1) {
                value.push(app)
            }
        } else {
            vueHooked.set(el, [app]);
        }
    }

    function recordDOM(el: Element, app: VueComponent) {
        if (el instanceof Text) {
            //如果是文本节点，获取父节点
            // log("获取到文本节点，已获取父节点", el, app);
            el = el.parentElement!;
        }
        //将app挂载到DOMelement.__vue__
        if (el.__vue__) {
            el.__vue__.add(app);
        } else {
            el.__vue__ = new WeakSet([app]);
        }
    }

    return vueHooked;
}
function isObject(value: any) {
    return value && (typeof value === "object")
}

function isNode(value: any) {
    return isObject(value) && value.nodeType > 0
}
// check if value is a proxy object
function isProxy(value: any) {
    return isObject(value) && !!value.__isProxy
}
// 这些元素输出太多日志了
const BlackClass = [
    "recent-contact-item",
]
function proxyContext(app: VueComponent){
    if (app.ctx && !app.ctx.__qqntTools_isProxy) {
        app.ctx.__qqntTools_isProxy = true
        if (app?.vnode?.el?.classList) {
            for (const className of app.vnode.el.classList) {
                if (BlackClass.includes(className)) {
                    return
                }
            }
        }
        app.ctx = new Proxy(app.ctx, {
            construct(target, args, newTarget) {
                logTrace(["construct", args], {color: uniqueColor(target)});
                return Reflect.construct(target, args, newTarget);
            },
            get(target, key, receiver) {
                let prop = Reflect.get(target, key, receiver);
                if (typeof prop === "function") {
                    return new Proxy(prop, {
                        apply(func, thisArg, argArray) {
                            log("apply", key, argArray)
                            if (window._qqntTools.__LOG_VUE_APP_CONTEXT_WHITELIST__?.includes(key as string)) {
                                logTrace(["apply", key, argArray], {color: uniqueColor(target), additional: () => {
                                    console.log("thisArg", thisArg);
                                    console.log("target", target);
                                    console.log("argArray", argArray);
                                    console.log("element", app?.vnode?.el);
                                }})
                            }
                            return Reflect.apply(func, thisArg, argArray);
                        }
                    })
                }
                else {
                    window._qqntTools.__LOG_VUE_APP_CONTEXT_GET__ && logTrace(["get", key, prop], {color: uniqueColor(target)})
                    return prop;
                }
            },
            set(target, key, value, receiver) {
                logTrace(["set", key, value], {color: uniqueColor(target)})
                return Reflect.set(target, key, value, receiver);
            },
            deleteProperty(target, key) {
                logTrace(["deleteProperty", key], {color: uniqueColor(target)})
                return Reflect.deleteProperty(target, key);
            },
            has(target, key) {
                logTrace(["has", key], {color: uniqueColor(target)})
                return Reflect.has(target, key);
            },
            ownKeys(target) {
                logTrace(["ownKeys"], {color: uniqueColor(target)})
                return Reflect.ownKeys(target);
            },
            apply(target, thisArg, argArray) {
                logTrace(["apply", target, argArray], {color: uniqueColor(target)})
                return Reflect.apply(target, thisArg, argArray);
            }
        })
    }
}