/**
 * Vite plugin that auto-stubs every `@/api/...` (and `@api/...`) import so the
 * upstream production source can be loaded without a real backend.
 *
 * Strategy:
 * - For each `import { a, b } from "@/api/foo"` in a consumer file, intercept
 *   resolution and emit a virtual module that exports `a` and `b` as no-op
 *   functions returning a benign payload shape.
 * - If a "real" stub file has been registered for that path (in `REAL_STUBS`),
 *   re-export everything from it, and fall back to a no-op for any named
 *   import the real stub doesn't provide.
 */
import fs from "node:fs";
import type { Plugin } from "vite";

interface Options {
  /** Map of api path -> absolute filesystem path of the real stub module. */
  realStubs?: Record<string, string>;
  /** Absolute filesystem prefix that, when seen, should be treated as `@/api/...`. */
  upstreamApiDir?: string;
}

const NOOP_DECL = `\
const __payload = () => ({ success: true, data: [], items: [], pagination: { total: 0 } });
function __noopFn() { return __noopProxy; }
__noopFn.then = function(onFul, onRej) { return Promise.resolve(__payload()).then(onFul, onRej); };
__noopFn.catch = function(onRej) { return Promise.resolve(__payload()).catch(onRej); };
__noopFn.finally = function(cb) { return Promise.resolve(__payload()).finally(cb); };
const __noopProxy = new Proxy(__noopFn, {
  get: function(target, prop) {
    if (prop === Symbol.toPrimitive) return function() { return null; };
    if (prop === 'toString') return function() { return ''; };
    if (prop === 'valueOf') return function() { return null; };
    if (prop === 'toJSON') return function() { return null; };
    if (prop === 'then' || prop === 'catch' || prop === 'finally') return target[prop].bind(target);
    if (typeof prop === 'symbol') return undefined;
    if (prop === '__esModule') return false;
    if (prop === 'length' || prop === 'name' || prop === 'prototype' || prop === 'constructor') return target[prop];
    return __noopProxy;
  },
  apply: function() { return __noopProxy; },
});
const __noop = __noopProxy;
`;

function parseImports(content: string, source: string) {
  const named = new Set<string>();
  let hasDefault = false;
  let hasNamespace = false;
  if (!content) return { named, hasDefault, hasNamespace };

  const esc = source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // import ... from "<source>"
  const reImport = new RegExp(
    `import\\s+((?:type\\s+)?[^;]+?)\\s+from\\s+['"]${esc}['"]`,
    "g",
  );
  // export { ... } from "<source>"
  const reReexport = new RegExp(
    `export\\s+(?:type\\s+)?\\{([^}]+)\\}\\s+from\\s+['"]${esc}['"]`,
    "g",
  );

  let m: RegExpExecArray | null;
  while ((m = reImport.exec(content))) {
    let spec = m[1].trim().replace(/^type\s+/, "");
    // Split top-level commas (ignore commas inside {})
    const parts: string[] = [];
    let depth = 0;
    let buf = "";
    for (const ch of spec) {
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
      if (ch === "," && depth === 0) {
        parts.push(buf.trim());
        buf = "";
      } else {
        buf += ch;
      }
    }
    if (buf.trim()) parts.push(buf.trim());

    for (const p of parts) {
      if (p.startsWith("{") && p.endsWith("}")) {
        const inner = p.slice(1, -1);
        for (const item of inner.split(",")) {
          const raw = item.trim().replace(/^type\s+/, "");
          if (!raw) continue;
          const name = raw.split(/\s+as\s+/)[0].trim();
          if (name) named.add(name);
        }
      } else if (p.startsWith("*")) {
        hasNamespace = true;
      } else if (p.length > 0) {
        hasDefault = true;
      }
    }
  }
  while ((m = reReexport.exec(content))) {
    for (const item of m[1].split(",")) {
      const raw = item.trim().replace(/^type\s+/, "");
      if (!raw) continue;
      const name = raw.split(/\s+as\s+/)[0].trim();
      if (name) named.add(name);
    }
  }
  return { named, hasDefault, hasNamespace };
}

const PREFIX = "\0apistub:";

function encode(s: string) {
  return Buffer.from(s).toString("base64url");
}
function decode(s: string) {
  return Buffer.from(s, "base64url").toString();
}

export default function apiStubPlugin(opts: Options = {}): Plugin {
  const realStubs = opts.realStubs ?? {};
  const upstreamApiDir = opts.upstreamApiDir
    ? opts.upstreamApiDir.replace(/\/+$/, "") + "/"
    : "";

  return {
    name: "demo-api-stub",
    enforce: "pre",

    resolveId(source, importer) {
      if (!source) return null;

      let normalized: string | null = null;

      // Accept `@/api/...` and `@api/...`
      const aliasMatch = /^(@\/api\/|@api\/)([^?]+)/.exec(source);
      if (aliasMatch) {
        normalized = "@/api/" + aliasMatch[2];
      } else if (
        upstreamApiDir &&
        source.startsWith(upstreamApiDir)
      ) {
        // Already-resolved absolute path under <upstream>/src/api/
        const rest = source.slice(upstreamApiDir.length).replace(/\.[tj]sx?$/, "");
        normalized = "@/api/" + rest;
      }

      if (!normalized) return null;
      return PREFIX + encode(normalized) + ":" + encode(importer ?? "");
    },

    load(id) {
      if (!id.startsWith(PREFIX)) return null;
      const rest = id.slice(PREFIX.length);
      const [sourceB64, importerB64] = rest.split(":");
      const source = decode(sourceB64);
      const importer = importerB64 ? decode(importerB64) : "";

      let importerContent = "";
      try {
        if (importer && fs.existsSync(importer)) {
          importerContent = fs.readFileSync(importer, "utf-8");
        }
      } catch {
        /* ignore */
      }

      const { named, hasDefault, hasNamespace } = parseImports(
        importerContent,
        source,
      );

      const realStubPath = realStubs[source];
      const lines: string[] = [NOOP_DECL];

      if (realStubPath) {
        const realQ = JSON.stringify(realStubPath);
        lines.push(`import * as __real from ${realQ};`);
        for (const n of named) {
          lines.push(
            `export const ${n} = (__real && __real.${n} !== undefined) ? __real.${n} : __noop;`,
          );
        }
        if (hasDefault) {
          lines.push(
            `const __def = (__real && __real.default !== undefined) ? __real.default : __noop;`,
            `export default __def;`,
          );
        }
        if (hasNamespace) {
          // Best-effort: re-export everything we got from the real stub.
          lines.push(`export * from ${realQ};`);
        }
      } else {
        for (const n of named) {
          lines.push(`export const ${n} = __noop;`);
        }
        if (hasDefault) {
          lines.push(`export default __noop;`);
        }
      }

      // Always also expose a default Proxy so star-imports get something usable.
      if (!hasDefault && !realStubPath) {
        lines.push(`export default __noop;`);
      }

      return lines.join("\n");
    },
  };
}
