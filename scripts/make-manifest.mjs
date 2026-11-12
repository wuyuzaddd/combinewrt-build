#!/usr/bin/env node
// Assemble the packages-build artifact: manifest.json + apks/.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";

function option(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) {
    if (fallback === undefined) throw new Error(`missing --${name}`);
    return fallback;
  }
  return process.argv[index + 1];
}

const artifacts = option("artifacts");
const selectionPath = option("selection");
const outDir = option("out", "build");
const runId = Number(option("run-id"));
const apkTool = option("apk-tool");
const baseVersion = option("base-version", "25.12.2");
const arch = option("arch", "x86_64");

if (!Number.isInteger(runId) || runId <= 0) throw new Error("--run-id must be a positive integer");

const selection = JSON.parse(readFileSync(selectionPath, "utf8"));
const available = new Set(readdirSync(artifacts));
const apksDir = join(outDir, "apks");
mkdirSync(apksDir, { recursive: true });

const entries = [];
for (const name of selection.packages) {
  const asset = [...available].find((file) => file.startsWith(`${name}-`) && file.endsWith(".apk"));
  if (!asset) {
    const failureFile = join(artifacts, `failure-${name}.txt`);
    const error = existsSync(failureFile)
      ? readFileSync(failureFile, "utf8").trim()
      : "build job produced no apk";
    entries.push({ status: "failed", name, error });
    console.error(`FAILED ${name}: ${error}`);
    continue;
  }

  const source = join(artifacts, asset);
  try {
    const info = JSON.parse(
      execFileSync(apkTool, ["adbdump", "--format", "json", source], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "inherit"],
        maxBuffer: 16 * 1024 * 1024,
      }),
    ).info;
    if (info.name !== name) {
      throw new Error(`apk metadata name ${info.name} does not match ${name}`);
    }
    if (info.version !== undefined && info.version.endsWith("-r")) {
      throw new Error(`invalid apk version ${info.version}`);
    }
    if (asset !== `${name}-${info.version}.apk`) {
      throw new Error(`asset ${asset} does not match ${name}-${info.version}.apk`);
    }

    const bytes = readFileSync(source);
    copyFileSync(source, join(apksDir, asset));
    entries.push({
      status: "ok",
      name,
      version: info.version,
      arch: info.arch ?? "noarch",
      description: info.description ?? "",
      depends: info.depends ?? [],
      license: info.license ?? "",
      installedSize: Number(info["installed-size"] ?? 0),
      fileSize: statSync(source).size,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      sourceRepo: selection.sourceRepo,
      sourceCommit: selection.sourceCommit,
      sourcePath: name,
      asset,
      publishedAt: new Date().toISOString(),
    });
    console.log(`OK ${name} ${info.version} (${asset})`);
  } catch (error) {
    entries.push({ status: "failed", name, error: String(error.message ?? error) });
    console.error(`FAILED ${name}: ${error.message ?? error}`);
  }
}

const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  baseVersion,
  arch,
  buildRunId: runId,
  entries,
};
writeFileSync(join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

const ok = entries.filter((entry) => entry.status === "ok").length;
console.log(`manifest: ${ok}/${entries.length} packages ok -> ${join(outDir, "manifest.json")}`);
if (!existsSync(join(outDir, "manifest.json"))) {
  throw new Error(`failed to write manifest next to ${basename(outDir)}`);
}
