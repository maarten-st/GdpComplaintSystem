# GDP Complaint Management on UiPath Maestro Case

A working agentic solution for **UiPath AgentHack, Track 1 (Maestro Case)**: pharma
B2B customer-complaint handling, end-to-end, under **EU GDP 2013/C 343/01 Ch.6**.
A customer emails a complaint → AI agents triage & investigate → RPA robots read/write
two mock desktop systems → **humans make every regulated decision** (5 HITL gates) →
the case resolves with the right physical action (return / redelivery / destruction)
and financial correction (credit / debit), with a full audit trail.

We are a **wholesale distributor**, not the manufacturer. See `01. Project Summary/gdp_team_briefing.html`
for the full domain explainer.

---

## What's in this repo

| Path | What it is | Status |
|---|---|---|
| `MaestroCase/` | **The UiPath Maestro Case** (`ComplaintCase/caseplan.json`, V20) — 13 stages, 5 HITL gates, Path-A fork + Saga compensation, lane split, 64 conditions, SLAs. **Published to Studio Web.** | ✅ Valid |
| `decision-logic/` | The deterministic brains: GDP 6.3 gate, family classifier, policy router, finance direction (port to DMN). | ✅ 32/32 tests |
| `intake-parser/` | Email-intake extractor (oracle/fallback for the intake agent). | ✅ 40/40 tests |
| `documents/` | JSON→HTML renderers: dossier, credit/debit note, certificate of destruction. | ✅ 4 samples |
| `mock-erp/` | Mock **ERP** desktop app (Electron) — sales orders, batch state machine, postings. The robot drives this. | ✅ runnable |
| `mock-cockpit/` | Mock **Case cockpit** (Electron) — case inbox, dossier view, the 5 gate approvals, metrics. | ✅ runnable |
| `02. Mock Data/` | All fabricated master data, policies, seed cases, email + document templates. | (provided) |
| `sdd.md`, `tasks/` | The case design blueprint + the 188-entry build plan + registry resolutions + build-issues log. | ✅ |

## The flow (one line)
Intake (agent extracts + robot pulls the sales order) → **Gate 1 triage (CS)** → acknowledge +
completeness (RFI/park if incomplete) → cross-case correlation → family-specific investigation →
**lane split** (commercial vs QA) → dossier + 6.3 scoring → **Gate 2 (QA)** → policy router →
**Path A** (fork: RP ratifies while logistics/finance prepare reversibly; Saga compensation on
override) or **Path B** (RP decides) → **Gate 3 disposition (RP)** → batch state machine
(QUARANTINE → AVAILABLE/BLOCKED, destruction always after RP) → **Gate 4 logistics** +
**Gate 5 finance** → close.

## Run the pieces
```bash
# Decision logic — 32 assertions vs the 9 seed cases
node "decision-logic/run-tests.js"

# Email intake parser — 40 assertions vs the 9 inbound emails
node "intake-parser/run-tests.js"

# Render the case documents to HTML (documents/out/)
node "documents/generate.js"

# Mock ERP desktop app (the robot drives this)
cd mock-erp && npm install && npm start

# Mock Case cockpit (the personas act here)
cd mock-cockpit && npm install && npm start

# The Maestro Case (validate / publish)  — set staging + log in first
$env:UIPATH_URL = "https://staging.uipath.com"
uip maestro case validate "MaestroCase/ComplaintCase/caseplan.json" --output json
uip solution upload "MaestroCase" --output json
```

## The 9 demo cases (each a distinct path)
| Case | Family | Path |
|---|---|---|
| CMP-1001 | A | Path A clean destroy + full credit |
| CMP-1002 | B | Path B, excursion within budget → back-to-stock |
| CMP-1003 | B | Path A, vaccine zero-tolerance breach → destroy |
| CMP-1004 | B | Missing logger → **UNKNOWN-as-fail** → destroy |
| CMP-1005 | C | Commercial lane (no QA gate), QA notified only |
| CMP-1006 / 1007 | C | Cross-case correlation pair (shared DISP-9031) |
| CMP-1008 | A | **Saga showpiece**: credit posted, RP overrides → reversal + CAPA |
| CMP-1009 | A | **Interruption**: incomplete → RFI → parked → resume |

## Remaining (platform-side UiPath)
The case is built/validated/published; the **corrected v2 `ComplaintIntakeAgent`** (families A/B/C,
deployed v2.0.0) and the `gdp-complaint-intake` Action App (Gate 1) are wired — `ExtractComplaint`
now produces `family`/`severity`/`qtyAffected`, so the lane split and policy router branch on real
intake. Still to do — see `tasks/build-issues.md`:
- Publish the correlation/dossier agents, the RPA robots (driving the apps above), the decision **processes/DMN** (port `decision-logic/`), and the outbound-email APIs, then bind them to the 18 placeholder tasks.
- Add the code-resolution `process` task (port `intake-parser/resolve-entities.js`) to map the agent's customer/product **names** → `customerCode`/`productCode`.
- Provision the Office 365 Outlook connection for the email-received trigger.

> Domain rules simplified for a hackathon prototype; production disposition always defers to the qualified RP under company SOPs.
