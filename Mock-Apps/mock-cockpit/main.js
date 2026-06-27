// Mock Case Management cockpit — Electron main process.
// Reads seed cases + master data, builds dossiers (reusing the document renderer
// and decision logic), serves the 5 HITL gate approvals, and persists gate
// decisions (the audit trail) to cockpit-state.json.
'use strict';
const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const R = require('../documents/render');
const D = require('../decision-logic/decisions');

const MOCK = path.join(__dirname, '..', '02. Mock Data', 'gdp_mockdata');
const STATE = path.join(__dirname, 'cockpit-state.json'); // gate decisions / audit trail

function csv(file) {
  const lines = fs.readFileSync(path.join(MOCK, 'master_data', file), 'utf8').trim().split(/\r?\n/);
  const head = lines[0].split(',');
  return lines.slice(1).map((l) => { const c = l.split(','); return Object.fromEntries(head.map((h, i) => [h, c[i]])); });
}
const by = (rows, k) => Object.fromEntries(rows.map((r) => [r[k], r]));
const readJson = (p, f) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return f; } };
const writeJson = (p, v) => fs.writeFileSync(p, JSON.stringify(v, null, 2));

const customers = by(csv('customers.csv'), 'customer_code');
const products = by(csv('products.csv'), 'product_code');
const orders = by(csv('orders.csv'), 'order_no');
const policies = readJson(path.join(MOCK, 'policies', 'disposition_policies.json'), { policies: [] }).policies;
const seeds = readJson(path.join(MOCK, 'cases', 'seed_cases.json'), { cases: [] }).cases;
const seedById = by(seeds, 'case_id');

const GATES = [
  { id: 'G1', name: 'Gate 1 · Triage', persona: 'Customer Service', options: ['Confirm', 'Reject'] },
  { id: 'G2', name: 'Gate 2 · Evidence', persona: 'QA Analyst', options: ['Evidence complete', 'Send back'] },
  { id: 'G3', name: 'Gate 3 · Disposition', persona: 'Responsible Person', options: ['Back to stock', 'Destroy', 'No return'] },
  { id: 'G4', name: 'Gate 4 · Follow-up', persona: 'Logistics', options: ['Approve', 'Revise'] },
  { id: 'G5', name: 'Gate 5 · Finance', persona: 'Finance', options: ['Approve', 'Reject'] },
];

function buildDossier(caseId) {
  const c = seedById[caseId];
  const cust = customers[c.customer_code] || {};
  const prod = products[c.product_code] || {};
  const ord = orders[c.order_no] || {};
  const disposition = c.criteria_6_3 ? D.gdp63Gate(c.criteria_6_3) : 'NO_DISPOSITION';
  const sub = D.deriveSubCondition(c.family, { excursionWithinBudget: caseId === 'CMP-1002', goodsReturned: false });
  const path_ = D.routePolicy({ product_code: c.product_code, family: c.family, sub_condition: sub }, policies);
  const rationale = disposition === 'DESTROY'
    ? `One or more 6.3 criteria FALSE/UNKNOWN — gate fails (UNKNOWN treated as FALSE). Policy: ${path_}.`
    : disposition === 'BACK_TO_STOCK'
      ? `All five 6.3 criteria TRUE — eligible for saleable stock (FEFO). Policy: ${path_}.`
      : `Family ${c.family} — no product disposition; commercial resolution. Policy: ${path_}.`;
  return {
    case_id: caseId, generated_at: '2026-06-04', family: c.family,
    customer: { code: c.customer_code, name: cust.name, type: cust.type },
    order: { order_no: c.order_no, dispatch_ref: ord.dispatch_ref, dispatch_date: ord.dispatch_date },
    product: { code: c.product_code, name: prod.name, batch_no: c.batch_no, cold_chain: prod.cold_chain },
    complaint_summary: c.complaint_summary, quantity_affected: c.qty_affected,
    gdp_6_3_criteria: c.criteria_6_3 || {}, root_cause: c.root_cause,
    recommended_disposition: disposition, recommendation_rationale: rationale,
    linked_case: c.linked_case || null,
  };
}

function caseStatus(caseId) {
  const state = readJson(STATE, {});
  const d = (state[caseId] && state[caseId].decisions) || {};
  if (d.G5) return 'Closed';
  if (d.G3) return 'In disposition';
  if (d.G1) return 'Investigating';
  return 'New';
}

ipcMain.handle('cockpit:getCases', () => seeds.map((c) => ({
  case_id: c.case_id, customer: (customers[c.customer_code] || {}).name || c.customer_code,
  family: c.family, demo_path: c.demo_path, status: caseStatus(c.case_id),
})));

ipcMain.handle('cockpit:getCaseDetail', (_e, id) => {
  const dossier = buildDossier(id);
  const state = readJson(STATE, {});
  return {
    dossierHtml: R.renderDossier(dossier),
    dossier,
    gates: GATES,
    decisions: (state[id] && state[id].decisions) || {},
    audit: (state[id] && state[id].audit) || [],
  };
});

ipcMain.handle('cockpit:recordGate', (_e, caseId, gateId, decision) => {
  const gate = GATES.find((g) => g.id === gateId);
  const state = readJson(STATE, {});
  state[caseId] = state[caseId] || { decisions: {}, audit: [] };
  state[caseId].decisions[gateId] = decision;
  state[caseId].audit.push({ gate: gateId, persona: gate ? gate.persona : '', decision, at: new Date().toISOString() });
  writeJson(STATE, state);
  return state[caseId];
});

ipcMain.handle('cockpit:getMetrics', () => {
  const m = { byFamily: {}, byDisposition: {}, byRootCause: {} };
  for (const c of seeds) {
    m.byFamily[c.family] = (m.byFamily[c.family] || 0) + 1;
    const disp = c.expected_disposition || 'N/A';
    m.byDisposition[disp] = (m.byDisposition[disp] || 0) + 1;
    const rc = c.root_cause || 'unknown';
    m.byRootCause[rc] = (m.byRootCause[rc] || 0) + 1;
  }
  return m;
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1180, height: 800, title: 'GDP Case Cockpit',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}
app.whenReady().then(() => { createWindow(); app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); }); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
