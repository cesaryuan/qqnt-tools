import { BuildOptions, build, context } from "esbuild";
import { globSync } from "glob";
const isProduction = process.env["NODE_ENV"] == "production";
const commonOptions: Partial<BuildOptions> = {
    bundle: true,
    write: true,
    allowOverwrite: true,
    // sourcemap: isProduction ? false : "inline",
    // minify: isProduction,
    sourcemap: "inline",
    minify: false,
    treeShaking: isProduction,
};

async function buildBundles(watch = false) {
    let rendererTasks = globSync("plugins/*/renderer.?s").concat(globSync("plugins/*/src/renderer.?s")).map((file) => {
        return {
            ...commonOptions,
            target: "chrome108",
            platform: "neutral",
            entryPoints: [file],
            outdir: file.replace(/renderer\.\ws$/, "").replace(/src\\$/, "") + "dist",
            external: ["electron"],
        } as BuildOptions;
    });
    let mainTasks = globSync("plugins/*/main.?s").concat(globSync("plugins/*/src/main.?s")).map((file) => {
        return {
            ...commonOptions,
            target: "node18",
            platform: "node",
            entryPoints: [file],
            outdir: file.replace(/main\.\ws$/, "").replace(/src\\$/, "") + "dist",
            external: ["electron", "original-fs"]
        } as BuildOptions;
    });
    let preloadTasks = globSync("plugins/*/preload.?s").concat(globSync("plugins/*/src/preload.?s")).map((file) => {
        return {
            ...commonOptions,
            target: "node18",
            platform: "node",
            entryPoints: [file],
            outdir: file.replace(/preload\.\ws$/, "").replace(/src\\$/, "") + "dist",
            external: ["electron"],
        } as BuildOptions;
    });
    let allTasks = [...rendererTasks, ...mainTasks, ...preloadTasks];
    if (watch) {
        await Promise.all(allTasks.map(async (task) => {
            let ctx = await context(task);
            await ctx.watch();
        }));
    } else {
        await Promise.all(allTasks.map(async (task) => {
            await build(task);
        }));
    }

}

let watch = process.argv.includes("--watch");
buildBundles(watch);
