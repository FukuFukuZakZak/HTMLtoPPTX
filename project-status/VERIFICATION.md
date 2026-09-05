# Verification evidence

Last updated: 2026-09-05

This file is the detailed audit trail. The concise current result is in [`../PROJECT_STATUS.md`](../PROJECT_STATUS.md).

## Editable text fidelity — 2026-09-05

- Fixed a scale mismatch: text and rich runs previously used a fixed `px * 0.75`, while shape/text-box bounds followed page-to-slide scale. Font size and line spacing now use measured vertical scale; CSS letter spacing uses horizontal scale. At double source resolution, a 64 px font now becomes 24 pt on the equivalent slide instead of 48 pt.
- Replaced top-edge-only line detection with vertical band overlap plus a direction-aware line-start check for equal-height glyphs on tightly spaced lines. Larger or smaller inline text can remain on the same baseline; authored breaks still take precedence.
- Added `web/text-extraction.test.js`, which runs the production IIFE extractor against deterministic DOM/Range measurements. It checks wide, A4 portrait, and A4 landscape at 0.5x/1x/1.5x/2x source dimensions, mixed font sizes, positive/negative/normal letter spacing, actual wrapping, repeated `<br>`, preformatted newlines, and tightly spaced LTR/RTL lines.
- A real PptxGenJS package built from the extracted model contains `sz="2400"`, `sz="3600"`, exact line spacing `3000`, character spacing `150` / `-75`, one intended break, and editable Japanese `<a:t>` text without image/group replacements.
- `npm test`: 27/27 passed, 244 ms in the complete-suite run. `go test ./...` and `go vet ./...` passed. `node --check web/app.js`, `node --check web/converter-core.js`, `git diff --check`, and `go build -o .tmp/HTMLtoPPTX-text-quality.exe .` passed.
- Context7 was consulted for PptxGenJS text/rich-run options and exact `lineSpacing` in points. No version-specific documentation entry was exposed. For the undocumented `charSpacing` units, the pinned 4.0.1 `types/index.d.ts` and `dist/pptxgen.cjs.js` serializer were checked: `spc` is `Math.round(opts.charSpacing * 100)`. No dependency versions or vendor bundles changed.
- Modern Web Guidance search/retrieve consulted `visually-stable-mixed-fonts` and `prevent-text-wrapping`; these concern authoring CSS, so they were not applied to user-owned source styles. [MDN Range.getClientRects](https://developer.mozilla.org/en-US/docs/Web/API/Range/getClientRects) confirms the measured rectangle API used by the extractor.
- Graphify was updated through its recorded interpreter: 331 nodes, 677 edges, 17 communities, AST-only. Better Code Review Graph context included the previous broad commit, so review was narrowed to the current diff and the known extractor callers.
- The existing local-URL browser permission denial was respected. No browser was launched or alternate browser automation used. Actual browser/PowerPoint visual acceptance is pending; synthetic measurements and OOXML checks cannot establish font substitution or pixel-identical rendering.
- All applicable pre-commit hooks passed after their initial normalization of `web/converter-core.js` to LF. The existing uv cache required an approved execution outside the filesystem sandbox.

## Plain-language script-setting guidance — 2026-09-05

- Replaced the technical “run embedded scripts / trusted HTML” label with the effect-based wording “reflect content added when the HTML opens,” plus a short example covering menus and charts.
- Added a keyboard-accessible native disclosure with a question-mark cue. It explains isolated JavaScript execution, examples that may be enabled (self-created or confirmed in-house sources), examples that should remain disabled (mail attachments, external or unknown sources, and uncertain cases), and the blocked-network boundary.
- HTML files and pasted content are checked for executable `<script>` elements without running them. When one is present and the option is off, an ARIA live warning explains that menus or charts may be omitted; the checkbox is not enabled automatically. Data-only scripts such as JSON-LD do not trigger the warning.
- The JavaScript regression reads the actual user-owned `test-data/香南市生成AIガイドライン研修_投影スライド案_文字多め版.html`, confirms that its agenda-population code is present, and classifies it as requiring the optional runtime-content path. The fixture was read only and not modified.
- `npm test` passed 21 tests; `go test ./...`, `go vet ./...`, syntax checks for `web/app.js` and `web/converter-core.js`, and all pre-commit hooks passed.
- The required Modern Web Guidance search was attempted for accessible checkbox help, disclosure, and dynamic warnings, but the local command returned no guidance. The implementation therefore uses the native `<details>/<summary>` disclosure and existing project accessibility patterns. No Context7 lookup was required because no external library or dependency API changed.
- A fresh visible-browser conversion is still required to confirm the warning interaction and the 12 populated sidebar agendas together. The earlier accepted browser run already converted this exact 12-slide fixture successfully with script execution enabled.
- The user authorized the fresh browser retest. `orca status --json` twice reported the runtime as `starting` and unreachable, while `orca computer capabilities --json` returned `Could not connect to the running Orca app. Restart Orca and try again.` No browser action was attempted after that tool-required stop condition.
- At the user's request, the retry switched away from Orca and explicitly requested Chrome. The computer-use provider returned `Browser is not available: chrome`; its inventory showed only the Codex in-app browser, so no file upload or conversion was attempted. The temporary local converter server was stopped cleanly.
- The user then requested the Codex in-app browser. The converter started successfully on a fresh loopback port, but the browser security prompt reported that permission to access the local URL was declined. In accordance with the browser-use stop condition, no retry, alternate surface, or indirect browser automation was attempted; the temporary server was stopped cleanly.
- Graphify was refreshed through its recorded Python environment after the code change; the updated graph contains 314 nodes, 658 edges, and 16 communities.

## Smartphone flyer conversion fidelity — 2026-09-05

- Real browser acceptance selected both user-owned files in `test-data` together and exercised the visible file chooser, DOM measurement, Worker conversion, ZIP packaging, and save flow. It completed at `2 / 2 PPTX` and 13 total slides.
- `test-data/2026スマホ教室.html` produced one exact A4 portrait PPTX (`7560000 x 10692000` EMU). Rendered output retains the complete lower footer, decorative background shapes, section rules, rounded course cards, elliptical badges, flex/grid centering, single-line capacity text, and separated telephone badge/number. Visually clipped `時間` and `会場` accessibility labels no longer appear as vertical text.
- The source HTML references `assets/smartphone-class-irasutoya.png`, but no such asset is present under `test-data` and the browser upload contains only the HTML file. The absent hero illustration is therefore a missing/unselected-input limitation rather than a remaining embedded-image conversion failure.
- `test-data/香南市生成AIガイドライン研修_投影スライド案_文字多め版.html` produced one 12-slide widescreen PPTX. A rendered 3-by-4 montage was inspected for every slide; sidebars, tables, two-column content, rules, page numbering, and footer placement remained intact.
- Both generated PPTX files passed the presentation overflow checker with `No overflow detected`. All 13 slides also rendered successfully to PNG.
- `npm test` passed 19 tests. The worker integration asserts an OOXML ellipse, `<p:pic>`, and packaged `ppt/media/image-*`; core tests cover image-model preservation and supported vertical alignment. `go test ./...`, `go vet ./...`, JavaScript syntax checks, `git diff --check`, and `uv tool run pre-commit run --all-files` passed.
- PptxGenJS documentation was consulted through Context7 (`/gitbrent/pptxgenjs`) for `addImage` data URLs and image sizing/cropping behavior. Modern Web Guidance was consulted before modifying browser-side HTML/CSS extraction behavior.
- Better Code Review Graph identified `web/app.js` as the broad impact boundary. Review and regression testing therefore covered both the one-page A4 portrait flyer and all 12 existing widescreen slides.
- `graphify update .` was run through the interpreter recorded in `graphify-out/.graphify_python` because the shell alias was unavailable; it rebuilt the graph to 308 nodes, 648 edges, and 16 communities.

## Existing file-upload regression after paste mode — 2026-09-05

- Tested the original file-selection control in the running embedded web app. Each case selected a real on-disk HTML file through the browser file chooser, confirmed the enabled conversion button, completed the conversion, and saved the generated ZIP.
- Landscape: `testdata/multi-slide.html` produced `multi-slide.zip` containing `multi-slide.pptx`; the PPTX has 3 slides and widescreen dimensions `12192000 x 6858000` EMU.
- Portrait: user-owned `test-data/2026スマホ教室.html` produced `2026スマホ教室.zip` containing one 1-slide PPTX with exact A4 portrait dimensions `7560000 x 10692000` EMU.
- Mixed: `testdata/mixed-a4.html` produced `mixed-a4.zip` containing `mixed-a4-A4縦.pptx` (2 slides, `7560000 x 10692000` EMU, only `縦 1` and `縦 2`) and `mixed-a4-A4横.pptx` (1 slide, `10692000 x 7560000` EMU, only `横 1`).
- The mixed completion message reported two PPTX files and repeated the manual PowerPoint integration instruction. Browser diagnostics contained no errors or warnings across the three conversions.

## Direct HTML paste mode — 2026-09-05

- Added a separate lightweight screen with a labelled plain textarea, a debounced right-hand iframe preview, a return-to-file button, conversion settings, progress/cancellation controls, and a ZIP save action. No code-editor package or other runtime dependency was added.
- Pasted content becomes an in-memory `貼り付けHTML.html` `File` and calls the same `startConversion` path as selected files. Both screens therefore share DOM measurement, optional trusted-script snapshotting, page/layout detection, Worker conversion, cancellation, and ZIP delivery.
- The preview iframe has no sandbox capabilities and receives a deny-by-default CSP. Scripts, connections, forms, child frames, objects, and base-URL changes are blocked; inline styles and `data:`/`blob:` visual assets remain available for local preview.
- Browser acceptance pasted a 1600 x 900 Japanese `.slide`, observed `貼り付け変換テスト` in the preview and `347 B` in the size display, completed conversion, and exposed `貼り付けHTML.zip`. Switching back to file mode preserved the same save link.
- `npm test` passed 18 tests; `go test ./...`, `go vet ./...`, JavaScript syntax checks, `git diff --check`, and `uv tool run pre-commit run --all-files` passed. The embedded-page test asserts the paste controls and script-disabled preview sandbox; Better Code Review Graph's heuristic security scan reported zero findings.
- Modern Web Guidance was consulted for accessible form labelling, focus visibility, textarea resizing, and responsive split-pane behavior. No Context7 consultation was required because the implementation uses only standard browser APIs and existing repository dependencies.
- Better Code Review Graph identified the shared conversion function as the broad impact boundary; review focused on the two UI adapters, active-job locking, cancellation, and shared Blob URL lifecycle. Graphify refreshed the repository graph to 291 nodes, 615 edges, and 17 communities.

## Mixed-orientation A4 split and workflow notice — 2026-09-05

- Every rendered page now retains its detected layout. Mixed pages are grouped into separate A4 portrait and A4 landscape presentations while preserving their source order within each group.
- A single mixed HTML produces `元名-A4縦.pptx` and `元名-A4横.pptx` in the ZIP. Case-insensitive duplicate names still receive numeric suffixes.
- The converter screen presents the required sequence as an ordered, labelled flow: classify each page, generate portrait and landscape PPTX files separately, then combine them manually in PowerPoint. The completion message repeats the manual-combination instruction when both A4 orientations were detected.
- The notice uses semantic `<aside>` and `<ol role="list">` markup and switches from a horizontal arrow flow to a vertical flow below 480px.
- `go test ./...`, JavaScript syntax checks, and `npm test` passed (18 JavaScript tests). The worker integration still verifies the exact A4 portrait and landscape OOXML sizes and one PPTX per orientation.
- The embedded-page Go test guards the notice heading and all three workflow stages; core tests guard layout grouping, order preservation, orientation-specific names, and duplicate-name handling.
- Headless Microsoft Edge converted `testdata/mixed-a4.html` (portrait, landscape, portrait) into `mixed-a4-A4縦.pptx` with two slides and `mixed-a4-A4横.pptx` with one slide. The test opened the outer ZIP and both PPTX packages, confirmed exact OOXML page sizes, the visible notice, the completion message, and zero page errors.
- PptxGenJS custom layouts and ArrayBuffer output were rechecked through Context7 (`/gitbrent/pptxgenjs`); JSZip ArrayBuffer insertion and ZIP generation were rechecked through Context7 (`/stuk/jszip`).
- Modern Web Guidance search returned no direct match; its accessibility catalogue was used to preserve ordered-list semantics with the grid styling. Headless Edge covered functional browser acceptance; interactive Orca visual inspection remained unavailable because its runtime could not be reached.

## Status structure — 2026-09-05

- The former 211-line status file was split into a short current-state entry point plus completed-history, decision, and verification documents.
- `git diff --check` and `uv tool run pre-commit run --all-files` passed; every relative Markdown link resolves to an existing file.
- Only status documentation changed; user-owned `docs/` and `test-data/` remained untouched.

## A4 portrait and landscape conversion — 2026-09-05

- `npm test` passed 16 tests, including exact OOXML slide-size checks for widescreen, A4 portrait, and A4 landscape output; JavaScript syntax checks and the Go verification suite also passed.
- Headless Microsoft Edge converted the user-owned `test-data/2026スマホ教室.html` (no `.slide`, inline `@page { size: A4 portrait; }`) together with a temporary A4 landscape fixture in one batch ZIP.
- The generated presentations used exact A4 OOXML dimensions: portrait `7560000 x 10692000` EMU and landscape `10692000 x 7560000` EMU.
- The browser run had no conversion/runtime errors. One expected 404 warning came from the source HTML's unresolved relative image asset, which remains outside the current image-conversion scope.
- PptxGenJS custom layout definition and selection were checked through Context7 (`/gitbrent/pptxgenjs`). The required modern-web-guidance search was attempted but the local command timed out without results, so repository patterns and direct browser verification were used.
- Graphify's recorded Python environment refreshed the code graph to 282 nodes, 585 edges, and 19 communities; no LLM extraction was required.

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
