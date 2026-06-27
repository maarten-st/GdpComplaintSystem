// Deterministic email-intake parser for the GDP complaint case.
// A verifiable fallback / oracle for the LLM ComplaintIntakeAgent — extracts the
// structured complaint record from a raw inbound complaint email.
'use strict';
const { classifyFamily } = require('../decision-logic/decisions');

const PRODUCT_NAMES = [
  'Amoxicillin', 'Insulin', 'Paracetamol', 'Influenza Vaccine', 'Vaccine',
  'Atorvastatin', 'Adalimumab', 'Salbutamol', 'Enoxaparin', 'Omeprazole', 'Metformin',
];

function header(text, name) {
  const m = text.match(new RegExp('^' + name + ':\\s*(.+)$', 'im'));
  return m ? m[1].trim() : null;
}
function first(re, text) { const m = text.match(re); return m ? m[1] : null; }

function parseComplaintEmail(raw) {
  const text = String(raw || '');
  const from = header(text, 'From');
  const subject = header(text, 'Subject');
  const date = header(text, 'Date');
  // strip headers for body-only scanning
  const body = text.replace(/^(From|To|Subject|Date):.*$/gim, '').trim();
  const hay = `${subject || ''}\n${body}`;

  const orderNo = first(/\b(SO-\d{4})\b/i, hay);
  const dispatchRef = first(/\b(DISP-\d{4})\b/i, hay);
  const batchNo = first(/\b(P\d{3}-B\d{2})\b/i, hay);
  const productName = PRODUCT_NAMES.find((p) => new RegExp(p, 'i').test(hay)) || null;
  const family = classifyFamily(hay);

  // quantity: family C -> |ordered - received|; otherwise the "<n> units" figure.
  let qtyAffected = null;
  if (family === 'C') {
    const ordered = Number(first(/ordered\s+(\d+)|(\d+)\s+ordered/i, hay) || first(/against\s+(\d+)\s+ordered/i, hay));
    // received can appear as "received 80" or "80 received"
    const recM = hay.match(/received\s+(\d+)|(\d+)\s+received/i);
    const received = recM ? Number(recM[1] || recM[2]) : NaN;
    const ordM = hay.match(/ordered\s+(\d+)|(\d+)\s+ordered/i);
    const ord = ordM ? Number(ordM[1] || ordM[2]) : NaN;
    if (Number.isFinite(ord) && Number.isFinite(received)) qtyAffected = Math.abs(ord - received);
    else qtyAffected = Number(first(/surplus of\s+(\d+)|short\s+(\d+)|(\d+)\s+units? short/i, hay)) || null;
  } else {
    const m = hay.match(/(\d+)\s+units?/i);
    qtyAffected = m ? Number(m[1]) : null;
  }
  if (Number.isNaN(qtyAffected)) qtyAffected = null;

  const missingInformation = [];
  if (!orderNo) missingInformation.push('order reference');
  if (!batchNo) missingInformation.push('batch number');
  if (qtyAffected == null) missingInformation.push('affected quantity');
  if (!productName) missingInformation.push('product');

  // confidence: share of the four core fields successfully extracted
  const core = [orderNo, batchNo, qtyAffected, productName];
  const confidence = Math.round((core.filter((v) => v != null).length / core.length) * 100) / 100;

  return {
    from, subject, date,
    orderNo, dispatchRef, batchNo, productName, qtyAffected, family,
    confidence, missingInformation,
    complete: missingInformation.filter((m) => m !== 'product').length === 0, // order+batch+qty present
  };
}

module.exports = { parseComplaintEmail, PRODUCT_NAMES };
// -- end of example
