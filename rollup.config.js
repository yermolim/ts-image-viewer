import license from "rollup-plugin-license";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import image from "@rollup/plugin-image";
import commonjs from "@rollup/plugin-commonjs";
import externals from "rollup-plugin-node-externals";
// import { terser } from "rollup-plugin-terser";
// import css from "rollup-plugin-css-porter";

export default [
  // main build
  {
    input: "tsc/src/ts-image-viewer.js",
    output: [
      { file: "dist/ts-image-viewer.esm.js", format: "esm" },
      // TODO: configure terser to prevent imports from shadowing variables
      // { file: "dist/ts-image-viewer.esm.min.js", format: "esm", plugins: [terser()] },
    ],
    plugins: [
      license({
        banner: `MIT License

        Copyright (c) 2021-present yermolim
        
        Permission is hereby granted, free of charge, to any person obtaining a copy
        of this software and associated documentation files (the "Software"), to deal
        in the Software without restriction, including without limitation the rights
        to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
        copies of the Software, and to permit persons to whom the Software is
        furnished to do so, subject to the following conditions:
        
        The above copyright notice and this permission notice shall be included in all
        copies or substantial portions of the Software.
        
        THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
        IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
        FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
        AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
        LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
        OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
        SOFTWARE.`,
      }),
      externals({
        deps: true,
        devDeps: false,
      }),
      image(),
      // css({
      //   raw: "dist/styles.css",
      //   minified: "dist/styles.min.css",
      // }),
    ],
  },
  // demo build
  {
    input: "tsc/src/demo.js",
    output: [
      { file: "demo/demo.js", format: "esm" },
    ],
    plugins: [
      nodeResolve({
        browser: true,
      }),
      commonjs(),
      image(),
      // css({
      //   raw: "demo/styles.css",
      //   minified: false
      //   minified: "demo/styles.min.css",
      // }),
    ],
  },
];
