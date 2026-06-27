Schema: v20

<!-- Plan for GdpComplaintManagement. Order: case → trigger → variables → stages → edges → tasks → conditions → SLA. -->

## T01: Create case file "GdpComplaintManagement"
- name: GdpComplaintManagement
- file-path: content/GdpComplaintManagement.json
- case-identifier: CMP
- identifier-type: constant
- case-app-enabled: true
- description: "Manages a pharma B2B customer complaint about a medicine shipment from intake through GDP-compliant disposition and financial correction, with AI triage/investigation, robots driving the mock ERP and cockpit, and a human gate at every regulated decision."
- verify: Confirm Result: Success, capture root id

## T02: Configure event trigger "Complaint Email Received"
- type-id: <UNRESOLVED: no IS connection for uipath-microsoft-office-365-outlook>
- connection-id: <UNRESOLVED>
- connector-key: uipath-microsoft-office-365-outlook
- object-name: Email
- event-operation: created
- event-mode: webhooks
- order: after T01
- verify: placeholder event trigger — data.uipath.serviceType=Intsvc.EventTrigger only; entry-points.json entry appended; trigger-edge to first stage created; user attaches connection after provisioning Outlook in Integration Service.

## T03: Declare Variable "emailFrom"
- category: Variable
- type: string
- sourceTrigger: T02
- sourceField: from

## T04: Declare Variable "emailSubject"
- category: Variable
- type: string
- sourceTrigger: T02
- sourceField: subject

## T05: Declare Variable "emailBody"
- category: Variable
- type: string
- sourceTrigger: T02
- sourceField: body

## T06: Declare Out-argument "caseOutcome"
- category: Out
- type: string
- default: "Pending"
- producedBy: CloseCase.outputs.caseOutcome

## T07: Declare Variable "caseStatus"
- category: Variable
- type: string
- default: "Intake"

## T08: Declare Variable "customerCode"
- category: Variable
- type: string

## T09: Declare Variable "customerName"
- category: Variable
- type: string

## T10: Declare Variable "customerType"
- category: Variable
- type: string

## T11: Declare Variable "productCode"
- category: Variable
- type: string

## T12: Declare Variable "productName"
- category: Variable
- type: string

## T13: Declare Variable "batchNo"
- category: Variable
- type: string

## T14: Declare Variable "orderNo"
- category: Variable
- type: string

## T15: Declare Variable "dispatchRef"
- category: Variable
- type: string

## T16: Declare Variable "qtyAffected"
- category: Variable
- type: integer
- default: 0

## T17: Declare Variable "qtyOrdered"
- category: Variable
- type: integer
- default: 0

## T18: Declare Variable "qtyShipped"
- category: Variable
- type: integer
- default: 0

## T19: Declare Variable "family"
- category: Variable
- type: string

## T20: Declare Variable "severity"
- category: Variable
- type: string
- default: "Medium"

## T21: Declare Variable "intakeConfidence"
- category: Variable
- type: double
- default: 0

## T22: Declare Variable "missingInformation"
- category: Variable
- type: string

## T23: Declare Variable "complaintSummary"
- category: Variable
- type: string

## T24: Declare Variable "isComplaintValid"
- category: Variable
- type: boolean
- default: false

## T25: Declare Variable "infoComplete"
- category: Variable
- type: boolean
- default: true

## T26: Declare Variable "rfiSent"
- category: Variable
- type: boolean
- default: false

## T27: Declare Variable "linkedCaseId"
- category: Variable
- type: string

## T28: Declare Variable "isCorrelated"
- category: Variable
- type: boolean
- default: false

## T29: Declare Variable "excursionHours"
- category: Variable
- type: double
- default: 0

## T30: Declare Variable "loggerAvailable"
- category: Variable
- type: boolean
- default: true

## T31: Declare Variable "lane"
- category: Variable
- type: string
- default: "QA"

## T32: Declare Variable "needsGoodsReturn"
- category: Variable
- type: boolean
- default: true

## T33: Declare Variable "dossierJson"
- category: Variable
- type: string

## T34: Declare Variable "packagingIntact"
- category: Variable
- type: string
- default: "UNKNOWN"

## T35: Declare Variable "storageProven"
- category: Variable
- type: string
- default: "UNKNOWN"

## T36: Declare Variable "shelfLifeOk"
- category: Variable
- type: string
- default: "UNKNOWN"

## T37: Declare Variable "notPriorReturnRecall"
- category: Variable
- type: string
- default: "UNKNOWN"

## T38: Declare Variable "withinTimeWindow"
- category: Variable
- type: string
- default: "UNKNOWN"

## T39: Declare Variable "rootCause"
- category: Variable
- type: string
- default: "Pending"

## T40: Declare Variable "recommendedDisposition"
- category: Variable
- type: string
- default: "DESTROY"

## T41: Declare Variable "qaSignoff"
- category: Variable
- type: boolean
- default: false

## T42: Declare Variable "policyPath"
- category: Variable
- type: string
- default: "NONE"

## T43: Declare Variable "rpRatified"
- category: Variable
- type: boolean
- default: false

## T44: Declare Variable "isOverride"
- category: Variable
- type: boolean
- default: false

## T45: Declare Variable "rpDecision"
- category: Variable
- type: string

## T46: Declare Variable "finalDisposition"
- category: Variable
- type: string
- default: ""

## T47: Declare Variable "batchStatus"
- category: Variable
- type: string
- default: "Available"

## T48: Declare Variable "financeDirection"
- category: Variable
- type: string
- default: "NONE"

## T49: Declare Variable "creditAmount"
- category: Variable
- type: double
- default: 0

## T50: Declare Variable "creditNoteStatus"
- category: Variable
- type: string
- default: "NONE"

## T51: Declare Variable "creditPosted"
- category: Variable
- type: boolean
- default: false

## T52: Declare Variable "compensationRequired"
- category: Variable
- type: boolean
- default: false

## T53: Declare Variable "deviationRaised"
- category: Variable
- type: boolean
- default: false

## T54: Declare Variable "logisticsApproved"
- category: Variable
- type: boolean
- default: false

## T55: Declare Variable "financeApproved"
- category: Variable
- type: boolean
- default: false

## T56: Declare Variable "customerNotified"
- category: Variable
- type: boolean
- default: false

## T57: Create stage "Intake & Triage"
- type: stage
- description: "Agent extracts the complaint; robot pulls the sales order; Customer Service validates (Gate 1)."
- isRequired: true
- order: after T56
- verify: Confirm Result: Success, capture StageId

## T58: Create stage "Acknowledge & Completeness"
- type: stage
- description: "Auto-acknowledge, check completeness; RFI + park on SLA timer when incomplete."
- isRequired: true
- order: after T57
- verify: Confirm Result: Success, capture StageId

