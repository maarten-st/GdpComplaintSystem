// A single resolved choice value.
export interface ChoiceValue {
  numberId: number;
  name: string;        // stable code, e.g. "Intake"
  displayName: string; // human label, e.g. "Intake"
}

// A choice set resolved into lookup maps. Choice fields always come back from
// Data Fabric as integer numberIds on reads, and must be SENT as numberIds on
// writes/filters — so we keep maps in both directions. See data-fabric.md.
export interface ChoiceMap {
  values: ChoiceValue[];               // ordered by numberId
  byNumberId: Map<number, ChoiceValue>;
  byName: Map<string, ChoiceValue>;
}

// A complaint as displayed in the UI. Raw DF records store Gate/ExtractedType
// as numberIds; we keep the raw numbers and resolve names at render time.
export interface Complaint {
  Id: string;
  ComplaintId: string;
  EmailBody: string;
  Sender: string;
  Company: string;
  SalesOrder: string;
  BatchNumber: string;
  ExtractedType: number | null;
  Gate: number | null;
  CreateTime?: string;
  // ---- Intake-extracted fields (ExtractComplaint agent output) ----
  ProductName: string;
  QtyAffected: number | null;
  Summary: string;
  Confidence: number | null; // 0–1
  // ---- Investigation Agent output ----
  InvestigationFindings: string; // JSON string
  LinkedComplaints: string;
  SuggestedAction: number | null; // choice numberId: BackToStock / Destroy / Credit / Debit / None
  // ---- CAPA human approval ----
  ApprovedAction: number | null;  // choice numberId, defaults to SuggestedAction
  FinanceAmount: number | null;
  // Per-flow CAPA approvals — which RPA steps the human authorised. Read by the
  // CAPA "Record Updated" trigger; each gates one branch of the CAPA gateway.
  ApproveAdjustInventory: boolean; // run the Adjust Inventory (disposition) robot
  ApproveCredit: boolean;          // issue a credit note
  ApproveDebit: boolean;           // issue a debit note
  // ---- Gate transition history (JSON array of GateEvent) ----
  GateHistory: string;
  // ---- Delivery-note extraction / match (IXP, JSON strings) ----
  DeliveryNoteData: string;  // extracted delivery-note fields (JSON)
  DeliveryNoteMatch: string; // compare-to-sales-order result (JSON)
  // ---- Triage RFI / case status ----
  RfiBody: string;            // request-for-more-info body recorded at Triage
  ReturnPlanned: boolean;     // logged-only marker a return was planned (Investigation)
  CaseStatus: number | null;  // ComplaintCaseStatus numberId: Open=0 / AwaitingInfo=1 / NoComplaint=2
  // Raw value of the ProofImage FILE field as it comes back on a read. Used only
  // to decide whether an attachment exists; the binary is fetched via
  // entities.downloadAttachment(). Shape is undocumented, so kept as `unknown`.
  ProofImage?: unknown;
}

// One gate transition: which gate (numberId), when, and by whom.
export interface GateEvent {
  g: number;   // gate numberId the case moved TO
  at: string;  // ISO timestamp
  by?: string; // user who made the change
}

export interface ComplaintInput {
  ComplaintId: string;
  EmailBody: string;
  Sender: string;
  Company: string;
  SalesOrder: string;
  BatchNumber: string;
  ExtractedType: number; // numberId
  Gate: number;          // numberId
  // Optional intake fields (populated by the agent, or manually in the modal).
  ProductName?: string;
  QtyAffected?: number | null;
  Summary?: string;
  Confidence?: number | null;
}

// Partial write back to a complaint record. Every field optional; choice fields
// are numberIds (same pattern as Gate/ExtractedType). Sent via updateRecord.
export interface ComplaintUpdate {
  Gate?: number;
  ExtractedType?: number;
  Company?: string;
  SalesOrder?: string;
  BatchNumber?: string;
  ProductName?: string;
  QtyAffected?: number | null;
  Summary?: string;
  Confidence?: number | null;
  InvestigationFindings?: string;
  LinkedComplaints?: string;
  SuggestedAction?: number | null;
  ApprovedAction?: number | null;
  FinanceAmount?: number | null;
  ApproveAdjustInventory?: boolean;
  ApproveCredit?: boolean;
  ApproveDebit?: boolean;
  GateHistory?: string;
  DeliveryNoteData?: string;
  DeliveryNoteMatch?: string;
  RfiBody?: string;
  ReturnPlanned?: boolean;
  CaseStatus?: number; // numberId
}
