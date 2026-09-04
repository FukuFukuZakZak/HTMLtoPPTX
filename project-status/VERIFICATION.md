# Verification evidence

Last updated: 2026-09-05

This file is the detailed audit trail. The concise current result is in [`../PROJECT_STATUS.md`](../PROJECT_STATUS.md).

## Status structure — 2026-09-05

- The former 211-line status file was split into a short current-state entry point plus completed-history, decision, and verification documents.
- `git diff --check` and `uv tool run pre-commit run --all-files` passed; every relative Markdown link resolves to an existing file.
- Only status documentation changed; user-owned `docs/` and `test-data/` remained untouched.

## Current batch release — 2026-09-05

- Clean clone commit: `7e3fcbfb37ef45ac8b8fa8566e918357b076175e`.
- `npm test` passed 14 tests; JavaScript syntax checks, `go test ./...`, `go vet ./...`, and the Windows build passed.
- Embedded `/`, `/converter-worker.js`, `/vendor/jszip.min.js`, and `/script-runner.html` returned HTTP 200.
- Published asset `HTMLtoPPTX-v0.1.0-alpha.1-windows-amd64.exe`: 9,359,872 bytes; SHA-256 `38FE040F2BB9E7452FA870B42B0A20C9316B790F1565598AF73D6EC0F93027FF`; PE32+ amd64 console subsystem `3`; embedded revision `7e3fcbfb37ef45ac8b8fa8566e918357b076175e`; `vcs.modified=false`.
- GitHub prerelease `https://github.com/divine261402-pixel/HTMLtoPPTX/releases/tag/v0.1.0-alpha.1` is marked prerelease, targets `7e3fcbf`, has title `HTMLtoPPTX v0.1.0-alpha.1（複数HTML・ZIP一括出力 実機検証版）`, and contains exactly one Windows asset.
- A fresh GitHub download matched the clean local candidate by size and SHA-256.
- GitHub CLI release edit/upload/delete-asset behavior was rechecked through Context7 (`/websites/cli_github_manual`). Replacement used a verified temporary recovery asset before replacing the formal asset and removing the temporary copy.

## Multi-HTML batch conversion — 2026-09-04

- `npm test` passed 14 tests, including opening the outer ZIP and every nested PPTX.
- `node --check`, `go test ./...`, `go vet ./...`, `go build`, `git diff --check`, and `uv tool run pre-commit run --all-files` passed with the Go cache redirected inside the workspace.
- Browser acceptance selected `testdata/multi-slide.html` and `testdata/hidden-slides.html` together, completed two independent PPTX conversions, exposed `html-to-pptx-2-files.zip`, reported `2 / 2 ファイル`, and produced no browser errors or warnings.
- JSZip 3.10.1 browser-side `file(ArrayBuffer)` and `generateAsync({ type: "arraybuffer" })` were checked through Context7 (`/stuk/jszip`). Modern web guidance covered accessible multi-file form feedback and yielding long browser work.
- Graphify updated to 247 nodes, 543 edges, and 18 communities using the interpreter recorded in `graphify-out/.graphify_python`.

## Issue #7 trusted-script implementation — 2026-09-04

