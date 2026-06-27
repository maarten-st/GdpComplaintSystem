import { Entities, ChoiceSets } from '@uipath/uipath-typescript/entities';
import { LogicalOperator, QueryFilterOperator, EntityAggregateFunction } from '@uipath/uipath-typescript/entities';
import type {
  EntityQueryFilter,
  EntityQueryFilterGroup,
  EntityQueryRecordsOptions,
} from '@uipath/uipath-typescript/entities';
import type { UiPath } from '@uipath/uipath-typescript/core';
import {
  COMPLAINTS_ENTITY_ID,
  COMPLAINT_GATE_CHOICESET_ID,
  COMPLAINT_TYPE_CHOICESET_ID,
  COMPLAINT_SUGGESTEDACTION_CHOICESET_ID,
  COMPLAINT_APPROVEDACTION_CHOICESET_ID,
  COMPLAINT_CASESTATUS_CHOICESET_ID,
  PROOF_IMAGE_FIELD,
  DELIVERY_NOTE_FIELD,
  SEARCH_FIELDS,
  PAGE_SIZE,
} from './config';
import type { ChoiceMap, ChoiceValue, Complaint, ComplaintInput, ComplaintUpdate } from './types';

export interface QueryArgs {
  search: string;
  gate: number | null; // numberId filter, null = all
  type: number | null;
  page: number;         // 1-based
}

