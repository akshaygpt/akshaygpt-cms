import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/fs.ts'],
  format: ['esm'],
  dts: true,
  minify: true,
  treeshake: true,
  clean: true,
  target: 'es2020',
  platform: 'node',
})
