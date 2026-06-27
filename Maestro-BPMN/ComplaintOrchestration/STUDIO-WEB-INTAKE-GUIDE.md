# Studio Web build guide — IntakeProcess (manual trigger → case at Gate=Triage)

Build this as a **Maestro process** in Studio Web (the visual designer enriches the connector/agent
nodes for you). All prerequisites are already provisioned on staging (`hackathon26_371 / DefaultTenant`).

## Provisioned resources (use these exactly)

| Thing | Value |
|---|---|
| Outlook read connection | **Connection technical@caudata.be** (`a33b08e7-c4db-42e7-b6d8-126ca71d0513`), connector *Microsoft Outlook 365*, folder Shared |
| Data Fabric connection | **steurma@cronos.be** (`49a6877f-462a-4199-a798-7a989bc3a9da`), connector *UiPath Data Fabric*, folder Shared |
| Agent | **ExtractComplaint** — process key `ExtractComplaintSolution.Agent.ExtractComplaint`, folder `Shared/ExtractComplaint` |
| Entity | **Complaints** (`e28dd0a9-c065-f111-8fcb-000d3ab1a7ac`) |
| Gate choice for this step | **Triage** |

> Only the **existing 8 columns** exist on the entity right now (Summary / Confidence / ProductName /
> QtyAffected are NOT created yet — `ADD-COLUMNS.md` hasn't been run). Map only the fields listed below.

## Steps in Studio Web (Maestro process)

1. **New Maestro process** named `IntakeProcess`, in/under the **Shared** folder. Start = **Manual trigger**.

2. **Node 1 — Get Newest Email** (Integration Service → Microsoft Outlook 365 → **Get Newest Email**)
   - Connection: **Connection technical@caudata.be**
   - Folder: pick the **complaints** mail folder from the dropdown
   - Unread only: **true** · Top / count: **1**
   - Outputs you'll use: **From**, **Subject**, **Body**

3. **Node 2 — ExtractComplaint** (Agent / Start Agent Job → **ExtractComplaint** in `Shared/ExtractComplaint`)
   - Inputs: `emailFrom` = Node1.From · `emailSubject` = Node1.Subject · `emailBody` = Node1.Body
   - Outputs: `customerName, productName, batchNo, orderNo, complaintSummary, confidence, qtyAffected, extractedType`

4. **Node 3 — Create Record** (Integration Service → UiPath Data Fabric → **Create Record**)
   - Connection: **steurma@cronos.be** · Entity: **Complaints**
   - Field mapping (existing columns only):
     | Complaints field | Value |
     |---|---|
     | `ComplaintId` | a unique `CMP-2026-####` — see note below |
     | `EmailBody` | Node1.Body |
     | `Sender` | Node1.From |
     | `Company` | Node2.customerName |
     | `SalesOrder` | Node2.orderNo |
     | `BatchNumber` | Node2.batchNo |
     | `ExtractedType` | Node2.extractedType *(optional — only if the value matches a choice name; else leave unset)* |
     | `Gate` | **Triage** |

   **ComplaintId uniqueness:** `ComplaintId` is unique-constrained, so a fixed value works only once.
   For repeatable test runs use an expression that varies per run, e.g. concatenate a timestamp:
   `"CMP-2026-" + <current datetime formatted yyyyMMddHHmmss>`. (A human-friendly sequential
   `CMP-2026-0001` numbering is better done later via a counter; for the smoke test, uniqueness is what matters.)

5. **Run / Debug** the process (manual trigger). On success, open the **GDP Complaint Tracker** app →
   the new complaint appears in the **Triage** stage. ✅

## Notes / gotchas
- The agent is the trimmed v1 with the 7-value `extractedType` taxonomy. If `ExtractedType` won't map
  cleanly to the choice in the DF node, leave it unset — it's optional; the case still lands at Triage.
- To later persist Summary / Confidence / ProductName / QtyAffected too, run `complaint-tracker/ADD-COLUMNS.md`
  first to create those columns, then add them to the Create Record mapping.
- This is the IntakeProcess only (Stage 1→Triage). Investigation/CAPA are separate trigger-started
  processes per `REBUILD-REQUIREMENTS.md`.
