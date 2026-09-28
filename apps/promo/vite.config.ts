import { defineConfig } from 'vite'

// PROMO_NO_HMR=1 turns live reload off: an export must not reload mid-render
// because a file was saved.
export default defineConfig({
  server: {
    port: 5199,
    strictPort: false,
    hmr: process.env.PROMO_NO_HMR ? false : undefined,
  },
  // Pre-bundle three together with the addons the scenes use, or the addons
  // import a second copy of three.
  optimizeDeps: {
    include: ['three', 'three/addons/environments/RoomEnvironment.js'],
  },
  build: { target: 'esnext' },
})