## T59: Create stage "Cross-Case Correlation"
- type: stage
- description: "Agent links a mirror case sharing the same dispatch reference."
- isRequired: true
- order: after T58
- verify: Confirm Result: Success, capture StageId

## T60: Create stage "Investigation"
- type: stage
- description: "Family-specific evidence gathering; decide lane and goods-return."
- isRequired: true
- order: after T59
- verify: Confirm Result: Success, capture StageId

## T61: Create stage "Commercial Resolution"
- type: stage
- description: "Commercial lane for Family C; credit/debit/redeliver, QA notified for metrics. Conditional."
- isRequired: false
- order: after T60
- verify: Confirm Result: Success, capture StageId

## T62: Create stage "Dossier & QA Sign-off"
- type: stage
- description: "QA lane; agent assembles dossier + 6.3 scoring; root cause; QA sign-off (Gate 2). Conditional."
- isRequired: false
- order: after T61
- verify: Confirm Result: Success, capture StageId

## T63: Create stage "Policy Routing"
- type: stage
- description: "Policy router decides Path A vs Path B. Conditional (QA lane)."
- isRequired: false
- order: after T62
- verify: Confirm Result: Success, capture StageId

## T64: Create stage "Path A — Provisional Parallel"
- type: stage
- description: "Fork: RP ratifies while logistics/finance prepare reversibly; join commits or compensates. Conditional."
- isRequired: false
- order: after T63
- verify: Confirm Result: Success, capture StageId

## T65: Create stage "Path B — Sequential Disposition"
- type: stage
- description: "RP makes the GDP disposition decision (Gate 3). Conditional; also override re-entry."
- isRequired: false
- order: after T64
- verify: Confirm Result: Success, capture StageId

## T66: Create stage "RP Override Compensation"
- type: stage
- description: "Saga compensation on override: cancel reversible work or reverse posted note + deviation/CAPA, then re-route to Path B. Conditional."
- isRequired: false
- order: after T65
- verify: Confirm Result: Success, capture StageId

## T67: Create stage "Batch Disposition Execution"
- type: stage
- description: "Batch state machine: QUARANTINE then AVAILABLE/BLOCKED; destruction confirmed by RP. Conditional."
- isRequired: false
- order: after T66
- verify: Confirm Result: Success, capture StageId

## T68: Create stage "Follow-up & Finance"
- type: stage
- description: "Logistics (Gate 4) and Finance (Gate 5) approvals; robot posts the note. QA and commercial lanes converge here."
- isRequired: true
- order: after T67
- verify: Confirm Result: Success, capture StageId

## T69: Create stage "Closure"
- type: stage
- description: "Notify customer, finalize audit trail, close case."
- isRequired: true
- order: after T68
- verify: Confirm Result: Success, capture StageId

## T70: Add edge "Complaint Email Received" → "Intake & Triage"
- source: "Complaint Email Received"
- target: "Intake & Triage"
- label: "On email received"
- order: after T69
- verify: Confirm Result: Success, capture EdgeId

## T71: Add edge "Intake & Triage" → "Acknowledge & Completeness"
- source: "Intake & Triage"
- target: "Acknowledge & Completeness"
- order: after T70
- verify: Confirm Result: Success, capture EdgeId

## T72: Add edge "Acknowledge & Completeness" → "Cross-Case Correlation"
- source: "Acknowledge & Completeness"
- target: "Cross-Case Correlation"
- order: after T71
- verify: Confirm Result: Success, capture EdgeId

## T73: Add edge "Cross-Case Correlation" → "Investigation"
- source: "Cross-Case Correlation"
- target: "Investigation"
- order: after T72
- verify: Confirm Result: Success, capture EdgeId

## T74: Add edge "Investigation" → "Commercial Resolution"
- source: "Investigation"
- target: "Commercial Resolution"
- label: "Commercial lane"
- order: after T73
- verify: Confirm Result: Success, capture EdgeId

## T75: Add edge "Investigation" → "Dossier & QA Sign-off"
- source: "Investigation"
- target: "Dossier & QA Sign-off"
- label: "QA lane"
- order: after T74
- verify: Confirm Result: Success, capture EdgeId

## T76: Add edge "Commercial Resolution" → "Follow-up & Finance"
- source: "Commercial Resolution"
- target: "Follow-up & Finance"
- order: after T75
- verify: Confirm Result: Success, capture EdgeId

## T77: Add edge "Dossier & QA Sign-off" → "Policy Routing"
- source: "Dossier & QA Sign-off"
- target: "Policy Routing"
- order: after T76
- verify: Confirm Result: Success, capture EdgeId

## T78: Add edge "Policy Routing" → "Path A — Provisional Parallel"
- source: "Policy Routing"
- target: "Path A — Provisional Parallel"
- label: "Path A"
- order: after T77
- verify: Confirm Result: Success, capture EdgeId

## T79: Add edge "Policy Routing" → "Path B — Sequential Disposition"
- source: "Policy Routing"
- target: "Path B — Sequential Disposition"
- label: "Path B"
- order: after T78
- verify: Confirm Result: Success, capture EdgeId

## T80: Add edge "Path A — Provisional Parallel" → "RP Override Compensation"
- source: "Path A — Provisional Parallel"
- target: "RP Override Compensation"
- label: "Override"
- source-handle: bottom
- target-handle: top
- order: after T79
- verify: Confirm Result: Success, capture EdgeId

## T81: Add edge "Path A — Provisional Parallel" → "Batch Disposition Execution"
- source: "Path A — Provisional Parallel"
- target: "Batch Disposition Execution"
- label: "Ratified"
- order: after T80
- verify: Confirm Result: Success, capture EdgeId

## T82: Add edge "RP Override Compensation" → "Path B — Sequential Disposition"
- source: "RP Override Compensation"
- target: "Path B — Sequential Disposition"
- order: after T81
- verify: Confirm Result: Success, capture EdgeId

## T83: Add edge "Path B — Sequential Disposition" → "Batch Disposition Execution"
- source: "Path B — Sequential Disposition"
- target: "Batch Disposition Execution"
- order: after T82
- verify: Confirm Result: Success, capture EdgeId

## T84: Add edge "Batch Disposition Execution" → "Follow-up & Finance"
- source: "Batch Disposition Execution"
- target: "Follow-up & Finance"
- order: after T83
- verify: Confirm Result: Success, capture EdgeId

## T85: Add edge "Follow-up & Finance" → "Closure"
- source: "Follow-up & Finance"
- target: "Closure"
- order: after T84
- verify: Confirm Result: Success, capture EdgeId

## T86: Add agent task "ExtractComplaint" to "Intake & Triage"
- type: agent
- taskTypeId: 1194abd2-799b-4b74-bd53-abd613db2e94   # ComplaintIntakeAgent v1.0.0 (GdpComplaintIntake)
- isRequired: true
- runOnlyOnce: true
- order: after T85
- lane: 0
- inputs:
    emailFrom: =vars.emailFrom
    emailSubject: =vars.emailSubject
    emailBody: =vars.emailBody
