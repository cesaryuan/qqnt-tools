import type { ComponentInternalInstance } from "vue";
import { BasePlugin, waitForElement } from "../base"
export default class ShowMsgTime extends BasePlugin {
    name = "ShowMsgTime";
    description = "在用户按下鼠标中键时显示消息发送时间";
    version = "1.0.0";
    observer: MutationObserver | null = null;
    load() {
        this.unload();
        waitForElement(".ml-list", (mlList) => {
            // 添加 mousedown 事件处理函数
            (mlList as HTMLElement).addEventListener('mousedown', function(event: MouseEvent) {
                // 检查是否是鼠标中键
                if (event.button === 1) {
                    console.log('Mouse middle button is pressed');
                    // 在这里添加你的代码
                }
            });

        });
    }
    unload() {
        this.observer?.disconnect();
    }
};

