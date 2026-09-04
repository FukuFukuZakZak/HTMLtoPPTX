## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- Use Graphify first only for an explicit `/graphify` request, a broad architecture question, or a question that connects code and documents. Routine code search, symbol lookup, change impact, and review use the tools in the routing table below.
- When `graphify-out/graph.json` exists, start with `graphify query "<question>" --budget 1500`. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. Narrow the query before raising the budget.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Code analysis routing

This repository keeps two interactive analysis MCP servers enabled through `.codex/config.toml`: Better Code Review Graph and Serena. The older Code Review Graph MCP is disabled to avoid duplicating its large tool schema; its repository hooks remain available independently.

| Question or task | First choice |
|---|---|
| Find code by meaning or purpose | `better-code-review-graph` query with `action=search` |
| Analyze change impact or blast radius | `better-code-review-graph` query with `action=impact` |
| Trace callers or dependencies | `better-code-review-graph` query with `action=query` |
| Find a known symbol, implementation, or reference | Serena symbolic tools |
| Rename or replace a known symbol | Serena symbolic editing tools |
| Understand the repository or connect code and docs | `$graphify` / `graphify query` |
| Review recent changes | `better-code-review-graph` review tools |

At the start of a session, activate the current repository with Serena and read its initial instructions. Use Code Review Graph only through its Git/edit hooks; prefer Better Code Review Graph for interactive queries. If the first-choice lookup finds nothing, fall back to the other scoped graph or symbolic lookup, then Graphify for broad relationships, and finally `rg` plus narrow file reads.

## Context and tool-output budget

The goal is to preserve implementation quality while preventing diagnostics and tool schemas from consuming the working context.

- Keep one tool call's stored output under 6,000 tokens by default; `.codex/config.toml` enforces this globally and applies tighter limits to graph query/review tools.
- For searches and reads, return names, matches, or the smallest relevant line ranges. Do not dump entire lockfiles, generated bundles, tool catalogs, `GRAPH_REPORT.md`, or large logs into the conversation.
- Never enumerate every available tool merely to discover one. Search for the exact server/tool prefix and print names only, capped at 2,000 tokens.
- When output is truncated or noisy, narrow the query, path, symbol, test, or time range before increasing a limit.
- Prefer summaries plus file/line references over replaying raw output. Preserve the command and decisive evidence needed to reproduce a result.
- Use full test output only for an unexplained failure. For passing suites, record the command, pass count, and duration or final status.
- Treat plugin activation as project-specific. Keep one browser automation path and disable unrelated or duplicate plugin families in this repository's `.codex/config.toml`; re-enable a plugin only for a task that actually needs it.

## External documentation with Context7

Context7 is the required first source for current documentation about third-party libraries, frameworks, SDKs, APIs, CLI tools, and their configuration.

- Before writing or modifying code that depends on an external library, framework, SDK, API, or CLI, call `mcp__context7__resolve_library_id` and then `mcp__context7__query_docs` for the exact implementation topic.
- Do this before selecting or adding a dependency, using an unfamiliar API, changing dependency configuration, handling a version migration, or diagnosing library-specific behavior. Do not rely on model memory for these facts.
- If the repository pins a version, query that version when Context7 exposes it. Keep each query focused on one concrete topic.
- Context7 is not required for standard-library-only work, repository-local business logic, mechanical refactoring, or general programming concepts.
- If Context7 is unavailable or has no relevant documentation, state that briefly and use the dependency's official documentation as the fallback.
- When implementation used Context7, record the library/topic consulted under `PROJECT_STATUS.md` Verification so later tasks can audit that the requirement fired.

## Persistent work management

`PROJECT_STATUS.md` is the durable handoff record for this repository. Do not rely on chat history as the only record of progress.

At the start of every new task or cleared thread:

1. Read `PROJECT_STATUS.md` before proposing or changing implementation.
2. Run `git status --short` and inspect the recent Git log.
3. Reconcile the status file with the working tree and verified commits. Git and test results take precedence if the record is stale.
4. Read only the design sections and source files needed for the current item; use Graphify for repository-wide context.

During work:

- Keep `Current work`, `Next actions`, `Decisions`, `Risks / blockers`, and `Verification` current when their meaning changes.
- Record outcomes and evidence, not a transcript of commands or discussion.
- Mark an item complete only after its acceptance checks pass.
- Preserve user-owned or unrelated working-tree changes and note them under `Working tree notes` when they affect handoff.
- Update `PROJECT_STATUS.md` before ending an incomplete task, changing milestones, or recommending a cleared/new thread.
- Commit the status update with the corresponding implementation when practical.

Recommend clearing the thread when a milestone or self-contained task has been committed and verified, the next task is materially different, or accumulated logs and obsolete context are likely to distract from the next phase. Do not recommend clearing while required work is uncommitted, a failure is unexplained, or a blocker/next action is missing from `PROJECT_STATUS.md`.

When recommending it, say explicitly: `ここで一度スレッドをクリアして問題ありません。進捗は PROJECT_STATUS.md に反映済みです。` Include the next action the new thread should start with.
