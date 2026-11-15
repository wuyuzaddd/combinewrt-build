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

const COMMIT_PATTERN = /^[0-9a-f]{40}$/;

function fail(message) {
  console.error(message);
  process.exit(1);
}

const raw = process.argv[2] ?? "";
const requested = raw.trim() === "" ? ALLOWED : raw.trim().split(/\s+/);
const unknown = requested.filter((name) => !ALLOWED.includes(name));
if (unknown.length > 0) {
  fail(`unknown package(s): ${unknown.join(", ")}\nallowed: ${ALLOWED.join(" ")}`);
}
if (requested.length === 0) fail("no packages selected");

// The workflow resolves the upstream commit and base version first, validates
// them, and passes them here so the selection artifact records exactly what
// was built (ADR 0008: every published index is traceable to one commit).
const baseVersion = process.env.BASE_VERSION?.trim() || "25.12.2";
if (!/^[0-9A-Za-z._-]+$/.test(baseVersion)) fail(`invalid base version: ${baseVersion}`);

const sourceCommit = process.env.SOURCE_COMMIT?.trim() ?? "";
if (!COMMIT_PATTERN.test(sourceCommit)) {
  fail(`SOURCE_COMMIT must be a 40 character lowercase git commit (got '${sourceCommit}')`);
}

const packages = ALLOWED.filter((name) => requested.includes(name));
const selection = {
  packages,
  baseVersion,
  arch: "x86_64",
  sourceRepo: process.env.SOURCE_REPO?.trim() || "kiddin9/op-packages",
  sourceCommit,
};

const output = process.env.GITHUB_OUTPUT;
if (output) {
  writeFileSync(output, `matrix=${JSON.stringify(packages)}\nfull=${packages.length === ALLOWED.length}\n`, {
    flag: "a",
  });
}

const selectionPath = process.env.SELECTION_PATH ?? "selection.json";
mkdirSync(dirname(selectionPath), { recursive: true });
writeFileSync(selectionPath, `${JSON.stringify(selection, null, 2)}\n`);
console.log(`selected: ${packages.join(" ")}`);
console.log(`base version: ${baseVersion}`);
console.log(`source commit: ${sourceCommit}`);
console.log(`wrote ${join(process.cwd(), selectionPath)}`);
