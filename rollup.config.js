import license from "rollup-plugin-license";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import image from "@rollup/plugin-image";
import commonjs from "@rollup/plugin-commonjs";
import externals from "rollup-plugin-node-externals";
import dts from "rollup-plugin-dts";
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
        banner: `
          ts-image-viewer (Browser image viewer with basic annotationing support written in TypeScript)          
          Copyright (C) 2021-present Volodymyr Yermolenko (yermolim@gmail.com), Chemproject PJSC
      
          This program is free software: you can redistribute it and/or modify
          it under the terms of the GNU Affero General Public License as published
          by the Free Software Foundation, either version 3 of the License, or
          (at your option) any later version.
      
          This program is distributed in the hope that it will be useful,
          but WITHOUT ANY WARRANTY; without even the implied warranty of
          MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
          GNU Affero General Public License for more details.
      
          You should have received a copy of the GNU Affero General Public License
          along with this program.  If not, see <https://www.gnu.org/licenses/>.
          
          You can be released from the requirements of the license by purchasing
          a commercial license. Buying such a license is mandatory as soon as you
          develop commercial activities involving this program without
          disclosing the source code of your own applications.
        `,
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
  {
    input: "tsc/src/ts-image-viewer.d.ts",
    output: [
      { file: "dist/ts-image-viewer.d.ts", format: "esm" },
    ],
    plugins: [
      dts(),
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
