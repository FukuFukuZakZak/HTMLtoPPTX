# Landscape size confirmation — 2026-09-08

## Outcome and decisions

The user confirmed existing generation quality and requested explicit choice when 16:9 and A4 landscape are mixed. Detection uses the existing canonical page-layout classification within each HTML, after any enabled script snapshot and page extraction.

- Recommend making source HTML page sizes consistent and allow cancellation to edit the source.
- Checkbox 「横向きページを16:9に統一する」 is unchecked for every HTML and every retry. The choice is not persisted.
- Continue unchecked: preserve existing size-separated PPTX output.
- Continue checked: put landscape pages into one widescreen deck in their source order. A4 landscape content is proportionally reduced, centered and surrounded by white side margins. Text, shapes, lines, radii, freeform points, rich text metrics and PNG images retain proportional geometry and remain editable where originally editable.
- A4 portrait always remains separate. Separate input HTML files remain separate presentations; consent for one file never applies to the next.
- Cancel or Escape stops the whole batch, retains editor/file input, and restores focus. Worker generation only begins after all required choices have been made.
- No mixed landscape sizes means no prompt. Existing wide and portrait slide XML is unchanged apart from an expected slide-name index when page order changes.

Implementation: `web/app.js` owns the modal/abort lifecycle; `converter-core.js` owns detection, explicit grouping and proportional transforms; `converter-worker.js` applies transforms to normalized editable objects. The existing extractor is unchanged. UI help and manual chapter 9 describe all choices.

## Verification

- `npm test`: 50 passed, including four new tests for detection, strict consent, geometry and real Worker PPTX output (suite ~0.37 seconds).
- `go test ./...`: passed (root package 2.744 seconds); `go vet ./...`: passed. Local cache set to `C:\GoDev\HTMLtoPPTX\.tmp\go-cache` because the default cache was read-only in this environment.
- `node --check web/app.js` and `node --check scripts/landscape-size-acceptance.cjs`: passed.
- `npm run build:manual`: regenerated standalone and embedded manuals.
- Build: `go build -trimpath -ldflags '-H=windowsgui' -o dist/landscape-size-20260908/HTMLtoPPTX.exe .` (with local GOCACHE). The PowerShell wrapper was blocked by execution policy; its equivalent Go build was used without changing policy.
- `NODE_PATH=<bundled packages> node scripts/landscape-size-acceptance.cjs <built EXE URL>`: eight ZIP downloads, eight native-dialog layouts (standard/8bit × light/dark × desktop/mobile), default-off and retry behavior, cancellation/Escape, inert background controls, file-by-file consent, script-generated pages, split/merged naming, ZIP CRCs, page order, actual PPTX size, unchanged wide/portrait XML and proportional text/shape/image coordinates. No page errors or external HTTP requests. Evidence: `.tmp/landscape-size-acceptance/verification.json`, screenshots and saved ZIP/PPTX files.
- Native Edge Tab navigation briefly reports BODY when browser chrome receives focus between dialog cycles. The acceptance test permits this native behavior and separately verifies background editor focus is blocked; no custom focus trap is added.
- `UI_OUTPUT_DIR=.tmp/landscape-size-ui node scripts/ui-acceptance.cjs <URL>`: 58 layouts, four downloads, theme/preview/editor/cancel/script regressions passed; minimum checked contrast 5, zero page errors.
- `node scripts/howtouse-acceptance.cjs <URL>`: 44 manual layouts, navigation/keyboard/FAQ/sample download, source-input preservation, actual two-slide conversion and CSP checks passed; zero errors/external requests.
- LibreOffice headless rendered the actual split A4-landscape deck and merged wide deck. Their corresponding A4 landscape pages were visually inspected: content retains its proportions, text wrapping, shapes, image and page background; merged output has white side margins. Evidence in `.tmp/landscape-size-render/`. Native Microsoft PowerPoint is not available for this check.
- Context7: `/mdn/content` native `dialog.showModal`, form method dialog, close/returnValue/cancel/Escape, checkbox/autofocus; `/gitbrent/pptxgenjs` defineLayout and editable geometry/fontSize/lineSpacing/charSpacing (repository version 4.0.1); `/microsoft/playwright` Edge channel, downloads/saveAs and checkbox actions. Modern Web Guidance CLI search failed on npm cache/network EACCES and offline cache miss; official MDN through Context7 was the fallback.
- `graphify update .` completed AST-only; generated code graph was refreshed. Seven JSON evidence files yielded no AST nodes, and community labels were automatically adjusted. No LLM labeling or semantic extraction was requested.

## Existing issue found during verification

A minimal inline SVG image produces `Image is not defined` in the browser Worker. Reproduced both with the previous `HEAD:web/converter-worker.js` (Playwright route interception) and with the current Worker on a single ordinary wide slide, so it does not depend on mixed sizes or the new transform. Evidence: `.tmp/landscape-size-acceptance/svg-baseline.json`; reproduction driver `.tmp/landscape-svg-baseline.cjs`. This separate SVG compatibility issue was not changed. Landscape image-fidelity checks use an embedded PNG and pass. Initial assertions for browser focus and generated slide numbering were corrected to match verified native behavior; no unresolved failure remains in the requested feature tests.

## Local artifact and handoff

- Executable: `dist/landscape-size-20260908/HTMLtoPPTX.exe`
- Size: 13,075,968 bytes.
- SHA-256: `9E2685A012237F4C4B36CBB0C9EAF9FA69B8A6CEC207F4A903ADB93349454C59`.
- This is the same executable exercised by the Edge acceptance suites. No product code changed after its build.
- User review: use representative mixed HTML and try unchecked continue, checked continue, and cancel; inspect output in native PowerPoint on the target machine.
- The user subsequently authorized commit, push and replacement of the existing beta. Publication is in progress; unrelated local files remain excluded.

## Beta replacement preparation

The replacement retains release `v0.1.0-beta.1`. Distribution: `HTMLtoPPTX-beta-20260908-windows-x64.zip`, 9,770,953 bytes, SHA-256 `A378C5846779A12329C55D9E8DC995F8E501D7D7DB73141850A61549702AE804`. The included EXE is byte-identical to the previously tested build above. ZIP CRC, all 28 files and the SHA256 manifest were checked. Updated README describes consent behavior and the baseline SVG limitation; earlier startup recordings/evidence are explicitly dated. No product rebuild was necessary.

Context7 `/websites/cli_github_manual` consulted for editing an existing prerelease, notes-file, asset upload/download and deletion after replacement verification. Remote publication outcome will be recorded after download/hash and tag verification.
