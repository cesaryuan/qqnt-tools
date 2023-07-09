import { waitFor } from "../common-renderer";

export async function onLoad() {
    // setInterval(() => { console.log("cesar-log", "cesar-log") }, 1000);
    console.log = new Proxy(console.log, {
        apply(target, thisArg, argumentsList) {
            preloadTools.ipcRenderer.send("cesar-log", "From Renderer:", ...argumentsList);
            return Reflect.apply(target, thisArg, argumentsList);
        }
    });
    let preloadTools = await waitFor(() => window._preloadTools);
}