# Project status

Last updated: 2026-09-07
Status owner: Codex and repository maintainers

This file is the short, current handoff view. Longer-lived details are split by purpose:

- [Completed work and release history](project-status/HISTORY.md)
- [Architecture and product decisions](project-status/DECISIONS.md)
- [Verification evidence](project-status/VERIFICATION.md)

## Objective

Build the HTML-to-PPTX converter described in `docs/HTML_to_PPTX_converter_spec_initial.md` as a Codex-maintainable Windows project.

## Current milestone

Approved How to use manual is integrated into the executable. A shared header link opens the 11-chapter guide in a separate tab while preserving editor input. Integration, commit/push and replacement of the existing alpha.1 prerelease are complete. A fresh GitHub download matches the tested executable.

## Current work

- 2026-09-07: user approved the manual and authorized integration, commit, GitHub push and replacement of the existing prerelease. Added the shared header entry and self-contained `web/howtouse/` assets. Existing CSP remains unchanged.

- Created `deliverables/Howtouse/Howtouse.html` for users to read on screen while operating the converter. Covers paste/preview, optional repair and script-added content, conversion, ZIP save/extraction, file input, page sizes, themes and troubleshooting. The single HTML embeds screenshots and the downloadable practice HTML. Source and original captures are beside it; approved content is now generated into the application without adding dependencies.
- Verified all 11 chapters at four viewport sizes (44 states), image enlargement/Escape/focus return, chapter navigation, standalone practice download and no-JavaScript reading in Edge. No page errors or external requests. Current executable produced the pictured two-slide `貼り付けHTML.pptx` inside a ZIP. Final manual evidence is `deliverables/Howtouse/verification.json`; detailed workflow evidence remains in `.tmp/howtouse/`.
- Implemented the user's paste-first HTML repair request in the existing textarea. The `簡易補正` button uses locally bundled parse5 to locate source tags; adds supported structural ends at ancestor/indentation/EOF boundaries and removes standalone Markdown code fences. Inline formatting boundaries, malformed attributes/raw text and unsupported ambiguities produce diagnostics without changing source. CSS and JavaScript contents are preserved.
- Verified 580 damaged copies of both supplied `test-data` HTMLs: 256 applied repairs all restore the original tree and Edge element/text geometry; 151 are already recovered by the browser, 166 remain warning-only, and 7 have no supported detectable repair. All cases are idempotent and the original file hashes are unchanged. Six real conversion ZIPs verify identical corresponding slide XML, including scripts enabled.
- Native Ctrl+Z/Ctrl+Y passes 150 undo/redo cycles with exactly 300 history input events. Paste and repair are separate history entries; no-op repair creates no entry, editing discards the redo branch, and navigation retains history. Latest local artifact: `dist/html-repair-20260906/HTMLtoPPTX.exe`, with screenshots, reports and copied mutation cases. Published this verified repair build in the existing prerelease on 2026-09-07 JST; a fresh GitHub download matches the tested executable.
- Applied the user's final palette adjustment: 8bit light uses the standard ivory page background (`#f3f1eb`) and neutral pixel dots; its settings thumbnail matches. Dark colors are unchanged. All 58 browser acceptance states and four conversion ZIP cases pass; the review artifact/screenshots were refreshed.
- Completed the settings gear and optional 8bit appearance: blue/navy palettes, pixel lettering, square panels, stepped shadows and original inline pixel art, inspired by the user's reference site. Native dialog/radios support keyboard operation, Escape and focus return. Light/dark/system remain independent; settings persist on the same browser origin and tolerate blocked storage.
- Latest review artifact: `dist/ui-8bit-20260906/HTMLtoPPTX.exe`, with light/dark home/editor/settings screenshots and `ui-verification.json`. Bundled complete DotGothic16 WOFF2 (500,340 bytes) under OFL 1.1; no runtime font downloads. Published this verified 8bit build in the existing `v0.1.0-alpha.1` prerelease; a fresh download matches the tested executable.
- Published the verified website UI build at the user's request: `main` was pushed and the existing `v0.1.0-alpha.1` prerelease/tag/Windows asset were replaced. A fresh GitHub download matches the tested executable. Target-machine validation is next.
- Follow-up to `8b97c24` is complete: the user prefers the original website character and clarified that the final destination is shared intranet browser access. The UI now uses a large introductory heading, warm paper/copper colors, a centered site header, consistent icons and joined editor panes. All acceptance checks pass. Shared hosting remains a future deployment task.
- File selection now leads from input on the left to settings, conversion and ZIP save on the right. Editor navigation/conversion sit above the code and preview, with script execution directly below the toolbar.
- FullHD acceptance passed with help closed; script notices, conversion progress and saved-result actions remain inside the viewport. Expanded help and content inside the editor/preview can scroll.
- Light, dark and live system themes are complete. Conversion measurement/Worker/package logic remains based on verified commit `5a3f440`; theme changes produce identical slide XML.
- Verified executable: `dist/ui-website-20260906/HTMLtoPPTX.exe`, with home/editor screenshots and `ui-verification.json` alongside it. No implementation blockers remain for this UI request.