- outputs:
    customerCode: -> customerCode
    productCode: -> productCode
    batchNo: -> batchNo
    qtyAffected: -> qtyAffected
    family: -> family
    severity: -> severity
    confidence: -> intakeConfidence
    missingInformation: -> missingInformation
    complaintSummary: -> complaintSummary
- verify: agent task appended; confirm agent output field names via `tasks describe` in Phase 3.

## T87: Add rpa task "LookupSalesOrder" to "Intake & Triage"
- type: rpa
- taskTypeId: <UNRESOLVED: ERP sales-order lookup robot not published>
- isRequired: true
- runOnlyOnce: true
- order: after T86
- lane: 1
- verify: placeholder rpa node (display-name + type only); user attaches published workflow + bindings.
```text
wiring notes (user must attach):
inputs: customerCode=vars.customerCode, productCode=vars.productCode, batchNo=vars.batchNo
outputs: orderNo, dispatchRef, qtyOrdered, qtyShipped, customerName, customerType, productName -> matching vars
```

## T88: Add action task "TriageValidation" to "Intake & Triage"
- type: action
- hitl: Action App: gdp-complaint-intake
- actionAppId: 6de89ba2-5251-4797-b90f-4596c4739736
- deploymentFolder: Shared
- recipient: Role: Customer Service
- priority: High
- taskTitle: "Validate complaint classification and confirm it is a genuine complaint."
- isRequired: true
- runOnlyOnce: true
- order: after T87
- lane: 2
- inputs:
    customerName: =vars.customerName
    productName: =vars.productName
    batchNo: =vars.batchNo
    family: =vars.family
    complaintSummary: =vars.complaintSummary
    intakeConfidence: =vars.intakeConfidence
- outputs:
    family: -> family
- buttons:
    Confirm: isComplaintValid = true
    Reject: isComplaintValid = false
- verify: action task appended with action-app binding + decision buttons.

## T89: Add api-workflow task "SendAcknowledgement" to "Acknowledge & Completeness"
- type: api-workflow
- taskTypeId: <UNRESOLVED: outbound acknowledgement email workflow not published>
- isRequired: true
- runOnlyOnce: true
- order: after T88
- lane: 0
- verify: placeholder api-workflow node; user attaches the outbound-email workflow + bindings.
```text
wiring notes (user must attach):
inputs: emailTo=vars.emailFrom, customerName=vars.customerName, complaintSummary=vars.complaintSummary
outputs: caseStatus = "Acknowledged"
```

## T90: Add process task "CompletenessCheck" to "Acknowledge & Completeness"
- type: process
- taskTypeId: <UNRESOLVED: completeness-check process not published>
- isRequired: true
- runOnlyOnce: true
- order: after T89
- lane: 1
- verify: placeholder process node; user attaches the process + bindings.
```text
wiring notes (user must attach):
inputs: batchNo=vars.batchNo, orderNo=vars.orderNo, missingInformation=vars.missingInformation
outputs: infoComplete -> infoComplete
```

## T91: Add action task "RequestForInformation" to "Acknowledge & Completeness"
- type: action
- hitl: JSON Schema
- recipient: Role: Customer Service
- priority: Medium
- taskTitle: "Send a request-for-information for the missing complaint details."
- isRequired: false
- runOnlyOnce: true
- order: after T90
- lane: 2
- inputs:
    customerName: =vars.customerName
    missingInformation: =vars.missingInformation
- outputs:
    rfiSent = true
- verify: non-decision action (acknowledge); sets rfiSent on completion.

## T92: Add wait-for-timer task "ParkOnSlaTimer" to "Acknowledge & Completeness"
- type: wait-for-timer
- timer-type: timeDuration
- value: P5D
- isRequired: false
- runOnlyOnce: true
- order: after T91
- lane: 3
- verify: timer task appended with P5D duration.

## T93: Add agent task "CorrelationCheck" to "Cross-Case Correlation"
- type: agent
- taskTypeId: <UNRESOLVED: cross-case correlation agent not published>
- isRequired: true
- runOnlyOnce: true
- order: after T92
- lane: 0
- verify: placeholder agent node; user attaches the correlation agent + bindings.
```text
wiring notes (user must attach):
inputs: dispatchRef=vars.dispatchRef, customerCode=vars.customerCode, qtyAffected=vars.qtyAffected
outputs: linkedCaseId -> linkedCaseId, isCorrelated -> isCorrelated
```

## T94: Add rpa task "GatherEvidence" to "Investigation"
- type: rpa
- taskTypeId: <UNRESOLVED: evidence-gathering robot not published>
- isRequired: true
- runOnlyOnce: true
- order: after T93
- lane: 0
- verify: placeholder rpa node; user attaches the workflow + bindings.
```text
wiring notes (user must attach):
inputs: family=vars.family, productCode=vars.productCode, batchNo=vars.batchNo, orderNo=vars.orderNo
outputs: excursionHours -> excursionHours, loggerAvailable -> loggerAvailable, qtyShipped -> qtyShipped
```

## T95: Add agent task "EvaluateFindings" to "Investigation"
- type: agent
- taskTypeId: <UNRESOLVED: investigation evaluation agent not published>
- isRequired: true
- runOnlyOnce: true
- order: after T94
- lane: 1
- verify: placeholder agent node; user attaches the agent + bindings.
```text
wiring notes (user must attach):
inputs: family=vars.family, qtyOrdered=vars.qtyOrdered, qtyShipped=vars.qtyShipped, excursionHours=vars.excursionHours, loggerAvailable=vars.loggerAvailable
outputs: lane -> lane, needsGoodsReturn -> needsGoodsReturn
```

## T96: Add process task "DetermineFinanceDirection" to "Commercial Resolution"
- type: process
- taskTypeId: <UNRESOLVED: finance-direction process not published>
- isRequired: true
- runOnlyOnce: true
- order: after T95
- lane: 0
- verify: placeholder process node; user attaches the process + bindings.
```text
wiring notes (user must attach):
inputs: qtyOrdered=vars.qtyOrdered, qtyShipped=vars.qtyShipped, isCorrelated=vars.isCorrelated
outputs: financeDirection -> financeDirection, creditAmount -> creditAmount
```

## T97: Add action task "SupplyChainResolution" to "Commercial Resolution"
- type: action
- hitl: JSON Schema
- recipient: Role: Supply Chain Coordinator
- priority: Medium
- taskTitle: "Decide the commercial resolution for the quantity discrepancy."
- isRequired: true
- runOnlyOnce: true
- order: after T96
- lane: 1
- inputs:
    qtyOrdered: =vars.qtyOrdered
    qtyShipped: =vars.qtyShipped
    financeDirection: =vars.financeDirection
    creditAmount: =vars.creditAmount
    linkedCaseId: =vars.linkedCaseId
