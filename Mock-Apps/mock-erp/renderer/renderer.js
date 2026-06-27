'use strict';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2200); }

// --- tabs ---
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
    tab.classList.add('active');
    $('panel-' + tab.dataset.tab).classList.add('active');
    if (tab.dataset.tab === 'inventory') loadBatches();
    if (tab.dataset.tab === 'postings') loadPostings();
  });
});

// --- sales orders ---
const money = (n) => '€' + Number(n || 0).toFixed(2);

async function lookupOrder() {
  const o = await window.erp.getOrder($('orderSearch').value);
  const el = $('orderResult');
  if (!o) { el.innerHTML = '<p class="muted" id="orderNotFound">No order found.</p>'; return; }
  const rows = o.lines.map((l) =>
    `<tr><td>${esc(l.product_code)}</td><td>${esc(l.batch_no)}</td><td>${l.qty_ordered}</td><td>${money(l.unit_price)}</td><td>${money(l.line_amount)}</td></tr>`,
  ).join('');
  // One labeled row; the value lives in a read-only <input> with a stable id + accessible
  // name (aria-label = the field id, value-independent), so UiPath targets it by name and
  // Get Text returns the value — selectors never depend on the value itself.
  const escAttr = (s) => esc(s).replace(/"/g, '&quot;');
  const fieldRow = (icon, label, id, val) =>
    `<tr><td class="cc-label">${icon ? `<span class="cc-icon">${icon}</span>` : ''}${label}</td>` +
    `<td class="cc-value"><input class="cc-input" id="${id}" data-field="${id}" aria-label="${id}" title="${id}" value="${escAttr(String(val))}" /></td></tr>`;
  const orderCard =
    `<div class="card" id="orderCard">
      <h3>📦 Order details</h3>
      <table class="cc-table"><tbody>
        ${fieldRow('🧾', 'Order no', 'orderNo', o.order_no)}
        ${fieldRow('🏥', 'Customer', 'customerName', o.customer_name)}
        ${fieldRow('🔖', 'Customer code', 'customerCode', o.customer_code)}
        ${fieldRow('👤', 'Customer type', 'customerType', o.customer_type)}
        ${fieldRow('🚚', 'Dispatch ref', 'orderDispatchRef', o.dispatch_ref)}
        ${fieldRow('📅', 'Dispatch date', 'dispatchDate', o.dispatch_date)}
        ${fieldRow('📦', 'Carrier', 'carrier', o.carrier)}
        ${fieldRow('💰', 'Total paid', 'orderTotalPaid', money(o.total_paid))}
      </tbody></table>
    </div>`;
  // The order-lines table carries a stable accessible name so the robot can target
  // it and Get Text the whole grid, then parse the row for the complaint's batch.
  el.innerHTML =
    orderCard +
    `<h3>📋 Order lines</h3>
     <table id="orderLinesTable" aria-label="orderLinesTable"><thead><tr><th>Product</th><th>Batch</th><th>Ordered</th><th>Unit price</th><th>Line amount</th></tr></thead>
     <tbody id="orderLines">${rows}</tbody></table>`;
}
$('btnSearchOrder').addEventListener('click', lookupOrder);
$('orderSearch').addEventListener('keydown', (e) => { if (e.key === 'Enter') lookupOrder(); });

// --- inventory / batch state machine ---
async function loadBatches() {
  const batches = await window.erp.getBatches($('batchFilter').value);
  $('batchBody').innerHTML = batches.map((b) => {
    const opts = ['Available', 'Sold', 'Quarantine', 'Destroyed'].map((s) => `<option ${s === b.status ? 'selected' : ''}>${s}</option>`).join('');
    return `<tr id="row-${esc(b.batch_no)}">
      <td>${esc(b.batch_no)}</td><td>${esc(b.product_name)} (${esc(b.product_code)})</td>
      <td id="qtyorig-${esc(b.batch_no)}">${b.original_quantity}</td>
      <td id="qtyrem-${esc(b.batch_no)}">${b.quantity}</td>
      <td id="destroyed-${esc(b.batch_no)}">${b.destroyed_qty || 0}</td>
      <td id="quarantined-${esc(b.batch_no)}">${b.quarantined_qty || 0}</td>
      <td>${esc(b.expiry_date)}</td>
      <td><select id="sel-${esc(b.batch_no)}">${opts}</select>
          <input id="qty-${esc(b.batch_no)}" class="qty-input" type="text" inputmode="numeric" placeholder="qty" aria-label="destroyQty" title="Quantity (for Destroyed or Quarantine; blank = all remaining)" />
          <button class="btnSet" data-batch="${esc(b.batch_no)}">Set</button></td>
    </tr>`;
  }).join('');
  document.querySelectorAll('.btnSet').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const batch = btn.dataset.batch;
      const status = $('sel-' + batch).value;
      const qtyRaw = $('qty-' + batch).value;
      const qty = qtyRaw === '' ? null : Number(qtyRaw);
      await window.erp.setBatchStatus(batch, status, qty);
      toast((status === 'Destroyed' || status === 'Quarantine') ? `${batch} → ${status.toLowerCase()} ${qtyRaw || 'all remaining'}` : `${batch} → ${status}`);
      loadBatches();
    });
  });
}
$('btnFilterBatches').addEventListener('click', loadBatches);
$('btnRefreshBatches').addEventListener('click', () => { $('batchFilter').value = ''; loadBatches(); });

// --- postings ---
async function loadPostings() {
  const postings = await window.erp.getPostings();
  $('postingsBody').innerHTML = postings.map((p) =>
    `<tr><td>${esc(p.note_no)}</td><td>${esc(p.note_type)}</td><td>${esc(p.case_id)}</td><td>${esc(p.customer_code)}</td><td>${p.qty}</td><td>${p.amount}</td><td>${esc(p.status)}</td><td>${esc(p.erp_posting_ref)}</td><td>${esc(p.reason)}</td></tr>`
  ).join('');
}
$('btnPostNote').addEventListener('click', async () => {
  const note = {
    note_type: $('noteType').value, case_id: $('postCase').value, customer_code: $('postCustomer').value,
    product_code: $('postProduct').value, batch_no: $('postBatch').value,
    qty: $('postQty').value, amount: $('postAmount').value, reason: $('postReason').value, status: 'POSTED',
  };
  const entry = await window.erp.postNote(note);
  toast(`Posted ${entry.note_no} (${entry.erp_posting_ref})`);
  loadPostings();
});
