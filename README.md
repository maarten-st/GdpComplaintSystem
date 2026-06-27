# GDP Complaint System

Agentic solution for **UiPath AgentHack, Track 1 (Maestro Case)** and **Track 2 (BPMN Orchestration)**.

Handles pharma B2B customer complaints end-to-end under **EU GDP 2013/C 343/01, Ch.6** (Good Distribution Practice): customer emails a complaint → AI agents triage & investigate → RPA robots read/write mock desktop business systems → humans make every regulated decision (5 HITL gates) → case resolves with the right physical action (return / redelivery / destruction) and financial correction (credit / debit note), with a full audit trail.

**We are a wholesale distributor** (warehouse + logistics for medicines), not the manufacturer.

---

## Folder Structure

```
GdpComplaintSystem/
├── README.md                  ← this file
│
├── Maestro-BPMN/              ← Track 2: long-running BPMN orchestration over Data Fabric
├── RPA-Flows/                 ← UiPath RPA XAML workflows (ErpRobots)
├── Coded-Apps/                ← React/Vite coded apps (complaint-tracker, intake form, gate apps)
├── Mock-Apps/                 ← Electron desktop mock apps (ERP + case cockpit)
├── Mock-Data/                 ← All fabricated data, seed cases, master CSVs
├── Decision-Logic/            ← Node.js decision oracles + test suites (no dependencies)
├── Documents/                 ← JSON→HTML renderers (dossier, credit/debit notes)
├── Demos/                     ← Demo scripts, submission deck, domain briefing
└── Project-Docs/              ← Specs, SDD, process diagrams, build status
```

> **Note:** The Maestro Case definition and solution (Track 1 `caseplan.json`, 13 stages, 33 tasks) lives in the separate source repo `uipath-maestro-test/MaestroCase/` and is published to Studio Web. It is not duplicated here.

---

## Quick Start

```bash
# Run decision-logic tests (32 assertions, no install needed)
node Decision-Logic/decision-logic/run-tests.js

# Run email intake parser tests (40 assertions)
node Decision-Logic/intake-parser/run-tests.js

# Render case documents to HTML
node Documents/generate.js

# Start mock ERP desktop app (robot drives this)
cd Mock-Apps/mock-erp && npm install && npm start

# Start mock Case cockpit
cd Mock-Apps/mock-cockpit && npm install && npm start

# Start complaint tracker CodeApp (dev mode)
cd Coded-Apps/complaint-tracker && npm install && npm run dev
```

---

## Maestro-BPMN

**Track 2 submission.** A long-running BPMN process over a Data Fabric `ComplaintsData` record.
Human gates control stage transitions via the `Gate` field.

Key files:
- `ComplaintOrchestration/ComplaintOrchestration.bpmn` — the master orchestration (4 stages)
- `ComplaintOrchestration/bindings_v2.json` — connector bindings
- `ComplaintOrchestration/WIRING-REFERENCE.md` — agent/RPA job mapping reference
- `README.md` — full architecture and publish commands

> **Source of truth is Studio Web.** Re-download before editing. See `SOURCE-OF-TRUTH.md`.

---

## RPA-Flows

UiPath RPA project (`ErpRobots`) — 10 XAML workflows that drive the mock ERP desktop app via UI automation.

| Workflow | Purpose |
|---|---|
| `GatherEvidence.xaml` | Read sales orders from ERP |
| `GatherTempLogs.xaml` | Scrape cold-chain portal |
| `ExecuteDisposition.xaml` | Set batch status (Quarantine / Available / Blocked) |
| `PostToErp.xaml` | Write credit/debit notes |
| `EnsureMockErpOpen.xaml` | App initialization |
| `HandleEmailAttachments.xaml` | Process email attachments |
| `ExtractDeliveryNote.xaml` | Document extraction (stub) |
| `BackfillFields.xaml` | Field population |

See `RPA-REUSE-MAP.md` for the mapping of BPMN RPA calls to XAML workflows with argument details.

---

## Coded-Apps

| App | Path | Purpose |
|---|---|---|
| `complaint-tracker` | `Coded-Apps/complaint-tracker/` | React 19 CodeApp — human UI for complaint management over Data Fabric |
| `gdp-complaint-intake` | `Coded-Apps/gdp-complaint-intake/` | Gate 1 action app — triage validation form |
| `gate-apps` | `Coded-Apps/gate-apps/` | Additional HITL gate approval apps |

Each app has its own `package.json`. Run `npm install && npm run dev` inside each folder.

---

## Mock-Apps

Two Electron desktop apps that the RPA robots drive via UI automation.

| App | Purpose |
|---|---|
| `mock-erp/` | Mock ERP — sales orders, batch status, credit/debit notes. Reads master CSVs; persists robot writes to `batch-overrides.json` and `postings.json`. |
| `mock-cockpit/` | Mock Case cockpit — case inbox, dossier view, the 5 HITL gate approvals, metrics. |

Run `npm install && npm start` in each folder. `node_modules/` is excluded — regenerate locally.

---

## Mock-Data

All fabricated test data. The canonical data root for every script is `gdp_mockdata/`.

| File / Folder | Contents |
|---|---|
| `gdp_mockdata/cases/seed_cases.json` | **9 seed cases** — one per demo path; `expected_route/disposition/finance` are the test oracles |
| `gdp_mockdata/customers/` | Customer master (B2B: pharmacies, hospitals, wholesalers) |
| `gdp_mockdata/products/` | Product master (batches, expiry, cold-chain requirements) |
| `gdp_mockdata/policies/` | GDP policy rules |
| `gdp_mockdata/emails/` | Inbound complaint email templates |
| `gdp_mockdata/document_templates/` | Dossier, credit/debit note, certificate templates |
| `_complaints-entity.json` | Data Fabric `ComplaintsData` entity schema |
| `_complaints-seed.json` | Seed records for the CodeApp |

