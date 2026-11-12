#!/usr/bin/env node
// Select the packages to build and expose them as a workflow matrix.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ALLOWED = [
  "luci-lib-xterm",
  "taskd",
  "luci-lib-taskd",
  "luci-app-store",
  "luci-app-substore",
  "luci-app-fwlive",
];

const raw = process.argv[2] ?? "";
const requested = raw.trim() === "" ? ALLOWED : raw.trim().split(/\s+/);
const unknown = requested.filter((name) => !ALLOWED.includes(name));
if (unknown.length > 0) {
  console.error(`unknown package(s): ${unknown.join(", ")}`);
  console.error(`allowed: ${ALLOWED.join(" ")}`);
  process.exit(1);
}
if (requested.length === 0) {
  console.error("no packages selected");
  process.exit(1);
}

const packages = ALLOWED.filter((name) => requested.includes(name));
const selection = {
  packages,
  baseVersion: "25.12.2",
  arch: "x86_64",
  sourceRepo: "kiddin9/op-packages",
  sourceCommit: "18b7d51c1a06427fa6e8c64b161869de7daded7e",
};

const output = process.env.GITHUB_OUTPUT;
if (output) {
  writeFileSync(output, `matrix=${JSON.stringify(packages)}\n`, { flag: "a" });
}

const selectionPath = process.env.SELECTION_PATH ?? "selection.json";
mkdirSync(dirname(selectionPath), { recursive: true });
writeFileSync(selectionPath, `${JSON.stringify(selection, null, 2)}\n`);
console.log(`selected: ${packages.join(" ")}`);
console.log(`wrote ${join(process.cwd(), selectionPath)}`);
