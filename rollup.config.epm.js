import babel from "rollup-plugin-babel";
import resolve from "@rollup/plugin-node-resolve"
import commonjs from "@rollup/plugin-commonjs";
import terser from '@rollup/plugin-terser';
import { defineConfig } from 'rollup';


const plugins = [
  resolve(),
  commonjs(),
  babel({
    exclude: "node_modules/**",
  }),
  terser({
    module: true, // 启用模块语法和模块解析逻辑
    mangle: true, // 混淆变量名
    compress: true, // 压缩代码
  }),
]

export default defineConfig(
  [
    {
      input: "src/epm-sdk/index.js",
      output: {
        file: "buildEpm/hinaEpm.esm.min.js",
        name: "hina-epm",
        format: "esm",
      },
      plugins,
    },
    {
      input: "src/epm-sdk/index.js",
      output: {
        file: "buildEpm/hinaEpm.min.js",
        name: "hina-epm",
        format: "umd",
      },
      plugins,
    }
  ]
)
