# Phase 2 — Orchestration wiring guide (Studio Web)

The robots, app, Data Fabric fields, and dummy data are all done (see `_FEATURE-CONTRACT.md`).
What remains is wiring the orchestration in **ComplaintOrchestration** (Studio Web), because it's
connector + new-robot-binding work. Do these in Studio Web on the ComplaintOrchestration BPMN.

## Prerequisites
1. In Studio Web, open ComplaintOrchestration → **refresh resources** so the new **ErpRobots 1.0.11**
   processes appear in Shared: `BackfillFields`, `ExtractDeliveryNote`, `HandleAttachment`.
2. Connections already bound and reused: Data Fabric **dataservice** (`49a6877f-462a-4199-a798-7a989bc3a9da`),
   Outlook **read** (`a33b08e7…`) and **send** (`2e23680f…`).

## Contract recap (names to map to)
- DF fields: `DeliveryNoteData`, `DeliveryNoteMatch`, `RfiBody` (multiline), `ReturnPlanned` (bool),
  `CaseStatus` (Open=0/AwaitingInfo=1/NoComplaint=2), `ProofImage` (FILE), `BatchNumber`, `QtyAffected`.
- Robot I/O (all String): BackfillFields(in_RecordId,in_OrderNo→out_BatchNo,out_Qty);
  ExtractDeliveryNote(in_RecordId,in_PdfPath,in_SalesOrder→out_DeliveryNoteJson,out_MatchResult);
  HandleAttachment(in_RecordId,in_AttachmentPath,in_AttachmentType→status only).

---

## #3 — Backfill missing batch/qty (Investigation)  ← highest value, do first
In **SubProcess_Investigation**, right after the `Record Updated` (Gate=Investigation) wait and before
`Gw_Inv_Split`:
1. Add **StartJob → BackfillFields**. Inputs: `in_RecordId = vars.complaintId` (the record Id),
   `in_OrderNo = vars.response3.SalesOrder`.
2. Add a **Data Fabric → Update Record** (dataservice conn) on the Complaints record: set
   `BatchNumber = out_BatchNo` and `QtyAffected = out_Qty` **only when currently empty**
   (guard with a condition, or accept overwrite-from-SO). This makes the human-left-blank fields fill
   automatically once the case enters Investigation.

## #2 — Delivery-note PDF → IXP → compare (intake or investigation)
When the inbound email has a **PDF** attachment:
1. **Outlook (read conn) → Get Attachments / Download Attachment** on the trigger message → a local path.
2. **StartJob → ExtractDeliveryNote**: `in_RecordId`, `in_PdfPath = <downloaded path>`,
   `in_SalesOrder = vars.response3.SalesOrder`.
3. **Update Record**: `DeliveryNoteData = out_DeliveryNoteJson`, `DeliveryNoteMatch = out_MatchResult`.
   (The IXP extraction inside the robot is **scaffolded** — plug the real IXP extractor/endpoint into
   `ExtractDeliveryNote.xaml` later; the compare-to-sales-order logic is already real.)

## #1 — Image attachment → proof
When the inbound email has an **image** attachment:
1. **Outlook → Download Attachment** → local path.
2. **StartJob → HandleAttachment**: `in_RecordId`, `in_AttachmentPath = <path>`, `in_AttachmentType = "image"`.
   - In `HandleAttachment.xaml`, bind the **DataService → Upload File** activity to the Complaints
     entity `ProofImage` field (design-time binding is Studio-only; that's why it's scaffolded).
   - ⚠️ Blocked at the platform level until DF file attachments are provisioned ("EntityAttachment not
     found" — see chat). The app already renders `ProofImage` once uploads work.
- **Attachment branch:** after the intake fetch, add an exclusive gateway on the attachment's content type
  → image ⇒ HandleAttachment, pdf ⇒ ExtractDeliveryNote, none ⇒ continue.

## #6 — Triage: request-info (RFI) + no-complaint
- **RFI send:** add a **Data Fabric trigger** (Record Updated, filter `CaseStatus == 1` AwaitingInfo) →
  **Outlook (send conn) → Send Mail** to the customer (`To = Sender`, `Body = RfiBody`). The case parks at
  Triage (`CaseStatus=AwaitingInfo`) until the customer replies / you resume. (The app already writes
  `RfiBody` + `CaseStatus=1`.)
- **No-complaint terminal:** add an **exclusive gateway after the Triage task** (`Task_Stage_Triage`):
  read the record's `CaseStatus`; if `== 2` (NoComplaint) route straight to the **CLOSED** end event,
  bypassing Investigation/CAPA. (The app already sets `CaseStatus=2` + `Gate=Closed`; this gateway makes
  the orchestration terminate cleanly instead of stalling at the Investigation gate trigger.)

## #4 — Plan return
App-only (writes `ReturnPlanned=true`). Optional: a `LogMessage "Return planned"` in Investigation for the
audit trail — cosmetic, no action.

## #5 — Closing report PDF
App-only (client-side jsPDF, button on Closed). No BPMN change.

---

## After wiring
- Bind the 3 new StartJob nodes to the ErpRobots 1.0.11 processes in Shared; map DF updates to the
  dataservice connection; map the RFI send to the Outlook send connection.
- Validate + publish from Studio Web. Re-download afterward so the local canonical stays in sync.
