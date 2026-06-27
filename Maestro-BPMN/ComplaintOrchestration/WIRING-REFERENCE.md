# ComplaintOrchestration — node wiring reference (resolved bindings)

Every resource the 3 executable `.bpmn` segments call is **deployed and live** on staging
(`hackathon26_371 / DefaultTenant`). This file is the lookup the final wiring pass uses, plus the
exact CLI-vs-Studio-Web split. Resolved 2026-06-15 via `uip maestro bpmn registry search` +
`uip or processes`. Re-run `uip maestro bpmn registry pull --force` if keys look stale.

## RPA processes — `Orchestrator.StartJob` (CLI-bindable; all in Shared)

Folder **Shared** = `d011df19-cddc-486f-ac9a-d99275328747`. Each is an entry point of the
`ErpRobots` feed package, bound as its own process.

| Node (BPMN) | Process name | ReleaseKey | Package | Inputs → | Outputs ← |
|---|---|---|---|---|---|
| `Task_GatherEvidence` (InvestigationProcess) | GatherEvidence | `d41dae90-5dae-4d6f-b61d-3afb63a5320e` | ErpRobots:1.0.6 | `in_OrderNo`=SalesOrder | out_RawResult, out_ExcursionHours, out_LoggerAvailable |
| `Task_GatherTempLogs` (InvestigationProcess) | GatherTempLogs | `95709202-8674-412d-a52d-2d6adab0e75e` | ErpRobots:**1.0.7** | `in_SalesOrder`=SalesOrder; in_PortalUrl=`https://nord-cold-logistics.vercel.app/`; in_Username=`demo`; in_Password=`demo` | out_TransportRef, out_TempMinC, out_TempMaxC, out_ExcursionHours, out_LoggerPresent, out_TempLog[], out_RawLogJson |
| `Task_AdjustInventory` (CapaProcess) — quarantine | SetBatchQuarantine | `5820dec8-cd4c-4c97-a6fa-809e1efee2fa` | ErpRobots:1.0.6 | in_BatchNo=BatchNumber | (status) |
| `Task_AdjustInventory` (CapaProcess) — disposition | ExecuteDisposition | `96e48bc6-7d85-47fd-baf6-bb484b14549f` | ErpRobots:1.0.6 | in_BatchNo=BatchNumber; in_TargetStatus (Available/Quarantine/**Blocked**) | (status) |
| `Task_IssueCreditNote` (CapaProcess) | PostToErp | `9bbb4375-5322-46d0-a238-154499172103` | ErpRobots:1.0.6 | in_NoteType=`CREDIT`; in_CaseId; in_CustomerCode; in_ProductCode; in_BatchNo; in_Qty; in_Amount; in_Reason | (note status) |
| `Task_IssueDebitNote` (CapaProcess) | IssueReversingNote | `54f45413-724e-496c-976d-64e12d4b2290` | ErpRobots:1.0.6 | in_NoteType=`DEBIT`; same fields | (reversed) |

> mock-ERP dropdowns are **exact-match**: batch status = Available / Quarantine / Blocked (destroy→Blocked);
> note type = CREDIT / DEBIT. See `uipath-maestro-test` memory `mock-erp-uia-selectors`.

`Orchestrator.StartJob` node template (fill `releaseKey`/`folderId`/`name`, map args in JobArguments JSON):
```xml
<bpmn:serviceTask id="Task_GatherTempLogs" name="Gather Temperature Logs (RPA)">
  <bpmn:extensionElements>
    <uipath:activity version="v1">
      <uipath:type value="Orchestrator.StartJob" version="v1" />
      <uipath:context>
        <uipath:input name="releaseKey" value="95709202-8674-412d-a52d-2d6adab0e75e" />
        <uipath:input name="folderId" value="d011df19-cddc-486f-ac9a-d99275328747" />
        <uipath:input name="folderPath" value="Shared" />
        <uipath:input name="name" value="GatherTempLogs" />
      </uipath:context>
      <uipath:input name="JobArguments" type="json" target="bodyField"><![CDATA[{"in_SalesOrder":"=vars.SalesOrder","in_PortalUrl":"https://nord-cold-logistics.vercel.app/","in_Username":"demo","in_Password":"demo"}]]></uipath:input>
      <uipath:output name="Process response" type="Orchestrator.RunJob" var="Var_TempJobResp" />
    </uipath:activity>
  </bpmn:extensionElements>
  <bpmn:incoming>Flow_Split_TempLogs</bpmn:incoming>
  <bpmn:outgoing>Flow_TempLogs_Join</bpmn:outgoing>
</bpmn:serviceTask>
<!-- -- end of example -->
```
> Output mapping (RunJob response field → process var, e.g. `=vars.Var_TempJobResp.out_TempMaxC`)
> is the one StartJob detail the CLI can't verify without a run — confirm in Studio Web / first debug run.

## Agents — `Orchestrator.StartAgentJob` (Studio Web only)

Both agents are **deployed and runnable** as Orchestrator processes, now also bound into **Shared**:

| Node (BPMN) | Agent | Shared process key | Package | I/O |
|---|---|---|---|---|
| `Task_ExtractComplaint` (IntakeProcess) | ExtractComplaint | `45a99b22-2f40-40c6-b5fc-aee0121a46b6` | ExtractComplaintSolution.Agent.ExtractComplaint:1.0.0 | in: emailFrom/Subject/Body → out: customerName, productName, batchNo, orderNo, complaintSummary, confidence, qtyAffected, extractedType |
| `Task_InvestigationAgent` (InvestigationProcess) | InvestigationAgent | `05580d56-8c16-430c-b454-42b9324cf4cf` | InvestigationAgentSolution.Agent.InvestigationAgent:1.0.0 | in: extractedType, salesOrderData, transportRef, tempMinC/MaxC, excursionHours, loggerPresent, tempLogJson, complaintHistory → out: suggestedAction, financeAmount, linkedComplaints, investigationFindings |

> **CLI gap:** `uip maestro bpmn registry search` does NOT surface agent-type processes on this tenant
> (RPA + processOrchestration only; ProcessCount unchanged after binding the agents into Shared).
> So `StartAgentJob` binding can't be done from the CLI — do it in **Studio Web**, which discovers
> agents via live metadata. The Shared bindings above just put them in the same folder as the robots.

## Data Fabric + connectors (Studio Web — need a provisioned IS connection)

- **DF event triggers** on `InvestigationProcess` / `CapaProcess` start events → `Intsvc.EventTrigger`,
  object = `Complaints` entity `e28dd0a9-c065-f111-8fcb-000d3ab1a7ac`, filter `Gate == Investigation`
  / `Gate == CAPA`.
- **FetchComplaintEmail** (IntakeProcess) → Outlook 365 `getNewestEmail` on the `complaints` folder.
  Two Outlook connections exist (read `technical@caudata.be` a33b08e7, send `steurma@cronos.be`
  2e23680f — see memory `outlook-connection-missing-send-scope`).
- **CreateComplaintRecord / WriteInvestigation / CloseRecord** → Data Fabric create/update on the
  `Complaints` entity, field mappings per `REBUILD-REQUIREMENTS.md`.

## CAPA gateway conditions (pass-2 model XML)
`Task_AdjustInventory` → exclusiveGateway: `=vars.ApprovedAction == "Credit"` → IssueCreditNote;
`== "Debit"` → IssueDebitNote; default → CloseRecord.

## Status
- ✅ All RPA + agent resources deployed, runnable, consolidated into Shared.
- ✅ **RPA StartJob nodes ENRICHED + validated** (2026-06-15): InvestigationProcess
  (GatherEvidence, GatherTempLogs) and CapaProcess (AdjustInventory→ExecuteDisposition,
  IssueCreditNote→PostToErp, IssueDebitNote→IssueReversingNote). `uip maestro bpmn validate` → Success
  on both. Output side uses a single `Orchestrator.RunJob` response var per node (e.g. `Var_TempJobResp`);
  field extraction (`=vars.Var_TempJobResp.out_TempMaxC`) is the one detail to confirm on first debug run.
- ⚠️ **Var reference convention:** expressions use the variable **name** (`=vars.ApprovedAction`), not
  the element id. CapaProcess gateway conditions were normalized from `=vars.Var_ApprovedAction` (id) to
  `=vars.ApprovedAction` (name) for this reason — verify in Studio Web; revert if the id form was intended.
- ⚠️ **CapaProcess JobArguments gaps (TODO literals in the .bpmn):** `in_TargetStatus` (AdjustInventory)
  must be derived from ApprovedAction (BackToStock→Available, Destroy→Blocked — no inline conditional in
  JobArguments; add a trigger var or split branches); `in_CustomerCode` + `in_ProductCode` (credit/debit)
  aren't process vars — need a Company→CustomerCode resolve + ProductCode lookup added as trigger vars.
- ⏳ Studio Web: 2 agent StartAgentJob binds, 2 DF triggers, 3 DF create/update connectors,
  1 Outlook connector, the CapaProcess TODO field mappings above, regenerate the 4 package JSON files,
  then pack/deploy/E2E.
