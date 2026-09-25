import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import twl from 'twl/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [twl(), react(), tailwindcss()],
})