## Current state

- Both workspaces use viewport-height layouts and clear high-contrast theme tokens. The empty preview follows the app theme; source HTML and conversion frames keep a light color scheme. Preview loading is deferred until the editor is visible to avoid a reproduced Chromium blank-frame issue.
- Output-quality implementation and actual-browser/PPTX acceptance are complete for the supplied inputs and regression fixtures: six PPTX files / 24 slides, all individually inspected after LibreOffice rendering. Inline labels, trimmed/checklist text, background stacking, rounded/clipped decoration, page-view scaling and stale package declarations are corrected. All 35 automated tests pass. Native Microsoft PowerPoint validation remains a separate environment-dependent follow-up.
- Editable text fidelity is improved for differently sized HTML pages: font sizes, line spacing, and inline run sizes follow the measured page-to-slide scale; positive and negative CSS letter spacing are preserved. Mixed inline font sizes no longer cause spurious line breaks.
- GitHub Issues #1-#7 are closed.
- Conversion fidelity for the supplied smartphone-class flyer is substantially improved: A4 portrait clipping uses the detected page bounds, visually clipped accessibility text stays hidden, circular badges remain ellipses, flex/grid text alignment is retained, single-line text receives PowerPoint metric tolerance, and container text no longer duplicates or overlaps nested content. Loaded `img`, `canvas`, inline SVG, and CSS pseudo-elements are now included in the extracted slide model.
- The file-upload workflow now has a separate lightweight paste mode: a plain textarea on the left, a script-disabled live preview on the right, and the same conversion/progress/ZIP pipeline used by uploaded HTML files. Pasted input is treated as a virtual `貼り付けHTML.html`; no code-editor dependency was added.
- A mixed A4 HTML is classified page by page and split into `元名-A4縦.pptx` and `元名-A4横.pptx` inside the ZIP while preserving page order within each orientation. The converter screen explains that the files must then be combined manually in PowerPoint.
- Multiple `.html`/`.htm` files can be selected. Each source becomes an independent PPTX, case-insensitive duplicate names receive ` (2)`, ` (3)`, and so on, and every conversion is delivered as one ZIP.
- Hidden `.slide` elements are measured in isolation and restored. Text extraction preserves authored and rendered line boundaries, inline styles, CSS whitespace, and computed line height as editable PowerPoint text.
- Content added after an HTML file opens remains disabled by default. The UI detects HTML that contains executable scripts, warns that menus or charts may be omitted while the option is off, and explains the choice with concrete source-based examples. If enabled, inline scripts run in a network-blocked, opaque-origin sandbox and the resulting DOM is snapshotted before conversion.
- PPTX construction and ZIP packaging run in a Web Worker while DOM measurement remains on the browser main thread with yielding between slides.
- Each HTML can now produce widescreen, A4 landscape, or A4 portrait output. `.slide` remains the primary page marker; when it is absent, inline `@page size` and rendered A4-proportioned page elements are detected.
- Repository-scoped Codex context optimization is complete: Graphify uses a short router, unrelated or duplicate plugins are disabled, Serena has an absolute startup path, and tool-output/compaction limits are configured.

