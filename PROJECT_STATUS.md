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

- Editable text fidelity is improved for differently sized HTML pages: font sizes, line spacing, and inline run sizes now follow the measured page-to-slide scale; positive and negative CSS letter spacing are preserved. Mixed inline font sizes no longer trigger a line break merely because their top edges differ. Automated extraction and OOXML checks pass; fresh browser and PowerPoint visual acceptance remain pending.
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

- Product commit: `7e3fcbfb37ef45ac8b8fa8566e918357b076175e`
- Release: `v0.1.0-alpha.1` — `HTMLtoPPTX v0.1.0-alpha.1（複数HTML・ZIP一括出力 実機検証版）`
- Asset: `HTMLtoPPTX-v0.1.0-alpha.1-windows-amd64.exe`
- Size: 9,359,872 bytes
- SHA-256: `38FE040F2BB9E7452FA870B42B0A20C9316B790F1565598AF73D6EC0F93027FF`
- The annotated tag and GitHub prerelease both target the clean product commit above. The release contains exactly one Windows asset.

## Next actions

1. After local-URL browser permission is available, re-run conversion of the user-owned generated-AI-guideline HTML and compare title letter spacing, inline emphasis, line order, and text size with the HTML. Include equivalent pages at different pixel dimensions. Confirm the script warning while the option is off, then enable it and confirm all 12 sidebar agendas are present in the PPTX.
2. Supply the missing hero illustration as a `data:` URL inside the smartphone HTML, or add an explicit associated-asset import workflow; then repeat the real conversion to confirm the intended illustration is embedded.
3. Open both latest `test-data` outputs in Microsoft PowerPoint and confirm editable-object placement, Japanese font substitution, and image compatibility outside LibreOffice rendering.
4. Validate the paste workflow with representative HTML copied directly from exaBase AI on the target LGWAN environment, including inline CSS, Japanese text, and expected restrictions on external assets.
5. Validate the closed Issue #5 against its attached PDF/PPTX pair in Microsoft PowerPoint, focusing on table-cell line order, explicit breaks, boundary containment, and logical edit units.
6. Open representative mixed A4 output in Microsoft PowerPoint and confirm both page setups, editable-object placement, and the documented manual-combination workflow.
7. Implement Issue #5 stage 3: surface material `fit: shrink` risk, detect/report font fallback where practical, and calibrate remaining PowerPoint-specific line-height differences.
8. If Issue #6 needs further follow-up, obtain an exact slide/object example and compare the PowerPoint selection UI with OOXML while preserving independent objects.
9. In a fresh Codex task, confirm the project plugin/MCP profile is reloaded and compare the initial prompt/tool-schema token count with the previous approximately 40,000-token baseline.

## Active risks / blockers

- The authorized visible-browser retest is temporarily blocked. Chrome is not connected, and the subsequent Codex in-app-browser attempt was rejected by its security prompt for the local converter URL (`http://127.0.0.1:<port>`). Browser policy forbids retrying or using an alternate automation path after that denial; a newly granted local-URL browser permission is required before resuming Next action 1.
- Microsoft PowerPoint-specific compatibility still requires validation on a separate environment; LibreOffice and OOXML checks have passed.
- PowerPoint uses one page size per presentation. The converter splits mixed A4 portrait and landscape pages into separate PPTX files; the user must combine their slides manually in PowerPoint when one deliverable is required.
- Gradients, box shadows, semantic PowerPoint tables, CSS background images, and external cross-origin images that taint the browser canvas are not implemented. Loaded `img`, `canvas`, and inline SVG elements are supported.
- `test-data/2026スマホ教室.html` references `assets/smartphone-class-irasutoya.png`, but that file is absent and the upload contains only the HTML file. The converter cannot recreate or access an unselected local asset, so the hero illustration is absent from the measured output.
- Pixel-identical browser-to-PowerPoint text layout cannot be guaranteed while keeping text editable. Issue #5 still needs PowerPoint validation.
- The new text regression uses deterministic DOM/Range measurements and real PptxGenJS output. It does not replace actual browser/font rendering acceptance. Line detection targets horizontal text; vertical writing, CSS-transformed text, and unusual overlapping/bidirectional inline layouts still require separate work. Non-proportional page scaling still cannot stretch font glyphs independently along each axis.
- Font fallback and unsupported Japanese glyph detection are not implemented.
- HTML programs can run indefinitely or mutate the DOM after the snapshot point. The option stays off by default and should be enabled only for files created by the user or from a confirmed source; external scripts and network-loaded assets stay blocked.
- Issue #6 has no exact failing object example. Current OOXML contains no nested PowerPoint group shapes.
- `npm audit` reports two high-severity denial-of-service advisories in PptxGenJS's transitive `image-size` dependency. Image embedding is now enabled, so reassess the pinned dependency and input-size limits before widening use beyond trusted local HTML.
- The initial design document and other user-owned untracked inputs must not be added or modified without explicit user intent.

## Latest verification

