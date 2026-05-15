// Print files under src/ that are NOT reached by trace-deps.cjs output.
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");

const keep = JSON.parse(execSync(`node "${path.join(__dirname, "trace-deps.cjs")}"`, { encoding: "utf8" })).files;
const keepSet = new Set(keep);

const all = execSync(
  `find "${SRC}" -type f \\( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.css" -o -name "*.json" \\)`,
  { encoding: "utf8" }
).trim().split("\n");

const unused = all.filter((p) => !keepSet.has(p));
console.log(JSON.stringify({ totalFiles: all.length, kept: keep.length, unused: unused.length, files: unused }, null, 2));
