// vite.config.ts
import { defineConfig } from 'vite'
import copy from 'rollup-plugin-copy'

export default defineConfig({
  build: {
    minify: false,
    rollupOptions: {
      input: './src-page/qq-page.ts',
      output: {
        format: 'iife',  // 输出格式为立即执行函数表达式
        name: 'qqnt_tools', // 输出的全局变量的名称
        entryFileNames: `[name].js`,
      },
      plugins: [
        copy({
          targets: [
            { src: './src-page/css/*', dest: './dist/css/' },
          ],
          hook: 'writeBundle'
        })
      ]
    },
    assetsDir: './src-page/css/',
  }
})
