# Project status

Last updated: 2026-09-04
Status owner: Codex and repository maintainers

## Objective

Build the HTML-to-PPTX converter described in `docs/HTML_to_PPTX_converter_spec_initial.md` as a Codex-maintainable Windows project.

## Current milestone

Step 2 PoC: multi-slide HTML conversion with responsive progress feedback.

## Current work

GitHub Issues #1-#6 are closed. Issues #3 and #4 are committed and pushed: the UI states the static 16:9 `.slide` contract, the no-slide error includes a minimal correction example, and hidden slides are isolated, temporarily displayed, measured, and restored one at a time. Issue #5 stages 1 and 2 are also committed and pushed: text extraction preserves explicit/block/rendered line boundaries, inline styles, CSS whitespace, and computed line height through PptxGenJS rich text runs and soft line breaks. The annotated prerelease tag targets product commit `69569fa`, and GitHub prerelease `v0.1.0-alpha.1` contains the verified Issue #3-#5 field-validation EXE and updated checksum. Issue #6 was closed at the user's direction while the sample-dependent PowerPoint selection-UI validation remains recorded as follow-up work; an OOXML regression test asserts that rich editable text does not introduce nested PowerPoint group objects. Issue #7 (`サイドバーの再現性について`) is implemented locally: the UI now offers an explicit trusted-HTML option that executes embedded scripts in an opaque-origin, network-blocked sandbox, freezes the resulting DOM, and then uses the existing script-disabled conversion path.

Repository-scoped Codex context optimization is complete. Graphify now loads a 65-line router for normal use and keeps the complete 705-line build runbook behind an operation-specific reference. The project profile disables duplicate/unrelated plugins and the legacy Code Review Graph MCP, fixes Serena startup to an absolute executable path, limits stored tool output, and enables early context compaction.

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
- Replaced prerelease `v0.1.0-alpha.1` with the Issue #1/#2 fix build, moved the tag to `c7eed34`, and updated the release notes and checksum for field-machine validation.
- Fixed Issue #1 by extracting visible solid element backgrounds and CSS borders as editable PowerPoint rectangles, rounded rectangles, and lines beneath text.
- Normalized browser CSS colors, including `oklch(...)`, through an sRGB canvas before passing colors and alpha transparency to PptxGenJS.
- Fixed Issue #2 by keeping a persistent user-clicked PPTX save link, revoking only superseded Blob URLs, and ignoring stale Worker callbacks through per-job identity checks.
- Added OOXML integration coverage for editable fill and dashed-border colors, plus shape-option and alpha-transparency tests.
- Documented the supported input contract in the browser UI: one or more `.slide` elements, fixed 16:9 dimensions, static DOM content, and disabled uploaded scripts.
- Added an actionable `.slide`-missing error with a minimal 1280 x 720 HTML example.
- Added per-slide measurement isolation that preserves and restores each slide's exact `class`, inline `style`, and `hidden` attributes.
- Added a 12-slide `display:none` browser fixture and verified every slide converts without zero-size failures.
- Replaced direct-text whitespace flattening with logical element/table-cell extraction using `Range.getClientRects()`, explicit `<br>` and block boundaries, CSS `white-space`, inline rich-text styling, and computed `line-height`.
- Added PptxGenJS `softBreakBefore` output so browser line boundaries serialize as editable `<a:br/>` elements instead of separate shapes.
- Added OOXML tests for explicit soft line breaks, exact point line spacing, and the absence of nested `<p:grpSp>` objects.
- Split the Graphify skill into a 4,364-byte router and an on-demand full pipeline runbook without removing build, query, update, export, or honesty guidance.
- Added a repository-local Codex profile that disables 14 unrelated or duplicate plugins, keeps the six capabilities relevant to HTML/PPTX development, and removes the duplicate legacy Code Review Graph MCP surface.
- Added global and per-graph-tool output limits plus a 120,000-token automatic compaction threshold for this repository.
- Committed and pushed the repository context optimization as `74c5dfd` and the Issue #3-#5 implementation as `69569fa`.
- Force-updated annotated tag `v0.1.0-alpha.1` from product commit `c7eed34` to `69569fa` for the next field-machine validation build.
- Replaced GitHub prerelease `v0.1.0-alpha.1` with the verified Issue #3-#5 Windows executable and updated the public title, notes, validation checklist, commit, and checksum.
- Implemented Issue #7 trusted embedded-script execution without weakening the default path: scripts remain off by default, the isolated runner has an opaque origin plus a deny-by-default CSP, cross-window messages validate origin/source/token, and only the resulting static DOM proceeds to slide extraction.

