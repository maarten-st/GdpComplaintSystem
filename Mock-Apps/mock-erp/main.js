// Mock ERP — Electron main process.
// Reads the gdp_mockdata master CSVs (read-only) and persists the robot's writes
// (batch status changes, posted notes) to local JSON so the demo state survives.
'use strict';
const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

// --- data + state locations (robust for both `npm start` and the packaged .exe) ---
// Read-only master data resolves in this order:
//   1. GDP_MOCKDATA env var (path to a gdp_mockdata dir),
//   2. the bundled ./data folder (shipped as extraResources in the packaged app),
//   3. the original sibling "../02. Mock Data/gdp_mockdata" (running inside the repo).
function resolveDataRoot() {
  const candidates = [];
  if (process.env.GDP_MOCKDATA) candidates.push(process.env.GDP_MOCKDATA);
  candidates.push(path.join(__dirname, 'data'));                  // dev + @electron/packager bundle (resources/app/data)
  candidates.push(path.join(process.resourcesPath, 'data'));      // electron-builder extraResources bundle (resources/data)
  candidates.push(path.join(__dirname, '..', '02. Mock Data', 'gdp_mockdata')); // original in-repo layout
  const found = candidates.find((d) => {
    try { return fs.existsSync(path.join(d, 'master_data')); } catch { return false; }
  });
  return found || candidates[candidates.length - 1];
}
const DATA_ROOT = resolveDataRoot();
const MASTER = path.join(DATA_ROOT, 'master_data');

// Writable runtime state must live OUTSIDE the (read-only) packaged app bundle.
// userData = %APPDATA%\GDP Mock ERP on Windows. Delete these files to reset the demo.
const STATE_DIR = app.getPath('userData');
try { fs.mkdirSync(STATE_DIR, { recursive: true }); } catch { /* already exists */ }
const OVERRIDES = path.join(STATE_DIR, 'batch-overrides.json'); // robot writes batch status here
const POSTINGS = path.join(STATE_DIR, 'postings.json');         // robot posts credit/debit notes here

console.log('[mock-erp] data root:', DATA_ROOT);
console.log('[mock-erp] state dir:', STATE_DIR);

// --- tiny CSV reader (master data has no quoted/comma-in-field cases) ---
function readCsv(file) {
  const lines = fs.readFileSync(path.join(MASTER, file), 'utf8').trim().split(/\r?\n/);
  const head = lines[0].split(',');
  return lines.slice(1).map((l) => {
    const c = l.split(',');
    return Object.fromEntries(head.map((h, i) => [h, c[i]]));
  });
}
const readJson = (p, fallback) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; } };
const writeJson = (p, v) => fs.writeFileSync(p, JSON.stringify(v, null, 2));

// --- product master (incl. unit_price) ---
const productInfo = () => Object.fromEntries(readCsv('products.csv').map((p) => [p.product_code, p]));
const round2 = (n) => Math.round(n * 100) / 100;

// --- data access ---
function getOrder(ref) {
  const q = String(ref || '').trim().toUpperCase();
  const orders = readCsv('orders.csv');
  const order = orders.find((o) => o.order_no.toUpperCase() === q || (o.dispatch_ref || '').toUpperCase() === q);
  if (!order) return null;
  const customers = readCsv('customers.csv');
  const cust = customers.find((c) => c.customer_code === order.customer_code) || {};
  const prods = productInfo();
  // Each line carries the product unit price and the line amount (unit_price * qty_shipped)
  // so a credit/debit note can read what the customer actually paid per product.
  const lines = readCsv('order_lines.csv').filter((l) => l.order_no === order.order_no)
    .map((l) => {
      const unitPrice = Number((prods[l.product_code] || {}).unit_price) || 0;
      const qtyShipped = Number(l.qty_shipped);
      return {
        product_code: l.product_code, product_name: (prods[l.product_code] || {}).name || '',
        batch_no: l.batch_no,
        qty_ordered: Number(l.qty_ordered), qty_shipped: qtyShipped,
        discrepancy: qtyShipped - Number(l.qty_ordered),
        unit_price: unitPrice, line_amount: round2(unitPrice * qtyShipped),
      };
    });
  const totalPaid = round2(lines.reduce((s, l) => s + l.line_amount, 0));
  return { ...order, customer_name: cust.name, customer_type: cust.type, lines, total_paid: totalPaid };
}

