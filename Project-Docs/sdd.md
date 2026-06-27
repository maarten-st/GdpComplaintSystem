# SDD — GdpComplaintManagement

> **⚠️ Generated lightweight; complexity exceeded thresholds.**
> Counts at generation time: 13 stages, 33 tasks, 1 integration, 6 personas, 0 child cases.
> Review carefully before approving. Consider splitting into smaller cases or trimming scope.

_Case Definition Blueprint — a developer can implement this directly in the UiPath Case Designer. Manages a pharma B2B customer complaint end-to-end under EU GDP 2013/C 343/01 Ch.6: triage, investigation, GDP 6.3 disposition, the five regulated human gates, Path-A provisional parallelism with Saga compensation, and the commercial-vs-QA lane split._

## Table of Contents

1. [Case Definition](#section-1-case-definition) — Metadata, SLA, Triggers, Exit Conditions, Variables
2. [Stages & Tasks](#section-2-stages--tasks)
   - [Stage 1: Intake & Triage](#stage-1-intake--triage) — 3 tasks
   - [Stage 2: Acknowledge & Completeness](#stage-2-acknowledge--completeness) — 4 tasks
   - [Stage 3: Cross-Case Correlation](#stage-3-cross-case-correlation) — 1 task
   - [Stage 4: Investigation](#stage-4-investigation) — 2 tasks
   - [Stage 5: Commercial Resolution](#stage-5-commercial-resolution) — 3 tasks
   - [Stage 6: Dossier & QA Sign-off](#stage-6-dossier--qa-sign-off) — 3 tasks
   - [Stage 7: Policy Routing](#stage-7-policy-routing) — 1 task
   - [Stage 8: Path A — Provisional Parallel](#stage-8-path-a--provisional-parallel) — 4 tasks
   - [Stage 9: Path B — Sequential Disposition](#stage-9-path-b--sequential-disposition) — 1 task
   - [Stage 10: RP Override Compensation](#stage-10-rp-override-compensation) — 3 tasks
   - [Stage 11: Batch Disposition Execution](#stage-11-batch-disposition-execution) — 3 tasks
   - [Stage 12: Follow-up & Finance](#stage-12-follow-up--finance) — 3 tasks
   - [Stage 13: Closure](#stage-13-closure) — 2 tasks
3. [Personas & App Views](#section-3-personas--app-views) — 6 Personas, Process App Views
4. [Integrations](#section-4-integrations) — Integration Service Connectors, External Agents
5. [Implementation Readiness](#section-5-implementation-readiness) — Review items

---

## Section 1: Case Definition

### Case Metadata

| Property | Value |
|----------|-------|
| Case Name | GdpComplaintManagement |
| Case Description | Manages a pharma B2B customer complaint about a medicine shipment from intake through GDP-compliant disposition and financial correction. AI agents triage and investigate, robots read and write the mock ERP and case cockpit, and humans authorize every regulated decision, with a full audit trail. |
| Case Identifier | Type: constant. Prefix: CMP |
| Priority | Choiceset: Low, Medium, High, Critical — Default: Medium |
| Case-Level SLA | 10 d |
| SLA Type | time-based |

### Case-Level SLA Escalation Rules

| SLA Status | Threshold | Action |
|------------|-----------|--------|
| At-Risk | 80% of SLA duration | Notify: UserGroup: Quality Assurance |
| Breached | 100% of SLA duration | Notify: UserGroup: Site Leadership |

### Case Triggers

| T# | Trigger Type | Source | Configuration |
|----|-------------|--------|---------------|
| T02 | Intsvc.EventTrigger | Office 365 Outlook | Email received |

### Case Exit Conditions

| WHEN | IF | THEN | Marks Case Complete |
|------|-----|------|---------------------|
| required-stages-completed | — | Case exited | Yes |
| selected-stage-completed("Intake & Triage") | =vars.isComplaintValid == false | Case exited | No |

### Case Variables

| Name | Category | Type | sourceTriggers | sourceFields | Default | Description |
|------|----------|------|----------------|--------------|---------|-------------|
| emailFrom | Variable | string | T02 | from | | Sender address of the inbound complaint email (from the trigger payload). |
| emailSubject | Variable | string | T02 | subject | | Subject line of the complaint email (from the trigger payload). |
| emailBody | Variable | string | T02 | body | | Raw body text of the complaint email (from the trigger payload). |
| caseOutcome | Out | string | | | "Pending" | Final outcome summary returned to the caller at close. |
| caseStatus | Variable | string | | | "Intake" | Current lifecycle status of the complaint case. |
| customerCode | Variable | string | | | | Resolved customer master code (e.g., C001). |
| customerName | Variable | string | | | | Customer organization name. |
| customerType | Variable | string | | | | pharmacy / hospital / wholesaler — drives the return window. |
| productCode | Variable | string | | | | Product master code (e.g., P001). |
| productName | Variable | string | | | | Product name. |
| batchNo | Variable | string | | | | Affected batch / lot number. |
| orderNo | Variable | string | | | | Matching sales order number. |
| dispatchRef | Variable | string | | | | Dispatch reference — the cross-case correlation key. |
| qtyAffected | Variable | integer | | | 0 | Quantity the customer reports as affected. |
| qtyOrdered | Variable | integer | | | 0 | Quantity ordered per the sales order. |
| qtyShipped | Variable | integer | | | 0 | Quantity shipped per the dispatch. |
| family | Variable | string | | | | Complaint family A (quality) / B (cold-chain) / C (logistics). |
| severity | Variable | string | | | "Medium" | Assessed complaint severity. |
| intakeConfidence | Variable | double | | | 0 | Intake agent extraction confidence (0-1). |
| missingInformation | Variable | string | | | | Fields the intake agent could not resolve. |
| complaintSummary | Variable | string | | | | One-line summary of the complaint. |
| isComplaintValid | Variable | boolean | | | false | Gate 1 outcome — valid, well-classified complaint. |
| infoComplete | Variable | boolean | | | true | Whether enough information exists to investigate. |
| rfiSent | Variable | boolean | | | false | Whether a request-for-information was sent. |
| linkedCaseId | Variable | string | | | | Correlated mirror case id, if any. |
| isCorrelated | Variable | boolean | | | false | Whether a mirror case was found. |
| excursionHours | Variable | double | | | 0 | Family B temperature-excursion duration in hours. |
| loggerAvailable | Variable | boolean | | | true | Whether temperature logger data was available. |
| lane | Variable | string | | | "QA" | Resolution lane: COMMERCIAL or QA. |
| needsGoodsReturn | Variable | boolean | | | true | Whether physical goods must be returned. |
| dossierJson | Variable | string | | | | Assembled dossier document (JSON source of truth). |
| packagingIntact | Variable | string | | | "UNKNOWN" | GDP 6.3 — packaging intact (TRUE/FALSE/UNKNOWN). |
| storageProven | Variable | string | | | "UNKNOWN" | GDP 6.3 — storage conditions proven. |
| shelfLifeOk | Variable | string | | | "UNKNOWN" | GDP 6.3 — acceptable remaining shelf life. |
| notPriorReturnRecall | Variable | string | | | "UNKNOWN" | GDP 6.3 — not previously returned / recalled. |
| withinTimeWindow | Variable | string | | | "UNKNOWN" | GDP 6.3 — returned within the time window. |
| rootCause | Variable | string | | | "Pending" | Recorded root cause (mandatory before QA sign-off). |
| recommendedDisposition | Variable | string | | | "DESTROY" | Dossier-recommended disposition. |
| qaSignoff | Variable | boolean | | | false | Gate 2 outcome — evidence package complete. |
| policyPath | Variable | string | | | "NONE" | Policy router output path. |
| rpRatified | Variable | boolean | | | false | Path A — RP ratified the policy decision. |
| isOverride | Variable | boolean | | | false | Path A — RP overrode the policy decision. |
| rpDecision | Variable | string | | | | Gate 3 disposition decision label. |
| finalDisposition | Variable | string | | | "" | Final disposition: BACK_TO_STOCK / DESTROY / NO_DISPOSITION. |
| batchStatus | Variable | string | | | "Available" | Batch state machine status. |
| financeDirection | Variable | string | | | "NONE" | CREDIT / DEBIT / NONE / NET_ZERO. |
| creditAmount | Variable | double | | | 0 | Credit / debit amount. |
| creditNoteStatus | Variable | string | | | "NONE" | DRAFT / POSTED / REVERSED. |
| creditPosted | Variable | boolean | | | false | Whether a credit / debit note has been posted to ERP. |
| compensationRequired | Variable | boolean | | | false | Whether Saga compensation is required. |
| deviationRaised | Variable | boolean | | | false | Whether a deviation / CAPA was raised. |
| logisticsApproved | Variable | boolean | | | false | Gate 4 outcome — follow-up plan approved. |
| financeApproved | Variable | boolean | | | false | Gate 5 outcome — finance amount approved. |
| customerNotified | Variable | boolean | | | false | Whether the customer received the resolution notice. |

---

## Section 2: Stages & Tasks

---

### Stage 1: Intake & Triage (`stage-intake`)

**Type:** Stage
**Description:** The front door. An AI agent extracts customer, product, batch, quantity and references from the inbound complaint email; a robot pulls the matching sales order from the mock ERP; and Customer Service confirms it is a valid, well-classified complaint.
**Required for Case Completion:** Yes

#### Stage Entry Conditions

| WHEN | IF | Interrupting |
|------|-----|-------------|
| case-entered | — | No |

#### Stage Completion Conditions

| WHEN | IF | Exit Type | Marks Stage Complete |
|------|-----|-----------|---------------------|
| required-tasks-completed | — | exit-only | Yes |

#### Stage SLA

| SLA | Unit | At-Risk | At-Risk Action | Breach Action |
|-----|------|---------|----------------|---------------|
| 1 | d | 75% | Notify: UserGroup: Customer Service | Notify: UserGroup: Site Leadership |

#### Tasks

| # | Task ID | Task | Type | Owner |
|---|---------|------|------|-------|
| 1 | `t1` | ExtractComplaint | agent | system |
| 2 | `t2` | LookupSalesOrder | rpa | system |
| 3 | `t3` | TriageValidation | action | Customer Service |

---

##### Task 1.1: ExtractComplaint (`t1`)

**Type:** agent
**Description:** The ComplaintIntakeAgent reads the raw complaint email and extracts the structured complaint record — customer, product, batch, affected quantity, complaint family A/B/C, a confidence score, and any missing information — resolving values against the GDP master data.

**Entry Condition**

| WHEN | IF |
|------|-----|
| current-stage-entered | — |

**Inputs:**

| Field | Type | Binding |
|-------|------|---------|
| emailFrom | string | =vars.emailFrom |
| emailSubject | string | =vars.emailSubject |
| emailBody | string | =vars.emailBody |

**Outputs:**

| Field | Binding / Value |
|-------|------------------|
| customerCode | -> customerCode |
| productCode | -> productCode |
| batchNo | -> batchNo |
| qtyAffected | -> qtyAffected |
| family | -> family |
| severity | -> severity |
| confidence | -> intakeConfidence |
| missingInformation | -> missingInformation |
| complaintSummary | -> complaintSummary |

---

##### Task 1.2: LookupSalesOrder (`t2`)

**Type:** rpa
**Description:** An unattended robot drives the mock ERP desktop application by its UI to look up the matching sales order for the complaint and returns the ordered-versus-shipped quantities, dispatch reference and resolved customer master data.

**Entry Condition**

| WHEN | IF |
|------|-----|
| selected-tasks-completed("ExtractComplaint") | — |

**Inputs:**

| Field | Type | Binding |
|-------|------|---------|
| customerCode | string | =vars.customerCode |
| productCode | string | =vars.productCode |
| batchNo | string | =vars.batchNo |

**Outputs:**

| Field | Binding / Value |
|-------|------------------|
| orderNo | -> orderNo |
| dispatchRef | -> dispatchRef |
| qtyOrdered | -> qtyOrdered |
| qtyShipped | -> qtyShipped |
| customerName | -> customerName |
| customerType | -> customerType |
| productName | -> productName |

---

##### Task 1.3: TriageValidation (`t3`)

**Type:** action
**Description:** Customer Service reviews the agent's draft classification and the pulled order, confirms it is a real, well-classified complaint or rejects it as spam / misroute, and may correct the family before the case proceeds. This is HITL Gate 1.

**Entry Condition**

| WHEN | IF |
|------|-----|
| selected-tasks-completed("LookupSalesOrder") | — |

**HITL Implementation:** Action App: gdp-complaint-intake
**Action App ID:** 6de89ba2-5251-4797-b90f-4596c4739736
**Deployment Folder:** Shared
**Recipient:** Role: Customer Service
**Priority:** High
**Task Title:** Validate complaint classification and confirm it is a genuine complaint.
**Labels:** —
**Run Only Once:** Yes
**Required:** Yes

**Input Schema:**

| Field | Type | Binding | Required |
|-------|------|---------|----------|
| customerName | String | =vars.customerName | No |
| productName | String | =vars.productName | No |
| batchNo | String | =vars.batchNo | No |
| family | String | =vars.family | No |
| complaintSummary | String | =vars.complaintSummary | No |
| intakeConfidence | Number | =vars.intakeConfidence | No |

**Output Schema:**

| Field | Binding / Value |
|-------|------------------|
| family | -> family |

**Actions:**

| Button | Maps To | Behavior |
|--------|---------|----------|
| Confirm | isComplaintValid = true | Complete task and mark the complaint valid so the case proceeds. |
| Reject | isComplaintValid = false | Complete task and mark not-a-complaint so the case routes to Closure. |

---

### Stage 2: Acknowledge & Completeness (`stage-acknowledge`)

**Type:** Stage
**Description:** Auto-acknowledges the customer against the SLA timer and checks whether enough information exists to investigate. If information is missing, a request-for-information is sent and the case parks on an SLA timer until the customer replies — demonstrating survival of interruptions.
**Required for Case Completion:** Yes

#### Stage Entry Conditions

| WHEN | IF |
|------|-----|
| selected-stage-completed("Intake & Triage") | =vars.isComplaintValid == true |

#### Stage Completion Conditions

| WHEN | IF | Exit Type | Marks Stage Complete |
|------|-----|-----------|---------------------|
| required-tasks-completed | — | exit-only | Yes |

#### Tasks

| # | Task ID | Task | Type | Owner |
|---|---------|------|------|-------|
| 1 | `t4` | SendAcknowledgement | api-workflow | system |
| 2 | `t5` | CompletenessCheck | process | system |
| 3 | `t6` | RequestForInformation | action | Customer Service |
| 4 | `t7` | ParkOnSlaTimer | wait-for-timer | system |

---

##### Task 2.1: SendAcknowledgement (`t4`)

**Type:** api-workflow
**Description:** Sends the customer an automatic acknowledgement that the complaint has been received and a case opened, starting the response SLA clock.

**Entry Condition**

| WHEN | IF |
|------|-----|
| current-stage-entered | — |

**Inputs:**

| Field | Type | Binding |
|-------|------|---------|
| emailTo | string | =vars.emailFrom |
| customerName | string | =vars.customerName |
| complaintSummary | string | =vars.complaintSummary |

**Outputs:**

| Field | Binding / Value |
|-------|------------------|
| — | caseStatus = "Acknowledged" |

---

##### Task 2.2: CompletenessCheck (`t5`)

**Type:** process
**Description:** Deterministically evaluates whether the mandatory fields (batch, order reference, affected quantity) are present so the case can be investigated, setting the completeness flag.

**Entry Condition**

| WHEN | IF |
|------|-----|
| selected-tasks-completed("SendAcknowledgement") | — |

**Inputs:**

| Field | Type | Binding |
|-------|------|---------|
| batchNo | string | =vars.batchNo |
| orderNo | string | =vars.orderNo |
| missingInformation | string | =vars.missingInformation |

**Outputs:**

| Field | Binding / Value |
|-------|------------------|
| infoComplete | -> infoComplete |

---

##### Task 2.3: RequestForInformation (`t6`)

**Type:** action
**Description:** When information is missing, Customer Service issues a targeted request-for-information to the customer; the case will park until a reply arrives. Runs only on incomplete complaints.

**Entry Condition**

| WHEN | IF |
|------|-----|
| selected-tasks-completed("CompletenessCheck") | =vars.infoComplete == false |

**HITL Implementation:** JSON Schema
**Recipient:** Role: Customer Service
**Priority:** Medium
**Task Title:** Send a request-for-information for the missing complaint details.
**Labels:** —
**Run Only Once:** Yes
**Required:** No

**Input Schema:**

| Field | Type | Binding | Required |
|-------|------|---------|----------|
| customerName | String | =vars.customerName | No |
| missingInformation | String | =vars.missingInformation | No |

**Output Schema:**

| Field | Binding / Value |
|-------|------------------|
| — | rfiSent = true |

---

##### Task 2.4: ParkOnSlaTimer (`t7`)

**Type:** wait-for-timer
**Description:** Parks the case for up to five days awaiting the customer's reply to the request-for-information, modelling the interruption-survival path. Runs only when a request-for-information was sent.

**Entry Condition**

| WHEN | IF |
|------|-----|
| selected-tasks-completed("RequestForInformation") | =vars.rfiSent == true |

**Timer:** timeDuration
**Value:** P5D

---

### Stage 3: Cross-Case Correlation (`stage-correlation`)

**Type:** Stage
**Description:** An agent checks whether another open case is the mirror image of this one — the same dispatch reference with an opposite quantity discrepancy — and links them so they can be resolved jointly.
**Required for Case Completion:** Yes

#### Stage Entry Conditions

| WHEN | IF |
|------|-----|
| selected-stage-completed("Acknowledge & Completeness") | — |

#### Stage Completion Conditions

| WHEN | IF | Exit Type | Marks Stage Complete |
|------|-----|-----------|---------------------|
| required-tasks-completed | — | exit-only | Yes |

#### Tasks

| # | Task ID | Task | Type | Owner |
|---|---------|------|------|-------|
| 1 | `t8` | CorrelationCheck | agent | system |

---

##### Task 3.1: CorrelationCheck (`t8`)

**Type:** agent
**Description:** Scans open complaint cases for a mirror case sharing the same dispatch reference and an offsetting quantity discrepancy, and returns the linked case id when a match is found.

**Entry Condition**

| WHEN | IF |
|------|-----|
| current-stage-entered | — |

**Inputs:**

| Field | Type | Binding |
|-------|------|---------|
| dispatchRef | string | =vars.dispatchRef |
| customerCode | string | =vars.customerCode |
| qtyAffected | integer | =vars.qtyAffected |

**Outputs:**

| Field | Binding / Value |
|-------|------------------|
| linkedCaseId | -> linkedCaseId |
| isCorrelated | -> isCorrelated |

---

### Stage 4: Investigation (`stage-investigation`)

**Type:** Stage
**Description:** Family-specific evidence gathering — a robot pulls batch records, temperature-logger data or the order-versus-shipped comparison from the business systems, and an agent interprets the evidence to decide the resolution lane and whether goods must physically return.
**Required for Case Completion:** Yes

#### Stage Entry Conditions

| WHEN | IF |
|------|-----|
| selected-stage-completed("Cross-Case Correlation") | — |

#### Stage Completion Conditions

| WHEN | IF | Exit Type | Marks Stage Complete |
|------|-----|-----------|---------------------|
| required-tasks-completed | — | exit-only | Yes |

#### Tasks

| # | Task ID | Task | Type | Owner |
|---|---------|------|------|-------|
| 1 | `t9` | GatherEvidence | rpa | system |
| 2 | `t10` | EvaluateFindings | agent | system |

---

##### Task 4.1: GatherEvidence (`t9`)

**Type:** rpa
**Description:** An unattended robot drives the mock ERP and case cockpit by their UI to gather family-specific evidence — batch record and prior complaints for quality defects, temperature-logger data and excursion budget for cold-chain, or warehouse inventory and order-versus-shipped figures for logistics errors.

**Entry Condition**

| WHEN | IF |
|------|-----|
| current-stage-entered | — |

**Inputs:**

| Field | Type | Binding |
|-------|------|---------|
| family | string | =vars.family |
| productCode | string | =vars.productCode |
| batchNo | string | =vars.batchNo |
| orderNo | string | =vars.orderNo |

**Outputs:**

| Field | Binding / Value |
|-------|------------------|
| excursionHours | -> excursionHours |
| loggerAvailable | -> loggerAvailable |
| qtyShipped | -> qtyShipped |

---

##### Task 4.2: EvaluateFindings (`t10`)

**Type:** agent
**Description:** Interprets the gathered evidence to determine whether the complaint resolves in the commercial lane (a valid Family C quantity / human-error claim with no goods return) or the QA lane (Family A or B, or any goods return), and whether physical goods must be returned.

**Entry Condition**

| WHEN | IF |
|------|-----|
| selected-tasks-completed("GatherEvidence") | — |

**Inputs:**

| Field | Type | Binding |
|-------|------|---------|
| family | string | =vars.family |
| qtyOrdered | integer | =vars.qtyOrdered |
| qtyShipped | integer | =vars.qtyShipped |
| excursionHours | double | =vars.excursionHours |
| loggerAvailable | boolean | =vars.loggerAvailable |

**Outputs:**

| Field | Binding / Value |
|-------|------------------|
| lane | -> lane |
| needsGoodsReturn | -> needsGoodsReturn |

---

### Stage 5: Commercial Resolution (`stage-commercial`)

**Type:** Stage
**Description:** The commercial lane for valid Family C quantity / human-error claims with no goods return. Supply Chain determines and approves a credit / debit / redelivery, and QA is notified for metrics only — no QA gate. Skipped on the QA lane.
**Required for Case Completion:** No

#### Stage Entry Conditions

| WHEN | IF |
|------|-----|
| selected-stage-completed("Investigation") | =vars.lane == "COMMERCIAL" |

#### Stage Completion Conditions

| WHEN | IF | Exit Type | Marks Stage Complete |
|------|-----|-----------|---------------------|
| required-tasks-completed | — | exit-only | Yes |

#### Tasks

| # | Task ID | Task | Type | Owner |
|---|---------|------|------|-------|
| 1 | `t11` | DetermineFinanceDirection | process | system |
| 2 | `t12` | SupplyChainResolution | action | Supply Chain Coordinator |
| 3 | `t13` | NotifyQaMetrics | api-workflow | system |

---

##### Task 5.1: DetermineFinanceDirection (`t11`)

**Type:** process
**Description:** Applies the finance-direction rules to the quantity discrepancy to compute whether the customer is owed a credit, owes a debit, or the correction nets to zero across a correlated pair, and the amount.

**Entry Condition**

| WHEN | IF |
|------|-----|
| current-stage-entered | — |

**Inputs:**

| Field | Type | Binding |
|-------|------|---------|
| qtyOrdered | integer | =vars.qtyOrdered |
| qtyShipped | integer | =vars.qtyShipped |
| isCorrelated | boolean | =vars.isCorrelated |

**Outputs:**

| Field | Binding / Value |
|-------|------------------|
| financeDirection | -> financeDirection |
| creditAmount | -> creditAmount |

---

##### Task 5.2: SupplyChainResolution (`t12`)

**Type:** action
**Description:** The Supply Chain Coordinator reviews the ordered-versus-shipped discrepancy and any linked mirror case and decides the commercial resolution — credit, debit or arrange a transfer / redelivery.

**Entry Condition**

| WHEN | IF |
|------|-----|
| selected-tasks-completed("DetermineFinanceDirection") | — |

**HITL Implementation:** JSON Schema
**Recipient:** Role: Supply Chain Coordinator
**Priority:** Medium
**Task Title:** Decide the commercial resolution for the quantity discrepancy.
**Labels:** —
**Run Only Once:** Yes
**Required:** Yes

**Input Schema:**

| Field | Type | Binding | Required |
|-------|------|---------|----------|
| qtyOrdered | Number | =vars.qtyOrdered | No |
| qtyShipped | Number | =vars.qtyShipped | No |
| financeDirection | String | =vars.financeDirection | No |
| creditAmount | Number | =vars.creditAmount | No |
| linkedCaseId | String | =vars.linkedCaseId | No |

**Output Schema:**

| Field | Binding / Value |
|-------|------------------|
| financeDirection | -> financeDirection |

**Actions:**

| Button | Maps To | Behavior |
|--------|---------|----------|
| Credit | financeApproved = true | Complete task approving a credit to the customer. |
| Debit | financeApproved = true | Complete task approving a debit to the customer. |
| Redeliver | needsGoodsReturn = true | Complete task arranging a redelivery / transfer instead of a financial correction. |

---

##### Task 5.3: NotifyQaMetrics (`t13`)

**Type:** api-workflow
**Description:** Sends QA a non-blocking notification that a commercial-lane complaint was resolved, for quality metrics and trend tracking only.

**Entry Condition**

| WHEN | IF |
|------|-----|
| selected-tasks-completed("SupplyChainResolution") | — |

**Inputs:**

| Field | Type | Binding |
|-------|------|---------|
| family | string | =vars.family |
| rootCause | string | =vars.rootCause |
| financeDirection | string | =vars.financeDirection |

**Outputs:**

| Field | Binding / Value |
|-------|------------------|
| — | caseStatus = "CommercialResolved" |

---

### Stage 6: Dossier & QA Sign-off (`stage-dossier`)

**Type:** Stage
**Description:** The QA lane. An agent assembles the structured dossier scoring the five GDP 6.3 criteria TRUE / FALSE / UNKNOWN and a recommended disposition; the investigator must record a root cause; and the QA Analyst signs off that the evidence package is complete. This is HITL Gate 2. Skipped on the commercial lane.
**Required for Case Completion:** No

#### Stage Entry Conditions

| WHEN | IF |
|------|-----|
| selected-stage-completed("Investigation") | =vars.lane == "QA" |

#### Stage Completion Conditions

| WHEN | IF | Exit Type | Marks Stage Complete |
|------|-----|-----------|---------------------|
| required-tasks-completed | — | exit-only | Yes |

#### Stage SLA

| SLA | Unit | At-Risk | At-Risk Action | Breach Action |
|-----|------|---------|----------------|---------------|
| 3 | d | 70% | Notify: UserGroup: Quality Assurance | Notify: UserGroup: Site Leadership |

#### Tasks

| # | Task ID | Task | Type | Owner |
|---|---------|------|------|-------|
| 1 | `t14` | AssembleDossier | agent | system |
| 2 | `t15` | RecordRootCause | action | Supply Chain Coordinator |
| 3 | `t16` | QaSignoff | action | QA Analyst |

---

##### Task 6.1: AssembleDossier (`t14`)

**Type:** agent
**Description:** Assembles the complaint dossier — facts, evidence links and batch history — and scores each of the five GDP 6.3 criteria as TRUE, FALSE or UNKNOWN, treating UNKNOWN as a failure, then recommends a disposition.

**Entry Condition**

| WHEN | IF |
|------|-----|
| current-stage-entered | — |

**Inputs:**

| Field | Type | Binding |
|-------|------|---------|
| family | string | =vars.family |
| productCode | string | =vars.productCode |
| batchNo | string | =vars.batchNo |
| customerType | string | =vars.customerType |
| excursionHours | double | =vars.excursionHours |
| loggerAvailable | boolean | =vars.loggerAvailable |

**Outputs:**

| Field | Binding / Value |
|-------|------------------|
| packagingIntact | -> packagingIntact |
| storageProven | -> storageProven |
| shelfLifeOk | -> shelfLifeOk |
| notPriorReturnRecall | -> notPriorReturnRecall |
| withinTimeWindow | -> withinTimeWindow |
| recommendedDisposition | -> recommendedDisposition |
| dossierJson | -> dossierJson |

---

##### Task 6.2: RecordRootCause (`t15`)

**Type:** action
**Description:** The investigator must record the root cause of the complaint before the dossier can proceed to QA sign-off — a mandatory regulated input.

**Entry Condition**

| WHEN | IF |
|------|-----|
| selected-tasks-completed("AssembleDossier") | — |

**HITL Implementation:** JSON Schema
**Recipient:** Role: Supply Chain Coordinator
**Priority:** High
**Task Title:** Record the root cause of the complaint.
**Labels:** —
**Run Only Once:** Yes
**Required:** Yes

**Input Schema:**

| Field | Type | Binding | Required |
|-------|------|---------|----------|
| complaintSummary | String | =vars.complaintSummary | No |
| family | String | =vars.family | No |

**Output Schema:**

| Field | Binding / Value |
|-------|------------------|
| rootCause | -> rootCause |

---

##### Task 6.3: QaSignoff (`t16`)

**Type:** action
**Description:** The QA Analyst reviews the assembled dossier and the 6.3 criteria checklist and either confirms the evidence package is complete or sends it back for more evidence. This is HITL Gate 2.

**Entry Condition**

| WHEN | IF |
|------|-----|
| selected-tasks-completed("RecordRootCause") | — |

**HITL Implementation:** JSON Schema
**Recipient:** Role: QA Analyst
**Priority:** High
**Task Title:** Confirm the evidence package is complete and sound.
**Labels:** —
**Run Only Once:** No
**Required:** Yes

**Input Schema:**

| Field | Type | Binding | Required |
|-------|------|---------|----------|
| packagingIntact | String | =vars.packagingIntact | No |
| storageProven | String | =vars.storageProven | No |
| shelfLifeOk | String | =vars.shelfLifeOk | No |
| notPriorReturnRecall | String | =vars.notPriorReturnRecall | No |
| withinTimeWindow | String | =vars.withinTimeWindow | No |
| rootCause | String | =vars.rootCause | No |
| recommendedDisposition | String | =vars.recommendedDisposition | No |

**Output Schema:**

| Field | Binding / Value |
|-------|------------------|
| — | qaSignoff = true |

**Actions:**

| Button | Maps To | Behavior |
|--------|---------|----------|
| EvidenceComplete | qaSignoff = true | Complete task and send the dossier to the policy router. |
| SendBack | qaSignoff = false | Complete task and return the case for more evidence. |

---

### Stage 7: Policy Routing (`stage-policy`)

**Type:** Stage
**Description:** Applies the standing disposition policy table to the product and complaint type to decide whether the case follows the policy-known Path A (provisional parallelism) or the genuine case-by-case Path B.
**Required for Case Completion:** No

#### Stage Entry Conditions

| WHEN | IF |
|------|-----|
| selected-stage-completed("Dossier & QA Sign-off") | =vars.lane == "QA" |

#### Stage Completion Conditions

| WHEN | IF | Exit Type | Marks Stage Complete |
|------|-----|-----------|---------------------|
| required-tasks-completed | — | exit-only | Yes |

#### Tasks

| # | Task ID | Task | Type | Owner |
|---|---------|------|------|-------|
| 1 | `t17` | PolicyRouter | process | system |

---

##### Task 7.1: PolicyRouter (`t17`)

**Type:** process
**Description:** Matches the product, family and sub-condition against the standing disposition policy table (first match wins) and outputs the routing path.

**Entry Condition**

| WHEN | IF |
|------|-----|
| current-stage-entered | — |

**Inputs:**

| Field | Type | Binding |
|-------|------|---------|
| productCode | string | =vars.productCode |
| family | string | =vars.family |
| packagingIntact | string | =vars.packagingIntact |
| storageProven | string | =vars.storageProven |

**Outputs:**

| Field | Binding / Value |
|-------|------------------|
| policyPath | -> policyPath |

---

### Stage 8: Path A — Provisional Parallel (`stage-patha`)

**Type:** Stage
**Description:** The policy-known path. The case forks: the Responsible Person ratifies that the policy was correctly applied on the authority track, while Logistics and Finance prepare a return / redelivery plan and a credit / debit note reversibly in parallel on the execution track. A join then commits irreversible steps only if ratified. Skipped on Path B.
**Required for Case Completion:** No

#### Stage Entry Conditions

| WHEN | IF |
|------|-----|
| selected-stage-completed("Policy Routing") | =vars.policyPath == "PATH_A_ALWAYS_DESTROY" |

#### Stage Completion Conditions

| WHEN | IF | Exit Type | Marks Stage Complete |
|------|-----|-----------|---------------------|
| required-tasks-completed | — | exit-only | Yes |

#### Stage SLA

| SLA | Unit | At-Risk | At-Risk Action | Breach Action |
|-----|------|---------|----------------|---------------|
| 2 | d | 75% | Notify: UserGroup: Responsible Person | Notify: UserGroup: Site Leadership |

#### Tasks

| # | Task ID | Task | Type | Owner |
|---|---------|------|------|-------|
| 1 | `t18` | RpRatification | action | Responsible Person |
| 2 | `t19` | PrepareLogistics | action | Logistics |
| 3 | `t20` | PrepareFinanceDraft | action | Finance |
| 4 | `t21` | CommitOrCompensate | process | system |

---

##### Task 8.1: RpRatification (`t18`)

**Type:** action
**Description:** The Responsible Person confirms the standing policy was correctly applied (ratify) or overrides it (e.g. the damage is unsubstantiated). This is HITL Gate 3 on Path A. Runs in parallel with the reversible execution-track preparations.

**Entry Condition**

| WHEN | IF |
|------|-----|
| current-stage-entered | — |

**HITL Implementation:** JSON Schema
**Recipient:** Role: Responsible Person
**Priority:** Critical
**Task Title:** Ratify or override the standing disposition policy.
**Labels:** —
**Run Only Once:** Yes
**Required:** Yes

**Input Schema:**

| Field | Type | Binding | Required |
|-------|------|---------|----------|
| recommendedDisposition | String | =vars.recommendedDisposition | No |
| packagingIntact | String | =vars.packagingIntact | No |
| storageProven | String | =vars.storageProven | No |
| rootCause | String | =vars.rootCause | No |

**Output Schema:**

| Field | Binding / Value |
|-------|------------------|
| — | rpRatified = false |

**Actions:**

| Button | Maps To | Behavior |
|--------|---------|----------|
| Ratify | rpRatified = true | Complete task confirming the policy; the case proceeds to commit and execute. |
| Override | isOverride = true | Complete task overriding the policy; the case routes to compensation and re-evaluation. |

---

##### Task 8.2: PrepareLogistics (`t19`)

**Type:** action
**Description:** Logistics approves a return / redelivery plan that is prepared but not dispatched — reversible work only — while the Responsible Person reviews. This is the provisional form of HITL Gate 4.

**Entry Condition**

| WHEN | IF |
|------|-----|
| current-stage-entered | — |

**HITL Implementation:** JSON Schema
**Recipient:** Role: Logistics
**Priority:** Medium
**Task Title:** Approve the provisional return / redelivery plan (not yet dispatched).
**Labels:** —
**Run Only Once:** Yes
**Required:** Yes

**Input Schema:**

| Field | Type | Binding | Required |
|-------|------|---------|----------|
| recommendedDisposition | String | =vars.recommendedDisposition | No |
| needsGoodsReturn | Boolean | =vars.needsGoodsReturn | No |

**Output Schema:**

| Field | Binding / Value |
|-------|------------------|
| — | caseStatus = "PathAPrepared" |

---

##### Task 8.3: PrepareFinanceDraft (`t20`)

**Type:** action
**Description:** Finance approves the credit / debit note. On the standard path the note is drafted but not posted; in the override showpiece Finance posts it early, committing it before ratification so the Saga reversal can be demonstrated. This is the provisional form of HITL Gate 5.

**Entry Condition**

| WHEN | IF |
|------|-----|
| current-stage-entered | — |

**HITL Implementation:** JSON Schema
**Recipient:** Role: Finance
**Priority:** Medium
**Task Title:** Approve the credit / debit note (draft) or post it early.
**Labels:** —
**Run Only Once:** Yes
**Required:** Yes

**Input Schema:**

| Field | Type | Binding | Required |
|-------|------|---------|----------|
| financeDirection | String | =vars.financeDirection | No |
| creditAmount | Number | =vars.creditAmount | No |

**Output Schema:**

| Field | Binding / Value |
|-------|------------------|
| — | creditNoteStatus = "DRAFT" |

**Actions:**

| Button | Maps To | Behavior |
|--------|---------|----------|
| ApproveDraft | creditNoteStatus = "DRAFT" | Complete task leaving the note drafted and reversible. |
| PostEarly | creditPosted = true | Complete task posting the note to ERP early (override showpiece). |

---

##### Task 8.4: CommitOrCompensate (`t21`)

**Type:** process
**Description:** The join. Evaluates the Responsible Person's outcome against the execution-track state: if ratified it commits the irreversible steps and sets the final disposition; if overridden it flags that compensation is required.

**Entry Condition**

| WHEN | IF |
|------|-----|
| selected-tasks-completed("RpRatification", "PrepareLogistics", "PrepareFinanceDraft") | — |

**Inputs:**

| Field | Type | Binding |
|-------|------|---------|
| rpRatified | boolean | =vars.rpRatified |
| isOverride | boolean | =vars.isOverride |
| creditNoteStatus | string | =vars.creditNoteStatus |
| creditPosted | boolean | =vars.creditPosted |
| recommendedDisposition | string | =vars.recommendedDisposition |

**Outputs:**

| Field | Binding / Value |
|-------|------------------|
| finalDisposition | -> finalDisposition |
| compensationRequired | -> compensationRequired |

---

### Stage 9: Path B — Sequential Disposition (`stage-pathb`)

**Type:** Stage
**Description:** The genuine case-by-case path. The Responsible Person makes the regulated disposition decision — back to saleable stock versus destroy — against the GDP 6.3 checklist. This is HITL Gate 3 on Path B, and the re-entry point after an override-and-compensate on Path A. Skipped on Path A unless an override re-routes here.
**Required for Case Completion:** No

#### Stage Entry Conditions

| WHEN | IF |
|------|-----|
| selected-stage-completed("Policy Routing") | =vars.policyPath == "PATH_B_CASE_BY_CASE" |
| selected-stage-completed("RP Override Compensation") | =vars.isOverride == true |

#### Stage Completion Conditions

| WHEN | IF | Exit Type | Marks Stage Complete |
|------|-----|-----------|---------------------|
| required-tasks-completed | — | exit-only | Yes |

#### Stage SLA

| SLA | Unit | At-Risk | At-Risk Action | Breach Action |
|-----|------|---------|----------------|---------------|
| 2 | d | 75% | Notify: UserGroup: Responsible Person | Notify: UserGroup: Site Leadership |

#### Tasks

| # | Task ID | Task | Type | Owner |
|---|---------|------|------|-------|
| 1 | `t22` | DispositionDecision | action | Responsible Person |

---

##### Task 9.1: DispositionDecision (`t22`)

**Type:** action
**Description:** The Responsible Person makes the legally-required disposition call against the 6.3 checklist — authorize return to saleable stock, order destruction, or close with no return. This decision cannot be automated away.

**Entry Condition**

| WHEN | IF |
|------|-----|
| current-stage-entered | — |

**HITL Implementation:** JSON Schema
**Recipient:** Role: Responsible Person
**Priority:** Critical
**Task Title:** Authorize the GDP disposition for the affected batch.
**Labels:** —
**Run Only Once:** No
**Required:** Yes

**Input Schema:**

| Field | Type | Binding | Required |
|-------|------|---------|----------|
| packagingIntact | String | =vars.packagingIntact | No |
| storageProven | String | =vars.storageProven | No |
| shelfLifeOk | String | =vars.shelfLifeOk | No |
| notPriorReturnRecall | String | =vars.notPriorReturnRecall | No |
| withinTimeWindow | String | =vars.withinTimeWindow | No |
| recommendedDisposition | String | =vars.recommendedDisposition | No |

**Output Schema:**

| Field | Binding / Value |
|-------|------------------|
| Action | -> rpDecision |

**Actions:**

| Button | Maps To | Behavior |
|--------|---------|----------|
| AuthorizeBackToStock | finalDisposition = "BACK_TO_STOCK" | Authorize return to saleable stock (all 6.3 criteria TRUE). |
| OrderDestruction | finalDisposition = "DESTROY" | Order destruction (any criterion FALSE or UNKNOWN). |
| NoReturn | finalDisposition = "NO_DISPOSITION" | Close with no product disposition. |

---

### Stage 10: RP Override Compensation (`stage-compensation`)

**Type:** Stage
**Description:** The Saga compensation branch. When the Responsible Person overrides the policy on Path A, this stage cheaply cancels reversible work, or — if a credit was already posted — issues a reversing note, reconciles the ERP and raises a deviation / CAPA, then re-routes the case to Path B for a fresh decision. Skipped unless an override occurred.
**Required for Case Completion:** No

#### Stage Entry Conditions

| WHEN | IF |
|------|-----|
| selected-stage-completed("Path A — Provisional Parallel") | =vars.isOverride == true |

#### Stage Completion Conditions

| WHEN | IF | Exit Type | Marks Stage Complete |
|------|-----|-----------|---------------------|
| required-tasks-completed | — | exit-only | Yes |

#### Tasks

| # | Task ID | Task | Type | Owner |
|---|---------|------|------|-------|
| 1 | `t23` | EvaluateCompensation | process | system |
| 2 | `t24` | IssueReversingNote | rpa | system |
| 3 | `t25` | RaiseDeviationCapa | action | QA Analyst |

---

##### Task EX.1: EvaluateCompensation (`t23`)

**Type:** process
**Description:** Determines the compensation type — a cheap cancel of reversible work when nothing was committed, or a Saga reversal when a credit was already posted — and releases any reserved stock.

**Entry Condition**

| WHEN | IF |
|------|-----|
| current-stage-entered | — |

**Inputs:**

| Field | Type | Binding |
|-------|------|---------|
| creditPosted | boolean | =vars.creditPosted |
| creditNoteStatus | string | =vars.creditNoteStatus |

**Outputs:**

| Field | Binding / Value |
|-------|------------------|
| compensationRequired | -> compensationRequired |

---

##### Task EX.2: IssueReversingNote (`t24`)

**Type:** rpa
**Description:** When a credit was already posted, a robot drives the mock ERP to issue a reversing debit / credit note and reconcile the ledger. Runs only when a posted note must be reversed.

**Entry Condition**

| WHEN | IF |
|------|-----|
| selected-tasks-completed("EvaluateCompensation") | =vars.creditPosted == true |

**Inputs:**

| Field | Type | Binding |
|-------|------|---------|
| creditAmount | double | =vars.creditAmount |
| financeDirection | string | =vars.financeDirection |

**Outputs:**

| Field | Binding / Value |
|-------|------------------|
| — | creditNoteStatus = "REVERSED" |

---

##### Task EX.3: RaiseDeviationCapa (`t25`)

**Type:** action
**Description:** The QA Analyst logs a deviation / CAPA record documenting the policy override and reversal, for the audit trail.

**Entry Condition**

| WHEN | IF |
|------|-----|
| selected-tasks-completed("EvaluateCompensation") | — |

**HITL Implementation:** JSON Schema
**Recipient:** Role: QA Analyst
**Priority:** High
**Task Title:** Log the deviation / CAPA for the policy override.
**Labels:** —
**Run Only Once:** Yes
**Required:** Yes

**Input Schema:**

| Field | Type | Binding | Required |
|-------|------|---------|----------|
| rootCause | String | =vars.rootCause | No |
| creditNoteStatus | String | =vars.creditNoteStatus | No |

**Output Schema:**

| Field | Binding / Value |
|-------|------------------|
| — | deviationRaised = true |

---

### Stage 11: Batch Disposition Execution (`stage-execution`)

**Type:** Stage
**Description:** Drives the batch state machine. A robot sets the affected batch to QUARANTINE in the ERP, then — per the authorized disposition — moves it to AVAILABLE (FEFO placement) or BLOCKED awaiting destruction. Destruction, the one irreversible act, is confirmed only after Responsible Person authorization. Skipped on the commercial lane.
**Required for Case Completion:** No

#### Stage Entry Conditions

| WHEN | IF |
|------|-----|
| selected-stage-completed("Path A — Provisional Parallel") | =js:(vars.finalDisposition != "" && vars.isOverride == false) |
| selected-stage-completed("Path B — Sequential Disposition") | =vars.finalDisposition != "" |

#### Stage Completion Conditions

| WHEN | IF | Exit Type | Marks Stage Complete |
|------|-----|-----------|---------------------|
| required-tasks-completed | — | exit-only | Yes |

#### Tasks

| # | Task ID | Task | Type | Owner |
|---|---------|------|------|-------|
| 1 | `t26` | SetBatchQuarantine | rpa | system |
| 2 | `t27` | ExecuteDisposition | rpa | system |
| 3 | `t28` | ConfirmDestruction | action | Responsible Person |

---

##### Task 10.1: SetBatchQuarantine (`t26`)

**Type:** rpa
**Description:** A robot drives the mock ERP to move the affected batch quantity into QUARANTINE status while the physical disposition is carried out.

**Entry Condition**

| WHEN | IF |
|------|-----|
| current-stage-entered | — |

**Inputs:**

| Field | Type | Binding |
|-------|------|---------|
| batchNo | string | =vars.batchNo |
| qtyAffected | integer | =vars.qtyAffected |

**Outputs:**

| Field | Binding / Value |
|-------|------------------|
| — | batchStatus = "QUARANTINE" |

---

##### Task 10.2: ExecuteDisposition (`t27`)

**Type:** rpa
**Description:** A robot updates the batch status in the ERP according to the authorized disposition — AVAILABLE with FEFO placement for back-to-stock, or BLOCKED awaiting destruction otherwise.

**Entry Condition**

| WHEN | IF |
|------|-----|
| selected-tasks-completed("SetBatchQuarantine") | — |

**Inputs:**

| Field | Type | Binding |
|-------|------|---------|
| batchNo | string | =vars.batchNo |
| finalDisposition | string | =vars.finalDisposition |

**Outputs:**

| Field | Binding / Value |
|-------|------------------|
| batchStatus | -> batchStatus |

---

##### Task 10.3: ConfirmDestruction (`t28`)

**Type:** action
**Description:** When the disposition is destruction, the Responsible Person confirms the irreversible destruction and a certificate of destruction is produced. Runs only for destroy dispositions.

**Entry Condition**

| WHEN | IF |
|------|-----|
| selected-tasks-completed("ExecuteDisposition") | =vars.finalDisposition == "DESTROY" |

**HITL Implementation:** JSON Schema
**Recipient:** Role: Responsible Person
**Priority:** Critical
**Task Title:** Confirm destruction of the affected batch.
**Labels:** —
**Run Only Once:** Yes
**Required:** No

**Input Schema:**

| Field | Type | Binding | Required |
|-------|------|---------|----------|
| batchNo | String | =vars.batchNo | No |
| qtyAffected | Number | =vars.qtyAffected | No |

**Output Schema:**

| Field | Binding / Value |
|-------|------------------|
| — | batchStatus = "BLOCKED" |

---

### Stage 12: Follow-up & Finance (`stage-followup`)

**Type:** Stage
**Description:** Logistics approves the final return / redelivery plan and Finance approves the credit / debit amount; a robot then posts the note to the ERP. Both the QA lane (after disposition) and the commercial lane converge here. These are HITL Gates 4 and 5.
**Required for Case Completion:** Yes

#### Stage Entry Conditions

| WHEN | IF |
|------|-----|
| selected-stage-completed("Batch Disposition Execution") | =vars.lane == "QA" |
| selected-stage-completed("Commercial Resolution") | =vars.lane == "COMMERCIAL" |

#### Stage Completion Conditions

| WHEN | IF | Exit Type | Marks Stage Complete |
|------|-----|-----------|---------------------|
| required-tasks-completed | — | exit-only | Yes |

#### Stage SLA

| SLA | Unit | At-Risk | At-Risk Action | Breach Action |
|-----|------|---------|----------------|---------------|
| 3 | d | 70% | Notify: UserGroup: Finance | Notify: UserGroup: Site Leadership |

#### Tasks

| # | Task ID | Task | Type | Owner |
|---|---------|------|------|-------|
| 1 | `t29` | LogisticsFollowup | action | Logistics |
| 2 | `t30` | FinanceApproval | action | Finance |
| 3 | `t31` | PostToErp | rpa | system |

---

##### Task 11.1: LogisticsFollowup (`t29`)

**Type:** action
**Description:** Logistics approves the final return, redelivery or destruction-order plan now that the disposition is known. This is HITL Gate 4.

**Entry Condition**

| WHEN | IF |
|------|-----|
| current-stage-entered | — |

**HITL Implementation:** JSON Schema
**Recipient:** Role: Logistics
**Priority:** Medium
**Task Title:** Approve the final follow-up plan.
**Labels:** —
**Run Only Once:** Yes
**Required:** Yes

**Input Schema:**

| Field | Type | Binding | Required |
|-------|------|---------|----------|
| finalDisposition | String | =vars.finalDisposition | No |
| needsGoodsReturn | Boolean | =vars.needsGoodsReturn | No |

**Output Schema:**

| Field | Binding / Value |
|-------|------------------|
| — | logisticsApproved = true |

**Actions:**

| Button | Maps To | Behavior |
|--------|---------|----------|
| Approve | logisticsApproved = true | Approve the follow-up plan and proceed to finance. |
| Revise | logisticsApproved = false | Send the plan back for revision. |

---

##### Task 11.2: FinanceApproval (`t30`)

**Type:** action
**Description:** Finance approves the final credit / debit amount before it is posted to the ERP. This is HITL Gate 5.

**Entry Condition**

| WHEN | IF |
|------|-----|
| current-stage-entered | — |

**HITL Implementation:** JSON Schema
**Recipient:** Role: Finance
**Priority:** High
**Task Title:** Approve the credit / debit amount to post.
**Labels:** —
**Run Only Once:** Yes
**Required:** Yes

**Input Schema:**

| Field | Type | Binding | Required |
|-------|------|---------|----------|
| financeDirection | String | =vars.financeDirection | No |
| creditAmount | Number | =vars.creditAmount | No |

**Output Schema:**

| Field | Binding / Value |
|-------|------------------|
| — | financeApproved = true |

**Actions:**

| Button | Maps To | Behavior |
|--------|---------|----------|
| Approve | financeApproved = true | Approve the amount and post the note. |
| Reject | financeApproved = false | Reject the amount and send back. |

---

##### Task 11.3: PostToErp (`t31`)

**Type:** rpa
**Description:** A robot drives the mock ERP to post the approved credit / debit note, marking it posted.

**Entry Condition**

| WHEN | IF |
|------|-----|
| selected-tasks-completed("LogisticsFollowup", "FinanceApproval") | =vars.financeApproved == true |

**Inputs:**

| Field | Type | Binding |
|-------|------|---------|
| financeDirection | string | =vars.financeDirection |
| creditAmount | double | =vars.creditAmount |

**Outputs:**

| Field | Binding / Value |
|-------|------------------|
| creditNoteStatus | -> creditNoteStatus |
| creditPosted | -> creditPosted |

---

### Stage 13: Closure (`stage-closure`)

**Type:** Stage
**Description:** Notifies the customer of the resolution, finalizes the audit trail and closes the case.
**Required for Case Completion:** Yes

#### Stage Entry Conditions

| WHEN | IF |
|------|-----|
| selected-stage-completed("Follow-up & Finance") | — |

#### Stage Completion Conditions

| WHEN | IF | Exit Type | Marks Stage Complete |
|------|-----|-----------|---------------------|
| required-tasks-completed | — | exit-only | Yes |

#### Tasks

| # | Task ID | Task | Type | Owner |
|---|---------|------|------|-------|
| 1 | `t32` | NotifyCustomer | api-workflow | system |
| 2 | `t33` | CloseCase | process | system |

---

##### Task 12.1: NotifyCustomer (`t32`)

**Type:** api-workflow
**Description:** Sends the customer the resolution notice describing the outcome and any credit, redelivery or destruction action taken.

**Entry Condition**

| WHEN | IF |
|------|-----|
| current-stage-entered | — |

**Inputs:**

| Field | Type | Binding |
|-------|------|---------|
| emailTo | string | =vars.emailFrom |
| customerName | string | =vars.customerName |
| finalDisposition | string | =vars.finalDisposition |
| financeDirection | string | =vars.financeDirection |

**Outputs:**

| Field | Binding / Value |
|-------|------------------|
| — | customerNotified = true |

---

##### Task 12.2: CloseCase (`t33`)

**Type:** process
**Description:** Finalizes the audit trail, sets the case outcome summary and marks the case closed.

**Entry Condition**

| WHEN | IF |
|------|-----|
| selected-tasks-completed("NotifyCustomer") | — |

**Inputs:**

| Field | Type | Binding |
|-------|------|---------|
| finalDisposition | string | =vars.finalDisposition |
| batchStatus | string | =vars.batchStatus |
| creditNoteStatus | string | =vars.creditNoteStatus |

**Outputs:**

| Field | Binding / Value |
|-------|------------------|
| caseOutcome | -> caseOutcome |
| — | caseStatus = "Closed" |

---

## Section 3: Personas & App Views

### Personas

| Persona | Stage Scope | Permissions | Description |
|---------|-------------|-------------|-------------|
| Customer Service | Intake & Triage, Acknowledge & Completeness | View, Act, Reassign | Owns the front door — validates and classifies complaints (Gate 1) and handles requests-for-information. |
| Supply Chain Coordinator | Investigation, Commercial Resolution, Dossier & QA Sign-off | View, Act | The investigator and commercial fixer — validates Family C claims, resolves the commercial lane, and records root cause. |
| QA Analyst | Dossier & QA Sign-off, RP Override Compensation | View, Act | The gatekeeper of evidence — signs off the dossier (Gate 2) and logs deviations / CAPA. |
| Responsible Person | Path A — Provisional Parallel, Path B — Sequential Disposition, Batch Disposition Execution | View, Act | The legal authority — ratifies or makes the regulated disposition decision (Gate 3) and confirms destruction. |
| Logistics | Path A — Provisional Parallel, Follow-up & Finance | View, Act | Approves the return / redelivery plan (Gate 4). |
| Finance | Path A — Provisional Parallel, Follow-up & Finance | View, Act | Approves credit / debit notes (Gate 5) and the posting amount. |

### Process App Views

| App | View | Persona | Purpose | Key Components |
|-----|------|---------|---------|----------------|
| GDP Complaint Console | Case List | Customer Service | Inbox-style queue of incoming complaints | Columns: case id, customer, family, status; filters by family and status |
| GDP Complaint Console | Triage Detail | Customer Service | One-screen confirm of the AI extraction | Extraction fields, confidence bar, classification picker, request-info / reject buttons |
| GDP Complaint Console | Investigation Detail | Supply Chain Coordinator | Ordered-vs-shipped comparison and correlation panel | Discrepancy table, linked-case panel, root-cause picker |
| GDP Complaint Console | Dossier View | QA Analyst | The 6.3 criteria checklist with evidence links | Criteria checklist (✓/✗/?), evidence links, recommendation, send-to-RP / send-back |
| GDP Complaint Console | Disposition Decision | Responsible Person | Focused, e-signed disposition decision | 6.3 summary, recommendation, authorize-back-to-stock / order-destruction buttons |
| GDP Complaint Console | Metrics Dashboard | QA Analyst | Complaint metrics and trends | Charts: complaints by family, root-cause trends |

---

## Section 4: Integrations

### Integration Service Connectors

| Connector | System | Auth Method | Operations Used | Used By Tasks |
|-----------|--------|-------------|-----------------|---------------|
| Office 365 Outlook | Microsoft 365 mailbox | OAuth2 | Send email | SendAcknowledgement, NotifyQaMetrics, NotifyCustomer |

> The mock ERP and case-management cockpit are desktop applications driven by the robot via UI Automation (the `rpa` tasks), not Integration Service connectors. The GDP 6.3 gate, family classifier, policy router and finance-direction rules are implemented as deterministic decision logic inside the `process` tasks (portable to DMN decision tables).

#### Office 365 Outlook

**Operations:**

| Operation | Method | Input Fields | Output Fields |
|-----------|--------|-------------|---------------|
| Send email | POST | to: string, subject: string, body: string | messageId: string |

### External Agents

_Not applicable — all reasoning tasks run as native UiPath agents._

---

## Section 5: Implementation Readiness

Review items (also mirrored in `tasks/registry-resolved.json`):

- **rev_trigger_event** (high) — target: Section 1.3 Triggers. The case starts on an Office 365 Outlook "Email received" event trigger, but no Outlook connection is provisioned in Integration Service yet, so the trigger is built as a placeholder (no `connectionId` / `activityTypeId`). Provision the Outlook connection and resolve the trigger before the case can start from a real mailbox.
- **rev_unresolved_rpa** (high) — target: LookupSalesOrder, GatherEvidence, IssueReversingNote, SetBatchQuarantine, ExecuteDisposition, PostToErp. The robots that drive the mock ERP and cockpit are not yet published to the tenant; these are placeholder `rpa` tasks pending the workflows.
- **rev_unresolved_agents** (high) — target: CorrelationCheck, EvaluateFindings, AssembleDossier. The correlation, investigation and dossier agents are not yet published; these are placeholder `agent` tasks. ExtractComplaint resolves to the published ComplaintIntakeAgent.
- **rev_unresolved_process** (high) — target: CompletenessCheck, DetermineFinanceDirection, PolicyRouter, CommitOrCompensate, EvaluateCompensation, CloseCase. The decision-logic processes (family classifier, 6.3 gate, policy router, finance direction, Saga join) are not yet published; these are placeholder `process` tasks.
- **rev_unresolved_api** (high) — target: SendAcknowledgement, NotifyQaMetrics, NotifyCustomer. Outbound-email API workflows are not yet published (the existing `1.ReceiveEmail` is inbound only); these are placeholder `api-workflow` tasks.
- **rev_actionapps_jsonschema** (medium) — target: all `action` tasks except TriageValidation. Only the `gdp-complaint-intake` Action App is deployed (used by Gate 1 TriageValidation); the remaining gates use JSON-schema forms until dedicated Action Apps are deployed.

