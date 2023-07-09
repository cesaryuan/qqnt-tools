import type { ComponentInternalInstance } from "vue";
import { insertCSS, waitFor, waitForElement } from "../common-renderer";

declare global {
    interface Element {
        // style: HTMLElementStyle;
        messageProps?: QQ.MessageProps;
    }
}

export async function onLoad(){
    insertCSS(`
    #ml-root > div.ml-list.list > .ml-item > .message {
        padding-bottom: 0px;
    }
    #app > div.container > div.draggable-view__container.sidebar > nav > div > div.sidebar__upper > div.nav.sidebar__nav > span[aria-label^="小世界"] {
        display: none;
    }`)
    if (window.location.href.includes("#/main/message")) {
        mergeMessageList();
        return;
    }
    navigation.addEventListener("navigatesuccess", (e) => {
        if (window.location.href.includes("#/main/message")) {
            mergeMessageList();
        }
    });
}

async function mergeMessageList(){
    await waitFor(() => window._vueHooked);
    let mlList = await waitForElement(".ml-list") as HTMLElement;
    // setInterval(() => console.log("*********", mlList), 1000);
    let observer = new MutationObserver((mutationsList, observer) => {
        for (const mutation of mutationsList) {
            if (mutation.type === "childList") {
                mergeMessage(mlList)
                break;
            }
        }
    });
    observer.observe(mlList, { childList: true});
}

function mergeMessage(mlList: HTMLElement){
    let _vueHooked = window._vueHooked as Map<Element, ComponentInternalInstance[]>;
    let lastMsg: QQ.MsgRecord | undefined;
    for (let item of [...mlList.children].reverse()) {
        let messageDiv = item.querySelector(".message");
        let messageContainer = messageDiv?.querySelector(".message-container") as HTMLElement;
        if (!messageDiv) {
            throw new Error("messageDiv not found");
        }
        let messageProps: QQ.MessageProps = (_vueHooked.get(messageDiv) as ComponentInternalInstance[])[0]?.props as unknown as QQ.MessageProps;
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
            messageContainer.querySelector<HTMLElement>(".avatar-span")!.style.display = "none";
            messageContainer.style.paddingTop = "0px";
        }
        lastMsg = messageProps?.msgRecord;
    }
}