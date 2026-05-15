// Trace every file reachable from src/main.tsx through static imports and
// print the list of files to KEEP. Anything else under src/ can be deleted.
//
// Rules:
//   - `@/...`       => src/...
//   - `@api/...`    => src/api/... (but the api-stub plugin intercepts these,
//                      so we DO NOT follow into them and DO NOT keep them)
//   - `@/api/...`   => same as above (stubbed; not followed, not kept)
//   - relative      => resolved from importer dir
//   - file-level redirects from vite.config.ts:
//       src/components/twenty-table/record-table-cell/components/RecordTableCellContainer.tsx
//         -> src/admin/dashboard/components/cell/RecordTableCellContainer.tsx
//       src/components/twenty-table/record-table-cell/components/RecordTableCellEditMode.tsx
//         -> src/admin/dashboard/components/cell/RecordTableCellEditMode.tsx
//
// Extensions tried: .ts, .tsx, .js, .jsx, .css, .json, /index.{ts,tsx,js,jsx}

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");

const REDIRECTS = {};

const EXTS = ["", ".ts", ".tsx", ".js", ".jsx", ".css", ".json"];
const INDEX_EXTS = [".ts", ".tsx", ".js", ".jsx"];

function tryResolve(p) {
  for (const ext of EXTS) {
    const cand = p + ext;
    try {
      const st = fs.statSync(cand);
      if (st.isFile()) return cand;
    } catch {}
  }
  for (const ext of INDEX_EXTS) {
    const cand = path.join(p, "index" + ext);
    try {
      const st = fs.statSync(cand);
      if (st.isFile()) return cand;
    } catch {}
  }
  return null;
}

function resolveImport(spec, importerFile) {
  // Skip pure package imports (no relative, no alias)
  if (/^@api\//.test(spec)) return { stubbed: true };
  if (/^@\/api\//.test(spec)) return { stubbed: true };

  let basePath;
  if (spec.startsWith("@/")) {
    basePath = path.join(SRC, spec.slice(2));
  } else if (spec.startsWith("./") || spec.startsWith("../")) {
    basePath = path.resolve(path.dirname(importerFile), spec);
  } else {
    return null; // bare package import
  }

  const resolved = tryResolve(basePath);
  if (!resolved) return null;

  // Apply file-level redirects
  if (REDIRECTS[resolved]) return { file: REDIRECTS[resolved] };
  return { file: resolved };
}

// Regexes — cover `import x from "y"`, `import "y"`, `export ... from "y"`,
// and `import("y")`. We strip block & line comments first to avoid matching
// commented-out imports.
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:\\])\/\/.*$/gm, "$1");
}

function extractSpecifiers(src) {
  const cleaned = stripComments(src);
  const specs = new Set();
  const patterns = [
    /\bfrom\s*['"]([^'"]+)['"]/g,
    /\bimport\s*['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(cleaned)) !== null) specs.add(m[1]);
  }
  return [...specs];
}

const visited = new Set();
const queue = [];

function enqueue(file) {
  if (!file) return;
  const abs = path.resolve(file);
  if (visited.has(abs)) return;
  if (!abs.startsWith(SRC + path.sep)) return; // only src/
  visited.add(abs);
  queue.push(abs);
}

// Entry points
enqueue(path.join(SRC, "main.tsx"));

while (queue.length) {
  const file = queue.shift();
  let src;
  try {
    src = fs.readFileSync(file, "utf8");
  } catch {
    continue;
  }
  if (file.endsWith(".css") || file.endsWith(".json")) continue;
  for (const spec of extractSpecifiers(src)) {
    const r = resolveImport(spec, file);
    if (!r) continue;
    if (r.stubbed) continue;
    enqueue(r.file);
  }
}

// Output
const keep = [...visited].sort();
console.log(JSON.stringify({ count: keep.length, files: keep }, null, 2));
