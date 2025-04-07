import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  shims: true,
  clean: true,
  splitting: false,
  platform: 'node',
  external: ['node-cache']
})