## Current release

- Product commit: `992d93cd844479bdacf53baf812e05110eecebd7`
- Release: [`v0.1.0-alpha.1`](https://github.com/divine261402-pixel/HTMLtoPPTX/releases/tag/v0.1.0-alpha.1) — `HTMLtoPPTX v0.1.0-alpha.1（操作マニュアル内蔵 実機検証版）`
- Asset: `HTMLtoPPTX-v0.1.0-alpha.1-windows-amd64.exe`
- Size: 11,205,120 bytes
- SHA-256: `7352875E071476B806EFC13AB1DF04AB4A53F1FCB71E4FBA33DC68A5D08C8F02`
- The annotated tag and GitHub prerelease both target the clean product commit above. The release contains exactly one Windows asset.

## Current manual decisions

- Approved content is shared by standalone and app generators. Embedded screenshots and static assets ship inside the executable. Open help in a separate tab to preserve active input and conversions; use external same-origin scripts under the existing CSP.

- Review the user-facing manual as a standalone, offline HTML before producing a video. Use real current-version screenshots with marked controls, short action/result text and on-demand chapters. Preserve the original application's behavior and provide no automatic playback.

## Next actions

On the target Windows browser, open the updated alpha.1 executable and use the shared header「How to use」entry while editing. The approved integration/release task is complete; video recording and narration remain a future task.

Try `dist/html-repair-20260906/HTMLtoPPTX.exe` on the target LGWAN/Windows browser: paste representative exaBase HTML, run `簡易補正`, inspect preview and use Ctrl+Z/Ctrl+Y. Closing positions use structural/indentation hints; arbitrary missing content or intended formatting cannot be reconstructed. Broaden supported repairs only with representative failing examples and original-output comparisons.

Confirm the latest artifact's top-right gear → 8bit appearance in light/dark on the target FullHD/LGWAN browser and preferred Windows display scaling. The next product milestone is shared intranet hosting: establish the target web server and stable origin, then verify the existing browser-only conversion, Worker and CSP behavior in that environment. The current executable still starts a local server for review.

1. Open the verified files in `dist/quality-20260906/変換結果.zip` in Microsoft PowerPoint on a machine where it is installed; confirm editable text/shapes, Japanese fonts and the corrected inline badges/checklist. This environment completed browser, OOXML and LibreOffice checks.
2. Supply the missing hero illustration as a `data:` URL inside the smartphone HTML, or add an explicit associated-asset import workflow; then repeat the real conversion to confirm the intended illustration is embedded.
3. Open both latest `test-data` outputs in Microsoft PowerPoint and confirm editable-object placement, Japanese font substitution, and image compatibility outside LibreOffice rendering.
4. Validate the paste workflow with representative HTML copied directly from exaBase AI on the target LGWAN environment, including inline CSS, Japanese text, and expected restrictions on external assets.
5. Validate the closed Issue #5 against its attached PDF/PPTX pair in Microsoft PowerPoint, focusing on table-cell line order, explicit breaks, boundary containment, and logical edit units.
6. Open representative mixed A4 output in Microsoft PowerPoint and confirm both page setups, editable-object placement, and the documented manual-combination workflow.
7. Implement Issue #5 stage 3: surface material `fit: shrink` risk, detect/report font fallback where practical, and calibrate remaining PowerPoint-specific line-height differences.
8. If Issue #6 needs further follow-up, obtain an exact slide/object example and compare the PowerPoint selection UI with OOXML while preserving independent objects.
9. In a fresh Codex task, confirm the project plugin/MCP profile is reloaded and compare the initial prompt/tool-schema token count with the previous approximately 40,000-token baseline.

## Active risks / blockers

- The approved manual is integrated; video production remains a separate future task. Screenshots document the unchanged conversion controls from product commit `2139b95`; the newly added header help link is not pictured. No integration blockers remain.
- Simple repair does not guarantee reconstruction of arbitrary malformed HTML. Missing inline formatting ends, starting tags/attributes, unfinished script/style/comment text, foreign content and ambiguous nesting are outside automatic repair. Native history uses the deprecated but currently working `execCommand("insertText")` API; Windows Edge acceptance must be repeated for an engine migration. No custom input/history reentry is used.
- Browser and filesystem access are available with the current full-access setting; the previous local-URL, uv-cache and Git-write blockers are resolved.
- Microsoft PowerPoint is not installed/registered in this environment. All 24 final slides were individually inspected using LibreOffice 26.2.5.2 → PDF → PNG. Native PowerPoint rendering and editing are not verified.
- For the earlier conversion-quality milestone, only `verified-*` artifacts under `.tmp/browser-acceptance-20260905/` and their copies in `dist/quality-20260906/` are the accepted output. The later UI executable is in `dist/ui-20260906/`. Older baseline, `accepted-*` and `final-*` candidates predate one or more quality fixes.
- PowerPoint uses one page size per presentation. The converter splits mixed A4 portrait and landscape pages into separate PPTX files; the user must combine their slides manually in PowerPoint when one deliverable is required.
- Gradients, box shadows, semantic PowerPoint tables, CSS background images, and external cross-origin images that taint the browser canvas are not implemented. Loaded `img`, `canvas`, and inline SVG elements are supported.
- `test-data/2026スマホ教室.html` references `assets/smartphone-class-irasutoya.png`, but that file is absent and the upload contains only the HTML file. The converter cannot recreate or access an unselected local asset, so the hero illustration is absent from the measured output.
- Pixel-identical browser-to-PowerPoint text layout cannot be guaranteed while keeping text editable. Issue #5 still needs PowerPoint validation.
- Regression tests use deterministic DOM/Range measurements and real PptxGenJS output, supplemented by actual-browser runs. Page-view transforms are normalized; arbitrary transforms inside a page, vertical writing and unusual bidirectional/overlapping inline layouts remain outside current coverage.
- Font fallback and unsupported Japanese glyph detection are not implemented.
- HTML programs can run indefinitely or mutate the DOM after the snapshot point. The option stays off by default and should be enabled only for files created by the user or from a confirmed source; external scripts and network-loaded assets stay blocked.
- Issue #6 has no exact failing object example. Current OOXML contains no nested PowerPoint group shapes.
- `npm audit` reports two high-severity denial-of-service advisories in PptxGenJS's transitive `image-size` dependency. Image embedding is now enabled, so reassess the pinned dependency and input-size limits before widening use beyond trusted local HTML.
- The initial design document and other user-owned untracked inputs must not be added or modified without explicit user intent.

## Latest verification

- 2026-09-07 JST: product commit `992d93c` pushed; existing alpha.1 annotated tag and prerelease target this product commit. Replaced the sole Windows asset. Fresh download matches 11,205,120 bytes and SHA-256 above; prerelease true, draft false. Publication evidence is `.tmp/howtouse/published-verification.json`; previous executable and release metadata retained locally for recovery.

- Standard and 8bit browser regression: 58 layout states each (116 total), four real conversion ZIPs each, zero page errors; minimum measured contrast 5.0 / 5.15. Desktop and mobile screenshots inspected. Graphify AST update: 803 nodes / 2132 edges / 43 communities; metadata JSON produces no AST nodes and community labels use hub fallback.

- Integrated manual: 44 viewport/chapter states; home/editor separate-tab entry, retained input, chapter links, modal close/Escape/focus, practice download, no-JS readability, actual two-slide ZIP, zero external requests/page errors/CSP violations. `npm test`: 43 passed; `go test ./...` and `go vet ./...`: passed. Context7 consulted: `/mdn/content` CSP external same-origin scripts; `/websites/cli_github_manual` release edit/upload/download.

- How to use (2026-09-07): Edge acceptance covers 11 chapters at 1920×1080, 1440×900, 1280×720 and 390×844, with no horizontal document overflow, missing images, page errors or external requests. Previous/next boundaries, direct chapter links, FAQ links, native image dialog/Escape/focus return, embedded practice-file download and no-JavaScript reading pass. Real conversion ZIP contains `貼り付けHTML.pptx` with 2 slides. Visual review confirmed FullHD chapter navigation remains within the screen; smaller desktop chapter content can scroll independently. No production tests were rerun because application code is unchanged.
- Context7 for the manual: `/mdn/content` native dialog/focus and current-step navigation; `/microsoft/playwright` installed Edge, viewport/screenshots and downloads. Modern Web Guidance HTML guide and Frontend Design applied. Graphify query located `showEditorWorkspace`, `previewDocument`, `startConversion` and `prepareZipDownload`; AST refresh completed with 792 nodes / 2123 edges / 45 communities. `capture.json` yields no AST nodes and community labels fell back to hubs; neither affects the manual.
- 2026-09-07 JST: pushed repair product commit 2139b95 and replaced the existing alpha.1 prerelease/tag/Windows asset. Fresh download matches the tested 10,145,280-byte executable and SHA-256 above; one asset, prerelease true, draft false. Context7: /websites/cli_github_manual, existing release edit/upload --clobber/download workflow. Details in project-status/VERIFICATION.md.

- HTML repair (2026-09-06): `npm test` 43/43 (0.395 s), `go test ./...` (0.915 s), vet and build pass. `scripts/repair-mutations.mjs`: seed 20260906, 580 copies, 256/256 applied repairs restore the original tree; shipped bundle matches all cases. `scripts/repair-acceptance.cjs`: 256 browser geometry comparisons, 150 native history cycles, six ZIPs / 50 slides with original/repaired XML equality, 12 repair-panel layouts, no page errors. Existing UI acceptance passes 58 states and four ZIPs in each appearance (116 states total).
- Context7 consulted before dependency/API use: `/inikulin/parse5` Parser/token/source locations and error recovery, `/evanw/esbuild` local browser IIFE bundle, `/mdn/content` history-preserving insertText and input/beforeinput reentry, `/microsoft/playwright` native keyboard/clipboard and installed browser execution. Modern Web Guidance HTML guidance was consulted. parse5 8.0.1 and esbuild 0.28.2 are pinned; parse5/entities MIT licenses are bundled. Graphify AST refresh: 771 nodes / 2104 edges / 44 communities; six community labels fell back to hub names after the update.
- HTML repair assessment (2026-09-06): inspected `web/index.html:170` (textarea), `web/app.js:176` (DOMParser preview normalization) and `web/app.js:484` (browser conversion frame), against Git HEAD `6645790`. Context7: `/inikulin/parse5` parse errors/source locations and `/codemirror/website`, `/codemirror/lang-html` embedding, diagnostics and typed closing-tag completion. MDN/WHATWG confirm HTML error recovery and optional tags; editor auto-completion does not by itself repair pasted documents. Modern Web Guidance HTML guidance was consulted. No application code, dependency, build, release or runtime behavior was changed; no implementation tests were required.
- Ivory 8bit light follow-up: `.tmp/ui-8bit-warm/` passed 58 states, four real ZIP conversions, theme/system/settings checks, with minimum contrast 5.15:1 and no page errors. Browser-computed standard/8bit light backgrounds both equal `rgb(243, 241, 235)`; 8bit dark remains `rgb(16, 27, 45)`. Refreshed `dist/ui-8bit-20260906/HTMLtoPPTX.exe` SHA-256: `28ED556B4537A283C72BAB3289074974A7949DAFB36CFE019498A1DF0ABE70F1`.
- Special theme: standard and 8bit each passed 58 layout states (116 total), both color modes, four desktop sizes, real ZIP downloads and settings/keyboard/persistence/mobile cases. Minimum measured contrast: standard 5.0:1, 8bit 5.15:1. All 9 slide XML files across four download cases match between appearances. Switching appearance while editing preserves source/preview; local font loads with no external requests.
- `npm test` 35/35 (0.257 s), Go tests (0.947 s), vet, build and JS syntax passed. Final executable: 9,963,520 bytes, SHA-256 `5C91994DCB31A3529725A852B04D0500D0A7DB49542892E0B38E9024F2ED7D52`. Context7: MDN native dialog/themes, Playwright keyboard/media/fonts and fontTools WOFF2. Graphify refresh: 363 nodes / 714 edges / 21 communities. See detailed special-theme evidence for build and final smoke coverage.
- Release replacement (2026-09-06): remote `main` and the annotated prerelease tag resolve to product commit `d12bda1`; GitHub reports one uploaded Windows asset, prerelease true and draft false. A fresh download matches the tested build's SHA-256 and size. Context7: `/websites/cli_github_manual`, existing release edit/notes/target, asset upload replacement and download verification. Subsequent status-only commits may advance `main` without moving the product tag.
- Website UI: Edge/Playwright acceptance passed 58 layout states at 1920×1080, 1920×950, 1536×864 and 1280×720, in light and dark. No page scrolling, offscreen introductory content/actions or panels escaping the form with help closed. System/keyboard/storage checks pass. All 28 checked text/background pairs are at least 5.0:1.
- Four real ZIP downloads verified: editor light/dark (identical slide XML), mixed A4 batch (3 PPTX / 6 slides), and scripts-enabled editor output. Cancellation/retry controls, retained editor input, folded help, error feedback, visible preview rendering and 390px mobile overflow checks passed. Evidence: `.tmp/ui-acceptance/`; repeatable test: `scripts/ui-acceptance.cjs`.
- Website UI build: `npm test` 35 passed (2.08 s), acceptance-driver syntax check, `go test ./...` (0.744 s), `go vet ./...`, and `go build -o .tmp/HTMLtoPPTX-website-v3.exe .` passed. Graphify AST refresh: 359 nodes / 711 edges / 23 communities. Context7: `/mdn/content` for responsive grid/minimum sizing, clamp typography, focus/hover/reduced motion and SVG. Modern Web Guidance and Frontend Design informed the visual work.
- Website UI executable: 9,446,912 bytes; SHA-256 `567FFDCE3D1DD2C4F4383A63E1C7C0AFCD8DA338FA9EF06016C0E9FC56C65656`. The distribution copy is byte-identical to the browser-tested build. See the detailed UI section in [Verification evidence](project-status/VERIFICATION.md).
- Actual Codex in-app browser: two supplied HTMLs with scripts on → two PPTX / 13 slides; three regression HTMLs with scripts off → four PPTX / 11 slides. ZIP save succeeded, mixed-A4 notice appeared, and browser warning/error logs were empty.
- All six final PPTX packages pass integrity and geometry inspections. All 24 slides were exported through LibreOffice 26.2.5.2 and viewed individually at up to 1600px. Fixed labels, bold checklist text, background ordering, rounded borders and page-view scaling were confirmed. Native PowerPoint is unavailable; the missing source illustration is documented above.
- OOXML verifies exact wide/A4 sizes, 99 runtime agenda entries, ungrouped editable objects, and invariant typography at 24/36pt, 36pt line spacing and -0.75/+1.5pt character spacing. Four viewport scales, including negative and zero scales, produce identical body geometry and 24pt text.
- `npm test`: 35 passed; JavaScript syntax checks, `go test ./...`, `go vet ./...`, and `go build -o .tmp/HTMLtoPPTX-visual-quality-v2.exe .` passed. All applicable pre-commit hooks passed; the initial run normalized this file's line endings.
- Graphify AST-only refresh: 337 nodes, 690 edges, 19 communities. Context7 covered MDN inline/trimmed text, stacking/radius/clipping and transformed dimensions; PptxGenJS native freeform/radius and package behavior; and JSZip archive editing. Modern Web Guidance covered clipping and individual transforms.
- Verified executable SHA-256: `0F0BCA1778506E32711EA6A38351E8D602999ECFF9FA5A945DEA876E9C8E5652`. Exact files, archive hashes, visual findings and commands are in [Verification evidence](project-status/VERIFICATION.md).

## Working tree notes

- This task includes `deliverables/Howtouse/` and the application integration. Existing `.codex/config.toml`, `.codex-remote-attachments/`, `docs/` and `test-data/` changes are preserved. The approved integration additionally owns `web/howtouse/`, the header/styles, the manual build command, acceptance script and verification/status updates.
- This task owns the repair source/bundle/licenses, three repair build/acceptance scripts, unit tests, editor HTML/CSS/JS, package manifests and status records. User-owned `.codex/config.toml`, `.codex-remote-attachments/`, `docs/` and `test-data/` remain separate. Original `test-data` files are unchanged; damaged/repaired copies are under `.tmp/html-repair/` and archived with the distribution.
- Special-theme follow-up owns `web/index.html`, `web/theme.js`, new `web/special-theme.css`, bundled font/license/provenance, the acceptance driver and status records. Conversion/runtime/Worker/Go hosting code and dependencies are unchanged. Existing published prerelease and previous distribution folders remain intact.
- Typography scaling was committed as `1af27f1`; paste-mode/script/fidelity work as `5800027`; quality acceptance as `5a3f440`; FullHD/theme foundations as `8b97c24`. This website-style follow-up owns `web/index.html`, `web/style.css`, `web/favicon.svg`, `scripts/ui-acceptance.cjs` and status records. Runtime JavaScript and Go hosting/conversion logic were not changed.
- Latest UI artifact: `dist/ui-website-20260906/HTMLtoPPTX.exe`, now published as the existing alpha prerelease's Windows asset. The previous `dist/ui-20260906/` and quality artifacts remain intact.
- Verified executable and output copies: `dist/quality-20260906/HTMLtoPPTX.exe` and `変換結果.zip`, with both PDF previews alongside them. The executable is byte-identical to the browser-tested `.tmp/HTMLtoPPTX-visual-quality-v2.exe`. No release was changed.
- `.codex/config.toml` acquired a persisted Serena `insert_after_symbol` approval setting during this session. Preserve this local setting separately from the product commit.
- `.codex-remote-attachments/` is also untracked and preserved.
- `docs/` and `test-data/` are user-owned untracked directories as of 2026-09-03. Preserve them unless the user explicitly requests otherwise.
- `deliverables/HTMLtoPPTX_Issue3-6_改修方針書.docx` is the decision memo used for Issues #3-#6 and was not edited during implementation.
- Batch conversion was released as `7e3fcbf`; the product release now points to `d12bda1`, including the subsequent fidelity and UI improvements. Status-document commits do not change the release artifact.

## Handoff checklist

- Update this file when the current milestone, next action, active risk, current release, or working-tree ownership changes.
- Put completed milestones in `project-status/HISTORY.md`, durable design choices in `project-status/DECISIONS.md`, and detailed test/release evidence in `project-status/VERIFICATION.md`.
- Record the exact next action and any unexplained failure before clearing or moving threads.
- Check `git status --short`, distinguish task changes from user-owned changes, and commit task-owned changes when appropriate.
