import fs = require("fs");
import path = require("path");
import { extractAll } from "asar";
import { globSync } from "glob";

function extractAsar(asarFile: string, destDir: string) {
    extractAll(asarFile, destDir);
}
function createDirIfNotExists(file: string) {
    let parentDir = path.dirname(file);
    if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir);
    }
    return file;
}
export function onLoad(){
    console.log(globSync, module.paths);
    let versionDir = path.join(__dirname, "./versions");
    if (!fs.existsSync(versionDir)) {
        fs.mkdirSync(versionDir);
    }
    let qqDir = process.execPath.replace("QQ.exe", "");
    const asarFile = globSync(`${qqDir}/resources/app/versions/*/application.asar`)[0]
    const baseDir = path.dirname(asarFile).replaceAll("\\", "/");
    const unpackDir = `${baseDir}/application_unpack`;
    const tempDecryptDir = `${baseDir}/application_temp`;
    const decryptDir = `${baseDir}/application`;
    fs.rmSync(unpackDir, { recursive: true, force: true });
    fs.rmSync(tempDecryptDir, { recursive: true, force: true });
    fs.rmSync(decryptDir, { recursive: true, force: true });
    extractAsar(asarFile, unpackDir);
    const files = globSync(unpackDir + `/**`, { nodir: true });
    console.log(`find ${files.length} files in ${unpackDir}`);
    for (let file of files) {
        let content = fs.readFileSync(file.replace("application_unpack", "application"));
        fs.writeFileSync(createDirIfNotExists(file.replace("application_unpack", "application_temp")), content);
    }
    fs.renameSync(tempDecryptDir, decryptDir);
}