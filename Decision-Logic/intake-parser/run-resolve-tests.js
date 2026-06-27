// Tests the master-data entity resolver against the 9 inbound emails + seed cases.
// Run: node "intake-parser/run-resolve-tests.js"
'use strict';
const fs = require('fs');
const path = require('path');
const { parseComplaintEmail } = require('./parse-email');
const { resolveComplaint } = require('./resolve-entities');

const ROOT = path.join(__dirname, '..', '02. Mock Data', 'gdp_mockdata');
const EMAILS = path.join(ROOT, 'email_templates');
const seeds = JSON.parse(fs.readFileSync(path.join(ROOT, 'cases', 'seed_cases.json'), 'utf8')).cases;
const seedById = Object.fromEntries(seeds.map((c) => [c.case_id, c]));

// Cases whose email actually contains the batch number (others can't resolve a batch).
const EMAIL_HAS_BATCH = new Set(['CMP-1001', 'CMP-1003', 'CMP-1004', 'CMP-1006', 'CMP-1008']);
// CMP-1009 is the deliberately vague email — no product stated.
const NO_PRODUCT = new Set(['CMP-1009']);

let pass = 0, fail = 0;
function check(id, label, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${id}  ${label}: ${JSON.stringify(got)}${ok ? '' : ` (expected ${JSON.stringify(want)})`}`);
  ok ? pass++ : fail++;
}

for (const id of Object.keys(seedById)) {
  const seed = seedById[id];
  const raw = fs.readFileSync(path.join(EMAILS, `INBOUND_complaint_${id}.txt`), 'utf8');
  const parsed = parseComplaintEmail(raw);
  const res = resolveComplaint(parsed, raw);
  console.log(`${id}`);
  check(id, 'customerCode', res.customerCode, seed.customer_code);
  check(id, 'productCode', res.productCode, NO_PRODUCT.has(id) ? null : seed.product_code);
  if (EMAIL_HAS_BATCH.has(id)) {
    check(id, 'batchNo', res.batchNo, seed.batch_no);
    check(id, 'batchValid', res.batchValid, true);
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
// -- end of example
