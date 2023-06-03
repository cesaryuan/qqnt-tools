import type { ComponentInternalInstance } from "vue";
import { BasePlugin, waitForElement } from "../base"

export default class Settings extends BasePlugin {
    name = "配置";
    description = "提供一些配置选项";
    version = "1.0.0";
    match: string | RegExp = "dwadawdawdawd";
    navItemClone: Element | null = null;
    navBar: Element | null = null;
    async load() {
        this.navBar = await waitForElement(".nav-bar")
        await waitForElement("#app > div.setting-layout > div.setting-tab > div > div:nth-child(2) > i > svg")
        // let navItem = this.navBar.querySelectorAll('.nav-item') as Element;
        this.navItemClone = this.navBar.querySelectorAll('.nav-item')[1].cloneNode(true) as Element;
        this.navBar.appendChild(this.navItemClone);
        this.navItemClone.querySelector('.name')!.innerHTML = "QQNT-Tools";
        this.navItemClone.addEventListener('click', () => {
            this.navBar?.querySelector('.nav-item-active')?.classList.remove('nav-item-active');
            this.navItemClone?.classList.add('nav-item-active');
            rightTitleItemVue.title = "QQNT-Tools";
            // rightTabItem.querySelector('div[class$="-tab"]')!.innerHTML = "";
        });

        let rightTitleItem = document.querySelector('#app > div.setting-layout > div.setting-main > div.setting-title') as HTMLElement;
        let rightTitleItemVue = window._vueHooked.get(rightTitleItem)![0].props;
        let rightTabItem = document.querySelector('#app > div.setting-layout > div.setting-main > div.setting-main__content > div') as Element;
    }
    unload() {
        this.navItemClone?.remove();
    }
};
