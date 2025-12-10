import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    // 判断是否为生产环境构建
    const isProd = mode === 'production';

    return {
      // ★★★ 核心修改：动态 Base 路径 ★★★
      // 如果是 npm run build (production)，使用子目录 '/pebbles/app/'
      // 如果是 npm run dev (development)，使用根目录 '/'
      base: isProd ? '/pebbles/app/' : '/',
      
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // 这里的 process.env 定义通常用于兼容旧库，现代 Vite 项目推荐直接用 import.meta.env
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});