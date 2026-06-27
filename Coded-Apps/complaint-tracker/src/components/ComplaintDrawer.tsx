import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ChoiceMap, Complaint, ComplaintUpdate, GateEvent } from '../lib/types';
import { ActionChip } from './Badges';
import { GateTimeline } from './GateTimeline';
import type { ComplaintsApi } from '../lib/api';
import { CASE_STATUS, caseStatusName, chipForCaseStatus } from '../lib/config';
import { generateCaseReport } from '../lib/caseReport';

// Parse the GateHistory JSON column into events; tolerate empty/invalid.
function parseHistory(raw: string): GateEvent[] {
  if (!raw || !raw.trim()) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as GateEvent[]).filter((e) => typeof e?.g === 'number') : [];
  } catch {
    return [];
  }
}

interface Props {
  complaint: Complaint;
  gates: ChoiceMap;
  types: ChoiceMap;
  actions: ChoiceMap; // SuggestedAction / ApprovedAction choice set (may be empty until configured)
  currentUser: string; // signed-in user, stamped onto gate transitions
  api: ComplaintsApi; // used to fetch the proof-image attachment binary
  onClose: () => void;
  onUpdate: (recordId: string, patch: ComplaintUpdate) => Promise<void>;
  onDelete: (complaint: Complaint) => Promise<void>; // permanently delete the record (confirms + refreshes + closes)
}

// Convert an HTML email body to readable plain text. Emails arrive as Word/Outlook
// HTML (heavy <style>/<head> noise); we strip those, turn block elements + <br> into
// line breaks, and let the browser decode entities. Plain-text bodies pass through.
function htmlToText(raw: string): string {
  if (!raw || !raw.trim()) return '';
  // If there are no tags, it's already plain text.
  if (!/<[a-z!/][\s\S]*>/i.test(raw)) return raw.trim();
  try {
    const doc = new DOMParser().parseFromString(raw, 'text/html');
    doc.querySelectorAll('style, script, head, title, meta, link').forEach((el) => el.remove());
    doc.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
    doc.querySelectorAll('p, div, tr, li, h1, h2, h3, h4, h5, h6, blockquote').forEach((el) => el.append('\n'));
    const text = doc.body?.textContent ?? '';
    return text
      .replace(/ /g, ' ')      // nbsp -> space
      .replace(/[ \t]+\n/g, '\n')   // trailing spaces before newline
      .replace(/\n{3,}/g, '\n\n')   // collapse blank-line runs
      .replace(/[ \t]{2,}/g, ' ')   // collapse runs of spaces
      .trim();
  } catch {
    return raw;
  }
}

