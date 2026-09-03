# Project status

Last updated: 2026-09-04
Status owner: Codex and repository maintainers

## Objective

Build the HTML-to-PPTX converter described in `docs/HTML_to_PPTX_converter_spec_initial.md` as a Codex-maintainable Windows project.

## Current milestone

Step 2 PoC: multi-slide HTML conversion with responsive progress feedback.

## Current work

Private GitHub prerelease `v0.1.0-alpha.1` is published with the verified Windows executable attached. No release task remains active.

## Completed

- Added a standard-library Go localhost server with an embedded browser UI and Windows browser launch.
- Added local PptxGenJS 4.0.1 bundling; end users do not need Node.js or a CDN.
- Added `.slide` enumeration and one PowerPoint page per `.slide`, preserving document order.
- Added browser-rendered DOM bounding-box and computed-style extraction for editable text boxes.
- Added a converter-card-local native progress bar with `completed / total` slide counts.
- Moved PowerPoint creation and ZIP packaging to a Web Worker so the browser UI remains responsive.
- Added cancellation and kept file selection available while a conversion is running.
- Added Go embedding/security tests, JavaScript core tests, and a tracked three-slide browser fixture.
- Git repository initialized.
- Project-scoped Codex, Serena, Code Review Graph, Better Code Review Graph, and Graphify configuration added.
- The design document was indexed into the local Graphify knowledge graph.
- Graphify skill auto-activation was verified with a minimal design question.
- Pre-commit 4.6.1 and generic repository checks were installed and verified.
- Code Review Graph update and change detection were integrated into pre-commit on Windows.
- Persistent handoff rules were added to `AGENTS.md`.
- Context7 was made mandatory in `AGENTS.md` for implementation work involving third-party libraries, frameworks, SDKs, APIs, or CLI tools.
- Created private GitHub repository `divine261402-pixel/HTMLtoPPTX`, pushed `main`, and published prerelease `v0.1.0-alpha.1` with the Windows executable asset.

## Next actions

1. When a Microsoft PowerPoint environment becomes available, open the generated three-slide fixture and record compatibility results.
2. Implement image conversion while preserving the current Worker progress protocol.
3. Preserve inline text runs and explicitly define z-order for shapes, tables, images, and text.
4. Add role-based normalization only where PowerPoint rendering proves that raw browser measurements are undesirable.

## Decisions

- Keep DOM measurement on the browser main thread but yield between slides; perform PPTX construction and compression in a Web Worker.
- Keep progress inside the converter card. Do not use a page-level overlay or disable unrelated controls.
- Use the native `<progress>` element with explicit slide counts and an ARIA live status message.
- Treat measured bounding boxes and computed styles as the starting point; add semantic normalization only for verified cross-renderer differences.
- Validate final files in Microsoft PowerPoint, not only through OOXML inspection or LibreOffice.
- Use `PROJECT_STATUS.md` as the source of truth for cross-thread progress and handoff.
- Use Git commits and test output as completion evidence.
- Keep generated Graphify and code-review databases local and ignored by Git.
- Treat one HTML `.slide` element as one PowerPoint slide, per the current design.
- Keep pre-commit checks language-neutral until implementation code establishes the Go and frontend toolchain.
- Require Context7 before coding against third-party libraries, frameworks, SDKs, APIs, or CLI tools; fall back to official documentation only when Context7 is unavailable or has no relevant entry.

## Risks / blockers

- LibreOffice Impress opens and renders the output correctly, but Microsoft PowerPoint-specific compatibility still requires later validation on a separate environment.
- The current vertical slice converts direct text nodes and slide backgrounds; images, tables, SVG, shapes, and inline run styling are not implemented yet.
- Browser measurements can be accurate but still undesirable across slides; header/font role normalization may be needed after visual comparison.
- Font fallback and unsupported Japanese glyph detection are not implemented yet.
- The initial design document is currently untracked and must not be added or modified without user intent.

## Verification

- Prerelease candidate `dist/HTMLtoPPTX-v0.1.0-alpha.1-windows-amd64.exe`: 6,583,296 bytes; SHA-256 `FEEF9342F42E83BF1A3E4BD93EB32AE0B026510B3817C3AD1A3D5AD0AA9CF388`.
- Private repository: `https://github.com/divine261402-pixel/HTMLtoPPTX`; GitHub UI showed the repository as Private before publication.
- Published prerelease: `https://github.com/divine261402-pixel/HTMLtoPPTX/releases/tag/v0.1.0-alpha.1`; GitHub showed the `Pre-release` label, tag `v0.1.0-alpha.1`, commit `f651b3a`, and attached `HTMLtoPPTX-v0.1.0-alpha.1-windows-amd64.exe` (6.28 MB).
- Prerelease candidate rebuild: `go test ./...`, `go vet ./...`, `npm test`, and JavaScript syntax checks passed.
- `go test ./...`: passed with the Go build cache redirected inside the workspace.
- `go vet ./...`: passed.
- `go build -o .tmp/Html2Pptx.exe .`: passed; the embedded Windows executable was 9,192,448 bytes.
- `npm test`: 4 JavaScript core tests passed; `node --check` passed for all project JavaScript files.
- Browser integration: uploaded `testdata/multi-slide.html`, downloaded `multi-slide.pptx`, and observed local progress completion at `3 / 3 枚` with no current-page console errors.
- Slow-worker browser check: the converter-card progress reached `2 / 3 枚` while the file input remained enabled, body pointer events remained `auto`, progress positioning remained `static`, and cancellation succeeded.
- Generated OOXML contains exactly `ppt/slides/slide1.xml` through `slide3.xml`, with the expected Japanese text in document order.
- LibreOffice Impress headless rendering produced all three slide PNGs with correct order, Japanese text, and positions; visual inspection found no clipping or unexpected wrapping.
- The presentation overflow checker passed with `No overflow detected`; OOXML inspection confirms editable `<p:sp>` text shapes rather than flattened slide images.
- PptxGenJS 4.0.1 browser bundle and `write({ outputType: "arraybuffer" })` usage were checked through Context7 (`/gitbrent/pptxgenjs`).
- The Qiita article on editable HTML-to-PPTX conversion was reviewed; browser measurement, whitespace normalization, PowerPoint-native validation, inline-run handling, z-order, and font/glyph lessons were incorporated into decisions and next actions.
- `uv tool run pre-commit run --all-files`: passed, including the Code Review Graph update hook.
- `graphify update .`: rebuilt the code graph to 179 nodes, 394 edges, and 13 communities (community labels need a future refresh).
- Latest completed setup commit before this task: `725fb75` (`Context7の必須利用ルールを追加`).
- `pre-commit run --all-files`: passed, including the Windows-compatible Code Review Graph hook.
- Graphify minimal query result: `.slide要素による複数スライド構造`.
- Context7 MCP invocation verified by resolving `/gitbrent/pptxgenjs` and querying browser-side wide-layout PPTX generation, editable text boxes, local bundling, and file download; mandatory firing conditions are recorded in `AGENTS.md`.

## Working tree notes

- `docs/` and `test-data/` are user-owned untracked directories as of 2026-09-03. Preserve them unless the user explicitly requests otherwise.

## Handoff checklist

Before clearing or moving to a new thread:

- Update the date and all sections whose meaning changed.
- Ensure completed work has verification evidence.
- Record unexplained failures and blockers.
- Record the exact next action.
- Check `git status --short` and distinguish task changes from user-owned changes.
- Commit task-owned changes when appropriate.
