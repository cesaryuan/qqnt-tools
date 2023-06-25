import { BasePlugin, log } from "./base";
import { hookVue3App } from "./lib/vueHook";
import PluginMessageLikeTelegram from "./plugins/PluginMessageLikeTelegram";
import ShowMsgTime from "./plugins/ShowMsgTime";
import {BtnToShowUserRecord, RecordHandlers} from "./plugins/ShowUserRecord";
import Settings from "./plugins/Setting";

function main(){
    if (window._qqntTools && !window.__DEV_MODE__){
        return;
    }
    log("Start init");
    import("./lib/ObjectInspector")
    window._vueHooked = window._vueHooked || hookVue3App();
    window._qqntTools = window._qqntTools || {
        __PluginsEnabled: [],
        __LOG_VUE_APP_CONTEXT_APPLY__: false,
        __LOG_VUE_APP_CONTEXT_GET__: false,
        __LOG_VUE_APP_CONTEXT_WHITELIST__: [],
    }
    window._debugTools = {
        proxyObject: (obj: any) => {
            return new Proxy(obj, {
                get(target, key, receiver) {
                    let value = Reflect.get(target, key, receiver);
                    log("get", key, value);
                    if (typeof value == "object") {
                        value = window._debugTools!.proxyObject(value);
                    }
                    return value;
                },
                set(target, key, value, receiver) {
                    log("set", key, value);
                    return Reflect.set(target, key, value, receiver);
                }
            })
        }
    };
    log("Inited");
    log("DEV MODE:", window.__DEV_MODE__);
    log("QQNT Tools:", window._qqntTools);
    log("QQNT Tools Debug:", window._debugTools);
    window._qqntTools.__PluginsEnabled.push(new PluginMessageLikeTelegram());
    window._qqntTools.__PluginsEnabled.push(new ShowMsgTime());
    window._qqntTools.__PluginsEnabled.push(new BtnToShowUserRecord());
    window._qqntTools.__PluginsEnabled.push(new RecordHandlers());
    window._qqntTools.__PluginsEnabled.push(new Settings());
    window.onQQPageLoaded = window.onQQPageLoaded || function() {
        if (location.hash == "#/blank") {
            return;
        }
        // 一旦切换到其他页面，就说明这个Window加载完成了，就可以根据url加载插件了
        window.onQQPageLoaded = undefined;
        // 1. 先unload所有插件(如果有的话，比如热重载)
        window._qqntTools.__PluginsEnabled.forEach((plugin: BasePlugin) => {
            plugin.unload();
        });
        // 2. 根据url决定加载哪些插件
        const url = location.href;
        window._qqntTools.__PluginsEnabled.forEach((plugin: BasePlugin) => {
            if (plugin.match instanceof RegExp && plugin.match.test(url)) {
                plugin.load().then(() => {
                    log("plugin loaded", plugin.name);
                }).catch((e) => {
                    log("plugin load failed", plugin.name, e);
                });
            } else if (typeof plugin.match == "string" && url.includes(plugin.match)) {
                plugin.load().then(() => {
                    log("plugin loaded", plugin.name);
                }).catch((e) => {
                    log("plugin load failed", plugin.name, e);
                });
            }
        })

    };
    // 用于热重载
    window.onQQPageLoaded();
}
try {
    main();
}
catch (e) {
    console.error(e);
}

