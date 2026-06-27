// JSON -> HTML renderers for the GDP case documents.
// Pattern: JSON = source of truth (the case carries it), HTML = human view.
// Matches the style of document_templates/sample_dossier_render.html.
'use strict';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const CSS = `
  body{font-family:Georgia,serif;max-width:760px;margin:40px auto;color:#1a1f2e;line-height:1.55;padding:0 20px}
  h1{font-size:1.5rem;border-bottom:2px solid #1a1f2e;padding-bottom:6px}
  .meta{font-family:monospace;font-size:.8rem;color:#555}
  table{width:100%;border-collapse:collapse;margin:14px 0}
  td,th{border:1px solid #d8d2c2;padding:7px 10px;text-align:left;font-size:.92rem}
  th{background:#f4f1ea;font-family:monospace;font-size:.72rem;text-transform:uppercase}
  .pass{color:#047857;font-weight:700}.fail{color:#b91c1c;font-weight:700}.unk{color:#b45309;font-weight:700}
  .rec{background:#fef2f2;border-left:4px solid #b91c1c;padding:12px 16px;margin:16px 0;border-radius:6px}
  .rec.ok{background:#f0fdf4;border-left-color:#047857}
  .status-POSTED{color:#047857;font-weight:700}.status-DRAFT{color:#b45309;font-weight:700}.status-REVERSED{color:#b91c1c;font-weight:700}
  .note{font-size:.82rem;color:#777;font-style:italic;margin-top:30px;border-top:1px solid #d8d2c2;padding-top:10px}
`;

const page = (title, body) =>
`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${esc(title)}</title><style>${CSS}</style></head>
<body>
${body}
</body>
</html>
`;

const STATUS_CLASS = { TRUE: 'pass', FALSE: 'fail', UNKNOWN: 'unk' };
const CRITERIA_LABELS = {
  packaging_intact: 'Packaging unopened & undamaged',
  storage_proven: 'Storage conditions proven throughout',
  shelf_life_ok: 'Acceptable remaining shelf life',
  not_prior_return_recall: 'Not prior return / recall / falsified',
  within_time_window: 'Within return time window',
};

function renderDossier(d) {
  const window = d.customer.type === 'wholesaler' ? '10-day window' : '5-day window';
  const cold = d.product.cold_chain === 'Y' ? 'cold-chain' : 'non-cold-chain';
  const crit = Object.entries(CRITERIA_LABELS).map(([k, label]) => {
    const v = d.gdp_6_3_criteria[k];
    return v == null ? '' : `    <tr><td>${esc(label)}</td><td class="${STATUS_CLASS[String(v).toUpperCase()] || ''}">${esc(v)}</td></tr>`;
  }).filter(Boolean).join('\n');
  const destroy = d.recommended_disposition === 'DESTROY';
  const linked = d.linked_case ? `<tr><th>Linked case</th><td>${esc(d.linked_case)}</td></tr>` : '';
  const body =
`  <h1>Complaint Dossier — ${esc(d.case_id)}</h1>
  <p class="meta">Family ${esc(d.family)} · generated ${esc(d.generated_at)}</p>

  <table>
    <tr><th>Customer</th><td>${esc(d.customer.name)} (${esc(d.customer.code)}) · ${esc(d.customer.type)} · ${esc(window)}</td></tr>
    <tr><th>Order</th><td>${esc(d.order.order_no)} · dispatch ${esc(d.order.dispatch_ref)} · ${esc(d.order.dispatch_date)}</td></tr>
    <tr><th>Product</th><td>${esc(d.product.name)} (${esc(d.product.code)}) · batch ${esc(d.product.batch_no)} · ${esc(cold)}</td></tr>
    <tr><th>Qty affected</th><td>${esc(d.quantity_affected)} units</td></tr>
    <tr><th>Complaint</th><td>${esc(d.complaint_summary)}</td></tr>
    <tr><th>Root cause</th><td>${esc(d.root_cause)}</td></tr>
    ${linked}
  </table>

  <h3>GDP 6.3 criteria</h3>
  <table>
    <tr><th>Criterion</th><th>Status</th></tr>
${crit}
  </table>

  <div class="rec${destroy ? '' : ' ok'}">
    <strong>Recommended disposition: ${esc(d.recommended_disposition)}</strong><br>
    ${esc(d.recommendation_rationale)}
  </div>

  <p class="note">Rendered from <code>dossier_template.json</code>. The agent writes the JSON; a Process App renders this for the QA Analyst (Gate 2) and Responsible Person (Gate 3). JSON = source of truth, HTML = human view.</p>`;
  return page(`Complaint Dossier — ${d.case_id}`, body);
}

function renderCreditDebitNote(n) {
  const rows = n.lines.map((l) =>
    `    <tr><td>${esc(l.product_code)}</td><td>${esc(l.batch_no)}</td><td>${esc(l.qty)}</td><td>${esc(l.unit_price)}</td><td>${esc(l.amount)}</td></tr>`).join('\n');
  const reversal = n.reversal_of ? `<tr><th>Reversal of</th><td>${esc(n.reversal_of)}</td></tr>` : '';
  const body =
`  <h1>${esc(n.note_type)} Note — ${esc(n.note_no)}</h1>
  <p class="meta">Case ${esc(n.case_id)} · ${esc(n.date)} · status <span class="status-${esc(n.status)}">${esc(n.status)}</span></p>
  <table>
    <tr><th>Customer</th><td>${esc(n.customer_code)}</td></tr>
    <tr><th>Reason</th><td>${esc(n.reason)}</td></tr>
    ${reversal}
    <tr><th>ERP posting ref</th><td>${esc(n.erp_posting_ref || '—')}</td></tr>
  </table>
  <table>
    <tr><th>Product</th><th>Batch</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr>
${rows}
    <tr><td colspan="4" style="text-align:right"><strong>Total</strong></td><td><strong>${esc(n.total)}</strong></td></tr>
  </table>
  <p class="note">Rendered from <code>credit_debit_note_template.json</code>. status DRAFT→POSTED→REVERSED supports the Saga override (CMP-1008).</p>`;
  return page(`${n.note_type} Note — ${n.note_no}`, body);
}

function renderCertificate(c) {
  const body =
`  <h1>Certificate of Destruction — ${esc(c.cod_no)}</h1>
  <p class="meta">Case ${esc(c.case_id)} · ${esc(c.date)}</p>
  <table>
    <tr><th>Product</th><td>${esc(c.product_name)} (${esc(c.product_code)}) · batch ${esc(c.batch_no)}</td></tr>
    <tr><th>Quantity destroyed</th><td>${esc(c.quantity_destroyed)} units</td></tr>
    <tr><th>Method</th><td>${esc(c.method)}</td></tr>
    <tr><th>Reason</th><td>${esc(c.reason)}</td></tr>
    <tr><th>Witnessed by</th><td>${esc(c.witnessed_by)}</td></tr>
    <tr><th>Authorized by (RP)</th><td>${esc(c.authorized_by_rp)} · e-sign ${esc(c.rp_signature_ref)}</td></tr>
  </table>
  <p class="note">Rendered from <code>certificate_of_destruction_template.json</code>. Destruction is the one irreversible act and always follows RP authorization (Gate 3).</p>`;
  return page(`Certificate of Destruction — ${c.cod_no}`, body);
}

module.exports = { renderDossier, renderCreditDebitNote, renderCertificate, esc };
// -- end of example
