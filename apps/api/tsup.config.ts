import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["./src/index.ts"],
  // Bundle workspace packages into the output so dist/ is self-contained for
  // the @repo/* code and only needs npm dependencies installed at runtime.
  noExternal: [/^@repo\//],
  splitting: false,
  bundle: true,
  outDir: "./dist",
  clean: true,
  env: { IS_SERVER_BUILD: "true" },
  loader: { ".json": "copy" },
  minify: true,
  sourcemap: false,
});
