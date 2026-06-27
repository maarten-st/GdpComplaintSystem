# GDP Complaint Handling — Rebuild Requirements

> Clean-rebuild spec. The existing 13-stage Maestro **Case** is replaced by a simpler
> **Data Fabric–driven Maestro BPMN** design. The Data Fabric `Complaints` table is the single
> source of truth; the standalone **GDP Complaint Tracker** app
> (`uipath-test-codeapps-datafabric/complaint-tracker`) is the human surface.

## Architecture decisions (confirmed)

- **Event-driven, human-paced.** Every stage transition is a **human** setting the next `Gate`
  value on the complaint record in the tracker app. Each Gate change fires a **Data Fabric event
  trigger** that starts the next automated segment. (Not one long-running process; not Action
  Center gates.)
- **CAPA is HITL.** The Investigation Agent writes a *suggested* action to the record. The
  irreversible/financial RPA runs **only after a human approves** — approval = advancing `Gate` to
  `CAPA`.
- **Temp portal + RPA keyed by Sales Order (`SO-####`).**
- **The `Complaints` entity is extended** with the missing columns (below).
- **Trigger for Intake is manual.**

## Stages & the `Gate` choice set

`Intake → Triage → Investigation → CAPA → Closed` (+ a `Closed` / no-complaint terminal reachable
from Triage). These choice values already exist in the entity and match exactly.

## Data Fabric `Complaints` entity (id `e28dd0a9-c065-f111-8fcb-000d3ab1a7ac`)

**Current 8 columns:** `ComplaintId, EmailBody, Sender, Company, SalesOrder, BatchNumber,
ExtractedType (choice), Gate (choice)`.

`ExtractedType` choice set = ProductQualityDefect / PackagingDefect / LabelingError / AdverseEvent /
ShippingDamage / CounterfeitSuspicion / Other.

**Columns to ADD:**

| Field | Type | Source / use |
|---|---|---|
| `ProductName` | STRING | ExtractComplaint output |
| `QtyAffected` | NUMBER | ExtractComplaint output |
| `Summary` | MULTILINE_TEXT | ExtractComplaint output |
| `Confidence` | NUMBER (0–1) | ExtractComplaint output |
| `InvestigationFindings` | MULTILINE_TEXT (JSON) | Investigation Agent — SO data + temp logs + linked complaints |
| `LinkedComplaints` | STRING | Investigation Agent — other complaints on same SO/batch |
| `SuggestedAction` | CHOICE | Investigation Agent — BackToStock / Destroy / Credit / Debit / None |
| `ApprovedAction` | CHOICE | Human approval at CAPA gate (defaults to SuggestedAction, editable) |
| `FinanceAmount` | NUMBER | optional, for credit/debit note |

The tracker app's `complaint-tracker/src/lib/{types,config}.ts` + drawer/modal must be updated to
match once the columns are added.

---

## The 5 stages — per-component Input / Output / Description

### Stage 1 — INTAKE  *(manual trigger; `IntakeProcess.bpmn`)*

**1.1 `FetchComplaintEmail`** — IS connector (Outlook 365, `getNewestEmail`)
- **Input:** `parentFolder` = `complaints` folder of technical@caudata.be (folder GUID), `unReadOnly=true`, `top=1`
- **Output:** `emailFrom` (string), `emailSubject` (string), `emailBody` (string)
- **Description:** Pulls the single newest unread email from the complaints inbox folder. No body = nothing to process (end).

**1.2 `ExtractComplaint`** — Agent (low-code; copy of ComplaintIntakeAgent, outputs trimmed)
- **Input:** `emailFrom`, `emailSubject`, `emailBody`
- **Output:** `customerName`, `productName`, `batchNo`, `orderNo`, `complaintSummary`, `confidence` (0–1), `qtyAffected`, `extractedType` (one of the 7 choice values)
- **Description:** LLM extracts structured complaint fields from the raw email for display + persistence.

**1.3 `CreateComplaintRecord`** — Data Fabric create (entity `Complaints`)
- **Input:** `ComplaintId` = generated `CMP-2026-####` (unique, human-readable); `EmailBody`=emailBody; `Sender`=emailFrom; `Company`=customerName; `SalesOrder`=orderNo; `BatchNumber`=batchNo; `ProductName`; `QtyAffected`; `Summary`=complaintSummary; `Confidence`; `ExtractedType`; `Gate`=`Triage`
- **Output:** created record key / `ComplaintId`
- **Description:** Persists the new complaint at `Gate=Triage`; it now appears in the tracker app.

