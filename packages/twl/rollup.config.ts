import { fileURLToPath } from "node:url";
import { defineConfig } from "rollup";
import alias from "@rollup/plugin-alias";

import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import dts from "rollup-plugin-dts";

export default defineConfig([
  {
    input: "src/index.ts",
    output: [
      {
        file: "dist/index.mjs",
        format: "esm",
      },
      {
        file: "dist/index.cjs",
        format: "cjs",
      },
    ],
    plugins: [
      alias({
        entries: [
          {
            find: "~",
            replacement: fileURLToPath(new URL("src", import.meta.url)),
          },
        ],
      }),
      typescript(),
      nodeResolve(),
      commonjs(),
    ],
  },
  {
    input: "src/index.ts",
    output: {
      file: "dist/index.d.ts",
      format: "esm",
    },
    plugins: [
      alias({
        entries: [
          {
            find: "~",
            replacement: fileURLToPath(new URL("src", import.meta.url)),
          },
        ],
      }),
      dts(),
    ],
  },
]);
