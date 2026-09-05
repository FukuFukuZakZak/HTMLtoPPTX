# Project status

Last updated: 2026-09-05
Status owner: Codex and repository maintainers

This file is the short, current handoff view. Longer-lived details are split by purpose:

- [Completed work and release history](project-status/HISTORY.md)
- [Architecture and product decisions](project-status/DECISIONS.md)
- [Verification evidence](project-status/VERIFICATION.md)

## Objective

Build the HTML-to-PPTX converter described in `docs/HTML_to_PPTX_converter_spec_initial.md` as a Codex-maintainable Windows project.

## Current milestone

Step 2 PoC: multi-HTML batch conversion with responsive progress feedback and ZIP delivery.

## Current state

- GitHub Issues #1-#7 are closed.
- A mixed A4 HTML is classified page by page and split into `元名-A4縦.pptx` and `元名-A4横.pptx` inside the ZIP while preserving page order within each orientation. The converter screen explains that the files must then be combined manually in PowerPoint.
- Multiple `.html`/`.htm` files can be selected. Each source becomes an independent PPTX, case-insensitive duplicate names receive ` (2)`, ` (3)`, and so on, and every conversion is delivered as one ZIP.
- Hidden `.slide` elements are measured in isolation and restored. Text extraction preserves authored and rendered line boundaries, inline styles, CSS whitespace, and computed line height as editable PowerPoint text.
- Embedded scripts remain disabled by default. A trusted-HTML option can execute inline scripts in a network-blocked, opaque-origin sandbox and snapshot the resulting DOM before conversion.
- PPTX construction and ZIP packaging run in a Web Worker while DOM measurement remains on the browser main thread with yielding between slides.
- Each HTML can now produce widescreen, A4 landscape, or A4 portrait output. `.slide` remains the primary page marker; when it is absent, inline `@page size` and rendered A4-proportioned page elements are detected.
- Repository-scoped Codex context optimization is complete: Graphify uses a short router, unrelated or duplicate plugins are disabled, Serena has an absolute startup path, and tool-output/compaction limits are configured.

## Current release

- Product commit: `7e3fcbfb37ef45ac8b8fa8566e918357b076175e`
- Release: `v0.1.0-alpha.1` — `HTMLtoPPTX v0.1.0-alpha.1（複数HTML・ZIP一括出力 実機検証版）`
- Asset: `HTMLtoPPTX-v0.1.0-alpha.1-windows-amd64.exe`
- Size: 9,359,872 bytes
- SHA-256: `38FE040F2BB9E7452FA870B42B0A20C9316B790F1565598AF73D6EC0F93027FF`
- The annotated tag and GitHub prerelease both target the clean product commit above. The release contains exactly one Windows asset.

## Next actions

1. Validate the closed Issue #5 against its attached PDF/PPTX pair in Microsoft PowerPoint, focusing on table-cell line order, explicit breaks, boundary containment, and logical edit units.
2. Open representative mixed A4 output in Microsoft PowerPoint and confirm both page setups, editable-object placement, and the documented manual-combination workflow.
3. Implement Issue #5 stage 3: surface material `fit: shrink` risk, detect/report font fallback where practical, and calibrate remaining PowerPoint-specific line-height differences.
4. If Issue #6 needs further follow-up, obtain an exact slide/object example and compare the PowerPoint selection UI with OOXML while preserving independent objects.
5. Resume image conversion while preserving the current Worker progress protocol and explicit shape-before-text z-order.
6. In a fresh Codex task, confirm the project plugin/MCP profile is reloaded and compare the initial prompt/tool-schema token count with the previous approximately 40,000-token baseline.

## Active risks / blockers

- Microsoft PowerPoint-specific compatibility still requires validation on a separate environment; LibreOffice and OOXML checks have passed.
- PowerPoint uses one page size per presentation. The converter splits mixed A4 portrait and landscape pages into separate PPTX files; the user must combine their slides manually in PowerPoint when one deliverable is required.
- Gradients, box shadows, pseudo-elements, images, semantic PowerPoint tables, and SVG content are not implemented.
- Pixel-identical browser-to-PowerPoint text layout cannot be guaranteed while keeping text editable. Issue #5 still needs PowerPoint validation.
- Font fallback and unsupported Japanese glyph detection are not implemented.
- Trusted scripts can run indefinitely or mutate the DOM after the snapshot point. Use the option only for known HTML; external scripts and network-loaded assets stay blocked.
- Issue #6 has no exact failing object example. Current OOXML contains no nested PowerPoint group shapes.
- `npm audit` reports two high-severity denial-of-service advisories in PptxGenJS's transitive `image-size` dependency. The current feature set does not parse images; reassess before implementing image conversion.
- The initial design document and other user-owned untracked inputs must not be added or modified without explicit user intent.

## Latest verification

- Mixed-orientation grouping, output naming, exact A4 OOXML dimensions, and the screen notice are covered by automated tests. `npm test` passes 18 tests, and JavaScript syntax checks plus `go test ./...` pass. Headless Edge also converted the tracked mixed-A4 fixture into portrait and landscape PPTX files with the expected slide counts and sizes.
- Clean-clone batch build at `7e3fcbf`: `npm test` passed 14 tests; JavaScript syntax checks, `go test ./...`, `go vet ./...`, and the Windows build passed.
- Browser acceptance converted `testdata/multi-slide.html` and `testdata/hidden-slides.html` together, exposed `html-to-pptx-2-files.zip`, reported `2 / 2 ファイル`, and logged no browser errors or warnings.
- Tests open the outer ZIP and each nested PPTX. Embedded `/`, `/converter-worker.js`, `/vendor/jszip.min.js`, and `/script-runner.html` returned HTTP 200.
- A fresh GitHub download matched the clean local release candidate by size and SHA-256; embedded VCS metadata reports `vcs.modified=false`.
- The status split passed `git diff --check` and `uv tool run pre-commit run --all-files`; every relative Markdown link resolves to an existing file, and no product code changed.
- Full historical commands, artifacts, hashes, browser checks, and Context7 consultations are in [Verification evidence](project-status/VERIFICATION.md).

## Working tree notes

- `docs/` and `test-data/` are user-owned untracked directories as of 2026-09-03. Preserve them unless the user explicitly requests otherwise.
- `deliverables/HTMLtoPPTX_Issue3-6_改修方針書.docx` is the decision memo used for Issues #3-#6 and was not edited during implementation.
- Batch conversion is committed and pushed as `7e3fcbf`; the product release points to it. Status-document commits do not change the release artifact.

## Handoff checklist

- Update this file when the current milestone, next action, active risk, current release, or working-tree ownership changes.
- Put completed milestones in `project-status/HISTORY.md`, durable design choices in `project-status/DECISIONS.md`, and detailed test/release evidence in `project-status/VERIFICATION.md`.
- Record the exact next action and any unexplained failure before clearing or moving threads.
- Check `git status --short`, distinguish task changes from user-owned changes, and commit task-owned changes when appropriate.