### Stage 2 — TRIAGE  *(human only, in the tracker app — no BPMN automation)*
- **Input (read):** all record fields above
- **Output (write):** edited fields if needed; `Gate` set to `Investigation` (proceed) **or** `Closed` (no complaint)
- **Description:** Reviewer validates/corrects the extraction and decides whether it is a real complaint. Advancing the Gate is the event that triggers the next process.

### Stage 3 — INVESTIGATION  *(DF trigger on `Gate → Investigation`; `InvestigationProcess.bpmn`)*
On start, the process reads the `Complaints` record by `ComplaintId` to get `SalesOrder` / `BatchNumber`.

**3.1 `GatherEvidence`** — RPA (reuse `ErpRobots/GatherEvidence.xaml`) *(parallel branch A)*
- **Input:** `in_OrderNo` = `SalesOrder`
- **Output:** `out_RawResult` (order/line data), `out_ExcursionHours`, `out_LoggerAvailable`
- **Description:** Drives the mock ERP to read sales-order / shipment data for the complaint.

**3.2 `GatherTempLogs`** — RPA (NEW, against the new transport portal) *(parallel branch B)*
- **Input:** `SalesOrder`
- **Output:** `tempMinC`, `tempMaxC`, `excursionHours`, `loggerPresent` (bool), `transportRef`, `rawLogJson`
- **Description:** Logs into the transport-company portal, searches the Sales Order, opens the transport, and scrapes its temperature log table.

**3.3 `InvestigationAgent`** — Agent (NEW; merges old Evaluate/Dossier/Correlation logic)
- **Input:** `extractedType`, sales-order data (3.1), temperature data (3.2), complaint history for same `SalesOrder` / `BatchNumber` (DF query)
- **Output:** `investigationFindings` (JSON: what went wrong + rationale), `linkedComplaints` (ids on same SO/batch), `suggestedAction` (BackToStock / Destroy / Credit / Debit / None), `financeAmount` (optional)
- **Description:** Correlates all evidence and proposes a disposition + finance action for the human to approve.

**3.4 `WriteInvestigation`** — Data Fabric update
- **Input:** `ComplaintId`; `InvestigationFindings`; `LinkedComplaints`; `SuggestedAction`; `FinanceAmount`
- **Output:** updated record (stays at `Gate=Investigation`)
- **Description:** Writes the findings + suggestion back so the human sees them in the app. No auto-advance.

*(Human step:)* reviewer reads the suggestion, sets `ApprovedAction` (defaults to `SuggestedAction`,
editable), and sets `Gate=CAPA` — which **is** the approval and fires Stage 4.

### Stage 4 — CAPA  *(DF trigger on `Gate → CAPA`; `CapaProcess.bpmn`)*
On start, reads the record for `ApprovedAction`, `BatchNumber`, `QtyAffected`, finance fields.

**4.1 `AdjustInventory`** — RPA (reuse `SetBatchQuarantine.xaml` / `ExecuteDisposition.xaml`)
- **Input:** `BatchNumber`, `ApprovedAction` (disposition), `QtyAffected`
- **Output:** `inventoryStatus` (e.g. Quarantine / Blocked / Available)
- **Description:** Applies the approved physical disposition — writes off / quarantines the affected stock in the mock ERP.

**4.2 Credit-vs-Debit gateway** — `exclusiveGateway`
- **Condition:** on outgoing flows, `=vars.ApprovedAction == "Credit"` → 4.3; `== "Debit"` → 4.4; default → skip to 4.5
- **Description:** Routes to the correct financial correction (or none).

**4.3 `IssueCreditNote`** — RPA (reuse `PostToErp.xaml`, type CREDIT)
- **Input:** `CustomerCode` / Company, `ProductCode`, `BatchNumber`, `QtyAffected`, `FinanceAmount`, `ComplaintId`
- **Output:** `creditNoteStatus`, `creditPosted` (bool)
- **Description:** Posts a credit note (we owe the customer — e.g. destroyed / short-shipped goods).

**4.4 `IssueDebitNote`** — RPA (reuse `IssueReversingNote.xaml` / `PostToErp.xaml`, type DEBIT)
- **Input:** same as 4.3
- **Output:** `debitNoteStatus`
- **Description:** Posts a debit note (customer owes us — e.g. extra goods received).

**4.5 `CloseRecord`** — Data Fabric update
- **Input:** `ComplaintId`; `Gate`=`Closed`; financial / inventory result fields
- **Output:** updated record
- **Description:** Marks the complaint resolved.

