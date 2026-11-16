#!/usr/bin/env node
// Feed tests for the curated extension bundles.
//
// Every bundle must be installable on the target it declares: each package is
// either built in this run (and therefore present in the signed extension
// index) or comes from an already-reviewed feed layer (official/supplement/
// dllkids). Failures are structured so the feed repo and the site can name the
// exact package and target (ticket 12 acceptance).
//
// Usage: node scripts/test-extension-bundles.mjs \
//   --bundles bundles.json --registry registry.json --selection selection.json \
//   --manifest build/manifest.json --target x86/64 --out build/bundles.json
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";

function option(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) {
    if (fallback === undefined) throw new Error(`missing --${name}`);
    return fallback;
  }
  return process.argv[index + 1];
}

const bundlesPath = option("bundles");
const registryPath = option("registry");
const selectionPath = option("selection");
const manifestPath = option("manifest");
const target = option("target", "x86/64");
const outPath = option("out", "build/bundles.json");

const bundles = JSON.parse(readFileSync(bundlesPath, "utf8")).bundles;
const registry = JSON.parse(readFileSync(registryPath, "utf8")).packages;
const selection = JSON.parse(readFileSync(selectionPath, "utf8"));
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : { entries: [] };

const SPDX = new Set([
  "0BSD", "AGPL-3.0-only", "AGPL-3.0-or-later", "Apache-1.1", "Apache-2.0",
  "BSD-2-Clause", "BSD-3-Clause", "BSD-4-Clause", "BSL-1.0", "CC0-1.0",
  "GPL-2.0", "GPL-2.0-only", "GPL-2.0-or-later", "GPL-3.0", "GPL-3.0-only",
  "GPL-3.0-or-later", "ISC", "LGPL-2.1-only", "LGPL-2.1-or-later", "MIT",
  "MPL-2.0", "Unlicense", "Zlib",
]);
const CATEGORIES = new Set(["proxy", "nas", "download", "monitor", "theme", "system"]);
const ALLOWED_KEYS = new Set([
  "id", "title", "description", "category", "packages", "targets",
  "license", "publicAllowed", "tests", "notes",
]);

const failures = [];
const skipped = [];
function fail(bundle, packageName, reason) {
  const marker = `COMBINEWRT_FAILURE bundle=${bundle} package=${packageName} target=${target} reason=${reason}`;
  console.error(marker);
  console.error(`::error title=extension bundle::${marker}`);
  failures.push({ bundle, package: packageName, target, reason });
}

if (!Array.isArray(bundles)) throw new Error("bundles.json must contain a bundles array");
if (bundles.length < 10) fail("<bundles>", "<count>", `only ${bundles.length} bundles, need at least 10`);

const builtOk = new Set(manifest.entries.filter((entry) => entry.status === "ok").map((entry) => entry.name));
const byName = new Map(registry.map((entry) => [entry.name, entry]));

const counts = { proxy: 0, "nas/download/monitor": 0 };
for (const bundle of bundles) {
  const where = bundle?.id ?? "<unnamed>";
  if (typeof bundle?.id !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(bundle.id)) {
    fail(where, "<id>", "invalid id");
    continue;
  }
  if (bundle.packages === undefined && bundle.test === undefined) {
    // intentionally not a failure: the schema below reports precise problems
  }
  const extra = Object.keys(bundle).filter((key) => !ALLOWED_KEYS.has(key));
  if (extra.length > 0) fail(where, "<schema>", `unknown fields ${extra.join(",")} (bundles carry no scripts or hooks)`);
  if (!CATEGORIES.has(bundle.category)) fail(where, "<category>", `unknown category ${JSON.stringify(bundle.category)}`);
  else if (bundle.category === "proxy") counts.proxy += 1;
  else if (["nas", "download", "monitor"].includes(bundle.category)) counts["nas/download/monitor"] += 1;
  if (typeof bundle.license !== "string" || !SPDX.has(bundle.license)) fail(where, "<license>", "unknown SPDX");
  if (typeof bundle.publicAllowed !== "boolean") fail(where, "<publicAllowed>", "must be a boolean");
  if (!Array.isArray(bundle.packages) || bundle.packages.length === 0) {
    fail(where, "<packages>", "must list at least one registry package");
    continue;
  }
  if (!Array.isArray(bundle.targets) || !bundle.targets.includes(target)) continue;
  if (!Array.isArray(bundle.tests) || bundle.tests.length === 0) {
    fail(where, "<tests>", "must declare at least one of dependency/installability");
  } else if (bundle.tests.some((test) => !["dependency", "installability"].includes(test))) {
    fail(where, "<tests>", `unknown test ${JSON.stringify(bundle.tests)}`);
  }
  const missingInSelection = bundle.packages.filter((name) => !byName.has(name));
  if (missingInSelection.length > 0) {
    for (const name of missingInSelection) fail(where, name, "not in the source registry");
    continue;
  }
  if (bundle.publicAllowed === true) {
    const privatePackages = bundle.packages.filter((name) => byName.get(name).publicAllowed !== true);
    for (const name of privatePackages) fail(where, name, "bundle is public but the package is not publicAllowed");
  }
  // A subset build only owns the packages in its feed lock. Bundles that need
  // an extension package from another lock are reported as skipped (they will
  // be covered by the run holding that lock), never as pass.
  const uncovered = bundle.packages
    .filter((name) => byName.get(name).source === "extension")
    .filter((name) => !selection.packages.includes(name));
  if (uncovered.length > 0) {
    skipped.push({ bundle: where, packages: uncovered, reason: "extension package outside this feed lock" });
    continue;
  }
  if (bundle.tests.includes("dependency")) {
    for (const name of bundle.packages) {
      const entry = byName.get(name);
      if (builtOk.has(name)) continue;
      if (entry.source !== "extension") continue; // supplied by an already reviewed feed layer
      fail(where, name, "extension package did not build into this feed");
    }
  }
}

if (counts.proxy < 3) fail("<bundles>", "<count>", `only ${counts.proxy} proxy bundles, need at least 3`);
if (counts["nas/download/monitor"] < 3) {
  fail("<bundles>", "<count>", `only ${counts["nas/download/monitor"]} nas/download/monitor bundles, need at least 3`);
}

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  target,
  feedLock: selection.feedLock,
  bundles: bundles.length,
  counts,
  failures,
  skipped,
};
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(
  `bundle report: ${bundles.length} bundles, ${counts.proxy} proxy, ${counts["nas/download/monitor"]} nas/download/monitor, ${failures.length} failure(s), ${skipped.length} skipped bundle(s)`,
);
if (failures.length > 0) process.exit(1);
