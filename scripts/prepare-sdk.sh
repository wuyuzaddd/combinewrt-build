#!/usr/bin/env bash
# Prepare an extracted ImmortalWrt SDK for building the six standalone packages.
set -euo pipefail

sdk="${1:?usage: prepare-sdk.sh <sdk-dir>}"
cd "$sdk"

# luci.mk and po2lmo live in the luci feed. Only luci-base's host tools are
# needed; installing the whole feed makes the SDK try to rebuild lucihttp,
# which is not present in the SDK sources.
./scripts/feeds update luci
./scripts/feeds install luci-base
make package/feeds/luci/luci-base/host/compile -j"$(nproc)"

for tool in po2lmo jsmin; do
  if [ -x "staging_dir/hostpkg/bin/$tool" ]; then
    cp "staging_dir/hostpkg/bin/$tool" "staging_dir/host/bin/$tool"
  fi
done

# Leave package/ root clean so `make package/<name>/compile` only sees our six
# packages and never traverses feed package definitions.
rm -rf package/feeds
