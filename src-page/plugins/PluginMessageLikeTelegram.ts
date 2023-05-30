import type { ComponentInternalInstance } from "vue";
import { BasePlugin, waitForElement } from "../base"
class PluginMessageLikeTelegram extends BasePlugin {
    name = "MessageMergeLikeTelegram";
    description = "合并相同用户发送的消息";
    version = "1.0.0";
    observer: MutationObserver | null = null;
    load() {
        this.unload();
        waitForElement(".ml-list", (mlList) => {
            const config = { childList: true};
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
export default PluginMessageLikeTelegram;

