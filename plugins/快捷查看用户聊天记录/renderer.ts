import type { ComponentInternalInstance } from "vue";
import {
    addMenuItemToNextMenu,
    sleep,
    waitFor,
    waitForElement,
    whenNavigated,
    logger,
} from "../common-renderer";

let originhandleMsgUserContextMenu: (
    { e, msgRecord }: { e: MouseEvent; msgRecord: any },
    event: PointerEvent
) => any;
let _vueHooked: WeakMap<Element, ComponentInternalInstance[]> | null = null;
// let log = console.log.bind(console, "[快捷查看用户聊天记录]");
let _preloadTools: typeof window._preloadTools | null = null;

export async function onLoad() {
    whenNavigated(async () => {
        _vueHooked = await waitFor(() => window._vueHooked);
        _preloadTools = await waitFor(() => window._preloadTools);
        if (window.location.href.includes("#/main/message")) {
            main();
        }
        if (window.location.href.includes("#/record")) {
            _preloadTools.ipcRenderer.on("search-record", async (_: any, data: any) => {
                logger.log("search-record", data);
                let searchInputEle = await waitForElement(
                    "#app > div.record > div.record-search > div > div"
                );
                let groupFilterEle = await waitForElement(
                    "#ml-root > div.message-filter-container > div > div:nth-child(3) > div.group-member-filter"
                );
                let groupFilter = _vueHooked!.get(groupFilterEle)![0].ctx;
                let searchInput = _vueHooked!.get(searchInputEle)![0].ctx;
                let { uid, text } = data;
                searchInput.change(text);
                groupFilter.onSelect(uid);
            });
            return;
        }
    });
}

async function main() {
    let mlList = await waitForElement(".ml-list");
    let groupChatEle = await waitForElement(
        "#app > div.container div.aio > div.group-panel.need-token-updated > div.group-chat"
    );
    let groupChat = _vueHooked!.get(groupChatEle)![0].ctx;
    if (!originhandleMsgUserContextMenu && !groupChat.handleMsgUserContextMenu.isModified) {
        originhandleMsgUserContextMenu = groupChat.handleMsgUserContextMenu;
    } else {
        logger.log("handleMsgUserContextMenu is already modified");
        return;
    }
    groupChat.handleMsgUserContextMenu = (
        { e, msgRecord }: { e: PointerEvent; msgRecord: QQ.MsgRecord },
        event: PointerEvent
    ) => {
        console.log("handleMsgUserContextMenu", "senderUid", msgRecord.senderUid);
        let result = originhandleMsgUserContextMenu?.apply(groupChat, [{ e, msgRecord }, event]);
        let groupId = groupChat.uid;
        setTimeout(async () => {
            addMenuItemToNextMenu("查看聊天记录", async () => {
                // await _preloadTools!.qqIPC.openExternalWindow("MsgRecordWindow", { peerUid: groupId, chatType: 2 });
                let openRecord = (await waitForElement(
                    "#id-func-bar-MessageRecord"
                )) as HTMLElement;
                openRecord.click();
                await sleep(1000);
                _preloadTools!.sendToRenderer("#/record", "search-record", {
                    uid: msgRecord.senderUid,
                    text: "",
                });
            });
        }, 0);
        return result;
    };
    groupChat.handleMsgUserContextMenu.isModified = true;
}