- outputs:
    financeDirection: -> financeDirection
- buttons:
    Credit: financeApproved = true
    Debit: financeApproved = true
    Redeliver: needsGoodsReturn = true
- verify: decision action with 3 buttons.

## T98: Add api-workflow task "NotifyQaMetrics" to "Commercial Resolution"
- type: api-workflow
- taskTypeId: <UNRESOLVED: QA-metrics notification workflow not published>
- isRequired: true
- runOnlyOnce: true
- order: after T97
- lane: 2
- verify: placeholder api-workflow node; user attaches the workflow + bindings.
```text
wiring notes (user must attach):
inputs: family=vars.family, rootCause=vars.rootCause, financeDirection=vars.financeDirection
outputs: caseStatus = "CommercialResolved"
```

## T99: Add agent task "AssembleDossier" to "Dossier & QA Sign-off"
- type: agent
- taskTypeId: <UNRESOLVED: dossier-assembly agent not published>
- isRequired: true
- runOnlyOnce: true
- order: after T98
- lane: 0
- verify: placeholder agent node; user attaches the dossier agent + bindings.
```text
wiring notes (user must attach):
inputs: family=vars.family, productCode=vars.productCode, batchNo=vars.batchNo, customerType=vars.customerType, excursionHours=vars.excursionHours, loggerAvailable=vars.loggerAvailable
outputs: packagingIntact, storageProven, shelfLifeOk, notPriorReturnRecall, withinTimeWindow, recommendedDisposition, dossierJson -> matching vars
```

## T100: Add action task "RecordRootCause" to "Dossier & QA Sign-off"
- type: action
- hitl: JSON Schema
- recipient: Role: Supply Chain Coordinator
- priority: High
- taskTitle: "Record the root cause of the complaint."
- isRequired: true
- runOnlyOnce: true
- order: after T99
- lane: 1
- inputs:
    complaintSummary: =vars.complaintSummary
    family: =vars.family
- outputs:
    rootCause: -> rootCause
- verify: non-decision action; captures rootCause (mandatory input).

## T101: Add action task "QaSignoff" to "Dossier & QA Sign-off"
- type: action
- hitl: JSON Schema
- recipient: Role: QA Analyst
- priority: High
- taskTitle: "Confirm the evidence package is complete and sound."
- isRequired: true
- runOnlyOnce: false
- order: after T100
- lane: 2
- inputs:
    packagingIntact: =vars.packagingIntact
    storageProven: =vars.storageProven
    shelfLifeOk: =vars.shelfLifeOk
    notPriorReturnRecall: =vars.notPriorReturnRecall
    withinTimeWindow: =vars.withinTimeWindow
    rootCause: =vars.rootCause
    recommendedDisposition: =vars.recommendedDisposition
- buttons:
    EvidenceComplete: qaSignoff = true
    SendBack: qaSignoff = false
- verify: decision action (Gate 2) with 2 buttons.

## T102: Add process task "PolicyRouter" to "Policy Routing"
- type: process
- taskTypeId: <UNRESOLVED: policy-router process / DMN not published>
- isRequired: true
- runOnlyOnce: true
- order: after T101
- lane: 0
- verify: placeholder process node; user attaches the policy router + bindings.
```text
wiring notes (user must attach):
inputs: productCode=vars.productCode, family=vars.family, packagingIntact=vars.packagingIntact, storageProven=vars.storageProven
outputs: policyPath -> policyPath
```

## T103: Add action task "RpRatification" to "Path A — Provisional Parallel"
- type: action
- hitl: JSON Schema
- recipient: Role: Responsible Person
- priority: Critical
- taskTitle: "Ratify or override the standing disposition policy."
- isRequired: true
- runOnlyOnce: true
- order: after T102
- lane: 0
- inputs:
    recommendedDisposition: =vars.recommendedDisposition
    packagingIntact: =vars.packagingIntact
    storageProven: =vars.storageProven
    rootCause: =vars.rootCause
- buttons:
    Ratify: rpRatified = true
    Override: isOverride = true
- verify: decision action (Gate 3 / Path A) with 2 buttons.

## T104: Add action task "PrepareLogistics" to "Path A — Provisional Parallel"
- type: action
- hitl: JSON Schema
- recipient: Role: Logistics
- priority: Medium
- taskTitle: "Approve the provisional return / redelivery plan (not yet dispatched)."
- isRequired: true
- runOnlyOnce: true
- order: after T103
- lane: 1
- inputs:
    recommendedDisposition: =vars.recommendedDisposition
    needsGoodsReturn: =vars.needsGoodsReturn
- outputs:
    caseStatus = "PathAPrepared"
- verify: non-decision action (provisional Gate 4); parallel with RP ratification.

## T105: Add action task "PrepareFinanceDraft" to "Path A — Provisional Parallel"
- type: action
- hitl: JSON Schema
- recipient: Role: Finance
- priority: Medium
- taskTitle: "Approve the credit / debit note (draft) or post it early."
- isRequired: true
- runOnlyOnce: true
- order: after T104
- lane: 2
- inputs:
    financeDirection: =vars.financeDirection
    creditAmount: =vars.creditAmount
- buttons:
    ApproveDraft: creditNoteStatus = "DRAFT"
    PostEarly: creditPosted = true
- verify: decision action (provisional Gate 5); PostEarly enables the Saga showpiece.

## T106: Add process task "CommitOrCompensate" to "Path A — Provisional Parallel"
- type: process
- taskTypeId: <UNRESOLVED: commit/compensate join process not published>
- isRequired: true
- runOnlyOnce: true
- order: after T105
- lane: 3
- verify: placeholder process node (the join); user attaches the process + bindings.
```text
wiring notes (user must attach):
inputs: rpRatified=vars.rpRatified, isOverride=vars.isOverride, creditNoteStatus=vars.creditNoteStatus, creditPosted=vars.creditPosted, recommendedDisposition=vars.recommendedDisposition
outputs: finalDisposition -> finalDisposition, compensationRequired -> compensationRequired
```

## T107: Add action task "DispositionDecision" to "Path B — Sequential Disposition"
- type: action
- hitl: JSON Schema
- recipient: Role: Responsible Person
- priority: Critical
- taskTitle: "Authorize the GDP disposition for the affected batch."
- isRequired: true
- runOnlyOnce: false
- order: after T106
- lane: 0
- inputs:
    packagingIntact: =vars.packagingIntact
    storageProven: =vars.storageProven
    shelfLifeOk: =vars.shelfLifeOk
    notPriorReturnRecall: =vars.notPriorReturnRecall
    withinTimeWindow: =vars.withinTimeWindow
    recommendedDisposition: =vars.recommendedDisposition
