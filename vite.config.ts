// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    minify: false,
    rollupOptions: {
      input: './src-page/base.ts',
      output: {
        format: 'iife',  // 输出格式为立即执行函数表达式
        name: 'MyModule', // 输出的全局变量的名称
        file: './dist/base.js' // 输出文件路径
      }
    }
  }
})
