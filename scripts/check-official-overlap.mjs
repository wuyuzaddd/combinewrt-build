#!/usr/bin/env node
// Assert that no package in this build shadows an official ImmortalWrt package.
//
// ADR 0007: an image installs the official feeds and our signed feed side by
// side, so a package we publish under an official name would silently replace
// the distribution's own build (apk resolves by name and version, not by
// repository order). The published feed's package set must therefore be
// disjoint from the official index of the same release.
//
// Usage: node scripts/check-official-overlap.mjs \
//          --manifest build/manifest.json \
//          --official-index base/packages.adb \
//          --official-index packages/packages.adb \
//          --apk-tool /path/to/apk.static
//
// The official release is split into feeds (base, luci, packages, routing,
// telephony); every one of them is passed in and their names are unioned.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

function option(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) {
    if (fallback === undefined) throw new Error(`missing --${name}`);
    return fallback;
  }
  return process.argv[index + 1];
}

function dumpNames(apkTool, file, label) {
  let raw;
  try {
    raw = execFileSync(apkTool, ["adbdump", "--format", "json", file], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "inherit"],
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (error) {
    throw new Error(`cannot read the ${label} index ${file}: ${error.message ?? error}`);
  }
  const parsed = JSON.parse(raw);
  const list = Array.isArray(parsed) ? parsed : parsed.packages;
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error(`the ${label} index ${file} has no packages`);
  }
  const names = new Set();
  for (const entry of list) {
    const name = entry?.name ?? entry?.info?.name;
    if (typeof name === "string" && name !== "") names.add(name);
  }
  if (names.size === 0) throw new Error(`the ${label} index ${file} has no package names`);
  return names;
}

function options(name) {
  const values = [];
  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] === `--${name}`) values.push(process.argv[index + 1]);
  }
  if (values.length === 0) throw new Error(`missing --${name}`);
  return values;
}

const manifestPath = option("manifest");
const officialIndexes = options("official-index");
const apkTool = option("apk-tool");

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const entries = Array.isArray(manifest.entries) ? manifest.entries : [];
const ours = new Set(entries.map((entry) => entry.name).filter((name) => typeof name === "string"));
if (ours.size === 0) throw new Error(`${manifestPath} has no package names`);

const official = new Set();
for (const file of officialIndexes) {
  for (const name of dumpNames(apkTool, file, "official")) official.add(name);
}
const collisions = [...ours].filter((name) => official.has(name)).sort();

console.log(`official indexes: ${officialIndexes.length} files, ${official.size} packages`);
console.log(`this feed:      ${ours.size} packages`);
if (collisions.length > 0) {
  console.error(`collision: ${collisions.join(", ")} also exist in the official index of ${manifest.baseVersion ?? "?"}`);
  process.exit(1);
}
console.log("overlap with the official index: none");
