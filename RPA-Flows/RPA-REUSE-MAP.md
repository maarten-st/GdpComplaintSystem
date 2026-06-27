# RPA Reuse Map — ComplaintOrchestration (Rebuild)

Maps each RPA call in the new flow to an existing `.xaml` workflow in
`uipath-maestro-test/ErpRobots/`, comparing the **actual workflow arguments** (read from the
`.xaml` `<x:Members>` and `.xaml.json`) against the **contract's expected I/O**
(REBUILD-REQUIREMENTS.md §3–4). Mismatches are flagged so the BPMN bindings get the names right.

Source workflows live in `uipath-maestro-test/ErpRobots/` (raw RPA project). The packaged copy is
`GdpErpRobots/ErpRobots/` — keep the two in sync (per MEMORY note `mock-erp-uia-selectors`).

> All `in_*`/`out_*` argument names below are quoted verbatim from the workflow source. RPA call
> bindings in the BPMN must use these exact names; the contract's field names are the *flow
> variables*, which differ in several places (flagged **MISMATCH**).

---

## Cross-cutting requirements (apply to every robot below)

- **`EnsureMockErpOpen.xaml`** is invoked at the top of `GatherEvidence`, `ExecuteDisposition`,
  `SetBatchQuarantine`, and `PostToErp`. It takes **no arguments** (`<x:Members>` is empty). It
  launches / attaches the mock ERP using the `GDP_MOCKERP_HOME` Orchestrator asset.
- **`GDP_MOCKERP_HOME` asset** — each robot does `GetRobotAsset AssetName="GDP_MOCKERP_HOME"` to
  build the `GDP Mock ERP.exe` path. This asset is **folder-scoped**: the robot must run inside a
  folder where that asset exists (Shared in this tenant). Per MEMORY (`mock-erp-uia-selectors`,
  `rpa-demo-runner`) a bare local run fails with no folder context — the BPMN `Orchestrator.StartJob`
  calls must target that folder.
- **mock-ERP dropdowns are exact-match** (MEMORY `rpa-demo-runner`): batch status accepts only
  `Available` / `Quarantine` / `Blocked`; note type accepts only `CREDIT` / `DEBIT`. There is **no
  "Destroyed"** status — a Destroy disposition maps to `Blocked`.

---

## 3.1 / Investigation — `GatherEvidence`  → `ErpRobots/GatherEvidence.xaml`

| Contract I/O (REBUILD §3.1) | Workflow argument | Type | Status |
|---|---|---|---|
| in: `in_OrderNo` = `SalesOrder` | `in_OrderNo` | InArgument(String) | **MATCH** |
| out: `out_RawResult` (order/line data) | `out_RawResult` | OutArgument(String) | **MATCH** |
| out: `out_ExcursionHours` | `out_ExcursionHours` | OutArgument(**Double**) | **MATCH** (note: Double, not String) |
| out: `out_LoggerAvailable` | `out_LoggerAvailable` | OutArgument(**Boolean**) | **MATCH** (note: Boolean) |

No renames needed. Bind `in_OrderNo` ← flow `SalesOrder`. Carry the two typed outputs as
Double / Boolean flow vars (do not coerce to String at the binding).

---

## 4.1 — `AdjustInventory`  → recommend `ErpRobots/ExecuteDisposition.xaml`

The contract lists both `SetBatchQuarantine.xaml` and `ExecuteDisposition.xaml`. **Use
`ExecuteDisposition.xaml`** — it is parameterised on the target status, whereas
`SetBatchQuarantine.xaml` **hardcodes `Quarantine`** (`NSelectItem Item="Quarantine"`, only
`in_BatchNo` in / `out_BatchStatus` out) and so cannot express Blocked/Available.

`ExecuteDisposition.xaml` arguments:

