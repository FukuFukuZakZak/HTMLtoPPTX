## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Code analysis routing

This repository exposes three MCP servers to Codex through `.codex/config.toml`.

| Question or task | First choice |
|---|---|
| Find code by meaning or purpose | `better-code-review-graph` query with `action=search` |
| Analyze change impact or blast radius | `better-code-review-graph` query with `action=impact` |
| Trace callers or dependencies | `better-code-review-graph` query with `action=query` |
| Find a known symbol, implementation, or reference | Serena symbolic tools |
| Rename or replace a known symbol | Serena symbolic editing tools |
| Understand the repository or connect code and docs | `$graphify` / `graphify query` |
| Review recent changes | `better-code-review-graph` review tools |

At the start of a session, activate the current repository with Serena and read its initial instructions. Use `code-review-graph` primarily for its Git and edit hooks; prefer `better-code-review-graph` for interactive queries. If graph-backed lookup finds nothing, fall back in this order: Graphify, Serena partial symbol lookup, then `rg` and direct file reads.

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