function getBatches(filter) {
  const overrides = readJson(OVERRIDES, {});
  const products = Object.fromEntries(readCsv('products.csv').map((p) => [p.product_code, p.name]));
  const f = String(filter || '').trim().toLowerCase();
  return readCsv('batches.csv')
    .map((b) => {
      const original = Number(b.quantity);
      const ov = overrides[b.batch_no];
      const destroyed = ov && Number(ov.destroyedQty) ? Number(ov.destroyedQty) : 0;
      const quarantined = ov && Number(ov.quarantinedQty) ? Number(ov.quarantinedQty) : 0;
      return {
        batch_no: b.batch_no, product_code: b.product_code, product_name: products[b.product_code] || '',
        quantity: Math.max(0, original - destroyed - quarantined), // remaining saleable units
        original_quantity: original,
        destroyed_qty: destroyed,
        quarantined_qty: quarantined,
        expiry_date: b.expiry_date,
        status: ov ? ov.status : b.status,
        overridden: !!ov,
      };
    })
    .filter((b) => !f || b.batch_no.toLowerCase().includes(f) || b.product_code.toLowerCase().includes(f) || (b.product_name || '').toLowerCase().includes(f));
}

// Apply a status to a batch. Both 'Destroyed' and 'Quarantine' consume the entered
// qty, but into SEPARATE tallies (destroyedQty vs quarantinedQty). Both reduce the
// remaining saleable quantity. Partial allowed; blank qty = all remaining.
function setBatchStatus(batchNo, status, qty) {
  const allowed = ['Available', 'Sold', 'Quarantine', 'Destroyed'];
  if (!allowed.includes(status)) throw new Error('Invalid status: ' + status);
  const batch = readCsv('batches.csv').find((b) => b.batch_no === batchNo);
  if (!batch) throw new Error('Unknown batch: ' + batchNo);
  const original = Number(batch.quantity);
  const overrides = readJson(OVERRIDES, {});
  const prev = overrides[batchNo] || {};
  let destroyedQty = Number(prev.destroyedQty) || 0;
  let quarantinedQty = Number(prev.quarantinedQty) || 0;
  let newStatus = status;

  if (status === 'Destroyed' || status === 'Quarantine') {
    const remaining = Math.max(0, original - destroyedQty - quarantinedQty);
    let n = Number(qty);
    if (!Number.isFinite(n) || n <= 0) n = remaining; // blank/invalid → all remaining
    n = Math.min(n, remaining);
    if (status === 'Destroyed') destroyedQty += n; else quarantinedQty += n;
    newStatus = status; // honor the selected disposition (Destroyed or Quarantine)
  }

  overrides[batchNo] = { status: newStatus, destroyedQty, quarantinedQty, at: new Date().toISOString() };
  writeJson(OVERRIDES, overrides);
  return {
    batch_no: batchNo, status: newStatus, destroyedQty, quarantinedQty,
    original_quantity: original, remaining: Math.max(0, original - destroyedQty - quarantinedQty),
    at: overrides[batchNo].at,
  };
}

function postNote(note) {
  const postings = readJson(POSTINGS, []);
  const entry = {
    note_no: note.note_no || ((note.note_type === 'DEBIT' ? 'DN-' : 'CN-') + (1000 + postings.length + 1)),
    note_type: note.note_type, case_id: note.case_id || '', customer_code: note.customer_code || '',
    product_code: note.product_code || '', batch_no: note.batch_no || '',
    qty: Number(note.qty) || 0, amount: Number(note.amount) || 0, reason: note.reason || '',
    status: note.status || 'POSTED', reversal_of: note.reversal_of || null,
    erp_posting_ref: 'ERP-' + Math.floor(100000 + postings.length * 7 + 1),
    posted_at: new Date().toISOString(),
  };
  postings.push(entry);
  writeJson(POSTINGS, postings);
  return entry;
}

// --- IPC wiring ---
ipcMain.handle('erp:getOrder', (_e, ref) => getOrder(ref));
ipcMain.handle('erp:getBatches', (_e, filter) => getBatches(filter));
ipcMain.handle('erp:setBatchStatus', (_e, batchNo, status, qty) => setBatchStatus(batchNo, status, qty));
ipcMain.handle('erp:postNote', (_e, note) => postNote(note));
ipcMain.handle('erp:getPostings', () => readJson(POSTINGS, []));

function createWindow() {
  const win = new BrowserWindow({
    width: 1100, height: 760, title: 'GDP Mock ERP',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
