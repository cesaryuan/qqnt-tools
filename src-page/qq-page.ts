import { BasePlugin, log } from "./base";
import { hookVue3App } from "./lib/vueHook";
function main(){
    log("Start");
    window._vueHooked = window._vueHooked || hookVue3App();
    window.PluginsEnabled = window.PluginsEnabled || [];
    window.onQQPageLoaded = window.onQQPageLoaded || function() {
        log("hashchange", location.hash);
        if (location.hash == "#/blank") {
            return;
        }
        // 一旦切换到其他页面，就说明这个Window加载完成了，就可以根据url加载插件了
        window.onQQPageLoaded = undefined;
        // 1. 先unload所有插件(如果有的话，比如热重载)
        window.PluginsEnabled.forEach((plugin: BasePlugin) => {
            plugin.unload();
        });
        // 2. 根据url决定加载哪些插件
        if(location.hash == "#/main/message") {
            import("./plugins/PluginMessageLikeTelegram").then((module) => {
                let plugin = new module.default();
                plugin.load();
                window.PluginsEnabled.push(plugin);
            });
            import("./plugins/ShowMsgTime").then((module) => {
                let plugin = new module.default();
                plugin.load();
                window.PluginsEnabled.push(plugin);
            });
        } else if (location.hash.startsWith("#/setting/settings")) {
            // import("./plugins/Setting").then((module) => {
            //     let plugin = new module.default();
            //     plugin.load();
            //     window.PluginsEnabled.push(plugin);
            // });
        }

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

