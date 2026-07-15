// Single-file build: inlines all JS/CSS into dist-artifact/index.html so the
// whole app can be served (or emailed) as one self-contained file.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: 'dist-artifact',
    emptyOutDir: true,
  },
})
