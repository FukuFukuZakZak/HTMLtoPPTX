---
name: graphify
description: "Use when the user explicitly invokes /graphify, asks to build, update, or query the repository knowledge graph, or needs broad architecture and code-to-document relationships that symbol or code-review graph tools cannot answer. Do not trigger for routine coding, known-symbol lookup, narrow code search, or ordinary change review."
---

# Graphify router

Use the smallest Graphify operation that answers the request. This file is a router; load only the referenced runbook needed for the current operation.

## Fast path for this repository

When `graphify-out/graph.json` exists and the request is a natural-language question about the repository, do not rebuild or scan the corpus. Run:

```powershell
graphify query "<question>" --budget 1500
```

Use `graphify path "<A>" "<B>"` for a relationship between two known concepts and `graphify explain "<concept>"` for one focused concept. Read [query.md](references/query.md) for vocabulary expansion, traversal choices, source citations, and fallback behavior.

If the executable is not on `PATH`, use the interpreter recorded in `graphify-out/.graphify_python` or the installed Graphify executable. Do not reinstall merely because the command alias is missing.

## Operation routing

| Request | Read this reference | Action |
|---|---|---|
| `/graphify --help` or `-h` | [usage.md](references/usage.md) | Print the Usage block verbatim and stop. |
| Query, path, or explain an existing graph | [query.md](references/query.md) | Traverse the existing graph with a tight token budget. |
| Full build from a folder or URL | [full-pipeline.md](references/full-pipeline.md) | Follow the complete extraction/build workflow. |
| Incremental update or recluster | [update.md](references/update.md) | Re-extract only changed files or rerun clustering. |
| GitHub URL, multiple repositories, or merge | [github-and-merge.md](references/github-and-merge.md) | Resolve inputs, then return to the full pipeline. |
| Optional exports, wiki, databases, MCP, benchmark | [exports.md](references/exports.md) | Run only the explicitly requested export. |
| Add a URL or watch a folder | [add-watch.md](references/add-watch.md) | Use the dedicated add/watch flow. |
| Install repository hooks or integration instructions | [hooks.md](references/hooks.md) | Apply only the requested integration. |
| Audio or video corpus | [transcribe.md](references/transcribe.md) | Transcribe before semantic extraction. |

Read the selected reference completely before acting. Do not load `full-pipeline.md`, `GRAPH_REPORT.md`, the wiki, or extraction instructions for a normal query.

## Existing-graph query discipline

1. Start with `--budget 1500`.
2. If results are noisy, narrow the vocabulary or use `path` or `explain`; do not immediately raise the budget.
3. Raise the budget only when the answer is visibly truncated and the omitted nodes are relevant.
4. Cite `source_file` or `source_location` from graph output for concrete claims.
5. Fall back in this order when the graph lacks the answer: repository routing rules, symbolic lookup, then `rg` and narrow file reads.

## Build discipline

- If no path is supplied for an explicit build, use `.`.
- A code-only corpus uses deterministic AST extraction and does not need an API key.
- Never ask for an OpenAI or Anthropic API key. Semantic extraction may use an already configured Gemini key; otherwise follow the host-agent route in the full runbook.
- Respect the corpus-size warning and the graph shrink guard.
- Run optional exporters only when their flags are present.
- Keep temporary or generated outputs under `graphify-out/`.

## Honesty rules

- Never invent a node or edge. Use `AMBIGUOUS` when the evidence is uncertain.
- Surface graph-health warnings, skipped sensitive files, and truncation.
- Show raw token cost and cohesion values when producing a full report.
- Warn before visualizing graphs larger than 5,000 nodes.
- Distinguish graph evidence from inferences and from direct source inspection.

## Completion

For a query, return a concise answer and only the graph paths needed to support it. For a full build, follow the reporting and output checklist in [full-pipeline.md](references/full-pipeline.md). For repository code changes, use the repository's `AGENTS.md` rule to decide whether `graphify update .` is required.
