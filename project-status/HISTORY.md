# Completed work and release history

Last updated: 2026-09-06

This file holds completed milestones and superseded release state. Current work and next actions belong in [`../PROJECT_STATUS.md`](../PROJECT_STATUS.md).

## FullHD UI refinement — 2026-09-06

- Published product commit `d12bda1` to GitHub and replaced the existing `v0.1.0-alpha.1` prerelease/tag/Windows executable at the user's request for real-machine validation. Updated release notes to include the UI and conversion-quality improvements. Fresh GitHub download matches the tested 9,446,912-byte build (SHA-256 `567FFDCE3D1DD2C4F4383A63E1C7C0AFCD8DA338FA9EF06016C0E9FC56C65656`). Preserved the prerelease URL and asset filename.
- Follow-up visual finish restored the website style requested for future shared intranet use: large introductory heading, warm paper/copper colors, clear conversion steps, consistent icons and adjoining code/preview panes. Preserved both themes/system choice and every conversion handler.
- The website build passed 58 layout states, 28 contrast pairs, real downloads, preview/navigation checks and the 35 existing conversion tests. A compact-height panel overflow found visually is fixed and covered by form-containment assertions. Saved separately as `dist/ui-website-20260906/HTMLtoPPTX.exe`, with screenshots and verification report.

- Reorganized file input/settings into two steps and the editor into a navigation/action toolbar, shared settings row, and flexible code/preview panes.
- Added light, dark and live system themes, accessible native selection controls, high-contrast dark surfaces and a themed empty preview. Kept source rendering independent of app colors.
- Verified 58 desktop layout states, real ZIP conversion/download behavior, preview rendering, system/keyboard/storage cases, help expansion and narrow-screen overflow. Existing conversion tests remain 35/35 passing.
- Fixed the preview's hidden-workspace initialization issue and retained the existing conversion pipeline, script sandbox and mixed A4 output contract.
- Distributed the verified build separately as `dist/ui-20260906/HTMLtoPPTX.exe`; existing quality artifacts and GitHub release remain unchanged.

## Application foundation

- Added a standard-library Go localhost server with an embedded browser UI and Windows browser launch.
- Bundled PptxGenJS 4.0.1 locally so end users do not need Node.js or a CDN.
- Added `.slide` enumeration with one PowerPoint page per element in document order.
- Added browser-rendered DOM bounding-box and computed-style extraction for editable text boxes.
- Added a converter-card-local native progress bar with explicit completed/total counts and ARIA live status.
- Moved PowerPoint creation and compression to a Web Worker, added cancellation, and kept file selection available during conversion.
- Added Go embedding/security tests, JavaScript core and OOXML tests, and tracked browser fixtures.

## Issues #1 and #2

- Fixed Issue #1 by extracting solid element backgrounds and CSS borders as editable PowerPoint rectangles, rounded rectangles, and lines beneath text.
- Normalized computed CSS colors, including `oklch(...)`, through an sRGB canvas before passing color and alpha values to PptxGenJS.
- Added OOXML coverage for editable fill and dashed-border colors plus shape-option and alpha-transparency tests.
- Fixed Issue #2 with a persistent user-clicked save link, safe Blob URL replacement, and per-job identity checks that ignore callbacks from cancelled or superseded Workers.

## Issues #3 through #6

- Documented the deterministic input contract: one or more `.slide` elements, fixed 16:9 dimensions, static DOM content, and scripts disabled by default.
- Added an actionable missing-`.slide` error with a minimal 1280 x 720 example.
- Added per-slide measurement isolation that temporarily displays hidden slides and restores their exact `class`, inline `style`, and `hidden` attributes.
- Added a 12-slide `display:none` fixture and verified every slide converts without zero-size failures.
- Replaced whitespace flattening with logical element/table-cell extraction using `Range.getClientRects()`, explicit `<br>` and block boundaries, CSS `white-space`, inline rich-text styles, and computed `line-height`.
- Added PptxGenJS `softBreakBefore` output so line boundaries serialize as editable `<a:br/>` elements rather than separate shapes.
- Added OOXML tests for soft line breaks, exact point line spacing, and the absence of nested `<p:grpSp>` objects.
- Closed Issue #6 at the user's direction. Its sample-dependent PowerPoint selection-UI validation remains a possible follow-up.
- Created `deliverables/HTMLtoPPTX_Issue3-6_改修方針書.docx` as the implementation handoff; its nine rendered pages and accessibility checks passed.

## Issue #7 trusted runtime content

- Identified the missing sidebar items as runtime-generated `<li>` elements, not a shape-extraction failure.
- Added an explicit trusted-HTML option without weakening the default path: inline scripts execute in an opaque-origin, deny-by-default CSP sandbox; messages validate origin, source, payload, and a one-time token; the resulting DOM is frozen before the normal script-disabled conversion path.
- Closed Issue #7 after browser acceptance with its 12-slide source and attached-source verification.

## Multi-HTML batch delivery

- Added multiple `.html`/`.htm` selection, one independent PPTX per input, case-insensitive collision-safe output names, and one ZIP download for every batch, including a single-file batch.
- Added Worker-level ZIP/PPTX structure tests and a two-file browser acceptance run.
- Committed and pushed the feature as `7e3fcbf`.

## Repository and agent tooling

- Initialized Git and added project-scoped Codex, Serena, Code Review Graph, Better Code Review Graph, and Graphify configuration.
- Indexed the design document in Graphify and verified Graphify skill routing with a minimal design query.
- Installed pre-commit 4.6.1 with generic repository checks and Windows-compatible Code Review Graph update/change detection.
- Added persistent handoff rules and mandatory Context7 consultation rules to `AGENTS.md`.
- Split the Graphify skill into a 4,364-byte / 65-line router and an on-demand 40,450-byte / 705-line runbook.
- Added a repository-local Codex profile that disables 14 unrelated or duplicate plugins, removes the legacy Code Review Graph MCP surface, fixes Serena startup, caps stored tool output, and enables early compaction.
- Committed the context optimization as `74c5dfd` and the Issue #3-#5 implementation as `69569fa`.

## Release timeline

- Created private repository `divine261402-pixel/HTMLtoPPTX`, pushed `main`, and published the initial `v0.1.0-alpha.1` Windows prerelease from product commit `f651b3a`.
- Replaced the prerelease for Issues #1/#2 and moved the annotated tag to `c7eed34`.
- Replaced it for Issues #3-#5 and moved the tag to product commit `69569fa`.
- Rebuilt from a clean clone for Issue #7, moved the tag to product commit `2e298dc`, and replaced the asset.
- Rebuilt from a clean clone for multi-HTML ZIP delivery, moved the tag to product commit `7e3fcbf`, safely replaced the asset through a verified temporary upload, and removed the temporary asset.
- Current release metadata and checksum are maintained in [`../PROJECT_STATUS.md`](../PROJECT_STATUS.md); detailed evidence is in [`VERIFICATION.md`](VERIFICATION.md).
