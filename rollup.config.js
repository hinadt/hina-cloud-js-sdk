import babel from "rollup-plugin-babel";
import { uglify } from "rollup-plugin-uglify";
import resolve from "@rollup/plugin-node-resolve"
import commonjs from "@rollup/plugin-commonjs";
import terser from '@rollup/plugin-terser';
import { defineConfig } from 'rollup';
// import obfuscatorPlugin from 'rollup-plugin-javascript-obfuscator'


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
// export default [
//   {
//     input: "src/pv-sdk/index.js",
//     output: {
//       file: "build/hina.esm.min.js",
//       name: "hina",
//       format: "esm",
//     },
//     plugins
//   },
//   {
//     input: "src/pv-sdk/index.js",
//     output: {
//       file: "build/hina.min.js",
//       name: "hina",
//       format: "umd",
//     },
//     plugins
//   },
//   // {
//   //   input: "src/epm-sdk/index.js",
//   //   output: {
//   //     file: "build/epm.esm.min.js",
//   //     name: "hina-epm",
//   //     format: "umd",
//   //   },
//   //   plugins
//   // },
//   {
//     input: "src/hotAnalyse.js",
//     output: {
//       file: "build/hotAnalyse.min.js",
//       name: "hina",
//       format: "umd",
//     },
//     plugins
//   },
// ];

export default defineConfig(
  [
    {
      input: "src/index.js",
      output: {
        file: "build/hina.esm.min.js",
        name: "hina-epm",
        format: "esm",
      },
      plugins: [
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
      ],
    },
    {
      input: "src/index.js",
      output: {
        file: "build/hina.min.js",
        name: "hina-epm",
        format: "umd",
      },
      plugins: [
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
      ],
    },
    {
      input: "src/hotAnalyse.js",
      output: {
        file: "build/hotAnalyse.min.js",
        name: "hina-epm",
        format: "umd",
      },
      plugins: [
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
      ],
    }
  ]
)
