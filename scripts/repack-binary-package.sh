#!/usr/bin/env bash
# Repack one extension package from a pinned upstream release bundle.
#
# Usage: repack-binary-package.sh <package> [registry.json]
#
# The registry entry carries a `binary` block:
#   { url, sha256, apkPrefix, name, version, arch, license, depends[], description }
# We verify the bundle hash, extract the requested apk payload with apk-tools 3
# and build + sign a fresh package with our own metadata, so the published feed
# keeps a single trust root while shipping exactly the pinned upstream bytes.
set -euo pipefail

package="${1:?usage: repack-binary-package.sh <package> [registry.json]}"
registry="${2:-ci/extension/registry.json}"

info=$(node -e '
const fs = require("node:fs");
const registry = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
const entries = Array.isArray(registry) ? registry : registry.packages;
const entry = entries.find((item) => item.name === process.argv[2]);
if (!entry) { console.error("package not in registry"); process.exit(1); }
const b = entry.binary;
if (!b) { console.error("registry entry has no binary block"); process.exit(1); }
for (const key of ["url", "sha256", "apkPrefix", "version", "arch", "license"]) {
  if (typeof b[key] !== "string" || b[key].length === 0) { console.error(`binary.${key} is required`); process.exit(1); }
}
const depends = Array.isArray(b.depends) ? b.depends.join(" ") : "";
console.log([b.url, b.sha256, b.apkPrefix, b.name ?? entry.name, b.version, b.arch, b.license, depends, b.description ?? ""].join("\t"));
' "$registry" "$package")

IFS=$'\t' read -r url want_sha apk_prefix pkg_name version arch license depends description <<< "$info"

work="${RUNNER_TEMP:-/tmp}/repack-$pkg_name"
rm -rf "$work"
mkdir -p "$work/bundle" "$work/payload" "$work/keys" "${GITHUB_WORKSPACE:-.}/out"

echo "downloading pinned bundle for $pkg_name"
curl -fL --retry 3 --retry-delay 5 -o "$work/bundle.tar.gz" "$url"
actual=$(sha256sum "$work/bundle.tar.gz" | cut -d' ' -f1)
if [ "$actual" != "$want_sha" ]; then
  echo "bundle sha256 mismatch: expected=$want_sha actual=$actual" >&2
  exit 1
fi
tar -xzf "$work/bundle.tar.gz" -C "$work/bundle"

apk_src=$(find "$work/bundle" -type f -name "${apk_prefix}-*.apk" | head -n1)
if [ -z "$apk_src" ]; then
  echo "no ${apk_prefix}-*.apk inside the bundle" >&2
  exit 1
fi

curl -fsSL --retry 3 -o "$work/apk-tools.apk" \
  https://dl-cdn.alpinelinux.org/alpine/v3.23/main/x86_64/apk-tools-static-3.0.9-r0.apk
mkdir -p "$work/apkstatic"
tar -xzf "$work/apk-tools.apk" -C "$work/apkstatic" --ignore-zeros
apk_tool="$work/apkstatic/sbin/apk.static"

key="${EXT_SIGN_KEY:-$RUNNER_TEMP/signing/private-key.pem}"
if [ ! -s "$key" ]; then
  echo "missing build signing key at $key" >&2
  exit 1
fi
openssl rsa -in "$key" -pubout -out "$work/keys/build.pub" 2>/dev/null

( cd "$work/payload" && "$apk_tool" extract --allow-untrusted "$apk_src" >/dev/null )
# /lib/apk holds the upstream package's own database entries; never republish it.
rm -rf "$work/payload/lib/apk"

args=(
  -I "name:$pkg_name"
  -I "version:$version"
  -I "arch:$arch"
  -I "license:$license"
  -I "origin:$pkg_name"
  -I "description:$description"
)
if [ -n "$depends" ]; then args+=(-I "depends:$depends"); fi

"$apk_tool" mkpkg "${args[@]}" -F "$work/payload" \
  -o "${GITHUB_WORKSPACE:-.}/out/$pkg_name-$version.apk" --sign-key "$key"
"$apk_tool" verify --keys-dir "$work/keys" "${GITHUB_WORKSPACE:-.}/out/$pkg_name-$version.apk" >/dev/null
echo "built $pkg_name-$version.apk"
