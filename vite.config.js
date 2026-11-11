import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',   // đường dẫn tương đối: chạy được dưới /GT2/ (Cloudflare Pages, route ở Karofi-VHKD/_worker.js)
  server: { port: 3200 }
});
