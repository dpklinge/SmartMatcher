const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

// Load local TypeScript modules for development tools and isolated tests.
module.exports = function createLoader(mocks = {}) {
  const cache = new Map();
  const root = path.resolve(__dirname, "../..");
  function load(filename) {
    const absolute = path.resolve(root, filename);
    if (cache.has(absolute)) return cache.get(absolute).exports;
    const mod = { exports: {} };
    cache.set(absolute, mod);
    const compiled = ts.transpileModule(fs.readFileSync(absolute, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    const localRequire = name => {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (!name.startsWith("@/") && !name.startsWith(".")) return require(name);
      const resolved = name.startsWith("@/") ? path.join(root, name.slice(2)) : path.resolve(path.dirname(absolute), name);
      if (resolved.endsWith(".json")) return JSON.parse(fs.readFileSync(resolved, "utf8"));
      return load(resolved.endsWith(".ts") ? resolved : `${resolved}.ts`);
    };
    new Function("require", "module", "exports", compiled)(localRequire, mod, mod.exports);
    return mod.exports;
  }
  return load;
};
