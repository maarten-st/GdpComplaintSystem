# ComplaintOrchestration — UiPath Maestro BPMN (GDP Pharma Complaint Handling)

UiPath AgentHack submission — **Track 2 / Maestro BPMN**.

An end-to-end orchestration that handles a **B2B customer complaint about a medicine shipment**
for a pharmaceutical **wholesale distributor** under EU GDP (2013/C 343/01, Ch.6). AI agents
extract and assess, RPA robots gather evidence and execute in business systems, and every
regulated decision stays with a human.

- **Tenant:** `hackathon26_371 / DefaultTenant` (staging) · **Solution:** `c60aa117-…`
- **Source of truth:** the single `ComplaintOrchestration/ComplaintOrchestration.bpmn`, exported
  from Studio Web. Final connector/agent/trigger wiring is done in **Studio Web** (authoritative);
  re-download before editing locally.

> **State / honesty note.** This is a working hackathon prototype, published and running, with
> known rough edges that are called out inline below. The latest local pull is 2026-06-18; some
> Studio Web wiring added after that (a `Quarantine` disposition value, the CAPA approval
> booleans) is verified from working notes, not a fresh pull.

---

## 1. What it does — the complaint lifecycle, end to end

The process is **one long-running orchestration over a single Data Fabric record**
(`ComplaintsData`). The record's `Gate` field — **Intake → Triage → Investigation → CAPA →
Closed** — is the state machine. The process **pauses at "Record Updated" wait points** and
resumes when a human advances the Gate in a cockpit app.

**Trigger.** The deployed package registers a **manual trigger** as its entry point
(`entry-points.json`). The Intake stage creates the case; thereafter each stage is gated by a
Data Fabric *record-update* event keyed on the `Gate` value.

### Stage 1 — INTAKE *(automated)*
- **Fetch Complaint Email** — Outlook 365 connector (`getNewestEmail`) reads the newest unread
  mail from the monitored mailbox folder.
- **Extract Complaint (Agent)** — the *ExtractComplaint* agent returns structured fields
  (customer, product, batch, order no., quantity affected, summary, confidence) and **classifies**
  the complaint into one of four types: *QuantityDiscrepancy, ColdChain, QualityDeficit, Other*.
- **Create Record** — a Data Fabric record is created at **Gate = Triage**.

### Stage 2 — TRIAGE *(human only — no automation)*
A customer-service reviewer opens the case in the cockpit app, **validates/edits the extracted
fields**, and chooses: advance to **Investigation**, request more info (**RFI** → case parked at
`AwaitingInfo`), or **reject** (**Mark as no complaint** → `Gate=Closed`, `CaseStatus=NoComplaint`).
Advancing the Gate fires the next stage.

### Stage 3 — INVESTIGATION *(automated; starts on Gate→Investigation)*
- Waits for the "Record Updated" event, then **runs two RPA robots in parallel**:
  - **Gather Evidence (Sales Order)** — drives the mock ERP for order lines, unit price, amounts.
  - **Gather Temperature Logs (Portal)** — drives the cold-chain web portal
    (`nord-cold-logistics.vercel.app`) for min/max temperature, excursion hours, logger presence.
- **Investigation Agent** reasons over the evidence and **suggests** a disposition
  (BackToStock / Quarantine) and a **finance direction** (Credit / Debit / None) with an amount
  and written findings.
- **Write Investigation** persists the suggestion + findings; stage ends at **"Awaiting approval."**

### Stage 4 — CAPA *(automated; starts on Gate→CAPA, i.e. after human approval)*
- Waits for the "Record Updated" event (filter `Gate == CAPA`), reads the human-approved flags,
  and routes via exclusive gateways:
  - **Adjust Inventory** (if approved) — RPA `ExecuteDisposition` sets batch status in the ERP.
  - **Issue Credit Note** *or* **Issue Debit Note** (if approved) — RPA `PostToErp` posts the
    financial correction.
- **Close Record** → **Gate = Closed**.

### Terminal states
- **CLOSED** — resolved (disposition + any finance note executed).
- **CLOSED / NoComplaint** — rejected at triage.
- *(Parked, non-terminal:* `AwaitingInfo` — RFI sent, awaiting customer reply.)*

---

## 2. UiPath components used

