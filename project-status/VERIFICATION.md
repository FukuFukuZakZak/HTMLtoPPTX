# Verification evidence

## Website-style UI finish — 2026-09-06

- Tested the embedded `.tmp/HTMLtoPPTX-website-v3.exe` with the same installed Edge / bundled Playwright path and `scripts/ui-acceptance.cjs`. All 58 desktop states passed at 1920×1080, 1920×950, 1536×864 and 1280×720 in light/dark. The heading, instructions and primary controls stay in the viewport; source/settings panels stay inside the form. Expanded help remains the page-scroll exception.
- Visual review covered both themes in file/editor mode, the empty home page, mobile and 1280×720 completion states. It caught a short-viewport form-boundary overflow that page-only checks missed; compact padding/gaps were corrected, and containment assertions now guard the form boundaries. New screenshots include `home-*.png`, `file-compact-*.png` and `editor-compact-*.png`.
- Twenty-eight foreground/background pairs passed at >= 5.0:1, including accent text on surface/selection colors and muted text on settings panels. Native theme radio keyboard behavior, live system changes, explicit override/reload persistence, blocked storage, cancellation/retry, editor input retention, preview rendering on re-entry, disclosures and mobile horizontal overflow all passed. No uncaught page errors.
- Real downloads remain: light/dark editor ZIPs each have 1 PPTX / 1 slide with identical slide XML, mixed-A4 batch ZIP has 3 PPTX / 6 slides, script-enabled editor ZIP has 1 PPTX / 1 slide with the expected added text. No production JavaScript, converter/Worker logic or Go hosting code changed.
- `npm test`: 35 passed, 0 failed (2.08 s); `node --check scripts/ui-acceptance.cjs`, `go test ./...` (0.744 s), `go vet ./...` and the final build passed. Better Code Review Graph found no impacted code nodes for these HTML/CSS/SVG/test-driver changes; the focused diff and browser screenshots were reviewed. Graphify AST refresh: 359 nodes / 711 edges / 23 communities, with no further topology change after the final spacing correction.
- Context7 consulted `/mdn/content` before implementation for responsive grid minimum sizing and overflow, clamp typography, focus/hover/reduced motion and SVG symbol/use/currentColor. Modern Web Guidance was searched first and its CSS guide used; Frontend Design informed the plan and critique. The user's preference for the original website style superseded the initial workbench palette.
- Distribution: `dist/ui-website-20260906/HTMLtoPPTX.exe`, 9,446,912 bytes; SHA-256 `567FFDCE3D1DD2C4F4383A63E1C7C0AFCD8DA338FA9EF06016C0E9FC56C65656`. This is a byte-identical copy of the tested build. Screenshots and `ui-verification.json` sit alongside it; detailed ZIPs/report remain under `.tmp/ui-acceptance/`. Earlier distributions and the GitHub release were preserved. Shared intranet deployment is not yet implemented.

## FullHD UI acceptance — 2026-09-06

