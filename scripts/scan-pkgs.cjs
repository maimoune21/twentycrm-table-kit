// Scan src/ for bare package imports and build a package.json `dependencies` /
// `devDependencies` map by looking up versions in the upstream package.json.
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");
const UPSTREAM_PKG = "/Users/stagiaire/Desktop/Stagiaires/stg_v3_web/package.json";

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?)$/.test(name)) out.push(p);
  }
  return out;
}

function stripComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:\\])\/\/.*$/gm, "$1");
}

const RE_FROM = /\bfrom\s*['"]([^'"]+)['"]/g;
const RE_BARE = /\bimport\s*['"]([^'"]+)['"]/g;
const RE_DYN = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
const RE_REQ = /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

function specsOf(src) {
  const out = new Set();
  const c = stripComments(src);
  for (const re of [RE_FROM, RE_BARE, RE_DYN, RE_REQ]) {
    let m;
    while ((m = re.exec(c)) !== null) out.add(m[1]);
  }
  return out;
}

function packageOf(spec) {
  if (spec.startsWith(".") || spec.startsWith("/")) return null;
  if (spec.startsWith("@/") || spec.startsWith("@api/")) return null;
  if (spec.startsWith("node:")) return null;
  // Scoped: @scope/name[/sub]
  if (spec.startsWith("@")) {
    const parts = spec.split("/");
    return parts.slice(0, 2).join("/");
  }
  return spec.split("/")[0];
}

const upstream = JSON.parse(fs.readFileSync(UPSTREAM_PKG, "utf8"));
const allDeps = { ...(upstream.dependencies || {}), ...(upstream.devDependencies || {}) };
const upstreamDevSet = new Set(Object.keys(upstream.devDependencies || {}));

const used = new Set();
for (const file of walk(SRC)) {
  for (const s of specsOf(fs.readFileSync(file, "utf8"))) {
    const pkg = packageOf(s);
    if (pkg) used.add(pkg);
  }
}

const deps = {};
const devDeps = {};
const missing = [];
for (const pkg of [...used].sort()) {
  const v = allDeps[pkg];
  if (!v) {
    missing.push(pkg);
    continue;
  }
  if (upstreamDevSet.has(pkg)) devDeps[pkg] = v;
  else deps[pkg] = v;
}

// Required toolchain for the standalone build/dev (Vite + TS + plugins).
// These come from the upstream devDependencies if available.
const toolchain = [
  "vite",
  "@vitejs/plugin-react",
  "@tailwindcss/vite",
  "tailwindcss",
  "typescript",
  "@types/node",
  "@types/react",
  "@types/react-dom",
];
for (const t of toolchain) {
  if (allDeps[t] && !deps[t] && !devDeps[t]) devDeps[t] = allDeps[t];
}

console.log(JSON.stringify({ deps, devDeps, missing, usedCount: used.size }, null, 2));
