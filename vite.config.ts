import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // IMPORTANT: Change 'elliott-wave-pro' to your GitHub repository name
  // Example: If your repo is https://github.com/user/my-stock-app, set this to '/my-stock-app/'
  base: '/elliott-wave-pro/', 
})