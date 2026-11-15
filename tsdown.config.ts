import { defineConfig } from 'tsdown'

export default defineConfig({
   entry: ["src/index.ts"],
  format: ["esm"],
  dts: {
    generator: 'tsgo',
  },
  exports: true,
  sourcemap: true,
  clean: true,
  outDir: "dist",
  target: "es2022"
  // ...config options
})
