# GDP Complaint Management — Mock Data Package

All fabricated data for the UiPath AgentHack (Track 1 · Maestro Case) pharma complaint solution.
Everything here is consistent: orders reference real customers/products/batches; seed cases
reference real orders; the correlation pair shares a dispatch reference.

## Format convention
- **CSV** = master data (flat, robot-friendly, eyeball-able). Lives in `master_data/` and `temperature_logs/`.
- **JSON** = anything nested: seed cases, policies, document templates.
- **.txt** = email templates (with `{{placeholders}}` for outbound).

## Folder map

### master_data/  (CSV)
| file | rows | purpose |
|---|---|---|
| products.csv | 10 | product master; `cold_chain` Y/N + `excursion_budget_hours` drive Family B logic |
| customers.csv | 15 | `type` drives the return window: wholesaler=10 days, pharmacy/hospital=5 days |
| batches.csv | 20 | 2 per product; `status` = Available/Quarantine/Blocked — the batch state machine |
| orders.csv | 50 | order header; `dispatch_ref` is the correlation key |
| order_lines.csv | ~95 | `qty_ordered` vs `qty_shipped` — discrepancies live here |

### policies/  (JSON)
- `disposition_policies.json` — the **Path-A routing table**. Matched top-to-bottom, first match wins, `*` = wildcard. Outputs: `PATH_A_ALWAYS_DESTROY`, `PATH_B_CASE_BY_CASE`, `COMMERCIAL_LANE`. Feed this into a DMN table.

### temperature_logs/  (CSV, Family B)
- `logger_CMP-B1_within_budget.csv` — ~3h excursion, peak 10.9°C, **within** P006's 8h budget → back-to-stock.
- `logger_CMP-B2_breach.csv` — ~14h excursion, peak 22.4°C, **breaches** P004's 6h budget → destroy.
- `logger_CMP-B3_missing.csv` — header only, no data rows → storage history **UNKNOWN** → treated as fail → destroy.

### cases/  (JSON)
- `seed_cases.json` — **9 cases, one per demo path.** Each has `expected_route`, `expected_disposition`, `expected_finance`, and (where relevant) the pre-scored `criteria_6_3`. This doubles as your demo script.

### email_templates/  (.txt)
- 9 `INBOUND_complaint_CMP-100x.txt` — the trigger emails (one per case; one is deliberately vague for the RFI demo; phrasings vary so the intake agent has real work to do).
- 5 `OUTBOUND_*.txt` — acknowledgement, RFI, resolution (credit), redelivery, destruction confirmation. Use `{{placeholders}}`.

### document_templates/  (JSON schemas)
Each is the **source-of-truth data object** the case carries. Render to HTML/PDF for humans (see `sample_dossier_render.html` for the pattern).
- `dossier_template.json` — the QA/RP review pack incl. the 6.3 checklist.
- `credit_debit_note_template.json` — `status` DRAFT→POSTED→REVERSED supports the Saga case.
- `certificate_of_destruction_template.json`
- `deviation_capa_template.json`
- `audit_trail_template.json` — Maestro's event log, formatted for export.

## The 9 seed cases at a glance
| Case | Family | Demo path |
|---|---|---|
| CMP-1001 | A | Path A clean destroy + full credit |
| CMP-1002 | B | Path B, excursion within budget → back-to-stock |
| CMP-1003 | B | Path A, vaccine zero-tolerance breach → destroy |
| CMP-1004 | B | Missing logger → UNKNOWN-as-fail → destroy |
| CMP-1005 | C | Commercial lane (no QA gate), QA notified only |
| CMP-1006 | C | Correlation pair — short side |
| CMP-1007 | C | Correlation pair — surplus side (shares DISP-9031) |
| CMP-1008 | A | **Saga showpiece**: Path A, credit posted, RP overrides → reversal + CAPA |
| CMP-1009 | A | **Interruption**: incomplete → RFI → parked → resume |

## Suggested load order into UiPath
1. Import the 5 CSVs into Data Fabric entities (or your mock ERP desktop app's store).
2. Load `disposition_policies.json` into a DMN decision table.
3. Drop the inbound emails into the mailbox the intake agent watches.
4. Use `seed_cases.json` as both the expected-result oracle and the demo run-sheet.

> Domain rules per EU GDP 2013/C 343/01 Ch.6; simplified for a hackathon prototype.
> Production disposition always defers to the qualified RP under company SOPs.
