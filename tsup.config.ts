import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli/index.ts"],
  format: ["cjs", "esm"],
  target: "node18",
  outDir: "dist/cli",
  splitting: false,
  clean: true,
  dts: true,
  shims: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
});