---

## Decision-Logic

Dependency-free Node.js modules — the deterministic "brains" and regression contract.

| Module | Tests | Purpose |
|---|---|---|
| `decision-logic/decisions.js` | 32/32 | GDP 6.3 gate, family classifier, policy router, finance direction |
| `intake-parser/parse-email.js` | 40/40 | Email-intake extractor |
| `intake-parser/resolve-entities.js` | — | Name → customerCode/productCode resolver |

Run: `node decision-logic/run-tests.js` and `node intake-parser/run-tests.js`

---

## Documents

JSON→HTML renderers for case documents.

| File | Output |
|---|---|
| `render.js` | Dossier, credit/debit note, certificate of destruction |
| `generate.js` | Writes rendered HTML to `out/` |

Run: `node Documents/generate.js`

---

## Demos

| File | Purpose |
|---|---|
| `demo-run-robots.ps1` | Run all 6 RPA robots standalone on the demo VM (targets Shared folder) |
| `Submission deck.pptx` | Hackathon presentation slides |
| `GDP Investigation Copilot.docx` | Domain documentation |

---

## Project-Docs

| File / Folder | Purpose |
|---|---|
| `sdd.md` | **Full Case Definition Blueprint** — 13 stages, 33 tasks, all variables, entry/exit conditions, personas |
| `REBUILD-REQUIREMENTS.md` | Phase 2 simplified BPMN + Data Fabric architecture spec |
| `README.md` | Original project README (from `uipath-maestro-test`) |
| `01. Project Summary/` | `gdp_team_briefing.html` (domain, glossary, personas, scoring), process diagram |
| `tasks/build-issues.md` | **Live wiring status** — what is wired vs placeholder on the UiPath side |
| `tasks/tasks.md` | Build plan |
| `agent-spec/ComplaintIntakeAgent-v2.md` | Corrected intake-agent spec (families A/B/C) |
| `roborana_design_system.html` | Design system reference |

---

## The 9 Demo Cases

| Case | Family | Path |
|---|---|---|
| CMP-1001 | A | Path A clean destroy + full credit |
| CMP-1002 | B | Path B, excursion within budget → back-to-stock |
| CMP-1003 | B | Path A, vaccine zero-tolerance breach → destroy |
| CMP-1004 | B | Missing logger → UNKNOWN-as-fail → destroy |
| CMP-1005 | C | Commercial lane (no QA gate), QA notified only |
| CMP-1006/1007 | C | Cross-case correlation pair (shared DISP-9031) |
| CMP-1008 | A | Saga showpiece: credit posted, RP overrides → reversal + CAPA |
| CMP-1009 | A | Interruption: incomplete → RFI → parked → resume |

---

## Domain Rules (must not be softened)

- **GDP 6.3 gate:** returned goods go back to saleable stock only if **all five** criteria are TRUE. UNKNOWN = FALSE (cannot prove safety → destroy).
- **Destruction is irreversible** and always waits for RP (Responsible Person) authorization.
- **5 HITL gates, distinct owners:** 1 Triage (Customer Service), 2 Evidence/dossier (QA), 3 Disposition (RP), 4 Follow-up (Logistics), 5 Finance (Finance).
- **Complaint families: A (Quality defect) / B (Cold-chain) / C (Logistics).** Old `Counterfeit` category is dead.
- **`dispatch_ref` is the cross-case correlation key** (demo pair CMP-1006/CMP-1007 share `DISP-9031`).

---

## Out of Scope

- **Manual trigger:** For testing purposes the trigger is manual to easily test it. In reality we would configure an event-based trigger on a new email.
- **Limited case types:** Currently we focus only on 3 cases: quantity discrepancy, quality defect, and temperature deviation.
- **Attachment assumptions:** We assume every PDF is a delivery note and every image attachment is damage proof. We are aware that in reality we should add filters and checks for this.
- **Unconditional robot runs:** Currently both temperature logs and gather evidence are run every time. If we had capacity constraints it would be possible to run them only if needed, based on what the agent extracts.
- **Error handling:** We are aware that for several parts of the process error handling should be much more detailed.
- **Filtering bug:** There were some issues with filtering on both the complaint ID and the gate field that is changed by the user. We assume this is a platform bug.

---

## Source Repositories

| This folder | Source |
|---|---|
| `Maestro-BPMN/` | `new-project/ComplaintOrchestration-orchestrator` |
| `RPA-Flows/ErpRobots/` | `new-project/uipath-maestro-test/ErpRobots/` |
| `Coded-Apps/complaint-tracker/` | `new-project/uipath-test-codeapps-datafabric/complaint-tracker/` |
| `Coded-Apps/gdp-complaint-intake/` | `new-project/uipath-maestro-test/gdp-complaint-intake/` |
| `Coded-Apps/gate-apps/` | `new-project/uipath-maestro-test/gate-apps/` |
| `Mock-Apps/` | `new-project/uipath-maestro-test/mock-erp/` and `mock-cockpit/` |
| `Mock-Data/` | `new-project/uipath-maestro-test/02. Mock Data/` |
| `Decision-Logic/` | `new-project/uipath-maestro-test/decision-logic/` and `intake-parser/` |
| `Documents/` | `new-project/uipath-maestro-test/documents/` |
| `Project-Docs/` | `new-project/uipath-maestro-test/` (sdd.md, tasks/, etc.) |
| Maestro Case (not here) | `new-project/uipath-maestro-test/MaestroCase/` — published to Studio Web |
