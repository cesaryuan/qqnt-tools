import type { ComponentInternalInstance } from "vue";
import { BasePlugin, waitForElement } from "../base"

export default class Settings extends BasePlugin {
    name = "MessageMergeLikeTelegram";
    description = "合并相同用户发送的消息";
    version = "1.0.0";
    observer: MutationObserver | null = null;
    load() {
        this.unload();
        waitForElement(".nav-bar", (navBar) => {
            let navItem = navBar.querySelector('.nav-item') as Element;
            let navItemClone = navItem.cloneNode(true) as Element;
            navItemClone.querySelector('.name')!.innerHTML = "QQNT-Tools";
            navBar.appendChild(navItemClone);
            navItemClone.addEventListener('click', () => {
                let settings = document.querySelector(".settings") as HTMLElement;
                if (settings.style.display === "none") {
                    settings.style.display = "block";
                } else {
                    settings.style.display = "none";
                }
            });
        });
    }
    unload() {
        this.observer?.disconnect();
    }
    mergeMessage(mlList: Element){
        
    }
};
