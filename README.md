# GDP-Compliant Automated Complaint Handling with Humans in the Loop

**Team RoboRana — UiPath AgentHack 2026 (Track 2: Maestro BPMN)**

An agentic, GDP-compliant complaint-handling system for pharmaceutical wholesale distribution, built as a BPMN flow on UiPath Maestro. AI agents extract and assess, RPA robots gather evidence and execute in business systems, and every regulated decision stays with a human.

**We are a wholesale distributor** (warehouse + logistics for medicines), not the manufacturer.

---

## Links

### Demo Videos
| # | Title | Link |
|---|---|---|
| 1 | Business Case | [Watch](https://youtu.be/xlerdKv3sWI) |
| 2 | Quantity Discrepancy | [Watch](https://youtu.be/UoqnSjhRh4Q) |
| 3 | Quality Deficit | [Watch](https://youtu.be/7ph6AheR7ws) |
| 4 | Temperature Dispersion | [Watch](https://youtu.be/Gf6HxlYZEnU) |
| 5 | Use of Coding Agents | [Watch](https://youtu.be/R348ZA8Dn84) |

### Repository
- **GitHub:** https://github.com/maarten-st/GdpComplaintSystem

### UiPath Orchestrator
- **Orchestrator:** https://staging.uipath.com/hackathon26_371

---

## Project Description

### The Problem
In pharmaceutical wholesale distribution, a customer complaint about a medicine shipment is a **regulated event** under EU Good Distribution Practice (GDP, 2013/C 343/01, Chapter 6). Each complaint must be investigated, root-caused, and resolved with a documented, auditable disposition. Handled manually, this is slow, inconsistent, and hard to audit — and a wrong release-or-destroy decision is both a compliance breach and a patient-safety risk.

### What It Does
The solution drives a complaint from inbound email to closed case, end to end:

1. **Intake (automated).** A robot fetches the complaint email (Outlook 365) and processes attachments (storing photos in Data Fabric and extracting delivery-note data). An AI agent extracts the structured fields (customer, product, batch, order number, quantity, summary) and classifies the complaint into one of four GDP categories: **quantity discrepancy, cold-chain (temperature) deviation, quality deficit, or other.** A case record is created at `Gate = Triage`.
2. **Triage (human + automated).** A Customer Service reviewer validates the extracted data and chooses: proceed, request more information (a robot emails the customer), or mark as "not a claim" (the case closes).
3. **Investigation (automated).** In parallel, robots gather sales-order evidence from the ERP and temperature logs from a cold-chain portal. An investigation agent reasons over the evidence and **suggests** a disposition and finance direction. The case pauses at "Awaiting approval."
4. **CAPA — Corrective and Preventive Action (automated after approval).** A Quality Assurance reviewer approves which steps may run. Robots then adjust inventory, post a credit or debit note in the ERP, and close the record at `Gate = Closed`.

### What Makes It Unique
- **Humans decide, by design.** Agents extract and recommend; robots execute deterministically; **every regulated decision requires a named human at a Gate.** The agent is structurally prevented from recommending destruction — goods that cannot return to stock go to quarantine first.
- **Data integrity built in.** The flow is designed so that the GDP ALCOA+ data-integrity principles (Attributable, Legible, Contemporaneous, Original, Accurate, Complete, Consistent, Enduring, Available) are satisfied by construction, not bolted on.
- **One auditable orchestration** over a single Data Service record whose `Gate` field is the state machine.

---

## Architecture at a Glance

```
Email ──▶ INTAKE (robot + agent) ──▶ TRIAGE (human + automated) ──▶ INVESTIGATION (robots ×2 + agent)
                                                                              │
                                                           (agent suggests, human approves)
                                                                              ▼
                                                CAPA (human approval + robots) ──▶ CLOSED
                      Monitored end-to-end via the GDP Complaint Tracker (Coded Web App)
```

**Legend:** Agents reason & suggest · Humans decide at every Gate · Robots gather & execute.

---

## UiPath Components Used

| Component | How it is used |
|---|---|
| **UiPath Maestro BPMN** | The orchestration spine: one long-running BPMN process with collapsed subprocesses, a parallel gateway (two robots concurrently), exclusive gateways, and event-wait nodes that pause for human gates and resume on `Gate` changes. |
| **Data Fabric / Data Service** | Single source of truth (`ComplaintsData` entity). It is the case state, the inter-stage hand-off, the cockpit's data store, and the event source that triggers each stage. |
| **Agent Builder** | Two purpose-built agents (see Agent Type below): complaint extraction/classification and investigation. |
| **Integration Service** | Microsoft Outlook 365 connector for email intake; Data Fabric connector for record create/update and "Record Updated" event waits. |
| **Robotic Process Automation (RPA)** | Deterministic robots that gather sales-order evidence and temperature logs, and execute disposition and financial postings against the mock ERP desktop application. |
| **Coded Web App (UiPath Apps + TypeScript SDK)** | The GDP Complaint Tracker — a React + TypeScript human-in-the-loop cockpit that reads/writes the case record. |
| **IXP / Document Understanding** | Used in attachment handling to extract delivery-note data. |
| **Orchestrator** | Hosts and runs the agent and RPA jobs; the BPMN binds them by release key. |

**Other technologies:** Claude Code (UiPath for Coding Agents), Claude Opus 4.8, Outlook 365, a mock ERP desktop application, and a cold-chain web portal.

---

## Agent Type

**This solution uses Low-code Agents (built with UiPath Agent Builder).**

There are two low-code agents, both authored in Agent Builder and running on a UiPath-hosted Claude model:

1. **Complaint Extraction & Classification agent** — interprets the unstructured complaint email into structured fields and classifies it into one of the four GDP categories, with a confidence score. It is instructed never to invent values.
2. **Investigation agent** — reasons over the complaint type, ERP order data, and cold-chain readings, and **suggests** a disposition (return-to-stock or quarantine) and a finance direction (credit, debit, or none). It never makes the decision and never recommends destruction.

> **Agent Type summary: Low-code Agents only** (no Coded Agents). Reasoning lives in the two Agent Builder agents; deterministic execution lives in RPA robots; decisions live with human gates.

---

## Setup Instructions

> **Note for judges:** the steps below describe how to configure and run the solution. Items marked **[verify]** should be confirmed against the deployed tenant before judging.

### Prerequisites
- A UiPath Automation Cloud tenant with **Maestro**, **Agent Builder**, **Data Fabric / Data Service**, **Integration Service**, **Orchestrator**, and **Apps** enabled.
- A Microsoft Outlook 365 account/mailbox for complaint intake.
- The mock ERP desktop application and the cold-chain portal running and reachable.

### 1. Clone the Repository
```bash
git clone https://github.com/maarten-st/GdpComplaintSystem.git
cd GdpComplaintSystem
```

### 2. Provision the Mock Environment
- Start the mock ERP desktop application: `cd Mock-Apps/mock-erp && npm install && npm start`
- Start the mock Case cockpit: `cd Mock-Apps/mock-cockpit && npm install && npm start`
- Load the seed data (orders, batches, temperature logs) from `Mock-Data/gdp_mockdata/`.

### 3. Set Up the Data Service Entity
- Import / confirm the `ComplaintsData` entity (fields incl. customer, product, batch, order number, quantity, `Gate`, disposition, approval flags, and attachment fields). Schema reference: `Mock-Data/_complaints-entity.json`.

### 4. Configure Integration Service Connections
- Create a **Microsoft Outlook 365** connection (OAuth sign-in to the complaint mailbox).
- Confirm the **Data Fabric** connection is active.

### 5. Deploy the Agents and Robots
- Publish the two **Agent Builder** agents and bind them in the BPMN via `StartAgentJob`. **[verify: release keys / folder]**
- Publish the **RPA** workflows (`ErpRobots`) to Orchestrator. **[verify: folder / asset `GDP_MOCKERP_HOME`]**

### 6. Deploy the Coded Web App (GDP Complaint Tracker)
- Build and publish the React + TypeScript app: `cd Coded-Apps/complaint-tracker && npm install && npm run dev`

### 7. Deploy and Run the Maestro BPMN Process
- Deploy `ComplaintOrchestration` to the target folder. **[verify: solution/folder `ComplaintOrchestrationSolution`]**
- Register the trigger and confirm all connections are bound (`bindings_v2.json`).

### 8. Run an End-to-End Test
- Send a complaint email to the monitored mailbox (structured body: order number, batch, quantity affected, complaint text). Sample emails are in `Mock-Data/gdp_mockdata/email_templates/`.
- Follow the case in the GDP Complaint Tracker app: Intake → Triage → Investigation → CAPA → Closed.
- Approve the human gates to advance the case; confirm the ERP and finance records update.

### Quick Validation (no UiPath tenant needed)
```bash
# Run decision-logic tests (32 assertions, no install needed)
node Decision-Logic/decision-logic/run-tests.js

# Run email intake parser tests (40 assertions)
node Decision-Logic/intake-parser/run-tests.js

# Render case documents to HTML
node Documents/generate.js
```

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

---

## Team RoboRana

- **Sabrina Ben Haddou** — Automation & AI Analyst
- **Maarten Steurs** — Technical Lead
- **Bert Provoost** — Solution Architect

*Built with UiPath Maestro and Claude Code.*