// Pretty-print a JSON string; fall back to raw text if it isn't valid JSON.
function prettyJson(raw: string): string {
  if (!raw.trim()) return '';
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

// The Investigation Agent writes findings as a JSON object. Parse the fields we
// surface individually; render the raw JSON as a fallback if it isn't this shape.
interface Findings {
  rootCause?: string;
  disposition?: string;
  financeDirection?: string;
  rationale?: string;
}
function parseFindings(raw: string): Findings | null {
  if (!raw || !raw.trim()) return null;
  try {
    const o = JSON.parse(raw);
    return o && typeof o === 'object' && !Array.isArray(o) ? (o as Findings) : null;
  } catch {
    return null;
  }
}

// Parse a JSON string into a plain object, or null if it isn't a JSON object.
function parseJsonObject(raw: string): Record<string, unknown> | null {
  if (!raw || !raw.trim()) return null;
  try {
    const o = JSON.parse(raw);
    return o && typeof o === 'object' && !Array.isArray(o) ? (o as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

// Humanize a JSON key into a readable label: split camelCase + snake/kebab.
function humanizeKey(k: string): string {
  const spaced = k.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : k;
}

// Render a JSON value as a short string for a label/value pair.
function formatValue(v: unknown): string {
  if (v == null || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

// One field of the delivery-note↔sales-order comparison (DeliveryNoteMatch JSON,
// produced by the ExtractDeliveryNote robot as { product|batch|qty: {...} }).
interface MatchCell {
  deliveryNote?: string;
  salesOrder?: string;
  match?: boolean;
}
function asMatchCell(v: unknown): MatchCell | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as MatchCell) : null;
}
// Rows rendered (in order) from the DeliveryNoteMatch object.
const DN_MATCH_ROWS: ReadonlyArray<readonly [string, string]> = [
  ['product', 'Product'],
  ['batch', 'Batch'],
  ['qty', 'Quantity'],
];

// Collapsible stage section. Always shows its title; body shows only when open.
function Section({ title, hint, open, onToggle, children }: { title: string; hint?: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <div className={`acc${open ? ' open' : ''}`}>
      <button type="button" className="acc-head" onClick={onToggle} aria-expanded={open}>
        <span className="acc-caret" aria-hidden>{open ? '▾' : '▸'}</span>
        <span className="acc-title">{title}</span>
        {hint && <span className="acc-hint">{hint}</span>}
      </button>
      {open && <div className="acc-body">{children}</div>}
    </div>
  );
}

const STAGES = ['Triage', 'Investigation', 'CAPA', 'Closed'] as const;

export function ComplaintDrawer({ complaint, gates, types, actions, currentUser, api, onClose, onUpdate, onDelete }: Props) {
  // Editable extracted fields.
  const [company, setCompany] = useState(complaint.Company);
  const [salesOrder, setSalesOrder] = useState(complaint.SalesOrder);
  const [batchNumber, setBatchNumber] = useState(complaint.BatchNumber);
  const [productName, setProductName] = useState(complaint.ProductName);
  const [extractedType, setExtractedType] = useState<number | null>(complaint.ExtractedType);
  const [qtyAffected, setQtyAffected] = useState<string>(
    complaint.QtyAffected != null ? String(complaint.QtyAffected) : '',
  );
  const [summary, setSummary] = useState(complaint.Summary);

  // Gate move.
  const [gate, setGate] = useState<number>(complaint.Gate ?? gates.values[0]?.numberId ?? 0);

  // CAPA approval fields.
  const [approvedAction, setApprovedAction] = useState<number | null>(
    complaint.ApprovedAction ?? complaint.SuggestedAction,
  );
  const [financeAmount, setFinanceAmount] = useState<string>(
    complaint.FinanceAmount != null ? String(complaint.FinanceAmount) : '',
  );

  // Per-flow CAPA approvals — which RPA steps the human authorises.
  const [approveAdj, setApproveAdj] = useState<boolean>(complaint.ApproveAdjustInventory);
  const [approveCredit, setApproveCredit] = useState<boolean>(complaint.ApproveCredit);
  const [approveDebit, setApproveDebit] = useState<boolean>(complaint.ApproveDebit);

  // Physical return (log-only marker). Now a checkbox in the CAPA approval; saved with it.
  const [returnPlanned, setReturnPlanned] = useState<boolean>(complaint.ReturnPlanned);

  // Triage RFI body (request-for-more-info to the customer).
  const [rfiBody, setRfiBody] = useState(complaint.RfiBody);

  // Proof-image attachment (object URL fetched on demand from the ProofImage FILE field).
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [proofState, setProofState] = useState<'idle' | 'loading' | 'loaded' | 'none' | 'error'>('idle');

  // Delivery-note attachment (object URL fetched on demand from the DeliveryNote FILE field).
  const [dnUrl, setDnUrl] = useState<string | null>(null);
  const [dnState, setDnState] = useState<'idle' | 'loading' | 'loaded' | 'none' | 'error'>('idle');

  const [saving, setSaving] = useState<'gate' | 'fields' | 'approve' | 'rfi' | 'noComplaint' | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Which stage section is expanded (defaults to the current stage).
  const [open, setOpen] = useState<Record<string, boolean>>({ Triage: true });
  const toggle = (k: string) => setOpen((o) => ({ ...o, [k]: !o[k] }));

  // Re-sync when a different complaint is opened.
  useEffect(() => {
    setCompany(complaint.Company);
    setSalesOrder(complaint.SalesOrder);
    setBatchNumber(complaint.BatchNumber);
    setProductName(complaint.ProductName);
    setExtractedType(complaint.ExtractedType);
    setQtyAffected(complaint.QtyAffected != null ? String(complaint.QtyAffected) : '');
    setSummary(complaint.Summary);
    setGate(complaint.Gate ?? gates.values[0]?.numberId ?? 0);
    setApprovedAction(complaint.ApprovedAction ?? complaint.SuggestedAction);
    setFinanceAmount(complaint.FinanceAmount != null ? String(complaint.FinanceAmount) : '');
    setApproveAdj(complaint.ApproveAdjustInventory);
    setApproveCredit(complaint.ApproveCredit);
    setApproveDebit(complaint.ApproveDebit);
    setReturnPlanned(complaint.ReturnPlanned);
    setRfiBody(complaint.RfiBody);
    setErr(null);
    // Expand the section for the current stage; collapse the rest.
    const gn = complaint.Gate != null ? gates.byNumberId.get(complaint.Gate)?.name : undefined;
    const cur = gn && (STAGES as readonly string[]).includes(gn) ? gn : 'Triage';
    setOpen({ Triage: cur === 'Triage', Investigation: cur === 'Investigation', CAPA: cur === 'CAPA', Closed: cur === 'Closed' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complaint.Id]);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Fetch the proof-image attachment (if any) when a complaint is opened.
  // The ProofImage FILE field's read-shape is undocumented, so we don't rely on
  // it to decide presence — we just attempt the download and show the image only
  // if it succeeds. A failed/empty download degrades to "no image" silently.
  useEffect(() => {
    let revoked = false;
    let url: string | null = null;
    setProofUrl(null);
    setProofState('loading');
    api
      .downloadProofImage(complaint.Id)
      .then((u) => {
        if (revoked) {
          if (u) URL.revokeObjectURL(u);
          return;
        }
        url = u;
        setProofUrl(u);
        setProofState(u ? 'loaded' : 'none');
      })
      .catch(() => {
        if (!revoked) setProofState('error');
      });
    return () => {
      revoked = true;
      if (url) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complaint.Id]);

  // Fetch the delivery-note PDF (if any) when a complaint is opened. Same
  // attempt-and-degrade approach as the proof image: show the download link
  // only if the attachment download succeeds.
  useEffect(() => {
    let revoked = false;
    let url: string | null = null;
    setDnUrl(null);
    setDnState('loading');
    api
      .downloadDeliveryNote(complaint.Id)
      .then((u) => {
        if (revoked) {
          if (u) URL.revokeObjectURL(u);
          return;
        }
        url = u;
        setDnUrl(u);
        setDnState(u ? 'loaded' : 'none');
      })
      .catch(() => {
        if (!revoked) setDnState('error');
      });
    return () => {
      revoked = true;
      if (url) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complaint.Id]);

  const gateName = complaint.Gate != null ? gates.byNumberId.get(complaint.Gate)?.name : undefined;
  const typeName = complaint.ExtractedType != null ? types.byNumberId.get(complaint.ExtractedType)?.name : undefined;
  const capaName = gates.byName.get('CAPA')?.numberId;
  const closedName = gates.byName.get('Closed')?.numberId;

  // CaseStatus chip — resolve the name client-side from the known numberIds.
  const statusChip = chipForCaseStatus(caseStatusName(complaint.CaseStatus));
  const isAwaitingInfo = complaint.CaseStatus === CASE_STATUS.AwaitingInfo;
  const isNoComplaint = complaint.CaseStatus === CASE_STATUS.NoComplaint;

  const history = useMemo(() => parseHistory(complaint.GateHistory), [complaint.GateHistory]);

  const emailText = useMemo(() => htmlToText(complaint.EmailBody), [complaint.EmailBody]);

  // Delivery-note extracted fields (DeliveryNoteData) + match vs sales order (DeliveryNoteMatch).
  const dnData = useMemo(() => parseJsonObject(complaint.DeliveryNoteData), [complaint.DeliveryNoteData]);
  const dnDataRaw = useMemo(() => prettyJson(complaint.DeliveryNoteData), [complaint.DeliveryNoteData]);
  const dnMatch = useMemo(() => parseJsonObject(complaint.DeliveryNoteMatch), [complaint.DeliveryNoteMatch]);
  const hasDnData = Boolean(complaint.DeliveryNoteData.trim());
  const hasDnMatch = Boolean(complaint.DeliveryNoteMatch.trim());
  const hasProof = proofState === 'loaded' && Boolean(proofUrl);
  const hasDnDownload = dnState === 'loaded' && Boolean(dnUrl);
  const showEvidence = hasProof || hasDnDownload || hasDnData || hasDnMatch;

  const findings = useMemo(() => prettyJson(complaint.InvestigationFindings), [complaint.InvestigationFindings]);
  const findingsObj = useMemo(() => parseFindings(complaint.InvestigationFindings), [complaint.InvestigationFindings]);
  const hasInvestigation = Boolean(complaint.InvestigationFindings.trim() || complaint.SuggestedAction != null);

  const parseQty = () => (qtyAffected.trim() === '' ? null : Number(qtyAffected));
  const parseAmount = () => (financeAmount.trim() === '' ? null : Number(financeAmount));

  const fieldsDirty =
    company !== complaint.Company ||
    salesOrder !== complaint.SalesOrder ||
    batchNumber !== complaint.BatchNumber ||
    productName !== complaint.ProductName ||
    extractedType !== complaint.ExtractedType ||
    parseQty() !== complaint.QtyAffected ||
    summary !== complaint.Summary;

  const gateDirty = gate !== complaint.Gate;

  const run = async (kind: 'gate' | 'fields' | 'approve' | 'rfi' | 'noComplaint', patch: ComplaintUpdate) => {
    setSaving(kind);
    setErr(null);
    // Stamp a gate transition into GateHistory whenever the gate actually changes.
    if (patch.Gate != null && patch.Gate !== complaint.Gate) {
      const next: GateEvent[] = [...history, { g: patch.Gate, at: new Date().toISOString(), ...(currentUser ? { by: currentUser } : {}) }];
      patch = { ...patch, GateHistory: JSON.stringify(next) };
    }
    try {
      await onUpdate(complaint.Id, patch);
      setSaving(null); // drawer stays open after save — reset the button state
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Update failed');
      setSaving(null);
    }
  };

  // Save only the extracted fields that actually changed.
  const saveFields = () => {
    const patch: ComplaintUpdate = {};
    if (company !== complaint.Company) patch.Company = company;
    if (salesOrder !== complaint.SalesOrder) patch.SalesOrder = salesOrder;
    if (batchNumber !== complaint.BatchNumber) patch.BatchNumber = batchNumber;
    if (productName !== complaint.ProductName) patch.ProductName = productName;
    if (extractedType !== complaint.ExtractedType && extractedType != null) patch.ExtractedType = extractedType;
    if (parseQty() !== complaint.QtyAffected) patch.QtyAffected = parseQty();
    if (summary !== complaint.Summary) patch.Summary = summary;
    run('fields', patch);
  };

  const saveGate = () => run('gate', { Gate: gate });

  // Approve = set ApprovedAction (+ FinanceAmount), record the per-flow step
  // approvals, and advance Gate to CAPA. The CAPA "Record Updated" trigger reads
  // the three booleans and runs only the approved branches.
  const approve = () =>
    run('approve', {
      ApprovedAction: approvedAction ?? undefined,
      FinanceAmount: parseAmount(),
      ApproveAdjustInventory: approveAdj,
      ApproveCredit: approveCredit,
      ApproveDebit: approveDebit,
      ReturnPlanned: returnPlanned,
      ...(capaName != null ? { Gate: capaName } : {}),
    });

  // Record a request-for-more-info: write RfiBody + set CaseStatus = AwaitingInfo.
  // The actual customer email is sent by the orchestration; the app only logs it.
  const requestInfo = () =>
    run('rfi', { RfiBody: rfiBody, CaseStatus: CASE_STATUS.AwaitingInfo });

  // Reject the case: CaseStatus = NoComplaint and move the gate to Closed (stops the flow).
  const markNoComplaint = () =>
    run('noComplaint', { CaseStatus: CASE_STATUS.NoComplaint, ...(closedName != null ? { Gate: closedName } : {}) });

  return (
    <div className="detail-overlay" role="dialog" aria-modal="true" aria-label="Complaint detail">
      <div className="detail-panel">
        <div className="detail-head">
          <div>
            <div className="cid">{complaint.ComplaintId}</div>
            <h3>
              {complaint.Company || '—'}
              {complaint.CaseStatus != null && complaint.CaseStatus !== CASE_STATUS.Open && (
                <span className={`chip ${statusChip.cls}`} style={{ marginLeft: 12, verticalAlign: 'middle' }}>{statusChip.label}</span>
              )}
            </h3>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm btn-ghost" title="Delete complaint" onClick={() => onDelete(complaint)}>🗑 Delete</button>
            <button className="btn btn-sm btn-back" onClick={onClose}>← Back</button>
          </div>
        </div>

        <div className="detail-body">
          {/* ---- Gate progression timeline ---- */}
          <div className="detail-section">
            <GateTimeline gates={gates} currentGate={complaint.Gate} history={history} createTime={complaint.CreateTime} />
          </div>

          {/* ---- Email (the source) on top ---- */}
          <div className="detail-section">
            <h2 className="section-title">Email</h2>
            <div className="detail-grid">
              <div>
                <div className="dl-label">Email sender</div>
                <div className="dl-value">{complaint.Sender || '—'}</div>
              </div>
            </div>
            <div className="dl-label">Email body</div>
            <div className="email-body">{emailText || '(no email body)'}</div>
          </div>

          {/* ---- Customer-supplied evidence (attachments) — below the email, outside the Triage stage ---- */}
          {showEvidence && (
            <div className="detail-section">
              <h2 className="section-title">Attachments &amp; evidence</h2>

              {/* Proof image of the damaged / defective goods (FILE field), if attached */}
              {hasProof && (
                <div className="proof-block">
                  <div className="dl-label">Proof image{typeName === 'QualityDeficit' ? ' (quality defect)' : ''}</div>
                  <a href={proofUrl!} target="_blank" rel="noreferrer" title="Open full size">
                    <img className="proof-img" src={proofUrl!} alt="Photo of the damaged / defective goods supplied by the customer" />
                  </a>
                </div>
              )}

              {/* Delivery note: download + extracted fields + match vs sales order */}
              {(hasDnDownload || hasDnData || hasDnMatch) && (
                <div className="dn-block">
                  <div className="dl-label">Delivery note</div>

                  {hasDnDownload && (
                    <a
                      className="btn btn-secondary dn-download"
                      href={dnUrl!}
                      target="_blank"
                      rel="noreferrer"
                      download={`delivery-note-${complaint.ComplaintId || complaint.Id}.pdf`}
                    >
                      ⬇ Download delivery note (PDF)
                    </a>
                  )}
                  {dnState === 'error' && (
                    <div className="inline-note">Couldn't load the delivery-note attachment.</div>
                  )}

                  {/* Extracted fields from the DeliveryNoteData JSON */}
                  {hasDnData &&
                    (dnData ? (
                      <div className="detail-grid dn-fields">
                        {Object.entries(dnData).map(([k, v]) => (
                          <div key={k}>
                            <div className="dl-label">{humanizeKey(k)}</div>
                            <div className="dl-value cell-mono">{formatValue(v)}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <>
                        <div className="dl-label" style={{ marginTop: 8 }}>Extracted data</div>
                        <pre className="email-body" style={{ fontFamily: 'monospace', fontSize: '.8rem' }}>{dnDataRaw}</pre>
                      </>
                    ))}

                  {/* Delivery note vs sales-order comparison (DeliveryNoteMatch JSON) */}
                  {hasDnMatch && dnMatch && (
                    <>
                      <div className="dl-label" style={{ marginTop: 10 }}>Delivery note vs sales order</div>
                      <table className="dn-match">
                        <thead>
                          <tr><th>Field</th><th>Delivery note</th><th>Sales order</th><th>Match</th></tr>
                        </thead>
                        <tbody>
                          {DN_MATCH_ROWS.map(([key, label]) => {
                            const cell = asMatchCell(dnMatch[key]);
                            if (!cell) return null;
                            const m = cell.match === true;
                            return (
                              <tr key={key}>
                                <td>{label}</td>
                                <td className="cell-mono">{cell.deliveryNote || '—'}</td>
                                <td className="cell-mono">{cell.salesOrder || '—'}</td>
                                <td><span className={`gdp-chip ${m ? 'true' : 'false'}`}>{m ? 'Match' : 'Mismatch'}</span></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ---- Stage sections (expandable; current stage open by default) ---- */}

          {/* TRIAGE — validate / correct the extracted fields */}
          <Section title="Triage" hint="Extracted fields" open={!!open.Triage} onToggle={() => toggle('Triage')}>
            <div className="form-grid2">
              <div className="form-row">
                <label className="field-label" htmlFor="f-company">Company</label>
                <input id="f-company" className="input" value={company} onChange={(e) => setCompany(e.target.value)} />
              </div>
              <div className="form-row">
                <label className="field-label" htmlFor="f-product">Product name</label>
                <input id="f-product" className="input" value={productName} onChange={(e) => setProductName(e.target.value)} />
              </div>
              <div className="form-row">
                <label className="field-label" htmlFor="f-so">Sales order</label>
                <input id="f-so" className="input" value={salesOrder} onChange={(e) => setSalesOrder(e.target.value)} />
              </div>
              <div className="form-row">
                <label className="field-label" htmlFor="f-batch">Batch number</label>
                <input id="f-batch" className="input" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} />
              </div>
              <div className="form-row">
                <label className="field-label" htmlFor="f-type">Extracted type</label>
                <select
                  id="f-type"
                  className="select"
                  value={extractedType ?? ''}
                  onChange={(e) => setExtractedType(e.target.value === '' ? null : Number(e.target.value))}
                >
                  <option value="">—</option>
                  {types.values.map((t) => (
                    <option key={t.numberId} value={t.numberId}>{t.displayName}</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label className="field-label" htmlFor="f-qty">Qty affected</label>
                <input id="f-qty" className="input" type="number" value={qtyAffected} onChange={(e) => setQtyAffected(e.target.value)} />
              </div>
            </div>
            <div className="inline-note">
              Batch number and qty affected are optional at Triage — leave them blank if the customer
              didn't state them. The RPA backfills both from the sales order during Investigation.
            </div>
            <div className="form-row">
              <label className="field-label" htmlFor="f-summary">Summary</label>
              <textarea id="f-summary" className="input" value={summary} onChange={(e) => setSummary(e.target.value)} />
            </div>
            <div className="dl-label" style={{ marginTop: 4 }}>
              Confidence: {complaint.Confidence != null ? `${Math.round(complaint.Confidence * 100)}%` : '—'}
            </div>
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={saveFields} disabled={!fieldsDirty || saving !== null}>
              {saving === 'fields' ? 'Saving…' : 'Save changes'}
            </button>

            {/* ---- Triage decisions: request more info / reject ---- */}
            {!isNoComplaint && (
              <div className="triage-decisions">
                <div className="dl-label">Request more information</div>
                <textarea
                  id="f-rfi"
                  className="input"
                  value={rfiBody}
                  onChange={(e) => setRfiBody(e.target.value)}
                  placeholder="Message to the customer asking for the missing details (delivery note, photos, batch…)."
                />
                <div className="triage-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={requestInfo}
                    disabled={saving !== null || rfiBody.trim() === ''}
                  >
                    {saving === 'rfi' ? 'Recording…' : 'Request info from customer'}
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={markNoComplaint}
                    disabled={saving !== null}
                  >
                    {saving === 'noComplaint' ? 'Closing…' : 'Mark as no complaint'}
                  </button>
                </div>
                {isAwaitingInfo && (
                  <div className="banner-info">
                    Awaiting info — request recorded; the orchestration sends the email and parks the case
                    until the customer replies.
                  </div>
                )}
                <div className="inline-note">
                  "Request info" records the message and sets the case to Awaiting info (the email is sent by
                  the orchestration). "Mark as no complaint" rejects the case and closes it, stopping the flow.
                </div>
              </div>
            )}
            {isNoComplaint && (
              <div className="banner-info" style={{ marginTop: 14 }}>
                This case was marked <strong>No complaint</strong> and closed. The flow is stopped.
              </div>
            )}
          </Section>

          {/* INVESTIGATION — suggested action, linked complaints, findings (+ approval) */}
          <Section title="Investigation" hint="Suggestion · findings" open={!!open.Investigation} onToggle={() => toggle('Investigation')}>
            {hasInvestigation || (gateName === 'Investigation' && complaint.SuggestedAction != null) ? (
              <>
                {hasInvestigation && (
                  <>
                    <div className="detail-grid">
                      <div>
                        <div className="dl-label">Suggested action</div>
                        <div className="dl-value"><ActionChip action={complaint.SuggestedAction} actions={actions} /></div>
                      </div>
                    </div>
                    {findingsObj ? (
                      <div className="findings-fields">
                        {findingsObj.rootCause && (
                          <>
                            <div className="dl-label">Root cause</div>
                            <div className="dl-value findings-text">{findingsObj.rootCause}</div>
                          </>
                        )}
                        <div className="detail-grid" style={{ marginTop: 10 }}>
                          {findingsObj.disposition && (
                            <div>
                              <div className="dl-label">Disposition</div>
                              <div className="dl-value">{findingsObj.disposition}</div>
                            </div>
                          )}
                          {findingsObj.financeDirection && (
                            <div>
                              <div className="dl-label">Finance direction</div>
                              <div className="dl-value">{findingsObj.financeDirection}</div>
                            </div>
                          )}
                        </div>
                        {findingsObj.rationale && (
                          <>
                            <div className="dl-label" style={{ marginTop: 10 }}>Rationale</div>
                            <div className="dl-value findings-text">{findingsObj.rationale}</div>
                          </>
                        )}
                      </div>
                    ) : findings ? (
                      <>
                        <div className="dl-label">Investigation findings</div>
                        <pre className="email-body" style={{ fontFamily: 'monospace', fontSize: '.8rem' }}>{findings}</pre>
                      </>
                    ) : null}
                  </>
                )}
                {gateName === 'Investigation' && complaint.SuggestedAction != null && (
                  <div style={{ marginTop: hasInvestigation ? 18 : 0 }}>
                    <div className="sub" style={{ marginBottom: 12 }}>
                      Confirm the action (defaults to the suggestion, editable) and advance to CAPA. This is the human approval.
                    </div>
                    <div className="form-grid2">
                      <div className="form-row">
                        <label className="field-label" htmlFor="approved-action">Approved action</label>
                        <select
                          id="approved-action"
                          className="select"
                          value={approvedAction ?? ''}
                          onChange={(e) => setApprovedAction(e.target.value === '' ? null : Number(e.target.value))}
                        >
                          <option value="">—</option>
                          {actions.values.map((a) => (
                            <option key={a.numberId} value={a.numberId}>{a.displayName}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-row">
                        <label className="field-label" htmlFor="finance-amount">Finance amount</label>
                        <input
                          id="finance-amount"
                          className="input"
                          type="number"
                          value={financeAmount}
                          onChange={(e) => setFinanceAmount(e.target.value)}
                          placeholder="optional"
                        />
                      </div>
                    </div>
                    <div className="form-row" style={{ marginTop: 12 }}>
                      <label className="field-label">Approve steps to run in CAPA</label>
                      <div className="check-row">
                        <label className="check"><input type="checkbox" checked={approveAdj} onChange={(e) => setApproveAdj(e.target.checked)} /> Adjust inventory</label>
                        <label className="check"><input type="checkbox" checked={approveCredit} onChange={(e) => setApproveCredit(e.target.checked)} /> Credit note</label>
                        <label className="check"><input type="checkbox" checked={approveDebit} onChange={(e) => setApproveDebit(e.target.checked)} /> Debit note</label>
                        <label className="check"><input type="checkbox" checked={returnPlanned} onChange={(e) => setReturnPlanned(e.target.checked)} /> Plan return</label>
                      </div>
                    </div>
                    <button className="btn btn-primary" onClick={approve} disabled={saving !== null || approvedAction == null}>
                      {saving === 'approve' ? 'Approving…' : 'Approve & advance to CAPA'}
                    </button>
                    <div className="inline-note">Sets ApprovedAction + FinanceAmount, records the approved steps (and whether a physical return is planned), and moves the gate to CAPA, firing the CAPA process.</div>
                  </div>
                )}
              </>
            ) : (
              <div className="empty" style={{ padding: '14px 0' }}>No investigation data yet.</div>
            )}
          </Section>

          {/* CAPA — the approved disposition + finance correction */}
          <Section title="CAPA" hint="Disposition · finance" open={!!open.CAPA} onToggle={() => toggle('CAPA')}>
            {complaint.ApprovedAction != null || complaint.FinanceAmount != null || complaint.ApproveAdjustInventory || complaint.ApproveCredit || complaint.ApproveDebit ? (
              <div className="detail-grid">
                <div>
                  <div className="dl-label">Approved action</div>
                  <div className="dl-value"><ActionChip action={complaint.ApprovedAction} actions={actions} /></div>
                </div>
                {complaint.FinanceAmount != null && (
                  <div>
                    <div className="dl-label">Finance amount</div>
                    <div className="dl-value cell-mono">{complaint.FinanceAmount}</div>
                  </div>
                )}
                <div className="full">
                  <div className="dl-label">Approved steps (run in CAPA)</div>
                  <div className="dl-value">
                    {[
                      complaint.ApproveAdjustInventory && 'Adjust inventory',
                      complaint.ApproveCredit && 'Credit note',
                      complaint.ApproveDebit && 'Debit note',
                    ].filter(Boolean).join(' · ') || 'None'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty" style={{ padding: '14px 0' }}>Pending CAPA — no approved disposition yet.</div>
            )}
          </Section>

          {/* CLOSED — final resolution */}
          <Section title="Closed" hint="Resolution" open={!!open.Closed} onToggle={() => toggle('Closed')}>
            {gateName === 'Closed' ? (
              <div className="detail-grid">
                <div>
                  <div className="dl-label">Final disposition</div>
                  <div className="dl-value"><ActionChip action={complaint.ApprovedAction ?? complaint.SuggestedAction} actions={actions} /></div>
                </div>
                {complaint.FinanceAmount != null && (
                  <div>
                    <div className="dl-label">Finance posted</div>
                    <div className="dl-value cell-mono">{complaint.FinanceAmount}</div>
                  </div>
                )}
                <div className="full"><div className="dl-value" style={{ color: 'var(--status-available)', fontWeight: 600 }}>Complaint resolved &amp; closed.</div></div>
                <div className="full">
                  <button
                    className="btn btn-secondary"
                    onClick={() => generateCaseReport(complaint, gates, types, actions)}
                  >
                    Download case report (PDF)
                  </button>
                  <div className="inline-note">Generates a full case dossier (ids, email, findings, disposition, finance, approvals, gate history) as a PDF in your browser.</div>
                </div>
              </div>
            ) : (
              <div className="empty" style={{ padding: '14px 0' }}>Not closed yet.</div>
            )}
          </Section>

          {/* ---- Move to gate ---- */}
          <div className="detail-section">
            <h2 className="section-title">Move to gate</h2>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <select
                id="gate-select"
                className="select"
                style={{ maxWidth: 240 }}
                value={gate}
                onChange={(e) => setGate(Number(e.target.value))}
              >
                {gates.values.map((g) => (
                  <option key={g.numberId} value={g.numberId}>{g.displayName}</option>
                ))}
              </select>
              <button className="btn btn-primary" onClick={saveGate} disabled={!gateDirty || saving !== null}>
                {saving === 'gate' ? 'Saving…' : 'Update gate'}
              </button>
            </div>
            <div className="inline-note">Writes to Data Fabric and fires entity triggers.</div>
          </div>

          {err && <div className="banner-error">{err}</div>}
        </div>
      </div>
    </div>
  );
}
