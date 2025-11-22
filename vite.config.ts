
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Polyfill process.env.API_KEY so it is replaced at build time with the Vercel env var
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
    // Fallback for other process.env usage
    'process.env': {}
  }
});