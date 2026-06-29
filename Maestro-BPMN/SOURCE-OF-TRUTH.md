# ComplaintOrchestration — Orchestrator / Studio Web source of truth

**This folder is the canonical copy, exported from Studio Web on 2026-06-30** (SolutionId
`c60aa117-4e28-40be-d206-08dec8f2123b`, via `uip solution download`). The user does their wiring
(connectors, agents, RPA jobs, triggers, I/O mappings) **in Studio Web**, so Studio Web is authoritative.

## Rules — do NOT override the user's Studio Web work
1. **Before any edit/upload, re-download** the latest: `uip solution download c60aa117-… -d . --extract`.
   The user changes things in Studio Web between sessions.
2. **Never `uip solution upload` the old sibling folders** `../ComplaintOrchestration/` or
   `../ComplaintOrchestrationSolution/` — they are the early CLI-authored 4-file draft and are now
   **superseded**. Uploading them would wipe the user's connectors/agents/triggers.
3. The real artifact is the **single `ComplaintOrchestration/ComplaintOrchestration.bpmn`** (overview with
   inline subprocesses). The separate IntakeProcess/InvestigationProcess/CapaProcess `.bpmn` are NOT used
   by the user and are not even in the export (the `.uis` export is lossy — only the overview ships).
4. `_export-snapshot.uis` is the raw archive of this export; keep it.

## What's wired (see the change list the assistant produced 2026-06-15)
Connectors: Outlook 365 `getNewestEmail` (conn `a33b08e7`), Data Fabric Create/Update + a mid-flow
`WaitForEvent` (conn `49a6877f` = steurma@cronos.be). Agents: ExtractComplaint, InvestigationAgent.
RPA: GatherEvidence, GatherTempLogs (+ Adjust/Credit/Debit partially wired). Bindings in
`ComplaintOrchestration/bindings_v2.json`.