- Root cause inspection found empty `<ul class="agenda">` elements on slides 2-12 populated by a bottom-of-document script. The supplied PDF reproduced the sidebar shell but omitted those entries, confirming a runtime-content gap.
- `node --check web/app.js`, `go test ./...`, `go vet ./...`, `npm test` (11 tests), and `uv tool run pre-commit run --all-files` passed.
- Browser acceptance with the attached 12-slide HTML and trusted-script option enabled completed at `12 / 12 枚` and exposed the PPTX save link.
- Runner tests assert `sandbox allow-scripts`, `default-src 'none'`, inline-script-only execution, blocked connections, and blocked forms. Better Code Review Graph's heuristic security scan reported zero findings.
- Modern web guidance was consulted for postMessage origin/source/payload validation. The implementation also uses a one-time token and an opaque-origin sandbox; the installed guide reported itself as stale.
- Graphify rebuilt to 214 nodes, 450 edges, and 15 communities.
- Clean-clone candidate: 6,613,504 bytes; SHA-256 `FF2D7310C8E7E926D8196A2CA4D97624D63BF9BDF7076B5C9943F500115DA9DA`; PE32+ console subsystem `3`; embedded revision `2e298dcf9eed25a350f3b9d65de267efd4bc3b7a`; `vcs.modified=false`.
- Runtime smoke tests returned HTTP 200 for the UI and isolated runner, exposed the trusted-script option, and confirmed the runner's deny-by-default CSP. The GitHub-downloaded asset matched locally by SHA-256.
- The superseded Issue #7 prerelease targeted `2e298dc`, used title `HTMLtoPPTX v0.1.0-alpha.1（Issues #3〜#5・#7 実機検証版）`, and published the matching 6,613,504-byte asset.
- GitHub CLI release edit/upload/download behavior and the delete-first risk of `gh release upload --clobber` were checked through Context7 (`/websites/cli_github_manual`).

## Issues #3 through #6 — 2026-09-04

- Issue attachments and reports for missing `.slide`, hidden zero-size slides, text line fidelity, and grouping were inspected without changing their fields.
- The Issue #4 attachment declares twelve 1280 x 720 `.slide` sections, hides all but `.active`, and therefore previously produced zero-size bounds after the first slide.
- Browser integration converted `testdata/hidden-slides.html` from one visible and eleven hidden slides to `12 / 12 枚` with no browser errors or warnings.
- `testdata/no-slide.html` displayed the minimal correction example `<section class="slide" style="width:1280px;height:720px">...</section>`.
- Issue #5 comparison found 98 `<p:sp>` objects, 40 text runs/paragraphs, zero `<a:br>` breaks, and zero nested `<p:grpSp>` objects in the former PPTX. The overflow checker passed, locating the problem within measured text boxes rather than outside the slide canvas.
- Source inspection confirmed the former direct-text path collapsed whitespace and did not preserve CSS line height or rendered browser line boundaries.
- PptxGenJS rich text, `breakLine`, `softBreakBefore`, `lineSpacing`, `lineSpacingMultiple`, and `fit: "shrink"` were checked through Context7 (`/gitbrent/pptxgenjs`). JSZip in-memory PPTX inspection was checked through Context7 (`/stuk/jszip`).
- `npm test` passed 11 tests; JavaScript syntax checks, `go test ./...`, `go vet ./...`, `go build`, and `git diff --check` passed.
- OOXML integration confirms `softBreakBefore` emits `<a:br/>`, an 18pt computed line height emits `<a:spcPts val="1800"/>`, and no nested `<p:grpSp>` is generated.
- Modern web guidance was consulted for hidden-content state and text layout after an initial network failure. Measurement preserves source visibility attributes rather than rewriting uploaded HTML.
- Better Code Review Graph scoped the change mainly to `web/app.js`, `web/converter-core.js`, `web/converter-worker.js`, JavaScript tests, and the bundled PptxGenJS file.
- `deliverables/HTMLtoPPTX_Issue3-6_改修方針書.docx` rendered to nine Letter-size pages; all pages passed visual inspection and its accessibility audit reported zero findings.

## Issues #1 and #2

- GitHub Issues #1 and #2 were inspected through authenticated access on 2026-09-04.
- User-owned `test-data/2026スマホ教室.html` was inspected but not modified; it uses `oklch(...)`, colored fills, rounded cards, and CSS borders.
- Browser regression converted a three-slide HTML, then a different one-slide HTML. The second save link was `second-slide.pptx`, with zero browser errors or warnings.
- The tracked fixture exercises an editable teal fill and orange border. OOXML assertions verify `2F7C80`, `CF552F`, and dashed-line markup.
- `go test ./...`, `go vet ./...`, `go build`, `npm test`, JavaScript syntax checks, `git diff --check`, and `uv tool run pre-commit run --all-files` passed.
- PptxGenJS 4.0.1 shape, fill, line, dash, transparency, and text options were checked through Context7 (`/gitbrent/pptxgenjs`).
- Modern web guidance was attempted but its online command stalled and no offline package cache was available, so no result was used.
- Graphify rebuilt to 185 nodes, 412 edges, and 13 communities and includes `extractElementShapes`, `createColorReader`, `shapeOptions`, `preparePptxDownload`, and `clearDownload`.

