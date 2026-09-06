# Architecture and product decisions

Last updated: 2026-09-06

These are durable choices. Active work and exceptions belong in [`../PROJECT_STATUS.md`](../PROJECT_STATUS.md).

## UI workflow and themes

- Use two steps for file conversion: choose HTML, then review settings and convert/save. Keep the editor's back action on the left, conversion/save on the right, and the script option above both panes. Use the existing shared conversion and download handlers.
- Fit normal application controls within FullHD with help closed. Use flexible code/preview panes and compact progress feedback; allow document scrolling when explanations expand, and internal scrolling for long source/preview content. Narrow screens can stack the layout.
- Offer explicit light, dark and system radio choices, with system selected initially. A small same-origin script runs before CSS under the existing strict CSP. Store the choice in browser localStorage, tolerate disabled storage, and let CSS respond immediately to system theme changes. Storage is per origin; the server's random port means a new app process may use the default again.
- Keep dark text/background contrasts high and retain a visible keyboard focus indicator. Keep preview and measurement iframe color schemes light so app theme changes cannot recolor source HTML or alter converted output.
- Load preview srcdoc only while the editor workspace is visible and recreate its iframe when opening the editor. Chromium reproduced zero-sized child layout after hidden-workspace initialization and re-entry; the clone preserves all sandbox/referrer attributes. The empty-state overlay keeps the frame available without hiding its own rendering surface. The existing network restrictions and script-disabled preview remain intact.

## Conversion architecture

- Keep DOM measurement on the browser main thread and yield between slides; perform PPTX construction and ZIP compression in a Web Worker.
- Treat measured browser bounding boxes and computed styles as the starting point. Add semantic normalization only for verified cross-renderer differences.
- Preserve solid CSS fills and borders as native PowerPoint shapes and add them before text so content remains editable and readable.
- Order background shapes by their stacking contexts, z-index and document order; keep a context's descendants together so a negative-z pseudo-element cannot cover later foreground backgrounds. This is background ordering, not a complete CSS paint engine for interleaved text and images.
- Compare uniform borders in CSS pixels before page-axis conversion, avoiding false separate edges from A4 rounding. Carry the measured radius into native roundRect shapes; use clipped native freeform contours for asymmetric or partially off-page rounded decoration instead of resizing its bounding box. Approximate curved freeform edges with 24 segments per corner.
- Normalize page-level viewer transforms and zoom only during measurement, including the page root and its ancestors. Use an identity transform to preserve containing blocks and stacking contexts, leave transformations inside the page alone, and restore original attributes afterward. Output uses authored page dimensions rather than a viewport-dependent display scale.
- Use each detected presentation layout as the clipping boundary; never clip A4 portrait content against widescreen constants.
- Wait for document fonts and images before measurement. Embed loaded `img` elements as PNG snapshots that retain CSS `object-fit`/`object-position`, preserve `canvas` pixels and inline SVG data, and skip unreadable or canvas-tainting sources without failing the rest of the deck.
- Materialize visible CSS `::before` and `::after` content as measured proxy elements, then suppress the originals so pseudo-element decoration and text are extracted once.
- Treat visually clipped one-pixel accessibility helpers as hidden output. Preserve circle geometry as PowerPoint ellipses and map flex/grid centering to PowerPoint text alignment.
- Reserve a small width tolerance for browser-single-line text because PowerPoint and Chromium font metrics differ; keep the measured origin stable for left alignment and compensate the origin for centered or right-aligned text.
- Convert computed CSS colors to sRGB in the browser instead of parsing every current CSS color syntax in the Worker.
- Keep generated PowerPoint objects ungrouped. Favor one editable text object per logical DOM element; table cells own their descendant text so each cell remains independently editable.
- Preserve atomic inline boxes (inline-block/flex/grid) as separate editable objects because their width and padding position adjacent text. Split surrounding text only at those boxes and measured line boundaries; ordinary inline emphasis stays in rich-text runs. Absolutely positioned pseudo-element proxies do not determine the owning paragraph's line box.
- Use a full CSS line-height box for glyph-only Range/inline bounds and text-box-trimmed text to avoid unintended PowerPoint autofit collapse. Preserve measured glyph placement when reconstructing that box.
- Normalize only nonexistent slide-master content-type overrides emitted by pinned PptxGenJS 4.0.1. Keep actual master parts, relationships and slide/media data intact; regression-check all declared parts in generated multi-slide packages.
- Use PptxGenJS `softBreakBefore` for authored and rendered soft line boundaries because version 4.0.1 serializes it as `<a:br/>`; `breakLine` creates a separate `<a:p>` paragraph.

## Input and fidelity contract

- Treat one HTML `.slide` element as one PowerPoint slide in document order.
- Support direct HTML input with a dependency-free plain textarea rather than a full code editor. Treat pasted text as an in-memory virtual HTML file and route it through the same conversion function as uploaded files so page detection, progress, cancellation, output naming, and ZIP packaging do not diverge.
- Keep `.slide` mandatory and deterministic. Do not discover classless slides or paginate arbitrary HTML automatically.
- Define supported input as static 16:9 slide markup. A sidebar is supported when present in each slide's static DOM; runtime-only generation is outside the default security model.
- Treat editable text fidelity as a human-effort optimization: preserve explicit structure and measured line boundaries, prevent text from crossing its intended box, and reserve exceptional font/layout differences for manual PowerPoint refinement.
- Validate final files in Microsoft PowerPoint, not only through OOXML inspection or LibreOffice.

## Security and download behavior

- Keep uploaded HTML scripts disabled by default. Slide-visibility normalization must not add `allow-scripts` to the same-origin measurement sandbox.
- Keep the paste-mode preview script-disabled in an iframe without sandbox capabilities. Inject a deny-by-default preview CSP that permits only inline styles and local `data:`/`blob:` visual assets; the separate trusted-script conversion option remains the only path that may execute inline scripts.
- Permit inline script execution only through an explicit trusted-HTML option. Use a separate CSP-sandboxed document without `allow-same-origin`; block network, forms, workers, and child frames; validate both message boundaries; snapshot the generated DOM; and keep the measurement iframe script-disabled.
- Describe that option by its visible effect—reflecting content added after the HTML opens—rather than leading with JavaScript or “trusted HTML” terminology. Keep it off by default, never auto-enable it, detect executable scripts to warn about possibly missing menus or charts, and provide an accessible disclosure with concrete examples of confirmed and unknown sources.
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
