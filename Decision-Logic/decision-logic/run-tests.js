// Unit tests for the GDP decision functions, asserted against the 9 seed cases.
// Run: node "decision-logic/run-tests.js"
'use strict';
const fs = require('fs');
const path = require('path');
const D = require('./decisions');

const ROOT = path.join(__dirname, '..', '02. Mock Data', 'gdp_mockdata');
const seeds = JSON.parse(fs.readFileSync(path.join(ROOT, 'cases', 'seed_cases.json'), 'utf8')).cases;
const policies = JSON.parse(fs.readFileSync(path.join(ROOT, 'policies', 'disposition_policies.json'), 'utf8')).policies;

// Per-case oracles (facts not present in seed_cases.json: excursion-within-budget,
// surplus-kept, goods-returned). Disposition/finance/path mirror expected_* fields.
const ORACLE = {
  'CMP-1001': { family: 'A', policy: 'PATH_A_ALWAYS_DESTROY', disposition: 'DESTROY',       finance: 'CREDIT', facts: {} },
  'CMP-1002': { family: 'B', policy: 'PATH_B_CASE_BY_CASE',   disposition: 'BACK_TO_STOCK', finance: 'NONE',   facts: { excursionWithinBudget: true } },
  'CMP-1003': { family: 'B', policy: 'PATH_A_ALWAYS_DESTROY', disposition: 'DESTROY',       finance: 'CREDIT', facts: { excursionWithinBudget: false } },
  'CMP-1004': { family: 'B', policy: 'PATH_A_ALWAYS_DESTROY', disposition: 'DESTROY',       finance: 'CREDIT', facts: { excursionWithinBudget: false } },
  'CMP-1005': { family: 'C', policy: 'COMMERCIAL_LANE',       disposition: null,            finance: 'CREDIT', facts: { goodsReturned: false } },
  'CMP-1006': { family: 'C', policy: 'COMMERCIAL_LANE',       disposition: null,            finance: 'CREDIT', facts: { goodsReturned: false } },
  'CMP-1007': { family: 'C', policy: 'COMMERCIAL_LANE',       disposition: null,            finance: 'DEBIT',  facts: { goodsReturned: false }, customerKeepsSurplus: true },
  'CMP-1008': { family: 'A', policy: 'PATH_A_ALWAYS_DESTROY', disposition: 'BACK_TO_STOCK', finance: 'NONE',   facts: {} }, // post-override re-evaluation
  'CMP-1009': { family: 'A', policy: 'PATH_A_ALWAYS_DESTROY', disposition: null,            finance: null,     facts: {}, incomplete: true },
};

let pass = 0, fail = 0;
function check(id, label, got, want) {
  const ok = got === want;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${id}  ${label}: ${JSON.stringify(got)}${ok ? '' : ` (expected ${JSON.stringify(want)})`}`);
  ok ? pass++ : fail++;
}

for (const c of seeds) {
  const o = ORACLE[c.case_id];
  if (!o) { console.log(`  ??    ${c.case_id}  no oracle`); continue; }
  console.log(`${c.case_id} — ${c.title}`);

  // 1. Family classifier (from the free-text complaint summary)
  check(c.case_id, 'classifyFamily', D.classifyFamily(c.complaint_summary), o.family);

  // 2. GDP 6.3 gate (only cases that carry scored criteria)
  if (c.criteria_6_3 && o.disposition) {
    check(c.case_id, 'gdp63Gate', D.gdp63Gate(c.criteria_6_3), o.disposition);
  }

  // 3. Policy router
  const sub = D.deriveSubCondition(o.family, o.facts);
  check(c.case_id, 'routePolicy', D.routePolicy({ product_code: c.product_code, family: o.family, sub_condition: sub }, policies), o.policy);

  // 4. Finance direction
  if (!o.incomplete) {
    const dir = D.financeDirection({
      family: o.family,
      disposition: o.disposition,
      qtyOrdered: c.qty_ordered,
      qtyShipped: c.qty_shipped,
      customerKeepsSurplus: o.customerKeepsSurplus,
    });
    check(c.case_id, 'financeDirection', dir, o.finance);
  }
}

// 5. Correlated pair nets to zero at company level (CMP-1006 short -20 / CMP-1007 surplus +20, shared DISP-9031)
console.log('CMP-1006 + CMP-1007 — correlation pair');
check('PAIR', 'pairNetsToZero', D.pairNetsToZero({ dispatchRef: 'DISP-9031', deltaUnits: -20 }, { dispatchRef: 'DISP-9031', deltaUnits: 20 }), true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
// -- end of example