## Next actions

1. Commit and push the verified Issue #7 implementation, then close the GitHub issue with the trusted-HTML usage note.
2. Validate the closed Issue #5 against its attached PDF/PPTX pair in Microsoft PowerPoint, focusing on table-cell line order, explicit breaks, boundary containment, and logical edit units.
3. Implement Issue #5 stage 3: surface material `fit: shrink` risk, detect/report font fallback where practical, and calibrate remaining PowerPoint-specific line-height differences.
4. If Issue #6 needs further follow-up, obtain an exact slide/object example and compare the PowerPoint selection UI with OOXML while preserving independent objects.
5. Resume image conversion while preserving the current Worker progress protocol and explicit shape-before-text z-order.
6. In the next fresh Codex task, confirm the project plugin/MCP profile is reloaded and compare the initial prompt/tool-schema token count with the previous approximately 40,000-token baseline.

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
- Preserve solid CSS fills and borders as native PowerPoint shapes and add them before text so content remains editable and readable.
- Convert computed CSS colors to sRGB in the browser rather than trying to parse every current CSS color syntax in the Worker.
- Require an explicit save click after conversion so each conversion has a fresh browser-authorized download gesture; keep the generated Blob URL valid until selection, reconversion, or page exit.
- Bind every asynchronous conversion callback to its originating job so callbacks from a cancelled or superseded Worker cannot finish a newer conversion.
- Keep uploaded HTML scripts disabled by default. Slide-visibility normalization must be performed by the converter and must not add `allow-scripts` to the same-origin sandbox.
- Permit embedded-script execution only through an explicit trusted-HTML option. Run it in a separate CSP-sandboxed document without `allow-same-origin`, block network/forms/workers/child frames, validate the origin/source/token on both message boundaries, snapshot the generated DOM, and keep the measurement/conversion iframe script-disabled.
- Keep `.slide` as a mandatory deterministic input contract. Do not add classless slide discovery or automatic pagination of arbitrary HTML.
- Define supported HTML as static 16:9 slide markup. A sidebar inside each slide is supported when it is present in the static DOM; runtime-only content generation is outside the default security model.
- Treat text fidelity as a human-effort optimization problem: preserve explicit structure and measured line boundaries, prevent text from crossing its intended box, and leave only exceptional font/layout refinements for manual PowerPoint editing.
- Keep generated PowerPoint objects ungrouped. Favor one editable text object per logical DOM element with measured line breaks/runs over a native PowerPoint table when independent object manipulation is required.
- Use PptxGenJS `softBreakBefore` for browser-rendered and authored soft line boundaries because version 4.0.1 serializes it as `<a:br/>`; `breakLine` creates a separate `<a:p>` paragraph instead.
- Measure text at the logical DOM element level, except table cells, which own their descendant text so each cell remains one independently editable PowerPoint text box.
- Route routine code work to Better Code Review Graph or Serena; invoke Graphify automatically only for explicit graph requests, broad architecture, or code-to-document relationships.
- Keep project plugins task-specific: presentations, PDF, frontend design, GitHub, the built-in browser, and unified computer use remain available; unrelated document/app plugins and duplicate browser/GitHub stacks stay disabled unless a task needs them.
- Cap stored tool output at 6,000 tokens by default, use tighter 3,000-5,000-token caps for graph operations, and narrow a query before increasing its budget.

## Risks / blockers

