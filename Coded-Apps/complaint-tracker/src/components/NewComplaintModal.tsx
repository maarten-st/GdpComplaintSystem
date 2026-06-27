import { useState } from 'react';
import type { ChoiceMap, ComplaintInput } from '../lib/types';

interface Props {
  gates: ChoiceMap;
  types: ChoiceMap;
  suggestedId: string;
  onClose: () => void;
  onCreate: (input: ComplaintInput) => Promise<void>;
}

export function NewComplaintModal({ gates, types, suggestedId, onClose, onCreate }: Props) {
  const [form, setForm] = useState<ComplaintInput>({
    ComplaintId: suggestedId,
    EmailBody: '',
    Sender: '',
    Company: '',
    SalesOrder: '',
    BatchNumber: '',
    ExtractedType: types.values[0]?.numberId ?? 0,
    Gate: gates.values[0]?.numberId ?? 0,
    ProductName: '',
    Summary: '',
  });
  // Numeric intake fields are kept as strings in the form, parsed on submit.
  const [qty, setQty] = useState('');
  const [confidence, setConfidence] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = (k: keyof ComplaintInput, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const valid = form.ComplaintId.trim() && form.Company.trim();

  const submit = async () => {
    if (!valid) { setErr('Complaint ID and Company are required.'); return; }
    setSaving(true);
    setErr(null);
    try {
      await onCreate({
        ...form,
        QtyAffected: qty.trim() === '' ? null : Number(qty),
        Confidence: confidence.trim() === '' ? null : Number(confidence),
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to create complaint');
      setSaving(false);
    }
  };

  return (
    <div className="modal-wrap">
      <div className="scrim" onClick={onClose} />
      <div className="modal" role="dialog" aria-label="New complaint" style={{ position: 'relative', zIndex: 50 }}>
        <div className="mhead">
          <h3>Log new complaint</h3>
          <button className="x" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="mbody">
          <div className="form-grid2">
            <div className="form-row">
              <label className="field-label">Complaint ID *</label>
              <input className="input" value={form.ComplaintId} onChange={(e) => set('ComplaintId', e.target.value)} />
            </div>
            <div className="form-row">
              <label className="field-label">Company *</label>
              <input className="input" value={form.Company} onChange={(e) => set('Company', e.target.value)} />
            </div>
          </div>
          <div className="form-grid2">
            <div className="form-row">
              <label className="field-label">Sender (email)</label>
              <input className="input" value={form.Sender} onChange={(e) => set('Sender', e.target.value)} />
            </div>
            <div className="form-row">
              <label className="field-label">Sales Order</label>
              <input className="input" value={form.SalesOrder} onChange={(e) => set('SalesOrder', e.target.value)} />
            </div>
          </div>
          <div className="form-grid2">
            <div className="form-row">
              <label className="field-label">Batch Number</label>
              <input className="input" value={form.BatchNumber} onChange={(e) => set('BatchNumber', e.target.value)} />
            </div>
            <div className="form-row">
              <label className="field-label">Extracted Type</label>
              <select className="select" value={form.ExtractedType} onChange={(e) => set('ExtractedType', Number(e.target.value))}>
                {types.values.map((t) => <option key={t.numberId} value={t.numberId}>{t.displayName}</option>)}
              </select>
            </div>
          </div>
          <div className="form-grid2">
            <div className="form-row">
              <label className="field-label">Product Name</label>
              <input className="input" value={form.ProductName ?? ''} onChange={(e) => set('ProductName', e.target.value)} />
            </div>
            <div className="form-row">
              <label className="field-label">Qty Affected</label>
              <input className="input" type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <label className="field-label">Confidence (0–1)</label>
            <input
              className="input"
              type="number"
              min={0}
              max={1}
              step={0.01}
              style={{ maxWidth: 240 }}
              value={confidence}
              onChange={(e) => setConfidence(e.target.value)}
            />
          </div>
          <div className="form-row">
            <label className="field-label">Summary</label>
            <textarea
              className="input"
              style={{ minHeight: 70 }}
              value={form.Summary ?? ''}
              onChange={(e) => set('Summary', e.target.value)}
              placeholder="Short extracted summary of the complaint…"
            />
          </div>
          <div className="form-row">
            <label className="field-label">Initial Gate</label>
            <select className="select" style={{ maxWidth: 240 }} value={form.Gate} onChange={(e) => set('Gate', Number(e.target.value))}>
              {gates.values.map((g) => <option key={g.numberId} value={g.numberId}>{g.displayName}</option>)}
            </select>
          </div>
          <div className="form-row">
            <label className="field-label">Email Complaint</label>
            <textarea className="input" value={form.EmailBody} onChange={(e) => set('EmailBody', e.target.value)} placeholder="Paste the inbound complaint email here…" />
          </div>
          {err && <div className="banner-error">{err}</div>}
        </div>
        <div className="mfoot">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving || !valid}>
            {saving ? 'Saving…' : 'Create complaint'}
          </button>
        </div>
      </div>
    </div>
  );
}
