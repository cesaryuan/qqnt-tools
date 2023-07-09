import type { ComponentInternalInstance } from "vue";
import { htmlStringToElement, insertCSS, waitFor, waitForElement } from "../common-renderer";


export function onLoad(){
    if (window.location.href.includes("#/main/message")) {
        main();
        return;
    }
    navigation.addEventListener("navigatesuccess", (e) => {
        if (window.location.href.includes("#/main/message")) {
            main();
        }
    });
}

let observer: MutationObserver | null = null;
let mlList: HTMLElement | null = null;
let _vueHooked: WeakMap<Element, ComponentInternalInstance[]> | null = null;

async function main(){
    _vueHooked = await waitFor(() => window._vueHooked);
    mlList = await waitForElement(".ml-list") as HTMLElement;
    // 添加 mousedown 事件处理函数
    mlList.addEventListener('mousedown', midBtnDown);
}

function midBtnDown(event: MouseEvent){
    let mlList = event.currentTarget as HTMLElement;
    // 检查是否是鼠标中键
    if (event.button === 1) {
        console.log('Mouse middle button is pressed');
        if (observer) {
            observer.disconnect();
            observer = null;
            removeMsgTime(mlList);
        } else {
            addMsgTime(mlList)
            // 在这里添加你的代码
            const config = { childList: true};
            observer = new MutationObserver((mutationsList, observer) => {
                for (const mutation of mutationsList) {
                    if (mutation.type === "childList") {
                        addMsgTime(mlList)
                        break;
                    }
                }
            });
            // 开始观察目标节点
            observer.observe(mlList, config);
        }
        event.preventDefault();
    }
}

function addMsgTime(mlList: Element) {
    let dataAttr = Array.from(mlList?.querySelector(".message__timestamp")?.attributes!).find((i) => i.name.startsWith("data-v-"))?.name;
    for (let item of [...mlList.children].reverse().map((i) => i as HTMLElement)) {
        let messageDiv = item.querySelector(".message");
        let messageContainer = messageDiv?.querySelector(".message-container");
        if (!messageDiv) {
            throw new Error("messageDiv not found");
        }
        let messageProps: QQ.MessageProps = (_vueHooked!.get(messageDiv) as ComponentInternalInstance[])[0]?.props as unknown as QQ.MessageProps;
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

function removeMsgTime(mlList: Element) {
    let allItems = mlList.querySelectorAll(".message__timestamp.qqnt_tools");
    for (let item of allItems) {
        item.remove();
    }
}
