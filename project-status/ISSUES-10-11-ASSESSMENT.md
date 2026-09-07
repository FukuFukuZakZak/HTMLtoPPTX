# Issues #10 / #11: feasibility assessment

Date: 2026-09-07. Inspected HEAD: `e30e31f` (product commit `e54b710`).
Scope: assess feasibility only, as requested. Both are feasible; no product implementation has started.

## Completed Issue management

The user confirmed #8/#9 passed target-machine validation and authorized closure.
Both were closed without comments and verified with `gh issue view --json number,state,stateReason,closedAt`:

- #8: CLOSED / COMPLETED, `2026-09-07T01:20:43Z`.
- #9: CLOSED / COMPLETED, `2026-09-07T01:20:45Z`.

## #10: title-derived editor output names

Issue: https://github.com/divine261402-pixel/HTMLtoPPTX/issues/10

**Feasible; small change.** `web/app.js:298` constructs the virtual input as `貼り付けHTML.html`. PPTX names derive from that file name at `web/app.js:376`, and ZIP naming uses the same source at `web/app.js:417`. Changing the editor-only virtual name can consistently change both outputs without altering conversion geometry or Worker packaging.

Proposed behavior:

- Read the first HTML title in the document head from the submitted source, without running scripts. Exclude SVG titles and title-like strings inside comments/scripts. Decode entities and normalize surrounding/internal whitespace.
- For `<title>業務説明資料</title>`, output `業務説明資料.zip` containing `業務説明資料.pptx`.
- If absent or blank, retain `貼り付けHTML.zip` / `貼り付けHTML.pptx`.
- Sanitize invalid filename characters, trailing dots/spaces, Windows reserved names and overly long stems consistently. Existing `web/converter-core.js:80` replaces invalid characters but does not cover every case. Define a bounded common stem with room for extensions and orientation suffixes.
- Preserve existing A4 split behavior (`業務説明資料-A4縦.pptx` / `業務説明資料-A4横.pptx`) and file-upload naming.
- Prefer reuse of an existing inert parse or the bundled parser when implementing. Do not introduce external resource fetching solely for title extraction; DOMParser inertness prevents script execution but is not itself a blanket network guarantee.

Acceptance: Japanese/entity/whitespace titles, absent/empty titles, reserved/invalid/long names, misleading title text, mixed A4, file-upload regression and actual ZIP/inner-PPTX names. Check conversion XML remains equivalent apart from intended document metadata. Update editor help/manual naming examples.

## #11: line numbers and colored repair tags

Issue: https://github.com/divine261402-pixel/HTMLtoPPTX/issues/11

**Feasible; medium change.** The editor is a native textarea (`web/index.html:172`, `web/style.css:229`). It supports plain text rather than independently styled tags. Retaining the textarea and adding a synchronized inert text display plus line-number gutter is the preferred initial approach. A new editor library is not necessary to establish feasibility.

Position evidence:

- `src/html-repair.mjs:109` returns `{line: node.startLine, tag, reason, offset, text}`. `line` identifies the opening tag, not the inserted closing tag.
- Offsets refer to source after optional Markdown fence removal but before repair insertions. `src/html-repair.mjs:150` applies grouped insertions from the end of the source; earlier insertions shift later final positions.
- `web/app.js:274` currently renders the opening-tag line as the repair item. Merely adding a gutter would not fully explain where an inserted tag went.
- Native repair uses `execCommand("insertText")` to preserve history (`web/app.js:236`). Input events also handle Undo/Redo and hide the existing report (`web/app.js:188`). Preserve that input path.

Proposed behavior:

- Number logical source lines starting at 1. Retain soft wrapping and align continuation rows without assigning extra source numbers. Synchronize on scrolling, resizing, typing and font changes.
- Highlight only inserted closing-tag spans in the editor display, with a complementary marker/repair report. Create display text safely as text nodes, never execute source HTML in the app document. Keep the overlay out of focus/accessibility navigation and pointer handling.
- Return explicit final start/end ranges for each insertion. Handle multiple tags at the same offset, multiple insertion sites, fence removal, LF/CRLF, EOF and Unicode consistently.
- Distinguish the opening-tag line from the final inserted-tag line in reports; provide navigation to the relevant location. Report removed Markdown fences as removals, since deleted content cannot be colored in the final source.
- Clear highlights on subsequent manual edits, Undo or Redo so stale positions are never shown. A no-op repair can preserve highlights only while the source still matches the repair snapshot.

Acceptance: at least 300 lines; long wrapped lines, tabs, blank lines, end-of-file/newline, scroll/resize, multiple same-offset insertions and fence removal. Verify Japanese IME, selection/copy/paste, native Undo/Redo, no-op repair, warning-only repairs, light/dark/8bit themes, long-input responsiveness and unaltered conversion output. Reuse existing repair/preview/UI acceptance drivers and update manual chapter 3/repair screenshots as appropriate.

## Verification and limits

- Read live Issue bodies and inspected scoped code with Serena plus targeted reads. Better Code Review Graph semantic search returned no matches because embeddings are absent; scoped symbol lookup supplied the relevant code.
- Ran the existing repair function in Node on two small samples. `<div>\n<section>\nhello` reports section opening line 2 although its closing tag is inserted on line 3; a fenced `<div>\nhello` reports offsets in the fence-stripped source. These confirm the mapping requirement; they are not acceptance tests of an implementation.
- Context7 consulted: `/websites/cli_github_manual` for [issue closure](https://cli.github.com/manual/gh_issue_close); `/mdn/content` for [textarea plain text](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/textarea) and [inert HTML parsing](https://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parseFromString).
- Modern Web Guidance searched the exact editor topic and retrieved `highlight-text-ranges`. DOM text-range highlighting applies to a separate display layer; it does not establish direct highlighting support for textarea values.
- No application source, dependencies, generated bundles, manual, executable or release changed. No full regression suite/build was run for this assessment. Browser alignment and history acceptance remain implementation work. #10/#11 stay open.