- Tested the embedded executable `.tmp/HTMLtoPPTX-ui-v6.exe` using installed Microsoft Edge and bundled Playwright. The repeatable driver is `scripts/ui-acceptance.cjs`; set `NODE_PATH` to the runtime's Playwright packages and run `node scripts/ui-acceptance.cjs <running-app-URL>`. `BROWSER_PATH` optionally selects another installed Chromium executable. No production dependency was added.
- Both themes passed 58 layout measurements across 1920×1080, 1920×950 (browser chrome allowance), 1536×864 and 1280×720 CSS viewports. Initial state, script notice, conversion progress and successful result actions fit without page scrolling or controls leaving the viewport. Mixed A4 completion and no-page error feedback fit too. Expanded explanations remain readable via normal document scrolling; long code/preview content uses its own pane scrolling.
- Actual UI downloads: `editor-light.zip` and `editor-dark.zip` each contain 1 PPTX / 1 slide, with exactly equal slide XML despite the source including a dark-mode media query. `batch-mixed-a4.zip` contains 3 PPTX / 6 slides; `editor-scripts-on.zip` contains 1 PPTX / 1 slide with the expected script-added text. Preview scripts stay disabled. Cancel/retry controls and input retention across back navigation passed.
- Confirmed live OS-theme changes in system mode, explicit-theme precedence and reload persistence, keyboard radio navigation, continued operation when localStorage throws, both modes' help disclosures and no horizontal page overflow at 390×844. Twenty foreground/background pairs met 4.5:1, with minimum measured contrast 5.0:1. No uncaught page errors were recorded.
- Visual review caught a blank preview that text-only DOM assertions missed. A focused browser matrix reproduced zero-sized child layout when srcdoc was initialized in a hidden workspace and after re-entry. Loading only while visible and recreating the iframe when opening the editor fixed both cases; acceptance now requires rendered heading bounds and visibility, including after back navigation and clearing/re-entering HTML. The cloned frame retains all sandbox/referrer attributes.
- Screenshots, ZIPs and geometry/contrast report: `.tmp/ui-acceptance/`. `file-light.png`, `file-dark.png`, `editor-light.png`, `editor-dark.png` and narrow-screen screenshots are visual evidence. Main/editor screenshots were inspected after the preview correction.
- `npm test`: 35 passed, 0 failed, 277.7 ms. `node --check web/theme.js`, `node --check web/app.js`, `node --check scripts/ui-acceptance.cjs`, `go test ./...` (0.756 s), `go vet ./...` and `go build -o .tmp/HTMLtoPPTX-ui-v6.exe .` passed. Graphify AST refresh completed with 359 nodes, 711 edges and 23 communities.
- Context7 consulted before implementation: `/mdn/content` for viewport sizing/flex/grid, color-scheme/prefers-color-scheme, localStorage, iframe srcdoc/sandbox and cloneNode attributes; Playwright documentation for emulated color schemes, file upload/download and frame/visibility assertions. Modern Web Guidance was used first for layout/theme work; the user's explicit three-mode requirement takes precedence over its two-mode preference.
- Distribution: `dist/ui-20260906/HTMLtoPPTX.exe`, 9,439,232 bytes, SHA-256 `E76AD1B1AA515F490331F227F36D60AABEECEB863CF6E1C8FAF42851FC1A4348`, copied directly from the browser-tested build. Earlier quality artifacts were preserved, and no GitHub release was published or modified.

## Output quality acceptance — 2026-09-06

