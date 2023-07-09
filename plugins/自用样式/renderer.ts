import { insertCSS } from "../common-renderer";
export function onLoad(){
    insertCSS(`
    body > div {
        font-family: Color Emoji, PingFang SC, system-ui, PingFangSC-Regular, Microsoft YaHei,
            Hiragino Sans GB, Heiti SC, WenQuanYi Micro Hei, sans-serif, Apple Braille;
    }`)
}