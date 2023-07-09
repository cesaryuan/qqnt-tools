import { hookVue3App } from "./vueHook";
export function onLoad(){
    window._vueHooked = hookVue3App();
}