export interface QueryResult {
  items: Complaint[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

// Map a raw DF record (string-keyed, choice fields as numberIds) to Complaint.
function toComplaint(r: Record<string, any>): Complaint {
  return {
    Id: r.Id,
    ComplaintId: r.ComplaintId ?? '',
    EmailBody: r.EmailBody ?? '',
    Sender: r.Sender ?? '',
    Company: r.Company ?? '',
    SalesOrder: r.SalesOrder ?? '',
    BatchNumber: r.BatchNumber ?? '',
    ExtractedType: typeof r.ExtractedType === 'number' ? r.ExtractedType : null,
    Gate: typeof r.Gate === 'number' ? r.Gate : null,
    CreateTime: r.CreateTime,
    ProductName: r.ProductName ?? '',
    QtyAffected: typeof r.QtyAffected === 'number' ? r.QtyAffected : null,
    Summary: r.Summary ?? '',
    Confidence: typeof r.Confidence === 'number' ? r.Confidence : null,
    InvestigationFindings: r.InvestigationFindings ?? '',
    LinkedComplaints: r.LinkedComplaints ?? '',
    SuggestedAction: typeof r.SuggestedAction === 'number' ? r.SuggestedAction : null,
    ApprovedAction: typeof r.ApprovedAction === 'number' ? r.ApprovedAction : null,
    FinanceAmount: typeof r.FinanceAmount === 'number' ? r.FinanceAmount : null,
    ApproveAdjustInventory: r.ApproveAdjustInventory === true,
    ApproveCredit: r.ApproveCredit === true,
    ApproveDebit: r.ApproveDebit === true,
    GateHistory: r.GateHistory ?? '',
    DeliveryNoteData: r.DeliveryNoteData ?? '',
    DeliveryNoteMatch: r.DeliveryNoteMatch ?? '',
    RfiBody: r.RfiBody ?? '',
    ReturnPlanned: r.ReturnPlanned === true,
    CaseStatus: typeof r.CaseStatus === 'number' ? r.CaseStatus : null,
    ProofImage: r.ProofImage,
  };
}

export class ComplaintsApi {
  private entities: Entities;
  private choiceSets: ChoiceSets;

  constructor(sdk: UiPath) {
    this.entities = new Entities(sdk);
    this.choiceSets = new ChoiceSets(sdk);
  }

  // Resolve a choice set into bidirectional lookup maps.
  async loadChoiceMap(choiceSetId: string): Promise<ChoiceMap> {
    const res = await this.choiceSets.getById(choiceSetId);
    const raw = (res.items ?? []) as any[];
    const values: ChoiceValue[] = raw
      .map((v) => ({ numberId: v.numberId, name: v.name, displayName: v.displayName ?? v.name }))
      .sort((a, b) => a.numberId - b.numberId);
    const byNumberId = new Map<number, ChoiceValue>();
    const byName = new Map<string, ChoiceValue>();
    for (const v of values) {
      byNumberId.set(v.numberId, v);
      byName.set(v.name, v);
    }
    return { values, byNumberId, byName };
  }

  loadTypes() { return this.loadChoiceMap(COMPLAINT_TYPE_CHOICESET_ID); }
  loadGates() { return this.loadChoiceMap(COMPLAINT_GATE_CHOICESET_ID); }
  loadSuggestedActions() { return this.loadActionChoiceMap(COMPLAINT_SUGGESTEDACTION_CHOICESET_ID); }
  loadApprovedActions() { return this.loadActionChoiceMap(COMPLAINT_APPROVEDACTION_CHOICESET_ID); }
  loadCaseStatuses() { return this.loadActionChoiceMap(COMPLAINT_CASESTATUS_CHOICESET_ID); }

  // Download the proof image attached to a record's ProofImage FILE field and
  // return an object URL the caller can put in an <img src>. Returns null if no
  // attachment exists / the download fails — callers must revoke the URL when done.
  async downloadProofImage(recordId: string): Promise<string | null> {
    try {
      const blob = await this.entities.downloadAttachment(COMPLAINTS_ENTITY_ID, recordId, PROOF_IMAGE_FIELD);
      if (!blob || blob.size === 0) return null;
      return URL.createObjectURL(blob);
    } catch {
      // No attachment, or the FILE field is empty — nothing to show.
      return null;
    }
  }

  // Download the delivery-note PDF attached to a record's DeliveryNote FILE
  // field and return an object URL the caller can use in a download link.
  // Returns null if no attachment exists / the download fails — callers must
  // revoke the URL when done.
  async downloadDeliveryNote(recordId: string): Promise<string | null> {
    try {
      const blob = await this.entities.downloadAttachment(COMPLAINTS_ENTITY_ID, recordId, DELIVERY_NOTE_FIELD);
      if (!blob || blob.size === 0) return null;
      return URL.createObjectURL(blob);
    } catch {
      // No attachment, or the FILE field is empty — nothing to download.
      return null;
    }
  }

  // Like loadChoiceMap, but tolerates an unset choiceSetId (the SuggestedAction /
  // ApprovedAction UUIDs are placeholders until the choice sets are created and
  // pasted into config.ts). Returns an empty map rather than throwing.
  private async loadActionChoiceMap(choiceSetId: string): Promise<ChoiceMap> {
    if (!choiceSetId) {
      return { values: [], byNumberId: new Map(), byName: new Map() };
    }
    return this.loadChoiceMap(choiceSetId);
  }

  // Paginated, filtered, sorted list of complaints.
  async query({ search, gate, type, page }: QueryArgs): Promise<QueryResult> {
    const queryFilters: EntityQueryFilter[] = [];
    if (gate !== null) {
      // Choice filter values must be the numberId as a string.
      queryFilters.push({ fieldName: 'Gate', operator: QueryFilterOperator.Equals, value: String(gate) });
    }
    if (type !== null) {
      queryFilters.push({ fieldName: 'ExtractedType', operator: QueryFilterOperator.Equals, value: String(type) });
    }

    const filterGroups: EntityQueryFilterGroup[] = [];
    const term = search.trim();
    if (term) {
      // OR a "contains" across each searchable string field.
      filterGroups.push({
        logicalOperator: LogicalOperator.Or,
        queryFilters: SEARCH_FIELDS.map((f) => ({
          fieldName: f,
          operator: QueryFilterOperator.Contains,
          value: term,
        })),
      });
    }

    const options: EntityQueryRecordsOptions = {
      sortOptions: [{ fieldName: 'CreateTime', isDescending: true }],
      pageSize: PAGE_SIZE,
      jumpToPage: page,
    };
    if (queryFilters.length || filterGroups.length) {
      options.filterGroup = {
        logicalOperator: LogicalOperator.And,
        queryFilters,
        filterGroups,
      };
    }

    const res: any = await this.entities.queryRecordsById(COMPLAINTS_ENTITY_ID, options);
    const items = ((res.items ?? []) as Record<string, any>[]).map(toComplaint);
    const totalCount: number = res.totalCount ?? items.length;
    const totalPages: number = res.totalPages ?? Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    const currentPage: number = res.currentPage ?? page;
    return { items, totalCount, totalPages, currentPage };
  }

  // Count of complaints per gate (numberId -> count), via server-side aggregate.
  async countsByGate(): Promise<Map<number, number>> {
    const res: any = await this.entities.queryRecordsById(COMPLAINTS_ENTITY_ID, {
      selectedFields: ['Gate'],
      groupBy: ['Gate'],
      aggregates: [{ function: EntityAggregateFunction.Count, field: 'Id', alias: 'total' }],
    });
    const map = new Map<number, number>();
    for (const row of (res.items ?? []) as Record<string, any>[]) {
      const gate = row.Gate;
      const total = row.total ?? row.Total ?? row.count ?? 0;
      if (typeof gate === 'number') map.set(gate, Number(total));
    }
    return map;
  }

  // Fetch all complaints (the dataset is small) so the reporting page can
  // compute every metric client-side from one consistent snapshot.
  async fetchAll(): Promise<Complaint[]> {
    const all: Complaint[] = [];
    let page = 1;
    let totalPages = 1;
    do {
      const res: any = await this.entities.queryRecordsById(COMPLAINTS_ENTITY_ID, {
        sortOptions: [{ fieldName: 'CreateTime', isDescending: true }],
        pageSize: 200,
        jumpToPage: page,
      });
      const items = ((res.items ?? []) as Record<string, any>[]).map(toComplaint);
      all.push(...items);
      totalPages = res.totalPages ?? 1;
      page++;
    } while (page <= totalPages && page <= 50);
    return all;
  }

  async total(): Promise<number> {
    const res: any = await this.entities.queryRecordsById(COMPLAINTS_ENTITY_ID, {
      aggregates: [{ function: EntityAggregateFunction.Count, field: 'Id', alias: 'total' }],
    });
    const row = (res.items ?? [])[0] as Record<string, any> | undefined;
    return Number(row?.total ?? row?.Total ?? 0);
  }

  // Insert a new complaint. Choice fields are sent as numberIds. Fires DF triggers.
  // Seeds GateHistory with the initial gate so the case timeline has a starting point.
  async insert(input: ComplaintInput, by?: string): Promise<void> {
    const seeded = {
      ...input,
      GateHistory: JSON.stringify([{ g: input.Gate, at: new Date().toISOString(), ...(by ? { by } : {}) }]),
    };
    await this.entities.insertRecordById(COMPLAINTS_ENTITY_ID, seeded as Record<string, any>);
  }

  // Move a complaint to a new gate. Fires DF triggers.
  async updateGate(recordId: string, gateNumberId: number): Promise<void> {
    await this.entities.updateRecordById(COMPLAINTS_ENTITY_ID, recordId, { Gate: gateNumberId });
  }

  // Permanently delete a complaint record. Uses deleteRecordById (the single-
  // record delete that fires DF trigger events), mirroring the other
  // *RecordById calls on this.entities.
  async deleteRecord(recordId: string): Promise<void> {
    await this.entities.deleteRecordById(COMPLAINTS_ENTITY_ID, recordId);
  }

  // Partial write back to a complaint. Choice fields (Gate, ExtractedType,
  // SuggestedAction, ApprovedAction) are sent as numberIds. Fires DF triggers
  // when Gate changes. Undefined keys are dropped so we never null an unset field.
  async updateRecord(recordId: string, patch: ComplaintUpdate): Promise<void> {
    const body: Record<string, any> = {};
    for (const [k, v] of Object.entries(patch)) {
      if (v !== undefined) body[k] = v;
    }
    await this.entities.updateRecordById(COMPLAINTS_ENTITY_ID, recordId, body);
  }
}