- LibreOffice Impress opens and renders the output correctly, but Microsoft PowerPoint-specific compatibility still requires later validation on a separate environment.
- The current vertical slice converts logical text runs, slide backgrounds, solid element fills, and CSS borders; gradients, box shadows, pseudo-elements, images, semantic PowerPoint tables, and SVG content are not implemented yet.
- Border radii are represented as PowerPoint rounded rectangles, so exact per-corner CSS radius values are approximated.
- Browser measurements can be accurate but still undesirable across slides; header/font role normalization may be needed after visual comparison.
- Font fallback and unsupported Japanese glyph detection are not implemented yet.
- The initial design document is currently untracked and must not be added or modified without user intent.
- Trusted embedded scripts can still run indefinitely or mutate the DOM after the snapshot point; use this option only for known HTML, and author required slide content synchronously or by `DOMContentLoaded`. External scripts and network-loaded assets are intentionally blocked in trusted mode.
- Pixel-identical browser-to-PowerPoint text layout cannot be guaranteed while keeping text editable because the browser and PowerPoint use different text engines. Measured line boundaries and explicit rich-text breaks materially improve fidelity but still need validation against the Issue #5 attachment in Microsoft PowerPoint.
- Character-level `Range.getClientRects()` measurement favors Japanese line fidelity over extraction speed; very text-heavy decks may need a later performance optimization that preserves the same line-boundary result.
- Issue #6 has no attachment or exact PowerPoint object example. Current code does not call a grouping API, and the inspected Issue #5 PPTX has zero nested PowerPoint group shapes, so the reported grouping is not yet reproducible.

## Verification