- outputs:
    Action: -> rpDecision
- buttons:
    AuthorizeBackToStock: finalDisposition = "BACK_TO_STOCK"
    OrderDestruction: finalDisposition = "DESTROY"
    NoReturn: finalDisposition = "NO_DISPOSITION"
- verify: decision action (Gate 3) with 3 buttons.

## T108: Add process task "EvaluateCompensation" to "RP Override Compensation"
- type: process
- taskTypeId: <UNRESOLVED: compensation-evaluation process not published>
- isRequired: true
- runOnlyOnce: true
- order: after T107
- lane: 0
- verify: placeholder process node; user attaches the process + bindings.
```text
wiring notes (user must attach):
inputs: creditPosted=vars.creditPosted, creditNoteStatus=vars.creditNoteStatus
outputs: compensationRequired -> compensationRequired
```

## T109: Add rpa task "IssueReversingNote" to "RP Override Compensation"
- type: rpa
- taskTypeId: <UNRESOLVED: reversing-note robot not published>
- isRequired: false
- runOnlyOnce: true
- order: after T108
- lane: 1
- verify: placeholder rpa node; user attaches the workflow + bindings.
```text
wiring notes (user must attach):
inputs: creditAmount=vars.creditAmount, financeDirection=vars.financeDirection
outputs: creditNoteStatus = "REVERSED"
```

## T110: Add action task "RaiseDeviationCapa" to "RP Override Compensation"
- type: action
- hitl: JSON Schema
- recipient: Role: QA Analyst
- priority: High
- taskTitle: "Log the deviation / CAPA for the policy override."
- isRequired: true
- runOnlyOnce: true
- order: after T109
- lane: 2
- inputs:
    rootCause: =vars.rootCause
    creditNoteStatus: =vars.creditNoteStatus
- outputs:
    deviationRaised = true
- verify: non-decision action; sets deviationRaised.

## T111: Add rpa task "SetBatchQuarantine" to "Batch Disposition Execution"
- type: rpa
- taskTypeId: <UNRESOLVED: batch-quarantine robot not published>
- isRequired: true
- runOnlyOnce: true
- order: after T110
- lane: 0
- verify: placeholder rpa node; user attaches the workflow + bindings.
```text
wiring notes (user must attach):
inputs: batchNo=vars.batchNo, qtyAffected=vars.qtyAffected
outputs: batchStatus = "QUARANTINE"
```

## T112: Add rpa task "ExecuteDisposition" to "Batch Disposition Execution"
- type: rpa
- taskTypeId: <UNRESOLVED: disposition-execution robot not published>
- isRequired: true
- runOnlyOnce: true
- order: after T111
- lane: 1
- verify: placeholder rpa node; user attaches the workflow + bindings.
```text
wiring notes (user must attach):
inputs: batchNo=vars.batchNo, finalDisposition=vars.finalDisposition
outputs: batchStatus -> batchStatus
```

## T113: Add action task "ConfirmDestruction" to "Batch Disposition Execution"
- type: action
- hitl: JSON Schema
- recipient: Role: Responsible Person
- priority: Critical
- taskTitle: "Confirm destruction of the affected batch."
- isRequired: false
- runOnlyOnce: true
- order: after T112
- lane: 2
- inputs:
    batchNo: =vars.batchNo
    qtyAffected: =vars.qtyAffected
- outputs:
    batchStatus = "BLOCKED"
- verify: non-decision action; runs only for DESTROY (task-entry IF).

## T114: Add action task "LogisticsFollowup" to "Follow-up & Finance"
- type: action
- hitl: JSON Schema
- recipient: Role: Logistics
- priority: Medium
- taskTitle: "Approve the final follow-up plan."
- isRequired: true
- runOnlyOnce: true
- order: after T113
- lane: 0
- inputs:
    finalDisposition: =vars.finalDisposition
    needsGoodsReturn: =vars.needsGoodsReturn
- buttons:
    Approve: logisticsApproved = true
    Revise: logisticsApproved = false
- verify: decision action (Gate 4) with 2 buttons.

## T115: Add action task "FinanceApproval" to "Follow-up & Finance"
- type: action
- hitl: JSON Schema
- recipient: Role: Finance
- priority: High
- taskTitle: "Approve the credit / debit amount to post."
- isRequired: true
- runOnlyOnce: true
- order: after T114
- lane: 1
- inputs:
    financeDirection: =vars.financeDirection
    creditAmount: =vars.creditAmount
- buttons:
    Approve: financeApproved = true
    Reject: financeApproved = false
- verify: decision action (Gate 5) with 2 buttons.

## T116: Add rpa task "PostToErp" to "Follow-up & Finance"
- type: rpa
- taskTypeId: <UNRESOLVED: ERP posting robot not published>
- isRequired: true
- runOnlyOnce: true
- order: after T115
- lane: 2
- verify: placeholder rpa node; user attaches the workflow + bindings.
```text
wiring notes (user must attach):
inputs: financeDirection=vars.financeDirection, creditAmount=vars.creditAmount
outputs: creditNoteStatus -> creditNoteStatus, creditPosted -> creditPosted
```

## T117: Add api-workflow task "NotifyCustomer" to "Closure"
- type: api-workflow
- taskTypeId: <UNRESOLVED: resolution-notice email workflow not published>
- isRequired: true
- runOnlyOnce: true
- order: after T116
- lane: 0
- verify: placeholder api-workflow node; user attaches the workflow + bindings.
```text
wiring notes (user must attach):
inputs: emailTo=vars.emailFrom, customerName=vars.customerName, finalDisposition=vars.finalDisposition, financeDirection=vars.financeDirection
outputs: customerNotified = true
```

## T118: Add process task "CloseCase" to "Closure"
- type: process
- taskTypeId: <UNRESOLVED: close-case process not published>
- isRequired: true
- runOnlyOnce: true
- order: after T117
- lane: 1
- verify: placeholder process node; user attaches the process + bindings.
```text
wiring notes (user must attach):
inputs: finalDisposition=vars.finalDisposition, batchStatus=vars.batchStatus, creditNoteStatus=vars.creditNoteStatus
outputs: caseOutcome -> caseOutcome, caseStatus = "Closed"
```

## T119: Add stage-entry condition for "Intake & Triage" — case start
- target-stage: "Intake & Triage"
- rule-type: case-entered
- order: after T118
- verify: capture ConditionId

## T120: Add stage-entry condition for "Acknowledge & Completeness" — valid complaint
- target-stage: "Acknowledge & Completeness"
- rule-type: selected-stage-completed
- selected-stage: "Intake & Triage"
- condition-expression: =vars.isComplaintValid == true
- order: after T119
- verify: capture ConditionId

