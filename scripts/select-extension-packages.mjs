#!/usr/bin/env node
// Select extension packages from the curated registry and expose them as a
// workflow matrix. The registry file is the authority (ADR 0003, ticket 12):
// this script re-validates every entry before anything is built, so a bad
// registry cannot reach the build farm even when it arrives through
// workflow_dispatch inputs.
//
// Usage: node scripts/select-extension-packages.mjs <registry.json> [names]
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const REPO_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const NAME_PATTERN = /^[a-z0-9][a-z0-9+._-]*$/;
const SAFE_PATH = /^(?:\.|[A-Za-z0-9_./+-]+)$/;
const URL_PATTERN = /https?:\/\//i;
const STRATEGIES = new Set(["prebuilt", "rebuild", "blocked"]);
const LAYERS = new Set(["official", "dllkids", "supplement", "extension"]);
// Mirrors src/lib/sources/spdx.ts in the site repo. Unknown identifiers must
// fail here too: a build farm that trusts an arbitrary license string would
// silently admit unlicensed code into the public feed.
const SPDX = new Set([
  "0BSD", "AGPL-3.0-only", "AGPL-3.0-or-later", "Apache-1.1", "Apache-2.0",
  "BSD-2-Clause", "BSD-3-Clause", "BSD-4-Clause", "BSL-1.0", "CC0-1.0",
  "CC-BY-3.0", "CC-BY-4.0", "CC-BY-SA-4.0", "EPL-1.0", "EPL-2.0",
  "GPL-2.0", "GPL-2.0-only", "GPL-2.0-or-later", "GPL-3.0", "GPL-3.0-only",
  "GPL-3.0-or-later", "ISC", "LGPL-2.0-only", "LGPL-2.0-or-later",
  "LGPL-2.1-only", "LGPL-2.1-or-later", "LGPL-3.0-only", "LGPL-3.0-or-later",
  "MIT", "MPL-2.0", "NCSA", "OFL-1.1", "OpenSSL", "PSF-2.0", "PostgreSQL",
  "Python-2.0", "Ruby", "Unlicense", "Vim", "WTFPL", "X11", "Zlib",
]);

function fail(message) {
  console.error(`extension-selection: ${message}`);
  process.exit(1);
}

const [registryPath = "registry.json", namesArg = process.env.PACKAGES_INPUT ?? ""] = process.argv.slice(2);

let raw;
try {
  raw = JSON.parse(readFileSync(registryPath, "utf8"));
} catch (error) {
  fail(`cannot read registry ${registryPath}: ${error.message}`);
}

const entries = Array.isArray(raw) ? raw : raw.packages;
if (!Array.isArray(entries) || entries.length === 0) fail("registry has no packages array");

const errors = [];
const seen = new Set();
for (const entry of entries) {
  const where = `package ${entry?.name ?? "<unnamed>"}`;
  if (typeof entry?.name !== "string" || !NAME_PATTERN.test(entry.name)) {
    errors.push(`${where}: invalid name (expected lowercase package name)`);
    continue;
  }
  if (!LAYERS.has(entry.source)) errors.push(`${where}: unknown source ${JSON.stringify(entry.source)}`);
  const key = `${entry.name}@${entry.source}`;
  if (seen.has(key)) errors.push(`${where}: duplicate entry for layer ${entry.source}`);
  seen.add(key);
  if (typeof entry.license !== "string" || !SPDX.has(entry.license)) {
    errors.push(`${where}: unknown SPDX license ${JSON.stringify(entry.license)}`);
  }
  if (typeof entry.publicAllowed !== "boolean") errors.push(`${where}: publicAllowed must be a boolean`);
  if (!STRATEGIES.has(entry.strategy)) errors.push(`${where}: unknown strategy ${JSON.stringify(entry.strategy)}`);
  for (const field of ["targets", "kernelLines", "patches"]) {
    const value = entry[field];
    if (value === undefined) continue;
    if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.trim() === "")) {
      errors.push(`${where}: ${field} must be an array of non-empty strings`);
    }
  }
  for (const patch of entry.patches ?? []) {
    if (!SAFE_PATH.test(patch) || patch.includes("..")) errors.push(`${where}: unsafe patch path ${JSON.stringify(patch)}`);
  }
  if (typeof entry.pin !== "string" || entry.pin.trim() === "") {
    // Official packages are version-frozen by the release feed path; everything
    // else must carry an immutable pin we can reproduce a build from.
    if (entry.source !== "official") errors.push(`${where}: missing pin`);
  }
  // A registry entry must never smuggle a third-party feed URL into a build.
  for (const [field, value] of Object.entries(entry)) {
    if (typeof value === "string" && URL_PATTERN.test(value)) {
      errors.push(`${where}: ${field} must not contain a URL`);
    }
  }
  if (entry.source === "extension") {
    if (typeof entry.repo !== "string" || !REPO_PATTERN.test(entry.repo)) {
      errors.push(`${where}: repo must be <owner>/<name>`);
    }
    if (typeof entry.ref !== "string" || !COMMIT_PATTERN.test(entry.ref)) {
      errors.push(`${where}: extension ref must be a 40 character lowercase git commit`);
    }
    const subdir = typeof entry.subdir === "string" && entry.subdir !== "" ? entry.subdir : ".";
    if (!SAFE_PATH.test(subdir) || subdir.includes("..")) errors.push(`${where}: unsafe subdir ${JSON.stringify(subdir)}`);
    if (typeof entry.recipe !== "string" || entry.recipe.trim() === "") {
      errors.push(`${where}: missing recipe`);
    }
    const expectedRecipe = `github:${entry.repo ?? ""}@${entry.ref ?? ""}/${subdir}`;
    if (typeof entry.recipe === "string" && entry.recipe !== expectedRecipe) {
      errors.push(`${where}: recipe ${JSON.stringify(entry.recipe)} does not match ${JSON.stringify(expectedRecipe)}`);
    }
    if (typeof entry.recipeHash !== "string" || !/^[0-9a-f]{64}$/.test(entry.recipeHash)) {
      errors.push(`${where}: recipeHash must be a 64 character sha256`);
    } else if (createHash("sha256").update(String(entry.recipe ?? "")).digest("hex") !== entry.recipeHash) {
      errors.push(`${where}: recipeHash does not match sha256(recipe)`);
    }
    if (entry.strategy === "prebuilt") errors.push(`${where}: extension packages must be rebuilt from a pinned ref`);
  }
}
if (errors.length > 0) {
  for (const message of errors) console.error(`extension-selection: ${message}`);
  fail(`${errors.length} registry violation(s)`);
}

