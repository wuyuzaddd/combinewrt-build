#!/usr/bin/env bash
# Build one extension package from a pinned upstream checkout inside an SDK.
#
# Usage: build-extension-package.sh <sdk-dir> <source-dir> <package>
#
# The source directory is the package directory itself: for repositories that
# keep the package at the root the caller passes the checkout root, and for
# feeds with one package per directory it passes that directory. Copying the
# directory as package/<name> keeps the two layouts on one code path.
set -euo pipefail

sdk="${1:?usage: build-extension-package.sh <sdk-dir> <source-dir> <package>}"
source_dir="${2:?usage: build-extension-package.sh <sdk-dir> <source-dir> <package>}"
package="${3:?usage: build-extension-package.sh <sdk-dir> <source-dir> <package>}"

if [ ! -d "$source_dir" ]; then
  echo "package source not found: $source_dir" >&2
  exit 1
fi
if [ ! -f "$source_dir/Makefile" ]; then
  echo "package source has no Makefile: $source_dir" >&2
  exit 1
fi

rm -rf "$sdk/package/$package"
cp -a "$source_dir" "$sdk/package/$package"
makefile="$sdk/package/$package/Makefile"

# apk rejects versions such as 1.2.1-r1-r7. Upstream Makefiles carry the
# release inside PKG_VERSION (or leave PKG_RELEASE empty), so normalise both.
sed -i -E 's/^(PKG_VERSION:=[^ ]*)-r[0-9]+$/\1/' "$makefile"
if grep -qE '^PKG_RELEASE:=$' "$makefile"; then
  sed -i -E 's/^PKG_RELEASE:=$/PKG_RELEASE:=1/' "$makefile"
fi

echo "building $package:"
grep -E '^(PKG_VERSION|PKG_RELEASE):=' "$makefile"

# The published apk carries PKG_LICENSE, and the catalogue's licence gate reads
# it. Recipes that do not declare one (every LuCI package in istoreos/istore)
# would surface as "unknown licence" even though the registry reviewed them, so
# fall back to the licence the registry pins for this package.
make_vars=()
if ! grep -qE '^PKG_LICENSE:=' "$makefile" && [ -n "${EXT_LICENSE:-}" ]; then
  echo "PKG_LICENSE not declared; using the registry licence: $EXT_LICENSE"
  make_vars+=("PKG_LICENSE=$EXT_LICENSE")
fi

cd "$sdk"
make "package/$package/compile" -j"$(nproc)" V=s "${make_vars[@]}"

apk_path="$(find bin/packages -maxdepth 3 -type f -name "$package-*.apk" -print -quit)"
if [ -z "$apk_path" ]; then
  echo "no apk produced for $package" >&2
  exit 1
fi

mkdir -p "$GITHUB_WORKSPACE/out"
cp "$apk_path" "$GITHUB_WORKSPACE/out/"
echo "built $(basename "$apk_path")"