## T121: Add stage-entry condition for "Cross-Case Correlation"
- target-stage: "Cross-Case Correlation"
- rule-type: selected-stage-completed
- selected-stage: "Acknowledge & Completeness"
- order: after T120
- verify: capture ConditionId

## T122: Add stage-entry condition for "Investigation"
- target-stage: "Investigation"
- rule-type: selected-stage-completed
- selected-stage: "Cross-Case Correlation"
- order: after T121
- verify: capture ConditionId

## T123: Add stage-entry condition for "Commercial Resolution" — commercial lane
- target-stage: "Commercial Resolution"
- rule-type: selected-stage-completed
- selected-stage: "Investigation"
- condition-expression: =vars.lane == "COMMERCIAL"
- order: after T122
- verify: capture ConditionId

## T124: Add stage-entry condition for "Dossier & QA Sign-off" — QA lane
- target-stage: "Dossier & QA Sign-off"
- rule-type: selected-stage-completed
- selected-stage: "Investigation"
- condition-expression: =vars.lane == "QA"
- order: after T123
- verify: capture ConditionId

## T125: Add stage-entry condition for "Policy Routing" — QA lane
- target-stage: "Policy Routing"
- rule-type: selected-stage-completed
- selected-stage: "Dossier & QA Sign-off"
- condition-expression: =vars.lane == "QA"
- order: after T124
- verify: capture ConditionId

## T126: Add stage-entry condition for "Path A — Provisional Parallel"
- target-stage: "Path A — Provisional Parallel"
- rule-type: selected-stage-completed
- selected-stage: "Policy Routing"
- condition-expression: =vars.policyPath == "PATH_A_ALWAYS_DESTROY"
- order: after T125
- verify: capture ConditionId

## T127: Add stage-entry condition for "Path B — Sequential Disposition" — policy path
- target-stage: "Path B — Sequential Disposition"
- rule-type: selected-stage-completed
- selected-stage: "Policy Routing"
- condition-expression: =vars.policyPath == "PATH_B_CASE_BY_CASE"
- order: after T126
- verify: capture ConditionId

## T128: Add stage-entry condition for "Path B — Sequential Disposition" — override re-entry
- target-stage: "Path B — Sequential Disposition"
- rule-type: selected-stage-completed
- selected-stage: "RP Override Compensation"
- condition-expression: =vars.isOverride == true
- order: after T127
- verify: capture ConditionId

## T129: Add stage-entry condition for "RP Override Compensation" — on override
- target-stage: "RP Override Compensation"
- rule-type: selected-stage-completed
- selected-stage: "Path A — Provisional Parallel"
- condition-expression: =vars.isOverride == true
- order: after T128
- verify: capture ConditionId

## T130: Add stage-entry condition for "Batch Disposition Execution" — from Path A
- target-stage: "Batch Disposition Execution"
- rule-type: selected-stage-completed
- selected-stage: "Path A — Provisional Parallel"
- condition-expression: =js:(vars.finalDisposition != "" && vars.isOverride == false)
- order: after T129
- verify: capture ConditionId

## T131: Add stage-entry condition for "Batch Disposition Execution" — from Path B
- target-stage: "Batch Disposition Execution"
- rule-type: selected-stage-completed
- selected-stage: "Path B — Sequential Disposition"
- condition-expression: =js:(vars.finalDisposition != "")
- order: after T130
- verify: capture ConditionId

## T132: Add stage-entry condition for "Follow-up & Finance" — QA lane
- target-stage: "Follow-up & Finance"
- rule-type: selected-stage-completed
- selected-stage: "Batch Disposition Execution"
- condition-expression: =vars.lane == "QA"
- order: after T131
- verify: capture ConditionId

## T133: Add stage-entry condition for "Follow-up & Finance" — commercial lane
- target-stage: "Follow-up & Finance"
- rule-type: selected-stage-completed
- selected-stage: "Commercial Resolution"
- condition-expression: =vars.lane == "COMMERCIAL"
- order: after T132
- verify: capture ConditionId

## T134: Add stage-entry condition for "Closure"
- target-stage: "Closure"
- rule-type: selected-stage-completed
- selected-stage: "Follow-up & Finance"
- order: after T133
- verify: capture ConditionId

## T135: Add stage-exit condition for "Intake & Triage" — completion
- target-stage: "Intake & Triage"
- type: exit-only
- marks-stage-complete: true
- rule-type: required-tasks-completed
- order: after T134
- verify: capture ConditionId

## T136: Add stage-exit condition for "Acknowledge & Completeness" — completion
- target-stage: "Acknowledge & Completeness"
- type: exit-only
- marks-stage-complete: true
- rule-type: required-tasks-completed
- order: after T135
- verify: capture ConditionId

## T137: Add stage-exit condition for "Cross-Case Correlation" — completion
- target-stage: "Cross-Case Correlation"
- type: exit-only
- marks-stage-complete: true
- rule-type: required-tasks-completed
- order: after T136
- verify: capture ConditionId

## T138: Add stage-exit condition for "Investigation" — completion
- target-stage: "Investigation"
- type: exit-only
- marks-stage-complete: true
- rule-type: required-tasks-completed
- order: after T137
- verify: capture ConditionId

## T139: Add stage-exit condition for "Commercial Resolution" — completion
- target-stage: "Commercial Resolution"
- type: exit-only
- marks-stage-complete: true
- rule-type: required-tasks-completed
- order: after T138
- verify: capture ConditionId

## T140: Add stage-exit condition for "Dossier & QA Sign-off" — completion
- target-stage: "Dossier & QA Sign-off"
- type: exit-only
- marks-stage-complete: true
- rule-type: required-tasks-completed
- order: after T139
- verify: capture ConditionId

## T141: Add stage-exit condition for "Policy Routing" — completion
- target-stage: "Policy Routing"
- type: exit-only
- marks-stage-complete: true
- rule-type: required-tasks-completed
- order: after T140
- verify: capture ConditionId

## T142: Add stage-exit condition for "Path A — Provisional Parallel" — completion
- target-stage: "Path A — Provisional Parallel"
- type: exit-only
- marks-stage-complete: true
- rule-type: required-tasks-completed
- order: after T141
- verify: capture ConditionId

## T143: Add stage-exit condition for "Path B — Sequential Disposition" — completion
- target-stage: "Path B — Sequential Disposition"
- type: exit-only
- marks-stage-complete: true
- rule-type: required-tasks-completed
- order: after T142
- verify: capture ConditionId

## T144: Add stage-exit condition for "RP Override Compensation" — completion
- target-stage: "RP Override Compensation"
- type: exit-only
- marks-stage-complete: true
- rule-type: required-tasks-completed
- order: after T143
- verify: capture ConditionId

