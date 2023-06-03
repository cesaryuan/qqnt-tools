import { BasePlugin, log } from "./base";
import { hookVue3App, proxyContext } from "./lib/vueHook";
import PluginMessageLikeTelegram from "./plugins/PluginMessageLikeTelegram";
import ShowMsgTime from "./plugins/ShowMsgTime";
import {ShowUserRecord, RecordHandlers} from "./plugins/ShowUserRecord";

function main(){
    log("Start");
    window._vueHooked = window._vueHooked || hookVue3App();
    window._qqntTools = window._qqntTools || {
        __PluginsEnabled: [],
        __LOG_VUE_APP_CONTEXT_APPLY__: false,
        __LOG_VUE_APP_CONTEXT_GET__: false,
    }
    window._debugTools = {
        proxyContext,
    }
    window._qqntTools.__PluginsEnabled.push(new PluginMessageLikeTelegram());
    window._qqntTools.__PluginsEnabled.push(new ShowMsgTime());
    window._qqntTools.__PluginsEnabled.push(new ShowUserRecord());
    window._qqntTools.__PluginsEnabled.push(new RecordHandlers());
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
                log("load plugin", plugin.name);
                plugin.load();
            } else if (typeof plugin.match == "string" && url.includes(plugin.match)) {
                log("load plugin", plugin.name);
                plugin.load();
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

