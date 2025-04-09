import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    "oidc-client": 'src/oidc-client.ts',
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  shims: true,
  clean: true,
  splitting: false,
  platform: 'node',
  external: ['node-cache']
})