| Component | How it's used here | Depth |
|---|---|---|
| **Maestro BPMN (Process Orchestration)** | The orchestration spine: one long-running process, 3 collapsed subprocesses, a **parallel gateway** (two robots concurrently), three **exclusive gateways**, and **Data Fabric event-wait** nodes that pause for human gates and resume on Gate changes. | **Deep** |
| **Data Fabric / Data Service** | Single source-of-truth entity **`ComplaintsData`** (~30 fields incl. choice sets, booleans, and **FILE attachment fields** `ProofImage`/`DeliveryNote`). It is the case state, the inter-stage hand-off (no Maestro variables threaded), the cockpit's data store, **and** the event source for stage triggering. | **Deep** |
| **Integration Service connectors** | **Microsoft Outlook 365** (`getNewestEmail`) for intake; **UiPath Data Fabric** connector for record **create**, **update**, and two **"Record Updated" event waits** (filtered on `Gate`). | **Deep** (2 connectors, 5 nodes incl. event triggers) |
| **Agent Builder (low-code agents)** | Two purpose-built low-code agents — **ExtractComplaint** and **InvestigationAgent** — each `type:lowCode`, model **`anthropic.claude-sonnet-4-6`**, temperature 0, with real GDP decision prompts and typed JSON I/O. Invoked from BPMN via `Orchestrator.StartAgentJob`. | **Deep** |
| **AI Trust Layer / LLM Gateway** | The agents run on UiPath-hosted Claude Sonnet 4.6 through the platform model gateway. | Light (platform-provided) |
| **Orchestrator** | Hosts/runs the agent jobs and RPA jobs (consolidated into the **Shared** folder); the BPMN binds them by release key via `StartJob` / `StartAgentJob`. | Medium |
| **RPA (UiPath Studio + UI Automation)** | The `ErpRobots` project: **GatherEvidence, ExecuteDisposition, PostToErp** drive a **desktop mock-ERP (Electron)** via UI Automation selectors; **GatherTempLogs** drives a **web portal** via browser automation. Fully deterministic. | **Deep** |
| **UiPath Apps — Coded Web App + TypeScript SDK** | **`complaint-tracker`** — React 19 + TypeScript + Vite, deployed as a UiPath Coded Web App, using **`@uipath/uipath-typescript`** to read/write `ComplaintsData`. The human cockpit / HITL surface. | **Deep** |
| **Document Understanding / IXP** | Wired in the `HandleEmailAttachments` robot (Outlook attachment → "Extract Document Data" → Data Fabric). | **Light / partial** — real IXP activity wired in one robot; the parallel `ExtractDeliveryNote` robot's extraction is **stubbed (hardcoded values, explicit TODO)** |
| **Test Cloud / Agent evals** | Both agents have eval **scaffolding** (LLM-judge evaluators defined). Repo also has dependency-free JS oracle suites (decision logic 32/32, intake parser 40/40). | **Light — thin:** **0 eval test cases** authored; the JS suites are not UiPath Test Cloud |
| **Action Center** | **Not used in this BPMN solution.** HITL is a **custom coded web app + Data Fabric `Gate` field**, not Action Center tasks. | n/a |

---

## 3. The agentic pieces — reasoning vs. execution vs. human gates

### AI agents that REASON / DECIDE (2 agents, Claude Sonnet 4.6, low-code Agent Builder)
- **ExtractComplaint** — interprets the unstructured email into structured data and **classifies**
  the complaint into one of four GDP categories with a confidence score; instructed never to
  invent values. *(No tools — a single structured LLM call.)*
- **InvestigationAgent** — the substantive reasoner. Given the complaint type + ERP order data +
  cold-chain readings (spec 2–8 °C), it **assesses and recommends** a disposition and a finance
  direction:
  - Quantity discrepancy → no physical action; **Credit** (short) or **Debit** (over).
  - Cold-chain → logger missing or confirmed excursion ⇒ cold chain unprovable ⇒ **Quarantine +
    Credit**; within spec ⇒ **BackToStock**, no finance.
  - Quality deficit → always **Quarantine + Credit**.
  - **GDP guardrail by design:** the agent **never recommends "Destroy."** Goods that can't return
    to stock go to **Quarantine first**; destruction is a later human decision. The agent assesses;
    it does not dispose.

### Robots that EXECUTE deterministically (no AI inside)
- **GatherEvidence / GatherTempLogs** — read-only evidence collection (ERP via UI automation; portal
  via browser automation); pure parsing/regex.
