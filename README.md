# combinewrt-build

Build workflows for [combinewrt](https://github.com/wuyuzaddd/combinewrt).

The site dispatches `build.yml` with two inputs:

- `build_id` — site build id, used in `run-name` so the site can find the run.
- `plan` — JSON build plan (base version, profile, packages, image type, files, artifact name, ImageBuilder command).

The workflow downloads the pinned ImmortalWrt ImageBuilder, writes the generated `uci-defaults`, runs `make image`, then uploads the image plus `manifest.json` as a workflow artifact (7 day retention) and prints `COMBINEWRT_MANIFEST={...}` for the site to record sha256/size.

Artifacts are public for public repositories; do not build images containing packages whose licenses have not been reviewed.

## Supplement packages

`.github/workflows/packages.yml` builds the six standalone packages used by the
combinewrt-packages feed:

- `luci-lib-xterm`
- `taskd`
- `luci-lib-taskd`
- `luci-app-store`
- `luci-app-substore`
- `luci-app-fwlive`

Sources are pinned to `kiddin9/op-packages@18b7d51c1a06427fa6e8c64b161869de7daded7e`
and built with the ImmortalWrt 25.12.2 x86_64 SDK. Run it manually with an
optional space-separated subset, e.g. `packages=taskd luci-app-store`.

The workflow caches the SDK tarball, builds each package in a fail-fast:false
matrix, runs `apk adbdump` on every output, and uploads a `packages-build`
artifact containing `manifest.json` and versioned `apks/`. It never signs
anything and does not create a Release; signing and publishing happen in
`wuyuzaddd/combinewrt-packages`.
