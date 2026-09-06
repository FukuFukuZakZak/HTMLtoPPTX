# Project status

Last updated: 2026-09-06
Status owner: Codex and repository maintainers

This file is the short, current handoff view. Longer-lived details are split by purpose:

- [Completed work and release history](project-status/HISTORY.md)
- [Architecture and product decisions](project-status/DECISIONS.md)
- [Verification evidence](project-status/VERIFICATION.md)

## Objective

Build the HTML-to-PPTX converter described in `docs/HTML_to_PPTX_converter_spec_initial.md` as a Codex-maintainable Windows project.

## Current milestone

Optional 8bit special theme complete: a top-right settings gear selects standard or retro appearance independently of light/dark/system. Both workspaces retain verified FullHD workflows and unchanged conversion behavior.

## Current work

- Applied the user's final palette adjustment: 8bit light uses the standard ivory page background (`#f3f1eb`) and neutral pixel dots; its settings thumbnail matches. Dark colors are unchanged. All 58 browser acceptance states and four conversion ZIP cases pass; the review artifact/screenshots were refreshed.
- Completed the settings gear and optional 8bit appearance: blue/navy palettes, pixel lettering, square panels, stepped shadows and original inline pixel art, inspired by the user's reference site. Native dialog/radios support keyboard operation, Escape and focus return. Light/dark/system remain independent; settings persist on the same browser origin and tolerate blocked storage.
- Latest review artifact: `dist/ui-8bit-20260906/HTMLtoPPTX.exe`, with light/dark home/editor/settings screenshots and `ui-verification.json`. Bundled complete DotGothic16 WOFF2 (500,340 bytes) under OFL 1.1; no runtime font downloads. This follow-up has not replaced the published `d12bda1` prerelease.
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

- Product commit: `d12bda185890872989d15ae0b7f2f05e6ecbc3eb`
- Release: [`v0.1.0-alpha.1`](https://github.com/divine261402-pixel/HTMLtoPPTX/releases/tag/v0.1.0-alpha.1) — `HTMLtoPPTX v0.1.0-alpha.1（UI刷新・変換品質改善 実機検証版）`
- Asset: `HTMLtoPPTX-v0.1.0-alpha.1-windows-amd64.exe`
- Size: 9,446,912 bytes
- SHA-256: `567FFDCE3D1DD2C4F4383A63E1C7C0AFCD8DA338FA9EF06016C0E9FC56C65656`
- The annotated tag and GitHub prerelease both target the clean product commit above. The release contains exactly one Windows asset.

## Next actions

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
