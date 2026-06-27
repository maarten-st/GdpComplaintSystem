// Master-data entity resolver: turns the intake agent's free-text customer /
// product / batch into real gdp_mockdata codes. This is the deterministic layer
// the LLM agent cannot do reliably (exact code lookup + validation against data).
'use strict';
const fs = require('fs');
const path = require('path');

const MASTER = path.join(__dirname, '..', '02. Mock Data', 'gdp_mockdata', 'master_data');
function csv(file) {
  const lines = fs.readFileSync(path.join(MASTER, file), 'utf8').trim().split(/\r?\n/);
  const head = lines[0].split(',');
  return lines.slice(1).map((l) => { const c = l.split(','); return Object.fromEntries(head.map((h, i) => [h, c[i]])); });
}

const customers = csv('customers.csv');
const products = csv('products.csv');
const batches = csv('batches.csv');

// First significant token of a name, lowercased (e.g. "Acme Pharmacy" -> "acme",
// "Influenza Vaccine 2026" -> "influenza", "Amoxicillin 500mg Caps" -> "amoxicillin").
const firstToken = (name) => String(name).toLowerCase().split(/\s+/)[0];

function resolveCustomer(haystack) {
  const h = String(haystack || '').toLowerCase();
  // match on the distinctive first token of the customer's name (also present in the email domain)
  const hit = customers.find((c) => h.includes(firstToken(c.name)));
  return hit ? hit.customer_code : null;
}

function resolveProduct(haystack) {
  const h = String(haystack || '').toLowerCase();
  const hit = products.find((p) => h.includes(firstToken(p.name)));
  return hit ? hit.product_code : null;
}

// Validate a batch number against the master batch list and (optionally) a product.
function validateBatch(batchNo, productCode) {
  if (!batchNo) return { valid: false, reason: 'no batch number' };
  const b = batches.find((x) => x.batch_no === batchNo);
  if (!b) return { valid: false, reason: 'batch not found in master data' };
  if (productCode && b.product_code !== productCode) {
    return { valid: false, reason: `batch belongs to ${b.product_code}, not ${productCode}` };
  }
  return { valid: true, product_code: b.product_code, status: b.status, expiry_date: b.expiry_date };
}

// Resolve a parsed-email record (from intake-parser) into coded fields.
function resolveComplaint(parsed, rawText) {
  const hay = `${rawText || ''} ${parsed.from || ''} ${parsed.subject || ''}`;
  const customerCode = resolveCustomer(hay);
  const productCode = resolveProduct(`${hay} ${parsed.productName || ''}`);
  const batch = validateBatch(parsed.batchNo, productCode);
  return {
    customerCode,
    productCode,
    batchNo: parsed.batchNo,
    batchValid: batch.valid,
    batchInfo: batch,
    unresolved: [
      !customerCode && 'customerCode',
      !productCode && 'productCode',
      parsed.batchNo && !batch.valid && 'batchNo',
    ].filter(Boolean),
  };
}

module.exports = { resolveCustomer, resolveProduct, validateBatch, resolveComplaint };
// -- end of example
