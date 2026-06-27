# GDP Decision Logic

Standalone, unit-tested decision functions for the complaint case — built per
`CLAUDE.md` build-order step 2 ("implement as standalone, unit-tested functions
FIRST, then port to UiPath DMN").

These are the deterministic brains behind the Maestro Case **`process`** tasks
(currently placeholders in `MaestroCase/ComplaintCase/caseplan.json`):

| Function (`decisions.js`) | Drives the case task |
|---|---|
| `gdp63Gate(criteria)` | informs the RP disposition (Gate 3) — BACK_TO_STOCK vs DESTROY; UNKNOWN→FALSE |
| `classifyFamily(text)` | the intake family A/B/C (until the intake agent is corrected) |
| `routePolicy(input, policies)` | **PolicyRouter** (Stage 7) — PATH_A / PATH_B / COMMERCIAL |
| `deriveSubCondition(family, facts)` | builds the policy-table sub_condition from case facts |
| `financeDirection(scenario)` | **DetermineFinanceDirection** (Stage 5) — CREDIT/DEBIT/NONE |
| `pairNetsToZero(a, b)` | correlated-pair company-level reconciliation (CMP-1006↔1007) |

## Run the tests

```
node "decision-logic/run-tests.js"
```

Asserts every function against the 9 seed cases in
`02. Mock Data/gdp_mockdata/cases/seed_cases.json`, using their `expected_*`
fields (and `disposition_policies.json`) as oracles. **32 assertions, all passing.**

## Porting to UiPath DMN
Each function maps to one DMN decision table:
- 6.3 gate → 5 boolean/UNKNOWN inputs → disposition (single-output, "all TRUE" hit policy).
- policy router → product + family + sub_condition → path (first-match, `*` wildcard — matches `disposition_policies.json` exactly).
- finance direction → family + disposition + qty delta → direction.
Wire each DMN as the implementation of its `process` task, replacing the placeholder.
