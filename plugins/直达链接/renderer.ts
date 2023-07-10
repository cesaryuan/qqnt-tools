import { waitForElement, whenNavigated } from "../common-renderer";


export function onLoad(){
    whenNavigated(() => {
        if (window.location.href.includes("#/main/message")) {
            main();
        }
    });
}

async function main(){
    const handler = (event: MouseEvent): void => {
        if (!(event.target instanceof HTMLSpanElement) || !(event.target.classList.contains("text-link"))) return;
        let link = event.target.innerText.trim();
        console.log("Click link: ", link);
        window._preloadTools.ipcRenderer.send("IPC_UP_2", {
            eventName: "ns-BusinessApi-2",
            type: "request",
        }, ["openUrl", { url: link }]);
    };
    HTMLSpanElement.prototype.addEventListener = new Proxy(HTMLSpanElement.prototype.addEventListener, {
        apply(target, thisArg, argArray) {
            if (argArray[0] === "click") {
                if (thisArg.classList.contains("text-link")) {
                    Reflect.apply(target, thisArg, [argArray[0], handler, argArray[2]]);
                    return;
                }
            }
            return Reflect.apply(target, thisArg, argArray);
        }
    });
}
