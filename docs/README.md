# Jonás Orbit v3 documentation

This index maps the repository's documentation. The approved project plan is the source of truth for scope, architecture, phases, acceptance criteria, and the test matrix. Later domain-specific decisions can supersede it where [AGENTS.md](../AGENTS.md) says so.

## Start here

| Document | Purpose |
| --- | --- |
| [Main README](../README.md) | Product overview, architecture, setup, and project links |
| [Contribution guide](../CONTRIBUTING.md) | Internal workflow and verification |
| [Security policy](../SECURITY.md) | Private vulnerability reporting |
| [Production readiness](production-readiness.md) | Release gates, environment, blockers, deployment, and recovery |
| [Repository quality](repository-quality.md) | Artifact, measurement, and repository hygiene policies |
| [README media](media/readme/README.md) | Source and capture details for README screenshots |

## Plans, decisions, and history

| Location | What it contains |
| --- | --- |
| [Mission Endurance plan](plans/jonas-orbit-v3-mission-endurance.md) | **Approved plan and baseline source of truth:** phases, content deliverables, Appendix A test matrix, and exit criteria |
| [Gargantua pivot](plans/sistema-gargantua.md) | **Approved on 2026-08-06:** supersedes the main plan for routes, camera contract, visual layer, transitions, and budgets |
| [Decision log](registro-de-decisiones.md) | Full owner decisions, measurements, and lessons; [AGENTS.md](../AGENTS.md) is its concise index |
| [Design documents](design/) | Detailed direction for the six destinations, the star system, sound, motion, and navigation |
| [Reviews](reviews/) | Dated CEO, design, engineering, developer-experience, and release reviews |
| [Current repository-readiness review](reviews/repository-readiness-2026-09-27.md) | Quality, security, and release evidence from the latest repository review |
| [Experiments](experiments/) | Optional hypotheses that may never be implemented |
| [Deferred work](deferred/) | Valid work postponed until its entry conditions are met |
| [Codebase knowledge graph](ai/codebase-memory.md) | How agents use codebase-memory-mcp and the code-domain map |
| [v2 reference](reference/v2/) | Previous-version code kept only as reference; excluded from TypeScript, Knip, and the graph |

The detailed plans, decision log, and design history were originally written in Spanish. Their existing filenames and in-document references are retained as stable historical identifiers. Read [AGENTS.md](../AGENTS.md) to determine which decision is current for a specific area.

## Working rules

- Do not reopen settled decisions outside the approved plan and its later domain-specific decisions.
- Root-level [TODOS.md](../TODOS.md) contains only deferred or parked work. Active tasks live in the plan's *Next Steps*.
- The `experiments/` and `deferred/` folders are not automatically technical debt; moving an item into the active roadmap requires explicit approval.
