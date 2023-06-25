import { BasePlugin, htmlStringToElement, log, addMenuItemToNextMenu, sleep, waitForElement, sendToRenderer } from "../base"

export class BtnToShowUserRecord extends BasePlugin {
    name = "BtnToShowUserRecord";
    description = "在用户头像的上下文菜单中添加选项，显示用户的消息记录";
    version = "1.0.0";
    match = "#/main/message";
    originhandleMsgUserContextMenu?: ({e, msgRecord}: {e: MouseEvent, msgRecord: any}, event: PointerEvent) => any;
    async load() {
        let mlList = await waitForElement(".ml-list");
        let groupChatEle = await waitForElement("#app > div.container > div.tab-container > div > div.aio > div.group-panel.need-token-updated > div.group-chat");
        let groupChat = window._vueHooked.get(groupChatEle)![0].ctx;
        if(!this.originhandleMsgUserContextMenu && !groupChat.handleMsgUserContextMenu.isModified) {
            this.originhandleMsgUserContextMenu = groupChat.handleMsgUserContextMenu;
        } else {
            log("handleMsgUserContextMenu is already modified");
            return;
        }
        groupChat.handleMsgUserContextMenu = ({e, msgRecord}: {e: PointerEvent, msgRecord: QQ.MsgRecord}, event: PointerEvent) => {
            log("handleMsgUserContextMenu", msgRecord, "senderUid", msgRecord.senderUid);
            let result = this.originhandleMsgUserContextMenu?.apply(groupChat, [{e, msgRecord}, event])
            setTimeout(async () => {
                addMenuItemToNextMenu("查看聊天记录", async () => {
                    let openRecord = await waitForElement("#id-func-bar-MessageRecord") as HTMLElement;
                    openRecord.click();
                    await sleep(1000);
                    sendToRenderer("#/record", "search-record", {uid: msgRecord.senderUid, text: ""});
                })
            }, 0);
            return result;
        }
        groupChat.handleMsgUserContextMenu.isModified = true;
        this.addEventListener("unload", () => {
            log("unload", BtnToShowUserRecord.name);
            groupChat.handleMsgUserContextMenu = this.originhandleMsgUserContextMenu;
        })
        
    }
    showUserRecord(uid: number) {

    }
};

export class RecordHandlers extends BasePlugin {
    match: string | RegExp = "#/record"
    name = "Record消息处理";
    description = "提供一些配置选项";
    version = "1.0.0";
    async onSearchRecord(event: any, data: any) {
        let searchInputEle = await waitForElement("#app > div.record > div.record-search > div > div");
        let groupFilterEle = await waitForElement("#ml-root > div.message-filter-container > div > div:nth-child(3) > div.group-member-filter")
        let groupFilter = window._vueHooked.get(groupFilterEle)![0].ctx;
        let searchInput = window._vueHooked.get(searchInputEle)![0].ctx;
        log("search-record", data);
        let {uid, text} = data;
        searchInput.change(text)
        groupFilter.onSelect(uid);

    }
    async load() {
        this.onSearchRecord = this.onSearchRecord.bind(this);
        window._preloadTools.ipcRenderer.on("search-record", this.onSearchRecord);
        this.addEventListener("unload", () => {
            window._preloadTools.ipcRenderer.removeListener("search-record", this.onSearchRecord);
        })
    }
    // unload() {
    //     window._preloadTools.ipcRenderer.removeListener("search-record", this.onSearchRecord);
    // }
};