### Stage 5 — CLOSED — terminal `endEvent`.

---

## Reusable assets (from this repo, copy & adapt)

| New task | Reuse from | Notes |
|---|---|---|
| FetchComplaintEmail | `MaestroCase/ComplaintCase/caseplan.json` Outlook `getNewestEmail` config | needs Outlook connection + `complaints` folder GUID |
| ExtractComplaint | `GdpComplaintIntake/ComplaintIntakeAgent/agent.json` | trim outputs to: customerName, productName, batchNo, orderNo, complaintSummary, confidence, qtyAffected, extractedType |
| GatherEvidence | `ErpRobots/GatherEvidence.xaml` (in: `in_OrderNo`) | reuse outputs RawResult / ExcursionHours / LoggerAvailable |
| InvestigationAgent | `GdpCaseResources/EvaluateFindings` + `AssembleDossier` + `CorrelationCheck` | merge into one simpler agent that emits findings + SuggestedAction |
| IssueCreditNote / IssueDebitNote | `ErpRobots/PostToErp.xaml` / `IssueReversingNote.xaml` | credit vs debit by note type |
| AdjustInventory | `ErpRobots/SetBatchQuarantine.xaml` / `ExecuteDisposition.xaml` | confirm meaning of "delete cases" = write off / quarantine affected stock |

## Net-new to build

- **Transport temperature portal** (web app) + its **RPA** (`GatherTempLogs`).
- **Entity column additions** + tracker-app UI updates.
- The **3 BPMN processes + review diagram** (`ComplaintOrchestration`).

---

## Maestro BPMN shape

Because stage transitions are human-paced Data Fabric events (and Maestro excludes conditional
"wait until field == X" events, and forbids multiple live trigger starts in one executable process),
the executable shape is **three trigger-started processes**, plus **one visual-only review diagram**
showing all five stages.

```
ComplaintOrchestration/                 (new project, location TBD — see below)
  ComplaintOrchestration.bpmn   # review/overview ONLY (pools/lanes/annotations, non-executable)
  IntakeProcess.bpmn            # manual start  → Intake automation
  InvestigationProcess.bpmn     # DF trigger: Gate → Investigation
  CapaProcess.bpmn              # DF trigger: Gate → CAPA
  project.uiproj
  README.md                     # CLI-enrichment blockers (DF triggers, connectors, bindings_v2.json)
  # CLI-generated: bindings_v2.json, entry-points.json, operate.json, package-descriptor.json
```

Placeholder node types (model authors the skeleton/shell; `Intsvc.*` + DF triggers are CLI-owned
enrichment, left as placeholders until then):
- IS connector (FetchComplaintEmail, all Data Fabric create/update) → `bpmn:serviceTask` + `Intsvc.*`.
- DF start trigger (Gate → X) → `bpmn:startEvent` (message) + `uipath:type=Intsvc.EventTrigger`.
- Agent call (ExtractComplaint, InvestigationAgent) → `bpmn:serviceTask` + `Orchestrator.StartAgentJob`.
- RPA call (GatherEvidence, GatherTempLogs, AdjustInventory, Issue*Note) → `bpmn:serviceTask` + `Orchestrator.StartJob`.
- INVESTIGATION parallel RPA → `parallelGateway` split/join. CAPA credit-vs-debit → `exclusiveGateway`
  with conditions on outgoing flows + default flow.

---

## Open items to confirm during build

- Project location: new `new-project\ComplaintOrchestration\` vs folding into existing
  `new-project\GdpComplaintIntake\` (recommend new — clean start).
- Exact meaning of CAPA "Adjust inventory – delete cases" (assumed: write off / quarantine affected
  stock for the batch).
- What drives **credit vs debit** (assumed: Investigation Agent — extra goods received = debit,
  destroyed / short-shipped = credit).
- Final list of added entity columns.

## Verification (later phases)

- `node "decision-logic/run-tests.js"` and intake-parser tests still pass for any reused logic ported.
- `uip maestro bpmn validate` on each `.bpmn` → 0 errors before packaging.
- Tracker app builds (`npm run build` in `complaint-tracker`) after entity/types changes and shows the
  new columns; create/update against staging Data Fabric round-trips.
- End-to-end smoke: drop a test email → run Intake manually → record appears at `Gate=Triage` →
  advance `Gate=Investigation` fires Investigation segment → suggestion appears → approve
  (`Gate=CAPA`) fires CAPA RPA → `Gate=Closed`.
