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