## Foundation and browser PoC

- `go test ./...` and `go vet ./...` passed with the Go cache redirected into the workspace.
- `go build -o .tmp/Html2Pptx.exe .` passed; the embedded executable was 9,192,448 bytes.
- The initial JavaScript/OOXML suite passed seven tests; all project JavaScript files passed `node --check`.
- Browser integration uploaded `testdata/multi-slide.html`, downloaded `multi-slide.pptx`, and completed at `3 / 3 枚` with no current-page console errors.
- During a slow-worker check, progress reached `2 / 3 枚` while the input stayed enabled, body pointer events stayed `auto`, progress positioning stayed `static`, and cancellation succeeded.
- OOXML contains exactly `slide1.xml` through `slide3.xml`, with expected Japanese text in document order and editable `<p:sp>` text shapes.
- LibreOffice Impress rendered all three slides in order with correct Japanese text and positions. Visual inspection found no clipping or unexpected wrapping, and the overflow checker reported `No overflow detected`.
- PptxGenJS 4.0.1 browser bundling and `write({ outputType: "arraybuffer" })` were checked through Context7 (`/gitbrent/pptxgenjs`).
- A Qiita article on editable HTML-to-PPTX conversion informed the browser measurement, whitespace, native validation, inline-run, z-order, and font/glyph decisions.
- `uv tool run pre-commit run --all-files` passed, including the Code Review Graph hook. Graphify rebuilt to 179 nodes, 394 edges, and 13 communities.

## Repository tooling

- Pre-commit passed with the Windows-compatible Code Review Graph hook.
- Graphify minimal query result: `.slide要素による複数スライド構造`.
- Context7 was verified by resolving `/gitbrent/pptxgenjs` and querying browser-side wide-layout generation, editable text boxes, local bundling, and download.
- `.codex/config.toml` parses with Python `tomllib`; it includes 14 project-level plugin disables, a 6,000-token output cap, a 120,000-token compaction threshold, four allowlisted Better Code Review Graph tools, and the legacy Code Review Graph MCP disabled.
- Graphify skill validation passed `quick_validate.py`; all nine router references exist. The always-loaded body decreased from 40,537 bytes / 699 lines to 4,364 bytes / 65 lines while the complete 40,450-byte / 705-line runbook remains available on demand.
- `C:\Users\福家\.local\bin\serena.exe start-mcp-server --help` confirmed `--project-from-cwd` and `--context` support. A fresh Codex task is needed for the desktop host to load the updated profile.
- One later `graphify update .` could not run because the executable alias was unavailable in a fresh shell; the pre-commit graph hook passed and prior Graphify output remained in place.

## Superseded prerelease evidence

- Initial candidate: 6,583,296 bytes; SHA-256 `FEEF9342F42E83BF1A3E4BD93EB32AE0B026510B3817C3AD1A3D5AD0AA9CF388`; initial product commit `f651b3a`.
- Issue #1/#2 replacement candidate: 6,592,000 bytes; SHA-256 `8FF7593FD1B7A218B857D0895F897EC30C8EB8205E73D6C2C9268008357D3A59`; product commit `c7eed34`; PE console subsystem `3`.
- Issue #3-#5 replacement candidate: 6,606,336 bytes; SHA-256 `6899929B140AD0A72511E6D3EEFA86C1485750AB10418E0F4B3B663AE81C560C`; product commit `69569fa`; annotated tag object `d82a26a`.
- The superseded Issue #3-#5 release title was `HTMLtoPPTX v0.1.0-alpha.1（Issues #3〜#5 実機検証版）` and its public digest matched the candidate.
- Release-replacement verification at each stage included JavaScript syntax checks, `npm test`, `go test ./...`, `go vet ./...`, and pre-commit. GitHub CLI behavior was checked through Context7 before destructive asset replacement.
