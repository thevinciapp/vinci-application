import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["./electron/main.ts", "./electron/preload.ts"],
  splitting: false,
  sourcemap: false,
  clean: true,
  outDir: "build",
  external: ["electron"],
  format: ["cjs"]
});
