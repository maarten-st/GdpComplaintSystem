# GDP Case Cockpit (Electron)

The persona-facing case-management cockpit — the human front-end for the 4+ personas.
Reuses the decision logic (`decision-logic/`) and the document renderer (`documents/`).

## Run
```
cd mock-cockpit
npm install      # already done — Electron 31
npm start
```

## Screens
1. **Case Inbox** — the 9 seed cases (id, customer, family badge, live status). Click a row →
2. **Case Detail** —
   - the **dossier** rendered inline (same renderer as `documents/`), with the GDP 6.3 checklist and the agent's recommended disposition (computed by `gdp63Gate` / `routePolicy`);
   - the **5 HITL gates** as approval cards, each tagged with its persona (Customer Service / QA Analyst / Responsible Person / Logistics / Finance) and decision buttons. Clicking records the decision + timestamp to `cockpit-state.json` and appends to the per-case **audit trail** shown below the gates.
3. **Metrics** — complaints by family, by expected disposition, by root cause (bar view).

## Maps to the Maestro Case
- The 5 gate cards mirror the case's 5 `action` tasks (TriageValidation, QaSignoff, DispositionDecision, LogisticsFollowup, FinanceApproval) — in production these surface via Action Center; this cockpit is the local demo stand-in.
- The dossier view is what the QA Analyst (Gate 2) and Responsible Person (Gate 3) review.
- `cockpit-state.json` is the audit-trail store (delete to reset the demo).

Together with `mock-erp/`, this is the **two-desktop-app** pair from the briefing: the robot drives the ERP, the personas act in the cockpit.