- **ExecuteDisposition** — sets batch status in the ERP.
- **PostToErp** — posts a credit or debit note in the ERP.

### Human-in-the-loop gates (in the `complaint-tracker` app, via the `Gate` field)
- **Triage gate (Customer Service):** validate/correct the agent's extraction; decide proceed /
  request-info / reject. *Nothing automated runs until a human advances the Gate.*
- **Investigation-approval gate (QA / decision-maker):** the agent's `suggestedAction` is shown
  **read-only as a suggestion**; the human sets **`ApprovedAction`**, an optional `FinanceAmount`,
  and ticks **which CAPA steps may run** (`ApproveAdjustInventory`, `ApproveCredit`, `ApproveDebit`).
  Those booleans are exactly what the CAPA exclusive gateways branch on.

**The line judges care about:** agents **extract and recommend**, robots **gather and execute**, and
**no inventory change or financial posting happens without a human approving it**. The agent is
structurally prevented from triggering destruction.

### Honest caveats
- The disposition target passed to `ExecuteDisposition` is a binary `ApprovedAction==0 ? "Available"
  : "Destroyed"` mapping, which doesn't yet cleanly cover the agent's *Quarantine* recommendation
  or the ERP's exact status values — a known mapping gap.
- The CAPA gateways read approval-boolean columns added **after** the trigger's typed-schema
  snapshot — a known Maestro quirk managed by regenerating the schema in Studio Web.
- The final **"Close Record" service task is currently an empty (unwired) node** in the deployed
  file — the close-out Data Fabric write was still to be wired in Studio Web.
- `linkedComplaints` (cross-complaint correlation) is **stubbed** to always-empty in the
  Investigation agent.

---

## 4. Coding-agent angle — was Claude Code used to build it?

**Yes — Claude Code (Anthropic's CLI) was the primary development environment**, used in the CLI and
the VS Code extension against this repo. The evidence is structural and documented:

- The repo is **organized around Claude Code**: a detailed root `CLAUDE.md`, per-solution
  `CLAUDE.md`/`AGENTS.md`, and a persistent project memory log of build/debug sessions.
- The design/wiring docs are **Claude-authored** — `WIRING-REFERENCE.md` (resolving every
  robot/agent release key, folder, and I/O mapping) and `SOURCE-OF-TRUTH.md`.

**Concretely, what Claude Code produced (meaningfully integrated, not just referenced):**

1. **The Maestro BPMN model itself** — the skeleton, the parallel/exclusive gateways, and the
   runtime expressions in the deployed file (e.g. `in_TargetStatus = ApprovedAction==0 ? "Available"
   : "Destroyed"`, the `ExtractedType` numeric-to-label map fed to the agent, and the CAPA gateway
   conditions `=js:(vars.responseCapaTrig.ApproveCredit == true)`). Claude Code authored/validated
   the XML; the user finalized connector/agent **binds in Studio Web** (the documented
   CLI-vs-Studio-Web split).
2. **The two Agent Builder agents' decision logic** — the GDP system prompts, the 4-category
   classifier, and the quarantine-first / never-destroy investigation rules; wired into the live
   BPMN via `StartAgentJob`.
3. **The `ErpRobots` RPA workflows** — scaffolded as XAML (GatherEvidence, GatherTempLogs,
   ExecuteDisposition, PostToErp, + helpers), with honest in-workflow scaffolding markers (e.g.
   `ExtractDeliveryNote` logs *"IXP/Document Understanding extraction is SCAFFOLDED. TODO…"*).
4. **The `complaint-tracker` coded web app** — the React + TypeScript + UiPath SDK cockpit that is
   the HITL surface; the memory log records Claude Code debugging its OAuth `baseUrl`/redirect-port
   and Data Fabric field wiring.
5. **The deterministic "oracle" layer + mock environment** — the dependency-free JS decision/intake
   suites (the test contract) and the two Electron mock apps (mock-ERP, mock-cockpit) + seed data.

**Honest scoping.** Claude Code did the authoring, scaffolding, validation, and binding-resolution;
the human did the final **Studio Web wiring** (IS connections, agent `StartAgentJob` binds, event
triggers) — a split documented because the CLI couldn't surface agent-type processes on this tenant.
There is no per-file "generated by Claude" stamp; the attribution rests on the Claude-authored design
docs and the project's Claude Code working memory — accurate to represent as "built with Claude Code,"
not "fully auto-generated end-to-end."
