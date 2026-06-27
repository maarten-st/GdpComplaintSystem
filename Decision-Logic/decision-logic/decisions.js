// GDP Complaint Management — deterministic decision functions.
// Platform-independent + unit-tested against the 9 seed cases (see run-tests.js).
// These are the "brains" the Maestro Case `process` tasks run; port to UiPath DMN later.
// Domain: EU GDP 2013/C 343/01 Ch.6.

'use strict';

// ---------------------------------------------------------------------------
// 1. GDP 6.3 disposition gate
// Returned goods may go BACK_TO_STOCK only if ALL five criteria are TRUE.
// UNKNOWN is treated as FALSE (cannot prove safety -> destroy). Deliberate.
// ---------------------------------------------------------------------------
const GDP_6_3_KEYS = [
  'packaging_intact',
  'storage_proven',
  'shelf_life_ok',
  'not_prior_return_recall',
  'within_time_window',
];

function gdp63Gate(criteria) {
  // criteria: { <key>: "TRUE" | "FALSE" | "UNKNOWN" }
  const allTrue = GDP_6_3_KEYS.every((k) => String(criteria[k]).toUpperCase() === 'TRUE');
  return allTrue ? 'BACK_TO_STOCK' : 'DESTROY'; // UNKNOWN/FALSE => DESTROY
}

// ---------------------------------------------------------------------------
// 2. Family classifier — A Quality / B Cold-chain / C Logistics.
// Keyword precedence: cold-chain (B) > quality (A) > logistics (C, default).
// ---------------------------------------------------------------------------
function classifyFamily(text) {
  const t = String(text || '').toLowerCase();
  const B = /(cold[- ]?chain|temperature|excursion|fridge|warm|alarm|logger|frozen|vaccine)/;
  const A = /(damag|crush|split|broke|contaminat|defect|mislabel|substandard|tamper)/;
  const C = /(short|surplus|wrong|missing|quantity|received|ordered|units|qty|dispatch|delivery|pick)/;
  if (B.test(t)) return 'B';
  if (A.test(t)) return 'A';
  if (C.test(t)) return 'C';
  return 'C';
}

// ---------------------------------------------------------------------------
// 3. Policy router — matches the disposition_policies.json table top-to-bottom,
// first match wins, '*' = wildcard. Outputs PATH_A_ALWAYS_DESTROY /
// PATH_B_CASE_BY_CASE / COMMERCIAL_LANE.
// ---------------------------------------------------------------------------
function routePolicy(input, policies) {
  // input: { product_code, family, sub_condition }
  for (const p of policies) {
    const productOk = p.product_code === '*' || p.product_code === input.product_code;
    const familyOk = p.family === '*' || p.family === input.family;
    const subOk = p.sub_condition === 'default' || p.sub_condition === input.sub_condition;
    if (productOk && familyOk && subOk) return p.path;
  }
  return 'PATH_B_CASE_BY_CASE'; // safety default
}

// Derive the policy sub_condition from case facts so the router can be driven
// straight from intake/investigation output.
function deriveSubCondition(family, facts = {}) {
  if (family === 'A') return 'contamination_or_damage';
  if (family === 'B') {
    // within budget only when we positively proved storage AND stayed within budget
    return facts.excursionWithinBudget ? 'excursion_within_budget' : 'any_excursion';
  }
  // family C
  return facts.goodsReturned ? 'goods_returned' : 'quantity_or_human_error_no_return';
}

// ---------------------------------------------------------------------------
// 4. Finance direction — CREDIT / DEBIT / NONE / NET_ZERO.
// ---------------------------------------------------------------------------
function financeDirection(scenario) {
  // Per-CASE (per-customer) direction. scenario:
  // { family, disposition, qtyOrdered, qtyShipped, customerKeepsSurplus }
  const { family, disposition, qtyOrdered, qtyShipped, customerKeepsSurplus } = scenario;

  // Quality / cold-chain destruction -> full credit for the affected goods.
  if (disposition === 'DESTROY') return 'CREDIT';

  // Back-to-stock with no physical return -> no financial correction.
  if (disposition === 'BACK_TO_STOCK') return 'NONE';

  // Logistics quantity discrepancies.
  if (family === 'C' && Number.isFinite(qtyOrdered) && Number.isFinite(qtyShipped)) {
    if (qtyShipped < qtyOrdered) return 'CREDIT'; // short delivery -> credit the shortfall
    if (qtyShipped > qtyOrdered) return customerKeepsSurplus ? 'DEBIT' : 'NONE'; // surplus kept -> debit
    return 'NONE';
  }

  return 'NONE';
}

// Company-level reconciliation across a correlated mis-split pair: the two
// per-customer corrections offset on the same dispatch -> NET_ZERO to the company.
function pairNetsToZero(a, b) {
  // a, b: { dispatchRef, deltaUnits } where deltaUnits = qtyShipped - qtyOrdered (signed)
  return a.dispatchRef === b.dispatchRef && a.deltaUnits + b.deltaUnits === 0;
}

module.exports = {
  GDP_6_3_KEYS,
  gdp63Gate,
  classifyFamily,
  routePolicy,
  deriveSubCondition,
  financeDirection,
  pairNetsToZero,
};
// -- end of example
