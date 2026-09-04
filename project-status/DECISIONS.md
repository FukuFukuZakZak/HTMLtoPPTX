# Architecture and product decisions

Last updated: 2026-09-05

These are durable choices. Active work and exceptions belong in [`../PROJECT_STATUS.md`](../PROJECT_STATUS.md).

## Conversion architecture

- Keep DOM measurement on the browser main thread and yield between slides; perform PPTX construction and ZIP compression in a Web Worker.
- Treat measured browser bounding boxes and computed styles as the starting point. Add semantic normalization only for verified cross-renderer differences.
- Preserve solid CSS fills and borders as native PowerPoint shapes and add them before text so content remains editable and readable.
- Convert computed CSS colors to sRGB in the browser instead of parsing every current CSS color syntax in the Worker.
- Keep generated PowerPoint objects ungrouped. Favor one editable text object per logical DOM element; table cells own their descendant text so each cell remains independently editable.
- Use PptxGenJS `softBreakBefore` for authored and rendered soft line boundaries because version 4.0.1 serializes it as `<a:br/>`; `breakLine` creates a separate `<a:p>` paragraph.

## Input and fidelity contract

- Treat one HTML `.slide` element as one PowerPoint slide in document order.
- Keep `.slide` mandatory and deterministic. Do not discover classless slides or paginate arbitrary HTML automatically.
- Define supported input as static 16:9 slide markup. A sidebar is supported when present in each slide's static DOM; runtime-only generation is outside the default security model.
- Treat editable text fidelity as a human-effort optimization: preserve explicit structure and measured line boundaries, prevent text from crossing its intended box, and reserve exceptional font/layout differences for manual PowerPoint refinement.
- Validate final files in Microsoft PowerPoint, not only through OOXML inspection or LibreOffice.

## Security and download behavior

- Keep uploaded HTML scripts disabled by default. Slide-visibility normalization must not add `allow-scripts` to the same-origin measurement sandbox.
- Permit inline script execution only through an explicit trusted-HTML option. Use a separate CSP-sandboxed document without `allow-same-origin`; block network, forms, workers, and child frames; validate both message boundaries; snapshot the generated DOM; and keep the measurement iframe script-disabled.
- Require an explicit save click after conversion so each result has a fresh browser-authorized download gesture. Keep the Blob URL valid until selection, reconversion, or page exit.
- Bind every asynchronous callback to its originating conversion job so stale Worker callbacks cannot finish a newer conversion.
- Package every conversion as a ZIP. Keep one PPTX per HTML and suffix duplicate case-insensitive basenames with ` (2)`, ` (3)`, and so on.

## User experience

- Keep progress inside the converter card. Do not use a page-level overlay or disable unrelated controls.
- Use the native `<progress>` element with explicit counts and an ARIA live status message.

## Repository workflow

- Use [`../PROJECT_STATUS.md`](../PROJECT_STATUS.md) as the short source of truth for current cross-thread progress; use this directory for detailed history, decisions, and evidence.
- Use Git commits and test output as completion evidence.
- Keep generated Graphify and code-review databases local and ignored by Git.
- Keep pre-commit checks language-neutral until implementation code establishes the Go and frontend toolchain.
- Require Context7 before coding against third-party libraries, frameworks, SDKs, APIs, or CLI tools; use official documentation only when Context7 is unavailable or has no relevant entry.
- Route routine code work to Better Code Review Graph or Serena. Use Graphify for explicit graph requests, broad architecture, or code-to-document relationships.
- Keep plugins task-specific: presentations, PDF, frontend design, GitHub, the built-in browser, and unified computer use remain available; unrelated or duplicate plugin families stay disabled until needed.
- Cap stored tool output at 6,000 tokens by default, use tighter 3,000-5,000-token caps for graph operations, and narrow queries before increasing budgets.
