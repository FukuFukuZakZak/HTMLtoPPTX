# Project status

Last updated: 2026-09-03
Status owner: Codex and repository maintainers

## Objective

Build the HTML-to-PPTX converter described in `docs/HTML_to_PPTX_converter_spec_initial.md` as a Codex-maintainable Windows project.

## Current milestone

Development environment and persistent workflow setup.

## Current work

No implementation task is active. The repository is ready for the first PoC implementation task.

## Completed

- Git repository initialized.
- Project-scoped Codex, Serena, Code Review Graph, Better Code Review Graph, and Graphify configuration added.
- The design document was indexed into the local Graphify knowledge graph.
- Graphify skill auto-activation was verified with a minimal design question.
- Pre-commit 4.6.1 and generic repository checks were installed and verified.
- Code Review Graph update and change detection were integrated into pre-commit on Windows.
- Persistent handoff rules were added to `AGENTS.md`.
- Context7 was made mandatory in `AGENTS.md` for implementation work involving third-party libraries, frameworks, SDKs, APIs, or CLI tools.

## Next actions

1. Review the initial PoC scope in the design document.
2. Turn the selected PoC scope into small acceptance-tested implementation tasks.
3. Implement the first vertical slice and update this file with verification evidence.

## Decisions

- Use `PROJECT_STATUS.md` as the source of truth for cross-thread progress and handoff.
- Use Git commits and test output as completion evidence.
- Keep generated Graphify and code-review databases local and ignored by Git.
- Treat one HTML `.slide` element as one PowerPoint slide, per the current design.
- Keep pre-commit checks language-neutral until implementation code establishes the Go and frontend toolchain.
- Require Context7 before coding against third-party libraries, frameworks, SDKs, APIs, or CLI tools; fall back to official documentation only when Context7 is unavailable or has no relevant entry.

## Risks / blockers

- Application code has not been created yet, so implementation-level architecture and tests remain unverified.
- The initial design document is currently untracked and must not be added or modified without user intent.

## Verification

- Latest completed setup commit before this status file: `238965f` (`pre-commitチェックを導入`).
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
