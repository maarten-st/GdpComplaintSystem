// Tests the email parser against the 9 inbound complaint samples.
// Run: node "intake-parser/run-tests.js"
'use strict';
const fs = require('fs');
const path = require('path');
const { parseComplaintEmail } = require('./parse-email');

const EMAILS = path.join(__dirname, '..', '02. Mock Data', 'gdp_mockdata', 'email_templates');

// Expected extraction per case (batch/qty only where the email actually states them).
const ORACLE = {
  'CMP-1001': { family: 'A', orderNo: 'SO-4001', batchNo: 'P001-B01', qty: 40 },
  'CMP-1002': { family: 'B', orderNo: 'SO-4012', dispatchRef: 'DISP-9012', batchNo: null, qty: null },
  'CMP-1003': { family: 'B', orderNo: 'SO-4004', batchNo: 'P004-B01', qty: 50 },
  'CMP-1004': { family: 'B', orderNo: 'SO-4020', batchNo: 'P002-B02', qty: null },
  'CMP-1005': { family: 'C', orderNo: 'SO-4031', batchNo: null, qty: 20 },
  'CMP-1006': { family: 'C', orderNo: 'SO-4031', dispatchRef: 'DISP-9031', batchNo: 'P003-B01', qty: 20 },
  'CMP-1007': { family: 'C', orderNo: 'SO-4032', dispatchRef: 'DISP-9031', batchNo: null, qty: 20 },
  'CMP-1008': { family: 'A', orderNo: 'SO-4040', batchNo: 'P005-B01', qty: 40 },
  'CMP-1009': { family: 'A', orderNo: null, batchNo: null, qty: null, incomplete: true },
};

let pass = 0, fail = 0;
function check(id, label, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${id}  ${label}: ${JSON.stringify(got)}${ok ? '' : ` (expected ${JSON.stringify(want)})`}`);
  ok ? pass++ : fail++;
}

for (const [id, o] of Object.entries(ORACLE)) {
  const raw = fs.readFileSync(path.join(EMAILS, `INBOUND_complaint_${id}.txt`), 'utf8');
  const r = parseComplaintEmail(raw);
  console.log(`${id}`);
  check(id, 'family', r.family, o.family);
  check(id, 'orderNo', r.orderNo, o.orderNo);
  check(id, 'batchNo', r.batchNo, o.batchNo);
  check(id, 'qtyAffected', r.qtyAffected, o.qty);
  if (o.dispatchRef) check(id, 'dispatchRef', r.dispatchRef, o.dispatchRef);
  if (o.incomplete) check(id, 'complete', r.complete, false);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
// -- end of example
