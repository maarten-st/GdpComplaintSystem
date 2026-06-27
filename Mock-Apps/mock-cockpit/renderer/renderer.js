'use strict';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function toast(m) { const t = $('toast'); t.textContent = m; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2200); }

document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
  tab.classList.add('active'); $('panel-' + tab.dataset.tab).classList.add('active');
  if (tab.dataset.tab === 'metrics') loadMetrics();
}));

let currentCase = null;

async function loadCases() {
  const cases = await window.cockpit.getCases();
  $('caseList').innerHTML = cases.map((c) =>
    `<tr data-id="${esc(c.case_id)}" id="case-${esc(c.case_id)}">
      <td>${esc(c.case_id)}</td><td>${esc(c.customer)}</td>
      <td><span class="badge ${esc(c.family)}">${esc(c.family)}</span></td><td>${esc(c.status)}</td></tr>`).join('');
  document.querySelectorAll('#caseList tr').forEach((tr) => tr.addEventListener('click', () => openCase(tr.dataset.id)));
}

async function openCase(id) {
  currentCase = id;
  document.querySelectorAll('#caseList tr').forEach((tr) => tr.classList.toggle('sel', tr.dataset.id === id));
  const d = await window.cockpit.getCaseDetail(id);
  const gatesHtml = d.gates.map((g) => {
    const decided = d.decisions[g.id];
    const opts = g.options.map((o, i) =>
      `<button class="${i ? 'secondary' : ''}" data-gate="${g.id}" data-decision="${esc(o)}">${esc(o)}</button>`).join('');
    return `<div class="gate" id="gate-${g.id}">
      <div class="hd"><strong>${esc(g.name)}</strong><span class="persona">${esc(g.persona)}</span></div>
      ${decided ? `<div class="decided" id="decided-${g.id}">✔ ${esc(decided)}</div>` : `<div class="opts">${opts}</div>`}
    </div>`;
  }).join('');
  const auditHtml = d.audit.length
    ? `<div class="audit"><strong>Audit trail</strong><ul>${d.audit.map((a) => `<li>${esc(a.at)} · ${esc(a.gate)} · ${esc(a.persona)} → ${esc(a.decision)}</li>`).join('')}</ul></div>`
    : '';
  $('caseDetail').innerHTML =
    `<iframe id="dossierFrame"></iframe>
     <div class="gates"><h2>HITL Gates</h2>${gatesHtml}</div>${auditHtml}`;
  // inject dossier HTML into the iframe
  $('dossierFrame').srcdoc = d.dossierHtml;
  document.querySelectorAll('#caseDetail .gate button').forEach((btn) => btn.addEventListener('click', async () => {
    await window.cockpit.recordGate(currentCase, btn.dataset.gate, btn.dataset.decision);
    toast(`${btn.dataset.gate}: ${btn.dataset.decision}`);
    openCase(currentCase); loadCases();
  }));
}

async function loadMetrics() {
  const m = await window.cockpit.getMetrics();
  const section = (title, obj) => {
    const max = Math.max(1, ...Object.values(obj));
    const rows = Object.entries(obj).map(([k, v]) =>
      `<div class="metric-row"><span class="k">${esc(k)}</span><span class="bar" style="width:${(v / max) * 220}px"></span><span>${v}</span></div>`).join('');
    return `<h3>${esc(title)}</h3>${rows}`;
  };
  $('metrics').innerHTML = section('Complaints by family', m.byFamily) +
    section('By expected disposition', m.byDisposition) + section('By root cause', m.byRootCause);
}

loadCases();
