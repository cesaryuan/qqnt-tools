import type { ComponentInternalInstance } from "vue";
import { BasePlugin, waitForElement, htmlStringToElement, log } from "../base"
export default class ShowMsgTime extends BasePlugin {
    name = "ShowMsgTime";
    description = "在用户按下鼠标中键时显示消息发送时间";
    version = "1.0.0";
    match = "#/main/message";
    observer: MutationObserver | null = null;
    mlList: HTMLElement | null = null;
    async load() {
        this.mlList = await waitForElement(".ml-list") as HTMLElement;
        // 添加 mousedown 事件处理函数
        this.midBtnDown = this.midBtnDown.bind(this);
        this.mlList.addEventListener('mousedown', this.midBtnDown);
    }
    unload() {
        this.observer?.disconnect();
        this.mlList?.removeEventListener('mousedown', this.midBtnDown);
    }
    midBtnDown(event: MouseEvent){
        let mlList = event.currentTarget as HTMLElement;
        // 检查是否是鼠标中键
        if (event.button === 1) {
            log('Mouse middle button is pressed');
            if (this.observer) {
                this.observer.disconnect();
                this.observer = null;
                this.removeMsgTime(mlList);
            } else {
                this.addMsgTime(mlList)
                // 在这里添加你的代码
                const config = { childList: true};
                this.observer = new MutationObserver((mutationsList, observer) => {
                    for (const mutation of mutationsList) {
                        if (mutation.type === "childList") {
                            this.addMsgTime(mlList)
                            break;
                        }
                    }
                });
                // 开始观察目标节点
                this.observer.observe(mlList, config);
            }
            event.preventDefault();
        }
    }
    addMsgTime(mlList: Element) {
        let dataAttr = Array.from(mlList?.querySelector(".message__timestamp")?.attributes!).find((i) => i.name.startsWith("data-v-"))?.name;
        for (let item of [...mlList.children].reverse().map((i) => i as HTMLElement)) {
            let messageDiv = item.querySelector(".message");
            let messageContainer = messageDiv?.querySelector(".message-container");
            if (!messageDiv) {
                throw new Error("messageDiv not found");
            }
            let messageProps: QQ.MessageProps = (window._vueHooked.get(messageDiv) as ComponentInternalInstance[])[0]?.props as unknown as QQ.MessageProps;
            item.messageProps = messageProps;
            item.setAttribute("data-time", new Date(Number.parseInt(messageProps?.msgRecord?.msgTime ?? "0") * 1000).toLocaleString())
            if (
                messageContainer &&
                !messageDiv.querySelector(".message__timestamp") && // 没有时间戳，有的话说明和上一条消息相隔时间很久，不需要合并
                messageProps?.msgRecord?.recallTime === "0" // 消息不是撤回消息
            ) {
                let timeElement = htmlStringToElement(`<div class="message__timestamp no-copy qqnt_tools" tabindex="-1" role="application" aria-label="10:05"><span class="babble">10:05</span></div>`);
                timeElement.querySelector(".babble")!.textContent = new Date(Number.parseInt(messageProps?.msgRecord?.msgTime ?? "0") * 1000).toLocaleString();
                timeElement.setAttribute(dataAttr!, "");
                timeElement.children[0].setAttribute(dataAttr!, "");
                messageDiv.insertBefore(timeElement, messageContainer);
            }
        }
    }
    removeMsgTime(mlList: Element) {
        let allItems = mlList.querySelectorAll(".message__timestamp.qqnt_tools");
        for (let item of allItems) {
            item.remove();
        }
    }

};

