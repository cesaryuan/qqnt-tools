// build.js

import { build } from "vite";
import analyze from 'rollup-plugin-analyzer'

if (process.argv.length > 2) {
    let filePath = process.argv[2];
    let fileName = filePath.split('\\').pop();
    await build({
        configFile: false,
        build: {
            lib: {
                entry: filePath,
                name: 'temp',
                fileName: fileName,
                formats: ['iife']
            },
            emptyOutDir: false,
            rollupOptions: {
                plugins: [analyze()]
            },
            minify: true,
        }
    });
} else {
    /**
     * @type {import('vite').LibraryOptions[]}
     */
    const libraries = [
        {
            entry: "./src-page/index.ts",
            name: "qqntTools",
            fileName: "index",
            formats: ["iife"],
        }
    ];

    // build
    libraries.forEach(async (libItem) => {
        await build({
            configFile: false,
            build: {
                lib: libItem,
                emptyOutDir: false,
                rollupOptions: {
                    // plugins: [analyze()]
                },
                minify: false,
            },
        });
    });
}


