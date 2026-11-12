#!/usr/bin/env bash
# Build one package from the pinned op-packages checkout inside an SDK.
set -euo pipefail

sdk="${1:?usage: build-package.sh <sdk-dir> <source-dir> <package>}"
source_dir="${2:?usage: build-package.sh <sdk-dir> <source-dir> <package>}"
package="${3:?usage: build-package.sh <sdk-dir> <source-dir> <package>}"

if [ ! -d "$source_dir/$package" ]; then
  echo "package source not found: $source_dir/$package" >&2
  exit 1
fi

rm -rf "$sdk/package/$package"
cp -a "$source_dir/$package" "$sdk/package/$package"
makefile="$sdk/package/$package/Makefile"

# apk rejects versions such as 1.2.1-r1-r7. The upstream Makefiles carry the
# release inside PKG_VERSION (or leave PKG_RELEASE empty), so normalise both.
sed -i -E 's/^(PKG_VERSION:=[^ ]*)-r[0-9]+$/\1/' "$makefile"
if grep -qE '^PKG_RELEASE:=$' "$makefile"; then
  sed -i -E 's/^PKG_RELEASE:=$/PKG_RELEASE:=1/' "$makefile"
fi

echo "building $package:"
grep -E '^(PKG_VERSION|PKG_RELEASE):=' "$makefile"

cd "$sdk"
make "package/$package/compile" -j"$(nproc)" V=s

apk_path="$(find bin/packages -maxdepth 3 -type f -name "$package-*.apk" -print -quit)"
if [ -z "$apk_path" ]; then
  echo "no apk produced for $package" >&2
  exit 1
fi

mkdir -p "$GITHUB_WORKSPACE/out"
cp "$apk_path" "$GITHUB_WORKSPACE/out/"
echo "built $(basename "$apk_path")"
