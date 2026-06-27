// Build case documents (dossier / credit note / certificate) from the seed cases
// + master data + decision functions, and render them to HTML in documents/out/.
// Run: node "documents/generate.js"
'use strict';
const fs = require('fs');
const path = require('path');
const R = require('./render');
const D = require('../decision-logic/decisions');

const MOCK = path.join(__dirname, '..', '02. Mock Data', 'gdp_mockdata');
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });

function csv(file) {
  const lines = fs.readFileSync(path.join(MOCK, 'master_data', file), 'utf8').trim().split(/\r?\n/);
  const head = lines[0].split(',');
  return lines.slice(1).map((l) => {
    const cells = l.split(',');
    return Object.fromEntries(head.map((h, i) => [h, cells[i]]));
  });
}
const by = (rows, key) => Object.fromEntries(rows.map((r) => [r[key], r]));

const customers = by(csv('customers.csv'), 'customer_code');
const products = by(csv('products.csv'), 'product_code');
const orders = by(csv('orders.csv'), 'order_no');
const seeds = JSON.parse(fs.readFileSync(path.join(MOCK, 'cases', 'seed_cases.json'), 'utf8')).cases;
const seedById = by(seeds, 'case_id');

function buildDossier(caseId, generatedAt) {
  const c = seedById[caseId];
  const cust = customers[c.customer_code] || {};
  const prod = products[c.product_code] || {};
  const ord = orders[c.order_no] || {};
  const disposition = c.criteria_6_3 ? D.gdp63Gate(c.criteria_6_3) : 'NO_DISPOSITION';
  const sub = D.deriveSubCondition(c.family, {
    excursionWithinBudget: caseId === 'CMP-1002',
    goodsReturned: false,
  });
  const policies = JSON.parse(fs.readFileSync(path.join(MOCK, 'policies', 'disposition_policies.json'), 'utf8')).policies;
  const path_ = D.routePolicy({ product_code: c.product_code, family: c.family, sub_condition: sub }, policies);
  const rationale = disposition === 'DESTROY'
    ? `One or more 6.3 criteria are FALSE or UNKNOWN — the gate fails (UNKNOWN is treated as FALSE). Policy match: ${path_}. Finance: full credit, ${c.qty_affected} units.`
    : `All five 6.3 criteria are TRUE — eligible to return to saleable stock (FEFO). Policy match: ${path_}. Finance: none (no return).`;
  return {
    case_id: caseId,
    generated_at: generatedAt,
    family: c.family,
    customer: { code: c.customer_code, name: cust.name, type: cust.type },
    order: { order_no: c.order_no, dispatch_ref: ord.dispatch_ref, dispatch_date: ord.dispatch_date },
    product: { code: c.product_code, name: prod.name, batch_no: c.batch_no, cold_chain: prod.cold_chain },
    complaint_summary: c.complaint_summary,
    quantity_affected: c.qty_affected,
    gdp_6_3_criteria: c.criteria_6_3 || {},
    root_cause: c.root_cause,
    recommended_disposition: disposition,
    recommendation_rationale: rationale,
    linked_case: c.linked_case || null,
  };
}

const STAMP = '2026-06-04T13:30Z'; // generation timestamp (passed in — Date.now() avoided)
const written = [];
function write(name, html) { const p = path.join(OUT, name); fs.writeFileSync(p, html); written.push(name); }

// Dossiers — one DESTROY, one BACK_TO_STOCK
write('dossier_CMP-1001.html', R.renderDossier(buildDossier('CMP-1001', STAMP)));
write('dossier_CMP-1002.html', R.renderDossier(buildDossier('CMP-1002', STAMP)));

// Credit note for the CMP-1001 destruction (full credit, 40 units)
write('credit_note_CMP-1001.html', R.renderCreditDebitNote({
  note_type: 'CREDIT', note_no: 'CN-1001', case_id: 'CMP-1001', customer_code: 'C001', date: '2026-06-04',
  lines: [{ product_code: 'P001', batch_no: 'P001-B01', qty: 40, unit_price: '12.50', amount: '500.00' }],
  total: '500.00', reason: 'Full credit — goods destroyed (transit damage, 6.3 gate failed).',
  status: 'POSTED', reversal_of: null, erp_posting_ref: 'ERP-CN-1001',
}));

// Certificate of destruction for CMP-1001
write('certificate_of_destruction_CMP-1001.html', R.renderCertificate({
  cod_no: 'COD-1001', case_id: 'CMP-1001', date: '2026-06-04',
  product_code: 'P001', product_name: products['P001'].name, batch_no: 'P001-B01',
  quantity_destroyed: 40, method: 'Incineration (licensed waste contractor)',
  witnessed_by: 'Warehouse Supervisor', authorized_by_rp: 'Responsible Person',
  rp_signature_ref: 'ESIGN-RP-1001', reason: 'Packaging integrity FALSE; storage history UNKNOWN — destroy per GDP 6.3.',
}));

console.log('Rendered ' + written.length + ' document(s) to documents/out/:');
written.forEach((n) => console.log('  - ' + n));
// -- end of example
