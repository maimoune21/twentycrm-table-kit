// For each named export of src/components/twenty-table/index.ts, check whether
// any other kept file imports it from "@/components/twenty-table". List the
// dead exports.
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");
const BARREL = path.join(SRC, "components/twenty-table/index.ts");

const src = fs.readFileSync(BARREL, "utf8");
const names = new Set();
// Match export { a, b as c } from "..."  and export type { ... }
const reExport = /export\s+(?:type\s+)?\{([^}]+)\}\s*from/g;
let m;
while ((m = reExport.exec(src)) !== null) {
  for (let part of m[1].split(",")) {
    part = part.trim();
    if (!part) continue;
    const asMatch = part.match(/\bas\s+([A-Za-z0-9_]+)/);
    const name = asMatch ? asMatch[1] : part.replace(/^type\s+/, "").trim();
    names.add(name);
  }
}

// Walk all .ts/.tsx files outside the barrel itself and its subtree.
function walk(dir, out) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(ent.name)) out.push(p);
  }
}
const all = [];
walk(SRC, all);

const used = new Set();
for (const file of all) {
  if (file === BARREL) continue;
  const content = fs.readFileSync(file, "utf8");
  // Match  import { ... } from "@/components/twenty-table"   (NOT a subpath)
  const re = /import\s+(?:type\s+)?\{([^}]+)\}\s*from\s*["']@\/components\/twenty-table["']/g;
  let mm;
  while ((mm = re.exec(content)) !== null) {
    for (let part of mm[1].split(",")) {
      part = part.trim();
      if (!part) continue;
      const asMatch = part.match(/\bas\s+([A-Za-z0-9_]+)/);
      // For imports, the local alias is the "as" part but the imported name
      // is what comes before "as".
      const importedName = part.replace(/^type\s+/, "").split(/\s+as\s+/)[0].trim();
      used.add(importedName);
    }
  }
}

const dead = [...names].filter((n) => !used.has(n)).sort();
const live = [...names].filter((n) => used.has(n)).sort();
console.log(JSON.stringify({ totalExports: names.size, used: live.length, dead: dead.length, deadNames: dead, liveNames: live }, null, 2));