- Full access resolved the earlier browser and filesystem permission blocks. Used the normal Codex in-app browser and its visible file chooser, script checkbox, conversion button and ZIP save link. No alternate browser driver was used.
- Verified executable: `.tmp/HTMLtoPPTX-visual-quality-v2.exe`, SHA-256 `0F0BCA1778506E32711EA6A38351E8D602999ECFF9FA5A945DEA876E9C8E5652`; served at `http://127.0.0.1:60898/`. The two unmodified user HTMLs converted with scripts enabled into two PPTX / 13 slides. Typography, mixed A4 and the new `testdata/viewport-scales.html` fixture converted with scripts disabled into four PPTX / 11 slides. The mixed-A4 manual-combination notice appeared. Browser warning/error logs were empty.
- Final evidence is under `.tmp/browser-acceptance-20260905/`, prefixed **`verified-`**: `verified-real-inputs.zip` / `verified-real-inputs/`, `verified-regressions.zip` / `verified-regressions/`, `verified-ooxml-report.json`, `verified-check-*.json`, `verified-pdf/`, and `verified-rendered-*/slide-N.png`. Archives were downloaded through the browser at 07:00 JST on September 6. Real-input ZIP SHA-256: `1932B1C8C6035CD69AD44E295A2DAB499C75CB740FE7DAC56A78CB3792384C18`; regression ZIP: `0DE5C77A6EEF1446DBB8D2D8DB6B45C3655C5A6EC564EA5C9866F0CD06F1B4C1`.
- All six PPTX files pass `inspect_presentation_package_integrity.py --fail-on-findings` and `inspect_presentation_layout_geometry.py --fail-on-findings`. LibreOffice 26.2.5.2 imported each PPTX and exported PDF; Poppler rendered each page at up to 1600px. **All 24 final slides were viewed individually**: smartphone 1; AI 1–12; typography 1–4; viewport scales 1–4; mixed A4 portrait 1–2 and landscape 1. No conversion-caused clipping or overlapping text was found in this set. The original missing smartphone illustration remains absent.
- Visual corrections confirmed: smartphone footer decoration is behind the application panel, circular decoration retains its clipped contour, and date/course/QR borders have a single rounded outline. AI cover metadata retains label/value spacing; table badges and inline permission labels remain separate editable objects; page 11 bold checklist text stays readable. Japanese text, original page layout, sidebars, tables and page numbers are preserved.
- A preliminary full-access candidate exposed an intermittent page-view transform defect: the AI source's viewport-scaling script could leave a negative scale in its snapshot, reversing measured coordinates and exporting a 9pt sidebar title at 108pt. Page/ancestor transform normalization fixes that path. The final sidebar title is 9pt. The actual-browser viewport fixture covers scale 0.5, 1.25, -0.0833333 and individual scale 0; all four outputs have identical editable body geometry and 24pt text. The failed candidate is retained under `final-*` for evidence only, despite that historical prefix.
- OOXML confirms exact A4 portrait `7560000 × 10692000` EMU and landscape inverse; wide `12192000 × 6858000`; 99 runtime agenda entries (nine on each AI content page 2–12); no nested group shapes; and typography invariance at 24/36pt with 36pt line spacing and -0.75/+1.5pt character spacing. Real inputs contain 22 / 520 editable text shapes. Worker tests additionally verify embedded media, native ellipse/freeform geometry, corner radius and all declared parts for 1/2/3-slide packages.
- `npm test`: 35 passed, 0 failed. JavaScript syntax checks, `go test ./...`, `go vet ./...`, and the Windows build pass. Graphify AST refresh: 337 nodes, 690 edges, 19 communities. All applicable pre-commit hooks pass after normalizing `PROJECT_STATUS.md` line endings.
- Context7: `/mdn/content` for atomic inline boxes, absolute-position ownership, text-box-trim, stacking contexts, rounded overflow clipping, and transformed versus layout dimensions; `/gitbrent/pptxgenjs` for freeform `points`, `rectRadius`, slide-master output and native image/shape APIs; JSZip archive editing for the stale-master cleanup. Exact PptxGenJS 4.0.1 types and serializer were checked for point/radius units. Modern Web Guidance covered clipping and individual transform properties, including identity transforms that preserve containing blocks.
- Deliverables are copied from the verified artifacts to `dist/quality-20260906/`: `HTMLtoPPTX.exe`, `変換結果.zip`, and the two PDF previews. No release or remote branch was changed. Earlier baseline, `accepted-*` and `final-*` artifacts are not deliverables. Microsoft PowerPoint is not installed/registered, so native PowerPoint rendering/editing remains unverified; this acceptance covers actual browser conversion, OOXML and LibreOffice rendering.

## Browser and PPTX acceptance follow-up — 2026-09-05 (historical; superseded above)

