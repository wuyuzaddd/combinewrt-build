#!/usr/bin/env bash
# Stage a `.github/packages/<name>` recipe for build-extension-package.sh.
#
# Usage: stage-local-recipe.sh <package> <dest-dir>
#
# A local recipe is the counterpart of an upstream checkout: the workflow hands
# the same directory shape to build-extension-package.sh, so local and pinned
# upstream packages share one build codepath. The recipe must be self-contained
# (Makefile plus the files/ luasrc/ root/ htdocs/ po/ trees) because nothing
# outside it is copied into the SDK.
set -euo pipefail

package="${1:?usage: stage-local-recipe.sh <package> <dest-dir>}"
dest="${2:?usage: stage-local-recipe.sh <package> <dest-dir>}"

repo_root="${GITHUB_WORKSPACE:-$(cd "$(dirname "$0")/.." && pwd)}"
recipe_dir="$repo_root/.github/packages/$package"

if [ ! -d "$recipe_dir" ]; then
  echo "local recipe not found: $recipe_dir" >&2
  exit 1
fi
if [ ! -f "$recipe_dir/Makefile" ]; then
  echo "local recipe has no Makefile: $recipe_dir" >&2
  exit 1
fi

# include/scan.mk only lists a package directory when its Makefile contains one
# of these macros verbatim; a LuCI package that relies on luci.mk alone would be
# invisible to `make package/<name>/compile` with a bare "No rule to make target".
if ! grep -qE 'call (Build/DefaultTargets|BuildPackage|KernelPackage)' "$recipe_dir/Makefile"; then
  echo "local recipe Makefile has no SDK scan marker (call BuildPackage/Build\/DefaultTargets/KernelPackage): $recipe_dir" >&2
  exit 1
fi

# ADR 0007: a download without a pinned hash must never reach the signed feed.
if grep -qE '^PKG_SOURCE:=' "$recipe_dir/Makefile"; then
  if ! grep -qE '^PKG_HASH:=[0-9a-f]{64}$' "$recipe_dir/Makefile"; then
    echo "local recipe declares PKG_SOURCE without a 64 character PKG_HASH: $recipe_dir" >&2
    exit 1
  fi
elif ! grep -qE '^PKG_HASH:=' "$recipe_dir/Makefile"; then
  echo "local recipe has no PKG_HASH: $recipe_dir" >&2
  exit 1
fi
if grep -qE '^PKG_HASH:=skip' "$recipe_dir/Makefile"; then
  echo "local recipe uses PKG_HASH:=skip: $recipe_dir" >&2
  exit 1
fi

rm -rf "$dest"
mkdir -p "$dest"
cp -a "$recipe_dir/." "$dest/"

echo "staged local recipe $package from $recipe_dir"
find "$dest" -type f | sort | sed 's/^/  /'
