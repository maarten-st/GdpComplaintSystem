# Build Issues — GdpComplaintManagement (MaestroCase / ComplaintCase)

**Validate status:** Valid (0 errors, 19 warnings) — `uip maestro case validate` (V20 schema).
**Schema:** v20 (CLI on this tenant rejects v19).

## Summary
- 13 stages, 16 edges, 1 trigger, 54 variables, 33 tasks, 64 conditions, 6 SLA durations — all structurally valid.
- Branch routing (lane split, Path A/B, override→compensation→Path B, not-a-complaint exit) wired via `=js:` guards on stage-entry and case-exit conditions.

## WIRED to real published resources (done)
- **ExtractComplaint** (agent) → `ComplaintIntakeAgent` (GdpComplaintIntake), **now v2.0.0** (release key `1194abd2-…` unchanged via in-place upgrade). Inputs emailFrom/emailSubject/emailBody bound; outputs **family→family, severity→severity, qtyAffected→qtyAffected** (NEW), customerName→customerName, productName→productName, batchNo→batchNo, orderNo→orderNo, complaintSummary→complaintSummary, confidence→intakeConfidence, missingInformation→missingInformation. (`dispatchRef` is extracted by the agent but NOT bound here — the ERP-authoritative `LookupSalesOrder` owns the correlation key.)
- **TriageValidation** (action / Gate 1) → `gdp-complaint-intake` Action App (folder Shared). Inputs fed from the agent's extracted vars; output `Action` (Approve/Reject) → `triageAction`. The two Gate-1 routing guards now read `vars.triageAction === 'Approve' | 'Reject'` (the boolean `isComplaintValid` is now unused — left declared).

### RESOLVED — intake agent corrected to v2 spec (was pre-spec)
~~The published `ComplaintIntakeAgent` emitted the OLD taxonomy~~ — **done (2026-06-08).** The agent was re-authored to families **A Quality / B Cold-chain / C Logistics** (Counterfeit dropped, `country`/`complaintType` dropped, `summary`→`complaintSummary`, added `severity`/`orderNo`/`dispatchRef`/`qtyAffected`), packaged and deployed as **v2.0.0** to the `GdpComplaintIntake` folder. Local source now lives in the repo at `GdpComplaintIntake/ComplaintIntakeAgent/`. `family`→`family` and `qtyAffected`→`qtyAffected` are now bound, so the lane split / policy router run on a real intake family instead of defaults. Code resolution (customerCode/productCode) still feeds the downstream `intake-parser/resolve-entities.js` once added as a `process` task.

## Warnings — placeholder tasks (18) "task with no configuration"
Expected. These tasks have `data: {}` because their underlying resources are not yet published to the tenant. Attach the real resource + I/O bindings, then re-generate:
- **agent (3):** CorrelationCheck, EvaluateFindings, AssembleDossier
- **rpa (6):** LookupSalesOrder, GatherEvidence, IssueReversingNote, SetBatchQuarantine, ExecuteDisposition, PostToErp
- **process (6):** CompletenessCheck, DetermineFinanceDirection, PolicyRouter, CommitOrCompensate, EvaluateCompensation, CloseCase
- **api-workflow (3):** SendAcknowledgement, NotifyQaMetrics, NotifyCustomer

## Placeholder trigger (1)
- "Complaint Email Received" (Office 365 Outlook event) — no IS connection provisioned; `serviceType` only. Provision the Outlook connection, then re-resolve.

## Open Items for User (deferred wiring — not blocking validate)
1. **Task I/O value bindings.** The shaped tasks (12 HITL action gates, the resolved intake agent, the timer) have entry conditions and titles but their `data.inputs[]` / `data.outputs[]` value bindings (the `=vars.X` wiring from tasks.md) are NOT yet written. The action **button → variable** mappings that produce the routing variables (isComplaintValid, qaSignoff, rpRatified, isOverride, finalDisposition, financeApproved, lane via the investigation agent, etc.) must be added for the case to actually branch at runtime. Most producers are placeholder agents/processes, so full runtime wiring is only completable once those resources exist.
2. **SLA escalation recipients.** Case + 5 stage SLA durations are set, but escalation `escalationRule[]` (at-risk / breach notifications) were omitted — they require tenant user/group UUIDs not resolved in this build. Add via the Action Center / sla recipients once group IDs are known.
3. **Resolved resources to attach:** ComplaintIntakeAgent (agentId 1194abd2-799b-4b74-bd53-abd613db2e94) and the gdp-complaint-intake Action App (6de89ba2-5251-4797-b90f-4596c4739736, folder Shared) are deployed and can be bound to ExtractComplaint and TriageValidation respectively.