- Authorized retry: after the user explicitly said `許可して再開`, launched the latest acceptance candidate (PID 16664) at `http://127.0.0.1:57900/` and called the normal Codex in-app browser entry point. Browser security again returned that the user had declined access. No alternate URL/driver or indirect browser automation was attempted. No corrected PPTX was generated by this retry; the user's authorization is already recorded, but the browser permission state still blocks execution. Startup evidence is in `server-accepted.stdout.log`, `server-accepted.stderr.log`, and `server-accepted.pid` under the evidence folder. The candidate server was stopped after recording the denial; `git diff --check` passed.
- Baseline commit `1af27f1`, executable `.tmp/HTMLtoPPTX-text-quality.exe`, Codex in-app browser at `http://127.0.0.1:61262/`. Actual file selection, conversion and save clicks succeeded. Scripts-off warning appeared for the supplied training HTML; enabling scripts produced two PPTX files / 13 slides. Regression selection with scripts off produced three PPTX files / seven slides. Browser warning/error logs were empty.
- Evidence folder: `.tmp/browser-acceptance-20260905/`. `real-inputs.zip` / `real-inputs/` contain the smartphone flyer (one A4 portrait slide) and AI training (12 wide slides). `regressions.zip` / `regressions/` contain four equivalent typography scales and mixed-A4 output split into two portrait slides and one landscape slide. These are baseline artifacts, not corrected deliverables.
- `inspect-output.py` and `ooxml-report.json` verify ZIP integrity, exact A4 dimensions (`7560000 × 10692000` and inverse), editable text/no nested groups, 99 agenda entries (nine entries on each content page 2–12), and scale-invariant mixed text (24/36pt, line spacing 36pt, character spacing -0.75/+1.5pt). The cover has no sidebar by design.
- All 20 baseline slides were exported by LibreOffice 26.2.5.2 to PDFs in `libreoffice-pdf/`, rasterized and inspected individually (`lo-rendered-ai/`, `lo-rendered-smartphone/`, `lo-typography-scales/`, `lo-mixed-a4-A4縦/`, `lo-mixed-a4-A4横/`). The typography/A4 fixtures show the expected size, line order and content. The 13 actual-input slides render but fail visual acceptance for the defects below. Microsoft PowerPoint is not registered here, so no native PowerPoint acceptance is claimed.
- Visual defects found: AI page 1 fixed-width metadata labels collapse into values; page 5 table badges lose padding; page 7 body text overlaps the 可/不可 badges; page 11 bold-only checklist content collapses to a tiny line. Smartphone organizer/section labels also shrink. Its missing relative illustration remains a source-asset limitation.
- DOM/source/OOXML diagnosis: inline-block text was flattened into the owning paragraph, losing layout space. An absolute pseudo-checkbox caused `hasInlineText` to reject the list item, so its bold child inherited only a glyph-height box. `text-box-trim` likewise produces a smaller box than PowerPoint's explicit line height can contain. Range/glyph bounds require reconstructed line-height space to avoid `fit: shrink` collapse.
- Package inspector passed both single-slide decks and failed all three multi-slide decks on `content_type_target_missing` for nonexistent `ppt/slideMasters/slideMaster2.xml` and later masters (11/3/1 findings for the 12/4/2-slide decks). All five geometry inspections passed. Pinned PptxGenJS 4.0.1 declares one master per slide in `makeXmlContentTypes`, but writes the actual shared master only. A narrow worker normalization removes declarations only when those master parts do not exist.
- Implemented fixes preserve atomic inline boxes separately, use measured line fragments around them, ignore out-of-flow children when selecting paragraph owners, and restore line-height space for Range/inline/trimmed boxes. Ordinary rich-text paragraphs remain a single editable object. Three extraction regressions reproduced the original failures before passing; a fourth checks trimmed-heading line space. The expanded real PptxGenJS worker test reproduced missing-part declarations before the package fix.
- Current verification: `npm test` **31 passed**; `go test ./...`, `go vet ./...`, `node --check web/app.js`, `node --check web/converter-worker.js`, and `go build -o .tmp/HTMLtoPPTX-acceptance-candidate.exe .` passed. Worker verification covers 1/2/3-slide output, all content-type target parts, retained media/ellipse objects and exact A4 dimensions. Graphify update completed (333 nodes / 680 edges / 18 communities).
- Context7: `/mdn/content` for atomic inline boxes, normal flow vs absolute positioning, and `text-box-trim`; `/gitbrent/pptxgenjs` for write/master behavior; `/stuk/jszip` for `loadAsync`, XML replacement and `generateAsync`. The master-declaration defect was confirmed against the installed 4.0.1 serializer because Context7 did not document that bug. Required Modern Web Guidance was attempted first; npm failed with EACCES, so official MDN documentation was used.
- **Blocked corrected-output acceptance:** opening the interim corrected server at `http://127.0.0.1:51419/` was explicitly denied by browser security as user-declined. No alternate port/browser/driver workaround was attempted. Renewed permission is required; rebuild/use the latest candidate (which additionally contains trimmed-heading and package fixes), repeat both UI batches, verify all packages and inspect every slide again.
- `uv tool run pre-commit run --all-files` failed before hooks because its user cache is not writable under the current permissions. `.git` is read-only; the task remains uncommitted. Preserve unrelated `.codex/config.toml` and user-owned untracked inputs.
- Candidate SHA-256: `59D9B2D719DBD558F64BD810E87312C84D3E7B8E64F0C606456503965A152D49`. Final `git diff --check` passed. The interim server PID 26240 was stopped. Cleanup of baseline server PID 34304 and fixture server PID 99180 was denied after the permission change; both were still running at handoff. Do not use them to bypass the browser denial; stop them when process permissions permit.

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