| Contract I/O (REBUILD §4.1) | Workflow argument | Type | Status |
|---|---|---|---|
| in: `BatchNumber` | `in_BatchNo` | InArgument(String) | name differs — bind `in_BatchNo` ← `BatchNumber` |
| in: `ApprovedAction` (disposition) | `in_TargetStatus` | InArgument(String) | **MISMATCH — needs value mapping (below)** |
| in: `QtyAffected` | *(none)* | — | **MISMATCH — no quantity write field** |
| out: `inventoryStatus` | `out_BatchStatus` | OutArgument(String) | **RENAME** `out_BatchStatus` → flow `inventoryStatus` |

**`ApprovedAction` → `in_TargetStatus` value mapping** (mock-ERP dropdown is exact-match,
Available/Quarantine/Blocked only):

| `ApprovedAction` (choice) | `in_TargetStatus` to pass |
|---|---|
| `BackToStock` | `Available` |
| `Destroy` | `Blocked`  *(no "Destroyed" option; Blocked = written-off/destroyed)* |
| `Credit` / `Debit` / `None` | no inventory move — **skip the AdjustInventory call** (these are finance-only paths; gate the service task on a disposition value) |

**`QtyAffected` is not writable** by this workflow — `ExecuteDisposition` only sets batch status,
there is no per-line quantity field in the mock-ERP inventory tab. If the rebuild needs a quantity
write-off recorded, that is **net-new** (extend the workflow + mock-ERP UI). For now treat
`QtyAffected` as carried on the DF record only.

---

## 4.3 — `IssueCreditNote`  → `ErpRobots/PostToErp.xaml` (NoteType = `CREDIT`)

`PostToErp.xaml` arguments:

| Contract I/O (REBUILD §4.3) | Workflow argument | Type | Status |
|---|---|---|---|
| (constant) note type | `in_NoteType` | InArgument(String) | pass literal **`CREDIT`** (exact-match dropdown) |
| `ComplaintId` | `in_CaseId` | InArgument(String) | **RENAME** — bind `in_CaseId` ← `ComplaintId` |
| `CustomerCode` / Company | `in_CustomerCode` | InArgument(String) | bind ← resolved customer code |
| `ProductCode` | `in_ProductCode` | InArgument(String) | bind ← resolved product code |
| `BatchNumber` | `in_BatchNo` | InArgument(String) | bind ← `BatchNumber` |
| `QtyAffected` | `in_Qty` | InArgument(**String**) | **TYPE** — qty is a **String** arg; `.ToString()` the number at the binding |
| `FinanceAmount` | `in_Amount` | InArgument(**String**) | **TYPE** — amount is a **String** arg; `.ToString()` |
| (reason text) | `in_Reason` | InArgument(String) | **no XAML default** — supply a reason string at the binding (e.g. complaint type + ComplaintId) |
| out: `creditNoteStatus` | `out_CreditNoteStatus` | OutArgument(String) | **RENAME** → flow `creditNoteStatus` |
| out: `creditPosted` (bool) | `out_CreditPosted` | OutArgument(Boolean) | **MATCH** → flow `creditPosted` |

Notes: `in_Qty` and `in_Amount` are **String** in the workflow (the mock-ERP fields are typed-into
as text); the flow's `QtyAffected` (number) and `FinanceAmount` (number) must be stringified.
`in_Reason` has no compiled default — always pass a value to avoid an empty field.

---

## 4.4 — `IssueDebitNote`  → recommend `ErpRobots/PostToErp.xaml` (NoteType = `DEBIT`)

The contract names `IssueReversingNote.xaml`. **Do NOT use it for a plain debit note** —
`IssueReversingNote.xaml` is the Saga-reversal robot: it hardcodes `out_CreditNoteStatus = "REVERSED"`
(literal) and logs "posted reversing … note", i.e. it always represents *undoing* a prior posting,
not issuing a fresh debit. It also lacks the `in_Reason` arg and the `out_CreditPosted` bool that
`PostToErp` has.