const target = process.env.TARGET?.trim() || "x86/64";
const kernelLine = process.env.KERNEL_LINE?.trim() || "";
const baseVersion = process.env.BASE_VERSION?.trim() || "25.12.2";
if (!/^[0-9A-Za-z._-]+$/.test(baseVersion)) fail(`invalid base version: ${baseVersion}`);

const extension = entries.filter((entry) => entry.source === "extension");
if (extension.length === 0) fail("registry has no extension packages");
const requested = namesArg.trim() === "" ? extension.map((entry) => entry.name) : namesArg.trim().split(/\s+/);
const unknown = requested.filter((name) => !extension.some((entry) => entry.name === name));
if (unknown.length > 0) fail(`unknown extension package(s): ${unknown.join(", ")}`);

const selected = [];
for (const name of requested) {
  const entry = extension.find((candidate) => candidate.name === name);
  if (entry.targets && !entry.targets.includes(target)) {
    fail(`${name} does not declare target ${target}`);
  }
  if (kernelLine !== "" && entry.kernelLines && !entry.kernelLines.includes(kernelLine)) {
    fail(`${name} does not declare kernel line ${kernelLine}`);
  }
  selected.push({
    name: entry.name,
    repo: entry.repo,
    ref: entry.ref,
    subdir: entry.subdir && entry.subdir !== "" ? entry.subdir : ".",
    license: entry.license,
    publicAllowed: entry.publicAllowed,
    recipe: entry.recipe,
    recipeHash: entry.recipeHash,
    targets: entry.targets ?? [],
    kernelLines: entry.kernelLines ?? [],
  });
}

const lockLines = selected
  .map((entry) => `${entry.name}@${entry.repo}@${entry.ref}@${entry.subdir}`)
  .sort()
  .join("\n");
// The frozen feed directory is named after the 40-hex prefix, so that is
// what the feed lock exposes (the full digest is reproducible from the refs).
const feedLock = createHash("sha256").update(lockLines).digest("hex").slice(0, 40);

const selection = {
  schemaVersion: 1,
  feed: "extension",
  baseVersion,
  target,
  arch: process.env.FEED_ARCH?.trim() || "x86_64",
  feedLock,
  packages: selected.map((entry) => entry.name),
  entries: selected,
};

const output = process.env.GITHUB_OUTPUT;
const matrix = { include: selected.map((entry) => ({ package: entry.name, repo: entry.repo, ref: entry.ref, subdir: entry.subdir })) };
if (output) {
  writeFileSync(
    output,
    `matrix=${JSON.stringify(matrix)}\nfeed_lock=${feedLock}\ncount=${selected.length}\nfull=${selected.length === extension.length}\n`,
    { flag: "a" },
  );
}

const selectionPath = process.env.SELECTION_PATH ?? "selection.json";
mkdirSync(dirname(selectionPath), { recursive: true });
writeFileSync(selectionPath, `${JSON.stringify(selection, null, 2)}\n`);
console.log(`selected: ${selection.packages.join(" ")}`);
console.log(`feed lock: ${feedLock}`);
console.log(`target ${target} base ${baseVersion}`);
console.log(`wrote ${selectionPath}`);