## T145: Add stage-exit condition for "Batch Disposition Execution" — completion
- target-stage: "Batch Disposition Execution"
- type: exit-only
- marks-stage-complete: true
- rule-type: required-tasks-completed
- order: after T144
- verify: capture ConditionId

## T146: Add stage-exit condition for "Follow-up & Finance" — completion
- target-stage: "Follow-up & Finance"
- type: exit-only
- marks-stage-complete: true
- rule-type: required-tasks-completed
- order: after T145
- verify: capture ConditionId

## T147: Add stage-exit condition for "Closure" — completion
- target-stage: "Closure"
- type: exit-only
- marks-stage-complete: true
- rule-type: required-tasks-completed
- order: after T146
- verify: capture ConditionId

## T148: Add case-exit condition — case resolved
- display-name: "Case resolved"
- marks-case-complete: true
- rule-type: required-stages-completed
- order: after T147
- verify: capture ConditionId

## T149: Add case-exit condition — not a complaint
- display-name: "Closed — not a complaint"
- marks-case-complete: false
- rule-type: selected-stage-completed
- selected-stage: "Intake & Triage"
- condition-expression: =vars.isComplaintValid == false
- order: after T148
- verify: capture ConditionId

## T150: Add task-entry condition for "ExtractComplaint" in "Intake & Triage"
- target-stage: "Intake & Triage"
- target-task: "ExtractComplaint"
- rule-type: current-stage-entered
- order: after T149

## T151: Add task-entry condition for "LookupSalesOrder" in "Intake & Triage"
- target-stage: "Intake & Triage"
- target-task: "LookupSalesOrder"
- rule-type: selected-tasks-completed
- selected-tasks: "ExtractComplaint"
- order: after T150

## T152: Add task-entry condition for "TriageValidation" in "Intake & Triage"
- target-stage: "Intake & Triage"
- target-task: "TriageValidation"
- rule-type: selected-tasks-completed
- selected-tasks: "LookupSalesOrder"
- order: after T151

## T153: Add task-entry condition for "SendAcknowledgement" in "Acknowledge & Completeness"
- target-stage: "Acknowledge & Completeness"
- target-task: "SendAcknowledgement"
- rule-type: current-stage-entered
- order: after T152

## T154: Add task-entry condition for "CompletenessCheck" in "Acknowledge & Completeness"
- target-stage: "Acknowledge & Completeness"
- target-task: "CompletenessCheck"
- rule-type: selected-tasks-completed
- selected-tasks: "SendAcknowledgement"
- order: after T153

## T155: Add task-entry condition for "RequestForInformation" in "Acknowledge & Completeness"
- target-stage: "Acknowledge & Completeness"
- target-task: "RequestForInformation"
- rule-type: selected-tasks-completed
- selected-tasks: "CompletenessCheck"
- condition-expression: =vars.infoComplete == false
- order: after T154

## T156: Add task-entry condition for "ParkOnSlaTimer" in "Acknowledge & Completeness"
- target-stage: "Acknowledge & Completeness"
- target-task: "ParkOnSlaTimer"
- rule-type: selected-tasks-completed
- selected-tasks: "RequestForInformation"
- condition-expression: =vars.rfiSent == true
- order: after T155

## T157: Add task-entry condition for "CorrelationCheck" in "Cross-Case Correlation"
- target-stage: "Cross-Case Correlation"
- target-task: "CorrelationCheck"
- rule-type: current-stage-entered
- order: after T156

## T158: Add task-entry condition for "GatherEvidence" in "Investigation"
- target-stage: "Investigation"
- target-task: "GatherEvidence"
- rule-type: current-stage-entered
- order: after T157

## T159: Add task-entry condition for "EvaluateFindings" in "Investigation"
- target-stage: "Investigation"
- target-task: "EvaluateFindings"
- rule-type: selected-tasks-completed
- selected-tasks: "GatherEvidence"
- order: after T158

## T160: Add task-entry condition for "DetermineFinanceDirection" in "Commercial Resolution"
- target-stage: "Commercial Resolution"
- target-task: "DetermineFinanceDirection"
- rule-type: current-stage-entered
- order: after T159

## T161: Add task-entry condition for "SupplyChainResolution" in "Commercial Resolution"
- target-stage: "Commercial Resolution"
- target-task: "SupplyChainResolution"
- rule-type: selected-tasks-completed
- selected-tasks: "DetermineFinanceDirection"
- order: after T160

## T162: Add task-entry condition for "NotifyQaMetrics" in "Commercial Resolution"
- target-stage: "Commercial Resolution"
- target-task: "NotifyQaMetrics"
- rule-type: selected-tasks-completed
- selected-tasks: "SupplyChainResolution"
- order: after T161

## T163: Add task-entry condition for "AssembleDossier" in "Dossier & QA Sign-off"
- target-stage: "Dossier & QA Sign-off"
- target-task: "AssembleDossier"
- rule-type: current-stage-entered
- order: after T162

## T164: Add task-entry condition for "RecordRootCause" in "Dossier & QA Sign-off"
- target-stage: "Dossier & QA Sign-off"
- target-task: "RecordRootCause"
- rule-type: selected-tasks-completed
- selected-tasks: "AssembleDossier"
- order: after T163

## T165: Add task-entry condition for "QaSignoff" in "Dossier & QA Sign-off"
- target-stage: "Dossier & QA Sign-off"
- target-task: "QaSignoff"
- rule-type: selected-tasks-completed
- selected-tasks: "RecordRootCause"
- order: after T164

## T166: Add task-entry condition for "PolicyRouter" in "Policy Routing"
- target-stage: "Policy Routing"
- target-task: "PolicyRouter"
- rule-type: current-stage-entered
- order: after T165

## T167: Add task-entry condition for "RpRatification" in "Path A — Provisional Parallel"
- target-stage: "Path A — Provisional Parallel"
- target-task: "RpRatification"
- rule-type: current-stage-entered
- order: after T166

## T168: Add task-entry condition for "PrepareLogistics" in "Path A — Provisional Parallel"
- target-stage: "Path A — Provisional Parallel"
- target-task: "PrepareLogistics"
- rule-type: current-stage-entered
- order: after T167

## T169: Add task-entry condition for "PrepareFinanceDraft" in "Path A — Provisional Parallel"
- target-stage: "Path A — Provisional Parallel"
- target-task: "PrepareFinanceDraft"
- rule-type: current-stage-entered
- order: after T168

## T170: Add task-entry condition for "CommitOrCompensate" in "Path A — Provisional Parallel"
- target-stage: "Path A — Provisional Parallel"
- target-task: "CommitOrCompensate"
- rule-type: selected-tasks-completed
- selected-tasks: "RpRatification, PrepareLogistics, PrepareFinanceDraft"
- order: after T169

## T171: Add task-entry condition for "DispositionDecision" in "Path B — Sequential Disposition"
- target-stage: "Path B — Sequential Disposition"
- target-task: "DispositionDecision"
- rule-type: current-stage-entered
- order: after T170

