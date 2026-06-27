# Data Fabric — `Complaints` column & choice-set additions

> **DRAFT — DO NOT RUN BLINDLY.** These `uip df` commands are the planned cloud
> mutation for Stream 1. They were **not executed** (guardrail: no tenant
> mutation from the build step). Run them yourself against the staging tenant,
> then paste the two generated `choiceSetId` UUIDs into
> `src/lib/config.ts` (`COMPLAINT_SUGGESTEDACTION_CHOICESET_ID` /
> `COMPLAINT_APPROVEDACTION_CHOICESET_ID`).
>
> Flag names vary by `uip` CLI version — confirm with `uip df --help`,
> `uip df entity --help`, `uip df entity field --help`, and
> `uip df choiceset --help` before running. The shapes below follow the
> documented `uip df` subcommand layout; adjust flag spelling if the CLI differs.

## Prerequisites

```powershell
$env:UIPATH_URL = "https://staging.uipath.com"
uip login                       # if not already authenticated
```

Target entity: `Complaints` — id `e28dd0a9-c065-f111-8fcb-000d3ab1a7ac`
(constant `COMPLAINTS_ENTITY_ID` in `src/lib/config.ts`).

---

## Step 1 — Create the two CHOICE sets FIRST

Both `SuggestedAction` and `ApprovedAction` use the **same** five values:
`BackToStock / Destroy / Credit / Debit / None`. Create two choice sets so the
suggestion and the human-approved value can diverge in audit.

```powershell
# SuggestedAction choice set
uip df choiceset create `
  --name "ComplaintSuggestedAction" `
  --display-name "Suggested Action" `
  --value "BackToStock=Back to stock" `
  --value "Destroy=Destroy" `
  --value "Credit=Credit note" `
  --value "Debit=Debit note" `
  --value "None=No action" `
  --output json

# ApprovedAction choice set
uip df choiceset create `
  --name "ComplaintApprovedAction" `
  --display-name "Approved Action" `
  --value "BackToStock=Back to stock" `
  --value "Destroy=Destroy" `
  --value "Credit=Credit note" `
  --value "Debit=Debit note" `
  --value "None=No action" `
  --output json
```

**Record the `id` returned by each command.** These are the `choiceSetId` UUIDs.
Paste them into `src/lib/config.ts`:

```ts
export const COMPLAINT_SUGGESTEDACTION_CHOICESET_ID = '<id from ComplaintSuggestedAction>';
export const COMPLAINT_APPROVEDACTION_CHOICESET_ID  = '<id from ComplaintApprovedAction>';
```

---

## Step 2 — Add the 9 columns to `Complaints`

`$ENTITY` is the entity id constant.

```powershell
$ENTITY = "e28dd0a9-c065-f111-8fcb-000d3ab1a7ac"

# --- Intake-extracted fields (ExtractComplaint agent output) ---
uip df entity field create --entity $ENTITY --name "ProductName"  --display-name "Product Name"  --type String        --output json
uip df entity field create --entity $ENTITY --name "QtyAffected"  --display-name "Qty Affected"   --type Number        --output json
uip df entity field create --entity $ENTITY --name "Summary"      --display-name "Summary"        --type MultilineText --output json
uip df entity field create --entity $ENTITY --name "Confidence"   --display-name "Confidence"     --type Number        --output json

# --- Investigation Agent output ---
uip df entity field create --entity $ENTITY --name "InvestigationFindings" --display-name "Investigation Findings" --type MultilineText --output json
uip df entity field create --entity $ENTITY --name "LinkedComplaints"      --display-name "Linked Complaints"      --type String        --output json
uip df entity field create --entity $ENTITY --name "SuggestedAction"       --display-name "Suggested Action"       --type Choice `
  --choiceset "<COMPLAINT_SUGGESTEDACTION_CHOICESET_ID from Step 1>" --output json

# --- CAPA human approval ---
uip df entity field create --entity $ENTITY --name "ApprovedAction" --display-name "Approved Action" --type Choice `
  --choiceset "<COMPLAINT_APPROVEDACTION_CHOICESET_ID from Step 1>" --output json
uip df entity field create --entity $ENTITY --name "FinanceAmount"  --display-name "Finance Amount"  --type Number --output json
```

### Column summary

| Field | Type | Choice set |
|---|---|---|
| `ProductName` | String | — |
| `QtyAffected` | Number | — |
| `Summary` | MultilineText | — |
| `Confidence` | Number (0–1) | — |
| `InvestigationFindings` | MultilineText (JSON) | — |
| `LinkedComplaints` | String | — |
| `SuggestedAction` | Choice | `ComplaintSuggestedAction` |
| `ApprovedAction` | Choice | `ComplaintApprovedAction` |
| `FinanceAmount` | Number | — |

---

## Step 3 — Verify & wire the app

1. Confirm the schema round-trips:
   ```powershell
   uip df entity get --entity $ENTITY --output json   # 17 columns total (8 existing + 9 new)
   ```
2. Paste both `choiceSetId` UUIDs into `src/lib/config.ts` (Step 1).
3. `npm run build` in `complaint-tracker` — the drawer/modal already read & write
   the new fields; once the two choice-set IDs are set, the SuggestedAction /
   ApprovedAction chips and the CAPA approve dropdown resolve to display names
   (until then `api.loadActionChoiceMap` returns an empty map and they render `—`).
