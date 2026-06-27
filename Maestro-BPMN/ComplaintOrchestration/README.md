# ComplaintOrchestration (Maestro BPMN) — placeholder skeleton

GDP complaint-handling orchestration, event-driven via the Data Fabric `Complaints` table.
Full requirements: `../uipath-maestro-test/REBUILD-REQUIREMENTS.md`.

> **State (2026-06-15): RPA `StartJob` nodes ENRICHED + validated** in InvestigationProcess and
> CapaProcess (release keys bound, JobArguments mapped; `uip maestro bpmn validate` → Success on all 4
> files). Still TODO and tracked in `WIRING-REFERENCE.md`: agent `StartAgentJob` binds, DF event
> triggers, Outlook + Data Fabric connectors, the CapaProcess CustomerCode/ProductCode/TargetStatus
> field gaps, package-JSON regeneration — all of which need Studio Web. Not packaged, not deployed.

## Files

| File | Role | Start |
|---|---|---|
| `ComplaintOrchestration.bpmn` | **Review/overview only** — all 5 stages end-to-end (illustrative). This is the package's main file and keeps the manual entry point. | manual |
| `IntakeProcess.bpmn` | Executable segment — Stage 1 (fetch → extract → create record at Gate=Triage). | manual |
| `InvestigationProcess.bpmn` | Executable segment — Stage 3 (parallel GatherEvidence + GatherTempLogs → InvestigationAgent → write findings/suggestion). | DF trigger `Gate→Investigation` |
| `CapaProcess.bpmn` | Executable segment — Stage 4 (AdjustInventory → credit/debit gateway → close at Gate=Closed). | DF trigger `Gate→CAPA` |

Stages 2 (Triage) and 5 (Closed) are human-only / terminal and carry no automation.

Every task node has a `bpmn:documentation` block listing its **Input / Output / Description**.

## Why three processes (not one)

Stage transitions are human-paced Data Fabric events (a person advances `Gate` in the tracker app).
Maestro excludes conditional "wait-until-field==X" events and forbids multiple live trigger-starts in
one executable process, so each automated segment is its own trigger-started process. The shared state
is the `Complaints` record itself (no Maestro variable is threaded between segments).

## CLI-enrichment blockers (NOT done — required before packaging/upload/run)

These are CLI-owned and intentionally left as placeholders:

1. **Data Fabric event triggers** on `InvestigationProcess` / `CapaProcess` start events — currently
   plain BPMN message-start placeholders. Need `Intsvc.EventTrigger` enrichment: connection, object
   = `Complaints`, filter `Gate == Investigation` / `Gate == CAPA`, dynamic schema.
2. **`FetchComplaintEmail`** — Outlook 365 connector activity (`getNewestEmail`): connection,
   `complaints` folder GUID, operation + dynamic schema.
3. **Data Fabric create/update** (`CreateComplaintRecord`, `WriteInvestigation`, `CloseRecord`) —
   connector activity enrichment + field mappings to entity `Complaints`
   (`e28dd0a9-c065-f111-8fcb-000d3ab1a7ac`).
4. **Agent calls** (`ExtractComplaint`, `InvestigationAgent`) — `Orchestrator.StartAgentJob` shells:
   release key, folder, I/O mapping. `InvestigationAgent` is net-new.
5. **RPA calls** (`GatherEvidence`, `GatherTempLogs`, `AdjustInventory`, `IssueCreditNote`,
   `IssueDebitNote`) — `Orchestrator.StartJob` shells: release key, folder, argument mapping.
   `GatherTempLogs` is net-new (depends on the not-yet-built transport portal).
6. **Root variables + entry-point IDs + gateway conditions** — pass-2 model XML: declare
   `uipath:variables`, add entry-point IDs to the 3 segment start events, and set the CAPA gateway
   conditions to `=vars.ApprovedAction == "Credit" / "Debit"` (currently business-readable flow names
   + a default flow).
7. **Generated package files** — `package-descriptor.json` and `entry-points.json` currently
   reference only `ComplaintOrchestration.bpmn`. They must be regenerated to register all four
   `.bpmn` files and their entry points (`bindings_v2.json`, `operate.json` too).

See `REBUILD-REQUIREMENTS.md` → "Maestro BPMN shape" and the later build phases (P2–P6).