## T172: Add task-entry condition for "EvaluateCompensation" in "RP Override Compensation"
- target-stage: "RP Override Compensation"
- target-task: "EvaluateCompensation"
- rule-type: current-stage-entered
- order: after T171

## T173: Add task-entry condition for "IssueReversingNote" in "RP Override Compensation"
- target-stage: "RP Override Compensation"
- target-task: "IssueReversingNote"
- rule-type: selected-tasks-completed
- selected-tasks: "EvaluateCompensation"
- condition-expression: =vars.creditPosted == true
- order: after T172

## T174: Add task-entry condition for "RaiseDeviationCapa" in "RP Override Compensation"
- target-stage: "RP Override Compensation"
- target-task: "RaiseDeviationCapa"
- rule-type: selected-tasks-completed
- selected-tasks: "EvaluateCompensation"
- order: after T173

## T175: Add task-entry condition for "SetBatchQuarantine" in "Batch Disposition Execution"
- target-stage: "Batch Disposition Execution"
- target-task: "SetBatchQuarantine"
- rule-type: current-stage-entered
- order: after T174

## T176: Add task-entry condition for "ExecuteDisposition" in "Batch Disposition Execution"
- target-stage: "Batch Disposition Execution"
- target-task: "ExecuteDisposition"
- rule-type: selected-tasks-completed
- selected-tasks: "SetBatchQuarantine"
- order: after T175

## T177: Add task-entry condition for "ConfirmDestruction" in "Batch Disposition Execution"
- target-stage: "Batch Disposition Execution"
- target-task: "ConfirmDestruction"
- rule-type: selected-tasks-completed
- selected-tasks: "ExecuteDisposition"
- condition-expression: =vars.finalDisposition == "DESTROY"
- order: after T176

## T178: Add task-entry condition for "LogisticsFollowup" in "Follow-up & Finance"
- target-stage: "Follow-up & Finance"
- target-task: "LogisticsFollowup"
- rule-type: current-stage-entered
- order: after T177

## T179: Add task-entry condition for "FinanceApproval" in "Follow-up & Finance"
- target-stage: "Follow-up & Finance"
- target-task: "FinanceApproval"
- rule-type: current-stage-entered
- order: after T178

## T180: Add task-entry condition for "PostToErp" in "Follow-up & Finance"
- target-stage: "Follow-up & Finance"
- target-task: "PostToErp"
- rule-type: selected-tasks-completed
- selected-tasks: "LogisticsFollowup, FinanceApproval"
- condition-expression: =vars.financeApproved == true
- order: after T179

## T181: Add task-entry condition for "NotifyCustomer" in "Closure"
- target-stage: "Closure"
- target-task: "NotifyCustomer"
- rule-type: current-stage-entered
- order: after T180

## T182: Add task-entry condition for "CloseCase" in "Closure"
- target-stage: "Closure"
- target-task: "CloseCase"
- rule-type: selected-tasks-completed
- selected-tasks: "NotifyCustomer"
- order: after T181

## T183: Set case default SLA
- target: case
- duration: 10
- unit: d
- sla-type: time-based
- escalation:
    at-risk: 80% -> Notify UserGroup: Quality Assurance
    breach: 100% -> Notify UserGroup: Site Leadership
- order: after T182
- verify: case slaConfig written with escalation rules

## T184: Set stage SLA for "Intake & Triage"
- target-stage: "Intake & Triage"
- duration: 1
- unit: d
- escalation:
    at-risk: 75% -> Notify UserGroup: Customer Service
    breach: 100% -> Notify UserGroup: Site Leadership
- order: after T183
- verify: stage slaConfig written

## T185: Set stage SLA for "Dossier & QA Sign-off"
- target-stage: "Dossier & QA Sign-off"
- duration: 3
- unit: d
- escalation:
    at-risk: 70% -> Notify UserGroup: Quality Assurance
    breach: 100% -> Notify UserGroup: Site Leadership
- order: after T184
- verify: stage slaConfig written

## T186: Set stage SLA for "Path A — Provisional Parallel"
- target-stage: "Path A — Provisional Parallel"
- duration: 2
- unit: d
- escalation:
    at-risk: 75% -> Notify UserGroup: Responsible Person
    breach: 100% -> Notify UserGroup: Site Leadership
- order: after T185
- verify: stage slaConfig written

## T187: Set stage SLA for "Path B — Sequential Disposition"
- target-stage: "Path B — Sequential Disposition"
- duration: 2
- unit: d
- escalation:
    at-risk: 75% -> Notify UserGroup: Responsible Person
    breach: 100% -> Notify UserGroup: Site Leadership
- order: after T186
- verify: stage slaConfig written

## T188: Set stage SLA for "Follow-up & Finance"
- target-stage: "Follow-up & Finance"
- duration: 3
- unit: d
- escalation:
    at-risk: 70% -> Notify UserGroup: Finance
    breach: 100% -> Notify UserGroup: Site Leadership
- order: after T187
- verify: stage slaConfig written

## Not Covered (notes — outside caseplan.json)
- Master data (products, customers, batches, orders, order_lines) lives in CSVs read by the robots / mock ERP; not Data Fabric entities in this case.
- The GDP 6.3 gate, family classifier, policy router and finance-direction logic are intended to become DMN decision tables, invoked by the `process` tasks; modeled here as placeholder processes.
- The mock ERP and case cockpit are Electron desktop apps driven via UI Automation by the `rpa` tasks.
- Document templates (dossier, credit/debit note, certificate of destruction, deviation/CAPA, audit trail) are JSON carried in case variables (e.g., `dossierJson`) and rendered to HTML for humans.

## Inventory

| Class | Count | T-entries |
|---|---|---|
| Case file | 1 | T01 |
| Triggers | 1 | T02 (placeholder event — Outlook) |
| Variables / arguments | 54 | T03–T56 (3 trigger-sourced, 1 Out, 50 Variable) |
| Stages | 13 | T57–T69 (all regular; 6 backbone required, 7 conditional) |
| Edges | 16 | T70–T85 |
| Tasks | 33 | T86–T118 (2 resolved: ExtractComplaint, TriageValidation; 10 JSON-schema actions; 21 placeholders) |
| Conditions | 64 | T119–T182 (16 stage-entry, 13 stage-exit, 2 case-exit, 33 task-entry) |
| SLA | 6 | T183–T188 (1 case + 5 stage) |
| **Total** | **188** | T01–T188 |

Cross-check vs sdd.md: 1 trigger ✓, 54 Case Variables rows ✓, 13 stage headings ✓, 33 task rows ✓, 16 stage-entry + 13 completion + 2 case-exit + 33 task-entry condition rows ✓, 1 case + 5 stage SLA tables ✓.
