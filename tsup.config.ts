import { defineConfig } from 'tsup'

export default defineConfig({
  // Two entries: offline library + cloud client.
  // Cloud is a separate entry so the offline/zero-dependency guarantee is unambiguous.
  entry: ['src/index.ts', 'src/cloud.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'node18',
})
