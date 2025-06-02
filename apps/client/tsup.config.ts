import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/app.ts'],
  format: ['esm', 'cjs'],
  outDir: "./dist",
  dts: true,
  sourcemap: true,
  shims: true,
  clean: true,
  splitting: false,
  platform: 'node',
  external: ['node-cache']
})
