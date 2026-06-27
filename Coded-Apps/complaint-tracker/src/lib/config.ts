// Data Fabric resource IDs (staging tenant hackathon26_371 / DefaultTenant).
// These were created via the `uip df` CLI. If you recreate the entity or
// choice sets, update these UUIDs.
// NOTE: now points at the ComplaintsData entity (migrated from the old
// Complaints entity e28dd0a9-… on 2026-06-18). ComplaintsData carries every
// Complaints field plus the ProofImage + DeliveryNote FILE fields.
export const COMPLAINTS_ENTITY_ID = 'be631aea-0e6b-f111-8fcb-000d3ab36606';
export const COMPLAINT_TYPE_CHOICESET_ID = 'c7e4bb62-c065-f111-8fcb-000d3ab1a7ac';
export const COMPLAINT_GATE_CHOICESET_ID = 'd4e4bb62-c065-f111-8fcb-000d3ab1a7ac';

// CHOICE sets for SuggestedAction / ApprovedAction (BackToStock / Destroy /
// Credit / Debit / None). Created via `uip df` after the column additions —
// see ADD-COLUMNS.md. PASTE the resulting choiceSetId UUIDs here once created;
// empty strings disable choice resolution gracefully (api.loadChoiceMap skips).
export const COMPLAINT_SUGGESTEDACTION_CHOICESET_ID = '2b2a4107-b968-f111-8fcb-000d3ab36606';
export const COMPLAINT_APPROVEDACTION_CHOICESET_ID = '382a4107-b968-f111-8fcb-000d3ab36606';

// ComplaintCaseStatus choice set (Open=0 / AwaitingInfo=1 / NoComplaint=2).
// Bound to the CaseStatus field. See _FEATURE-CONTRACT.md §2.
export const COMPLAINT_CASESTATUS_CHOICESET_ID = 'cf623af2-f96a-f111-8fcb-000d3ab36606';

// Known CaseStatus numberIds — written directly so the UI never depends on the
// choice set being resolvable. Names match the choice-value `name`.
export const CASE_STATUS = {
  Open: 0,
  AwaitingInfo: 1,
  NoComplaint: 2,
} as const;

// Name of the FILE-type field on the Complaints entity that holds the proof
// image (created by the orchestrator — see _FEATURE-CONTRACT.md addendum).
export const PROOF_IMAGE_FIELD = 'ProofImage';

// Name of the FILE-type field that holds the customer's delivery-note PDF
// (written by the ExtractDeliveryNote robot). Downloaded the same way as the
// proof image, via entities.downloadAttachment.
export const DELIVERY_NOTE_FIELD = 'DeliveryNote';

// Fields that a free-text search scans (string fields only — choice fields
// are matched by numberId, handled separately).
// NOTE: only include columns that EXIST on the live entity. ProductName and
// Summary are added back here once ADD-COLUMNS.md has been run (a Contains
// filter over a nonexistent column makes the Data Fabric query throw
// "An unknown error occurred").
export const SEARCH_FIELDS = ['ComplaintId', 'Company', 'Sender', 'BatchNumber', 'SalesOrder', 'ProductName', 'Summary'] as const;

export const PAGE_SIZE = 8;

// Badge colour for each Gate, keyed by the stable choice-value `name`
// (not displayName). Unknown gates fall back to slate — so changing the
// gate choice set later won't break rendering.
export const GATE_BADGE: Record<string, string> = {
  Intake: 'b-slate',
  Triage: 'b-blue',
  Investigation: 'b-amber',
  CAPA: 'b-orange',
  Closed: 'b-green',
};

// Chip colour for each complaint Type, keyed by choice-value `name`.
// 3-category taxonomy: Quantity Discrepancy / Cold-chain / Quality Deficit.
export const TYPE_CHIP: Record<string, string> = {
  QuantityDiscrepancy: 'chip-blue',
  ColdChain: 'chip-amber',
  QualityDeficit: 'chip-red',
  Other: 'chip-slate',
};

// Chip colour for each disposition / finance action, keyed by choice-value
// `name`. Never green text on white (RoboRana rule) — BackToStock uses the
// blue chip, not green. Unknown actions fall back to slate.
export const ACTION_CHIP: Record<string, string> = {
  BackToStock: 'chip-blue',
  Destroy: 'chip-red',
  Credit: 'chip-amber',
  Debit: 'chip-amber',
  NoAction: 'chip-slate',
  None: 'chip-slate',
};

// Chip colour + label for each CaseStatus, keyed by choice-value `name`.
// Used when no choice map is loaded (we resolve from the 3 known numberIds).
export const CASE_STATUS_CHIP: Record<string, { cls: string; label: string }> = {
  Open: { cls: 'chip-blue', label: 'Open' },
  AwaitingInfo: { cls: 'chip-amber', label: 'Awaiting info' },
  NoComplaint: { cls: 'chip-slate', label: 'No complaint' },
};

// Resolve a CaseStatus numberId to its stable name (client-side, from §2).
const CASE_STATUS_NAME: Record<number, string> = {
  [CASE_STATUS.Open]: 'Open',
  [CASE_STATUS.AwaitingInfo]: 'AwaitingInfo',
  [CASE_STATUS.NoComplaint]: 'NoComplaint',
};
export const caseStatusName = (id: number | null | undefined) =>
  id == null ? undefined : CASE_STATUS_NAME[id];

export const badgeForGate = (name: string | undefined) => (name && GATE_BADGE[name]) || 'b-slate';
export const chipForType = (name: string | undefined) => (name && TYPE_CHIP[name]) || 'chip-slate';
export const chipForAction = (name: string | undefined) => (name && ACTION_CHIP[name]) || 'chip-slate';
export const chipForCaseStatus = (name: string | undefined) =>
  (name && CASE_STATUS_CHIP[name]) || { cls: 'chip-slate', label: name ?? '—' };
