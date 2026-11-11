# combinewrt-build

Build workflows for [combinewrt](https://github.com/wuyuzaddd/combinewrt).

The site dispatches `build.yml` with two inputs:

- `build_id` — site build id, used in `run-name` so the site can find the run.
- `plan` — JSON build plan (base version, profile, packages, image type, files, artifact name, ImageBuilder command).

The workflow downloads the pinned ImmortalWrt ImageBuilder, writes the generated `uci-defaults`, runs `make image`, then uploads the image plus `manifest.json` as a workflow artifact (7 day retention) and prints `COMBINEWRT_MANIFEST={...}` for the site to record sha256/size.

Artifacts are public for public repositories; do not build images containing packages whose licenses have not been reviewed.