**Use `PostToErp.xaml` with `in_NoteType = "DEBIT"`** — same argument set as the credit path:

| Contract I/O (REBUILD §4.4) | Workflow argument (PostToErp) | Status |
|---|---|---|
| (constant) note type | `in_NoteType` | pass literal **`DEBIT`** |
| `ComplaintId` | `in_CaseId` | **RENAME** ← `ComplaintId` |
| Company / `CustomerCode` | `in_CustomerCode` | bind |
| `ProductCode` | `in_ProductCode` | bind |
| `BatchNumber` | `in_BatchNo` | bind |
| `QtyAffected` | `in_Qty` (String) | **TYPE** — stringify |
| `FinanceAmount` | `in_Amount` (String) | **TYPE** — stringify |
| (reason text) | `in_Reason` | supply a reason string |
| out: `debitNoteStatus` | `out_CreditNoteStatus` | **RENAME** `out_CreditNoteStatus` → flow `debitNoteStatus` |
| (optional) | `out_CreditPosted` (bool) | available; map to `debitPosted` if needed |

Keep `IssueReversingNote.xaml` in reserve **only** for a true compensation/Saga undo of a
previously posted note (its `in_*` set matches `PostToErp` minus `in_Reason`; its single output is
the literal `"REVERSED"`). It is not part of the normal credit-vs-debit gateway.

---

## Argument-name quick reference (verbatim from source)

| Workflow | In args | Out args |
|---|---|---|
| `GatherEvidence.xaml` | `in_OrderNo` | `out_RawResult` (String), `out_ExcursionHours` (Double), `out_LoggerAvailable` (Boolean) |
| `ExecuteDisposition.xaml` | `in_BatchNo`, `in_TargetStatus` | `out_BatchStatus` (String) |
| `SetBatchQuarantine.xaml` | `in_BatchNo` | `out_BatchStatus` (String) — status hardcoded to `Quarantine` |
| `PostToErp.xaml` | `in_NoteType`, `in_CaseId`, `in_CustomerCode`, `in_ProductCode`, `in_BatchNo`, `in_Qty` (String), `in_Amount` (String), `in_Reason` | `out_CreditNoteStatus` (String), `out_CreditPosted` (Boolean) |
| `IssueReversingNote.xaml` | `in_NoteType`, `in_CaseId`, `in_CustomerCode`, `in_ProductCode`, `in_BatchNo`, `in_Qty` (String), `in_Amount` (String) | `out_CreditNoteStatus` (String) — hardcoded `"REVERSED"` |
| `EnsureMockErpOpen.xaml` | *(none)* | *(none)* |

## Summary of mismatches to handle in BPMN bindings

1. **Output renames** — `out_BatchStatus` → `inventoryStatus`; `out_CreditNoteStatus` →
   `creditNoteStatus` (credit) / `debitNoteStatus` (debit).
2. **Input renames** — `BatchNumber` → `in_BatchNo`; `ComplaintId` → `in_CaseId`; `SalesOrder` →
   `in_OrderNo`.
3. **Value mapping** — `ApprovedAction` ∈ {BackToStock, Destroy} → `in_TargetStatus` ∈
   {Available, Blocked}; Credit/Debit/None skip AdjustInventory.
4. **Type coercion** — `in_Qty` and `in_Amount` are **String**; stringify the numeric flow vars.
5. **No quantity write** — `ExecuteDisposition` has no field for `QtyAffected`; not writable
   without extending the workflow.
6. **`in_Reason`** — no compiled default in `PostToErp`; always pass a reason string.
7. **Debit note** — use `PostToErp` (NoteType=DEBIT), **not** `IssueReversingNote` (which is a
   hardcoded Saga reversal, status `"REVERSED"`).
8. **AdjustInventory** — prefer `ExecuteDisposition` over `SetBatchQuarantine` (the latter
   hardcodes `Quarantine`).
