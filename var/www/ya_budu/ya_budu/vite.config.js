import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Загружаем переменные окружения
  const env = loadEnv(mode, process.cwd(), '')
  
  // Значения по умолчанию для локальной разработки
  const apiTarget = env.VITE_API_URL || 'http://localhost:3001'
  const wsTarget = env.VITE_WS_URL || 'ws://localhost:3005'
  
  return {
    plugins: [react(), tailwindcss()],
    css: {
      postcss: false
    },
    esbuild: {
      loader: 'jsx',
      include: /src\/.*\.[jt]sx?$/,
    },
    server: {
      port: 5173,
      host: true,  // Используем 0.0.0.0 вместо 127.0.0.1
      hmr: {
        protocol: 'ws',
        timeout: 30000,
        overlay: true
      },
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true
        },
        '/uploads': {
          target: apiTarget,
          changeOrigin: true
        },
        '/ws': {
          target: wsTarget,
          ws: true
        },
        '/socket.io': {
          target: apiTarget,
          ws: true
        }
      }
    }
  }
})
