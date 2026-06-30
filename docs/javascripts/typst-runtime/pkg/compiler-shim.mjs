import { setImportWasmModule } from "./typst_ts_web_compiler.mjs";
import initCompiler from "./typst_ts_web_compiler.mjs";
export * from "./typst_ts_web_compiler.mjs";
export default initCompiler;

let nodeJsImportWasmModule = async function (wasmName, url) {
  const escapeImport = new Function("m", "return import(m)");
  const path = await escapeImport("path");
  const { readFileSync } = await escapeImport("fs");

  const wasmPath = new URL(path.join(path.dirname(url), wasmName));
  return await readFileSync(wasmPath).buffer;
};

const isNode =
  typeof process !== "undefined" &&
  process.versions != null &&
  process.versions.node != null;

if (isNode) {
  setImportWasmModule(nodeJsImportWasmModule);
}