- Replacement candidate `dist/HTMLtoPPTX-v0.1.0-alpha.1-windows-amd64.exe`: 6,592,000 bytes; SHA-256 `8FF7593FD1B7A218B857D0895F897EC30C8EB8205E73D6C2C9268008357D3A59`; PE subsystem matches the original console executable (`3`).
- Replacement verification on 2026-09-04: `go test ./...`, `go vet ./...`, `npm test`, JavaScript syntax checks, and `uv tool run pre-commit run --all-files` passed.
- GitHub `main` and annotated tag `v0.1.0-alpha.1` were pushed to fix commit `c7eed34`.
- Replaced prerelease: `https://github.com/divine261402-pixel/HTMLtoPPTX/releases/tag/v0.1.0-alpha.1`; GitHub showed the `Pre-release` label, commit `c7eed34`, replacement asset size 6.29 MB, and asset digest `sha256:8ff7593fd1b7a218b857d0895f897ec30c8eb8205e73d6c2c9268008357d3a59`.
- GitHub CLI release upload/edit behavior, including the delete-first risk of `--clobber`, was checked through Context7 (`/websites/cli_github_manual`).
- Prerelease candidate `dist/HTMLtoPPTX-v0.1.0-alpha.1-windows-amd64.exe`: 6,583,296 bytes; SHA-256 `FEEF9342F42E83BF1A3E4BD93EB32AE0B026510B3817C3AD1A3D5AD0AA9CF388`.
- Private repository: `https://github.com/divine261402-pixel/HTMLtoPPTX`; GitHub UI showed the repository as Private before publication.
- Initial prerelease publication: `https://github.com/divine261402-pixel/HTMLtoPPTX/releases/tag/v0.1.0-alpha.1`; before replacement, GitHub showed the `Pre-release` label, tag `v0.1.0-alpha.1`, commit `f651b3a`, and the original 6.28 MB Windows asset.
- Prerelease candidate rebuild: `go test ./...`, `go vet ./...`, `npm test`, and JavaScript syntax checks passed.
- `go test ./...`: passed with the Go build cache redirected inside the workspace.
- `go vet ./...`: passed.
- `go build -o .tmp/Html2Pptx.exe .`: passed; the embedded Windows executable was 9,192,448 bytes.
- `npm test`: 7 JavaScript core and OOXML integration tests passed; `node --check` passed for all project JavaScript files.
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
- GitHub Issues #1 (`変換前後で色や枠等が表示されない`) and #2 (`複数回の変換ができない`) were inspected through the authenticated GitHub UI on 2026-09-04.
- The Issue #1 field HTML in user-owned `test-data/2026スマホ教室.html` was inspected and confirmed to use `oklch(...)`, colored fills, rounded cards, and CSS borders; the file was not modified.
- Browser regression: converted `testdata/multi-slide.html` (3 slides), selected a different HTML, and converted again (1 slide); the second save link used `second-slide.pptx` and the current page had zero console errors or warnings.
- The tracked browser fixture now exercises an editable teal fill and orange border; OOXML assertions verify `2F7C80`, `CF552F`, and dashed-line markup in a generated PPTX package.
- Final issue-fix verification: `go test ./...`, `go vet ./...`, `go build`, `npm test`, JavaScript syntax checks, `git diff --check`, and `uv tool run pre-commit run --all-files` passed.
- PptxGenJS 4.0.1 shape, fill, line, dash, transparency, and text options were checked through Context7 (`/gitbrent/pptxgenjs`) before implementation.
- The mandatory modern-web-guidance lookup was attempted; its online command stalled and the offline package cache was unavailable, so no guidance result was used.
- `graphify update .`: rebuilt the post-fix graph to 185 nodes, 412 edges, and 13 communities; `extractElementShapes`, `createColorReader`, `shapeOptions`, `preparePptxDownload`, and `clearDownload` are present in the updated graph.
- GitHub Issues #3 (`.slide` absence), #4 (zero-sized hidden slides), #5 (low line-break/layout fidelity), and #6 (reported grouping) were inspected through authenticated GitHub access on 2026-09-04; no Issue fields were changed.
- GitHub CLI was re-authenticated as `divine261402-pixel` on 2026-09-04. Issues #3-#6 were closed as completed at the user's direction; Issues #1 and #2 were already closed, and Issue #7 remains open.
- Issue #7 (`サイドバーの再現性について`) reports that the converted PPTX omits the sidebar and includes a reference PDF, source HTML, and converted PPTX; it had no labels, assignees, or comments when inspected.
- Issue #7 root cause: slides 2-12 contain an empty `<ul class="agenda">`; a bottom-of-document script injects all agenda `<li>` items at runtime. The supplied converted PDF reproduces the dark sidebar shell but omits those items, confirming a blocked runtime-content gap rather than a shape-extraction failure.
- Issue #7 verification on 2026-09-04: `node --check web/app.js`, `go test ./...`, and `npm test` passed (11 JavaScript tests). Browser acceptance with the attached 12-slide source HTML and the trusted-script checkbox enabled completed at `12 / 12 枚` and exposed the PPTX save link.
- The Issue #7 runner endpoint test asserts `sandbox allow-scripts`, `default-src 'none'`, inline-script-only execution, blocked connections, and blocked forms. Better Code Review Graph's heuristic security scan reported zero findings.
- The mandatory modern-web-guidance security lookup was used for the Issue #7 design; the implementation follows its postMessage origin/source/payload validation guidance while using a one-time token and an opaque-origin sandbox. The initial search required a network-enabled retry, and the installed guide version reported itself as stale.
- Graphify was updated through the interpreter recorded in `graphify-out/.graphify_python` because the command alias was not on PATH; the code graph rebuilt to 214 nodes, 450 edges, and 15 communities.
- Issue #4 attachment: 12 `.slide` sections are declared at 1280x720, but `.slide { display:none }` and only `.slide.active { display:flex }`. The converter selects all 12 and throws on the second hidden slide because `getBoundingClientRect()` returns zero size. The attachment also generates agenda entries with a script that the converter sandbox intentionally blocks.
- Issue #5 visual comparison: the one-page source PDF preserves multi-line table cells, while the generated PPTX flattens several cell lines and shifts/wraps text differently. The PPTX slide contains 98 `<p:sp>` objects, 40 text runs/paragraphs, zero explicit `<a:br>` breaks, and zero nested `<p:grpSp>` group objects; the overflow checker nevertheless passes because the problem is fidelity inside measured boxes rather than slide-canvas overflow.
- Source inspection confirms the direct-text path joins text nodes with spaces and applies `/\s+/g`, discarding explicit whitespace/line-break intent, while `textOptions()` does not carry CSS line height or rendered browser line boundaries. PptxGenJS 4.x rich text runs, `breakLine`, `lineSpacing`, `lineSpacingMultiple`, and `fit: "shrink"` were checked through Context7 (`/gitbrent/pptxgenjs`).
- Better Code Review Graph prospective impact analysis scoped Issues #3-#6 mainly to `web/app.js`, `web/converter-core.js`, `web/converter-worker.js`, and JavaScript tests; the bundled PptxGenJS file is the only additional affected file reported within the queried radius.
- Created `deliverables/HTMLtoPPTX_Issue3-6_改修方針書.docx` as the implementation handoff for Issues #3-#6. The final DOCX rendered to 9 Letter-size pages; all pages passed visual inspection, the accessibility audit reported zero findings, and the document contains no placeholder or internal citation tokens.
- Issue #3-#6 implementation verification on 2026-09-04: `npm test` passed 11 tests; `node --check` passed for `web/app.js`, `web/converter-core.js`, and `web/converter-worker.js`; `go test ./...`, `go vet ./...`, `go build`, and `git diff --check` passed.
- Browser integration on the final build converted `testdata/hidden-slides.html` from one visible and eleven `display:none` slides to completion at `12 / 12 枚`; the save link was shown and browser error/warning logs were empty.
- Browser acceptance for `testdata/no-slide.html` displayed the minimal correction example `<section class="slide" style="width:1280px;height:720px">...</section>` instead of a generic failure.
- OOXML integration confirms PptxGenJS 4.0.1 rich text `softBreakBefore` emits `<a:br/>`, a CSS-derived 18pt line height emits `<a:spcPts val="1800"/>`, and no nested `<p:grpSp>` is generated.
- Current PptxGenJS rich text, `softBreakBefore`, `lineSpacing`, and `fit: "shrink"` behavior was checked through Context7 (`/gitbrent/pptxgenjs`); JSZip in-memory PPTX inspection was checked through Context7 (`/stuk/jszip`).
- The mandatory modern-web-guidance lookup completed after an initial sandbox/network failure. The closest guides covered hidden-content state and text layout; the implementation preserves source visibility attributes during temporary measurement and does not rewrite uploaded HTML to newer disclosure primitives.
- Codex context-profile verification on 2026-09-04: `.codex/config.toml` parsed with Python `tomllib`; it contains 14 project-level plugin disables, a 6,000-token stored-output cap, a 120,000-token compaction threshold, four allowlisted Better Code Review Graph tools, and the legacy Code Review Graph MCP disabled.
- Graphify skill validation on 2026-09-04: the skill-creator `quick_validate.py` passed; all nine router references exist; the always-loaded body decreased from 40,537 bytes / 699 lines to 4,364 bytes / 65 lines. The complete 40,450-byte / 705-line runbook, including its new contents list and corrected relative paths, remains available on demand.
- Serena path verification on 2026-09-04: `C:\Users\福家\.local\bin\serena.exe start-mcp-server --help` passed and confirmed `--project-from-cwd` plus `--context` support. A fresh Codex task is required for the desktop host to load the updated MCP/plugin profile.
- Release replacement verification on 2026-09-04: `npm test` passed 11 tests; `go test ./...`, `go vet ./...`, JavaScript syntax checks, `git diff --check`, and `uv tool run pre-commit run --all-files` passed.
- Verified replacement EXE: `.tmp/release-candidate/HTMLtoPPTX-v0.1.0-alpha.1-windows-amd64.exe`; 6,606,336 bytes; SHA-256 `6899929B140AD0A72511E6D3EEFA86C1485750AB10418E0F4B3B663AE81C560C`; PE subsystem `3`.
- GitHub `main` contains commits `74c5dfd` and `69569fa`. Remote annotated tag `v0.1.0-alpha.1` was force-updated to tag object `d82a26a`, dereferencing to product commit `69569fa`.
- Replaced GitHub prerelease: `https://github.com/divine261402-pixel/HTMLtoPPTX/releases/tag/v0.1.0-alpha.1`; the public UI shows title `HTMLtoPPTX v0.1.0-alpha.1（Issues #3〜#5 実機検証版）`, the `Pre-release` label, commit `69569fa`, one 6.3 MB Windows asset, and digest `sha256:6899929b140ad0a72511e6d3eefa86c1485750ab10418e0f4b3b663ae81c560c`.
- `graphify update .` could not be rerun because the `graphify` executable was unavailable in the fresh shell; the pre-commit Code Review Graph hook passed and the previously updated Graphify output remains in place.

## Working tree notes

- `docs/` and `test-data/` are user-owned untracked directories as of 2026-09-03. Preserve them unless the user explicitly requests otherwise.
- `deliverables/HTMLtoPPTX_Issue3-6_改修方針書.docx` is the task-owned decision memo used as the implementation source on 2026-09-04; the document itself was not edited.
- The Issue #7 implementation is locally verified but not yet committed at this checkpoint. The preserved user-owned untracked `docs/` and `test-data/` directories remain untouched.

## Handoff checklist

Before clearing or moving to a new thread:

- Update the date and all sections whose meaning changed.
- Ensure completed work has verification evidence.
- Record unexplained failures and blockers.
- Record the exact next action.
- Check `git status --short` and distinguish task changes from user-owned changes.
- Commit task-owned changes when appropriate.