- Text fidelity: `npm test` passes 27 tests (six new extraction/OOXML regressions), `go test ./...`, `go vet ./...`, JavaScript syntax checks, and `go build -o .tmp/HTMLtoPPTX-text-quality.exe .` pass. The regressions cover 0.5x/1x/1.5x/2x source dimensions across wide/A4 portrait/A4 landscape, mixed inline font sizes, real wraps, repeated `<br>`, preformatted newlines, tight line-height, and positive/negative character spacing in editable PPTX text. Graphify updated to 331 nodes, 677 edges, and 17 communities.
- Context7: consulted PptxGenJS text/rich-run formatting and exact `lineSpacing` units. Context7 did not document `charSpacing` units; the pinned PptxGenJS 4.0.1 type definition and serializer were checked (points serialized as hundredths of a point). Modern Web Guidance's mixed-font/nowrap guides and MDN's `Range.getClientRects()` documentation were consulted; source HTML styles were preserved.
- All applicable pre-commit hooks pass. The first pass normalized `web/converter-core.js` line endings; the second pass was clean.
- Real browser acceptance selected both user-owned HTML files under `test-data` in one batch. The conversion completed as `2 / 2 PPTX` and 13 total slides: `2026スマホ教室.pptx` is one exact A4 portrait slide and `香南市生成AIガイドライン研修_投影スライド案_文字多め版.pptx` contains 12 widescreen slides. All 13 slides rendered successfully; the smartphone flyer and a 12-slide montage were visually inspected, and `slides_test.py` reported no overflow for either PPTX.
- The script-setting UX is covered by the embedded-page test and by an actual-fixture regression that reads `test-data/香南市生成AIガイドライン研修_投影スライド案_文字多め版.html`, detects its agenda-population script, and confirms that static HTML and JSON-LD do not trigger the warning. `npm test` passes 21 tests; `go test ./...`, `go vet ./...`, JavaScript syntax checks, and all pre-commit hooks pass. Graphify was refreshed to 314 nodes, 658 edges, and 16 communities.
- After the fidelity work, the worker integration verifies ellipse OOXML, `<p:pic>` output, packaged media, image-model preservation, and vertical text alignment. Context7 was consulted for PptxGenJS `addImage` data-URL and sizing behavior.
- Graphify was refreshed through its recorded Python environment after the shell alias was unavailable; the updated graph contains 308 nodes, 648 edges, and 16 communities.
- Existing file-upload regression passed after the paste-mode change: `multi-slide.html` produced one 3-slide landscape PPTX (`12192000 x 6858000` EMU), `2026スマホ教室.html` produced one 1-slide A4 portrait PPTX (`7560000 x 10692000` EMU), and `mixed-a4.html` split into a 2-slide portrait PPTX and a 1-slide landscape PPTX with exact A4 dimensions and correct page content. All three completed through the visible file-selection UI with no browser errors.
- Paste-mode browser acceptance entered a 1-slide Japanese HTML document, confirmed the debounced right-hand preview, converted it through the shared pipeline, and exposed `貼り付けHTML.zip`. Returning to file mode preserved the same valid save link. `npm test` passes 18 tests; `go test ./...`, `go vet ./...`, JavaScript syntax checks, `git diff --check`, and all pre-commit hooks pass; the heuristic security scan reports zero findings.
- Mixed-orientation grouping, output naming, exact A4 OOXML dimensions, and the screen notice are covered by automated tests. `npm test` passes 18 tests, and JavaScript syntax checks plus `go test ./...` pass. Headless Edge also converted the tracked mixed-A4 fixture into portrait and landscape PPTX files with the expected slide counts and sizes.
- Clean-clone batch build at `7e3fcbf`: `npm test` passed 14 tests; JavaScript syntax checks, `go test ./...`, `go vet ./...`, and the Windows build passed.
- Browser acceptance converted `testdata/multi-slide.html` and `testdata/hidden-slides.html` together, exposed `html-to-pptx-2-files.zip`, reported `2 / 2 ファイル`, and logged no browser errors or warnings.
- Tests open the outer ZIP and each nested PPTX. Embedded `/`, `/converter-worker.js`, `/vendor/jszip.min.js`, and `/script-runner.html` returned HTTP 200.
- A fresh GitHub download matched the clean local release candidate by size and SHA-256; embedded VCS metadata reports `vcs.modified=false`.
- The status split passed `git diff --check` and `uv tool run pre-commit run --all-files`; every relative Markdown link resolves to an existing file, and no product code changed.
- Full historical commands, artifacts, hashes, browser checks, and Context7 consultations are in [Verification evidence](project-status/VERIFICATION.md).

## Working tree notes

- The prior paste-mode, script-setting guidance, and conversion-fidelity changes are committed as `5800027`. The former uncommitted notes were stale; the tracked tree was clean at task start.
- This text-quality change covers `web/app.js`, `web/converter-core.js`, `web/text-extraction.test.js`, and the status/verification records. The temporary Windows build is `.tmp/HTMLtoPPTX-text-quality.exe`; it is not a published release.
- `.codex/config.toml` acquired a persisted Serena `insert_after_symbol` approval setting during this session. Preserve this local setting separately from the product commit.
- `.codex-remote-attachments/` is also untracked and preserved.
- `docs/` and `test-data/` are user-owned untracked directories as of 2026-09-03. Preserve them unless the user explicitly requests otherwise.
- `deliverables/HTMLtoPPTX_Issue3-6_改修方針書.docx` is the decision memo used for Issues #3-#6 and was not edited during implementation.
- Batch conversion is committed and pushed as `7e3fcbf`; the product release points to it. Status-document commits do not change the release artifact.

## Handoff checklist

- Update this file when the current milestone, next action, active risk, current release, or working-tree ownership changes.
- Put completed milestones in `project-status/HISTORY.md`, durable design choices in `project-status/DECISIONS.md`, and detailed test/release evidence in `project-status/VERIFICATION.md`.
- Record the exact next action and any unexplained failure before clearing or moving threads.
- Check `git status --short`, distinguish task changes from user-owned changes, and commit task-owned changes when appropriate.
