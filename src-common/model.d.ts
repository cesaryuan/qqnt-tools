import type { IpcRenderer } from "electron";

export interface PreloadTools {
    ipcRenderer: Pick<IpcRenderer, "send" | "on" | "removeListener">;
}