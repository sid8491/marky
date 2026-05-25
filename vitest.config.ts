import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer/src'),
      '@shared': resolve(__dirname, 'src/shared')
    }
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
    globals: false,
    css: false,
    restoreMocks: true,
    // Shiki lazily loads its WASM engine + grammars on first use; the cold-start
    // can blow past the 5s default on slower CI runners (seen on Windows).
    testTimeout: 20000,
    hookTimeout: 20000
  }
})
