import { useEffect, useMemo, useState } from 'react';
import type { ComplaintsApi } from '../lib/api';
import type { ChoiceMap, Complaint } from '../lib/types';

interface Props {
  api: ComplaintsApi;
  gates: ChoiceMap;
  types: ChoiceMap;
  suggested: ChoiceMap;
  approved: ChoiceMap;
}

interface Dist {
  label: string;
  value: number;
  color: string;
}

// Colours keyed by the stable choice-value `name` (mirrors PipelineStrip / config).
const GATE_COLOR: Record<string, string> = {
  Intake: '#5b6b7a',
  Triage: '#001126',
  Investigation: '#d99100',
  CAPA: '#d9620a',
  Closed: '#6fbf39',
};
const ACTION_COLOR: Record<string, string> = {
  BackToStock: '#6fbf39',
  Destroy: '#c0392b',
  Credit: '#d99100',
  Debit: '#d9620a',
  None: '#5b6b7a',
  NoAction: '#5b6b7a',
};

function Bars({ rows, max }: { rows: Dist[]; max: number }) {
  if (rows.every((r) => r.value === 0)) {
    return <div className="empty" style={{ padding: '20px 0' }}>No data yet.</div>;
  }
  return (
    <div className="bars">
      {rows.map((r) => (
        <div className="bar-row" key={r.label}>
          <div className="blabel" title={r.label}>{r.label}</div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: max ? `${(r.value / max) * 100}%` : '0%', background: r.color }} />
          </div>
          <div className="bval">{r.value}</div>
        </div>
      ))}
    </div>
  );
}

export function ReportsPage({ api, gates, types, suggested, approved }: Props) {
  const [rows, setRows] = useState<Complaint[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const all = await api.fetchAll();
        if (alive) setRows(all);
      } catch (e) {
        console.error('[reports fetchAll] full error:', e);
        if (alive) setErr(e instanceof Error ? e.message : 'Failed to load complaints');
      }
    })();
    return () => { alive = false; };
  }, [api]);

  const m = useMemo(() => {
    if (!rows) return null;
    const total = rows.length;

    const countBy = (sel: (c: Complaint) => number | null, cm: ChoiceMap, colors?: Record<string, string>): Dist[] =>
      cm.values.map((v) => ({
        label: v.displayName,
        value: rows.filter((c) => sel(c) === v.numberId).length,
        color: colors?.[v.name] ?? '#001126',
      }));

    const gateName = (n: number | null) => (n == null ? null : gates.byNumberId.get(n)?.name ?? null);
    const closed = rows.filter((c) => gateName(c.Gate) === 'Closed').length;
    const open = total - closed;
    const needsReview = rows.filter((c) => {
      const g = gateName(c.Gate);
      return g === 'Investigation' || g === 'CAPA';
    }).length;

    const withConf = rows.filter((c) => typeof c.Confidence === 'number');
    const avgConf = withConf.length ? withConf.reduce((s, c) => s + (c.Confidence || 0), 0) / withConf.length : null;

    const actionName = (n: number | null) =>
      n == null ? null : approved.byNumberId.get(n)?.name ?? suggested.byNumberId.get(n)?.name ?? null;
    const effective = (c: Complaint) => c.ApprovedAction ?? c.SuggestedAction;
    let credit = 0;
    let debit = 0;
    for (const c of rows) {
      const amt = c.FinanceAmount || 0;
      const a = actionName(effective(c));
      if (a === 'Credit') credit += amt;
      else if (a === 'Debit') debit += amt;
    }

    return {
      total, open, closed, needsReview, avgConf, credit, debit,
      byGate: countBy((c) => c.Gate, gates, GATE_COLOR),
      byType: countBy((c) => c.ExtractedType, types),
      bySuggested: suggested.values.length ? countBy((c) => c.SuggestedAction, suggested, ACTION_COLOR) : [],
      byApproved: approved.values.length ? countBy((c) => c.ApprovedAction, approved, ACTION_COLOR) : [],
    };
  }, [rows, gates, types, suggested, approved]);

  if (err) return <section className="panel"><div className="banner-error">{err}</div></section>;
  if (!m) {
    return (
      <section className="panel">
        <div className="empty"><div className="spinner" /><p style={{ marginTop: 12 }}>Crunching metrics…</p></div>
      </section>
    );
  }

  const eur = (n: number) => n.toLocaleString(undefined, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  const max = (rs: Dist[]) => Math.max(1, ...rs.map((r) => r.value));

  return (
    <>
      <section className="panel">
        <h2 className="section-title">Reporting overview</h2>
        <div className="sub">Metrics across all {m.total} complaint{m.total === 1 ? '' : 's'}</div>
        <div className="kpi-row" style={{ marginTop: 16 }}>
          <div className="kpi total"><div className="bar" /><div className="label">Total complaints</div><div className="value">{m.total}</div></div>
          <div className="kpi"><div className="bar" /><div className="label">Open</div><div className="value">{m.open}</div></div>
          <div className="kpi"><div className="bar" style={{ background: '#6fbf39' }} /><div className="label">Closed</div><div className="value">{m.closed}</div></div>
          <div className="kpi"><div className="bar" style={{ background: '#d99100' }} /><div className="label">Needs review (QA / RP)</div><div className="value">{m.needsReview}</div></div>
          <div className="kpi"><div className="bar" /><div className="label">Avg AI confidence</div><div className="value">{m.avgConf == null ? '—' : `${Math.round(m.avgConf * 100)}%`}</div></div>
          <div className="kpi"><div className="bar" style={{ background: '#d9620a' }} /><div className="label">Finance exposure</div><div className="value">{eur(m.credit + m.debit)}</div></div>
        </div>
      </section>

      <div className="report-grid">
        <section className="panel">
          <h2 className="section-title">Complaints by stage</h2>
          <div className="sub">Where complaints sit in the pipeline</div>
          <div style={{ marginTop: 14 }}><Bars rows={m.byGate} max={max(m.byGate)} /></div>
        </section>
        <section className="panel">
          <h2 className="section-title">By complaint type</h2>
          <div className="sub">Quality / cold-chain / logistics families</div>
          <div style={{ marginTop: 14 }}><Bars rows={m.byType} max={max(m.byType)} /></div>
        </section>
      </div>

      <div className="report-grid">
        <section className="panel">
          <h2 className="section-title">Suggested disposition</h2>
          <div className="sub">Investigation Agent recommendation</div>
          <div style={{ marginTop: 14 }}>
            {m.bySuggested.length ? <Bars rows={m.bySuggested} max={max(m.bySuggested)} /> : <div className="empty">SuggestedAction choice set not configured.</div>}
          </div>
        </section>
        <section className="panel">
          <h2 className="section-title">Approved disposition</h2>
          <div className="sub">Human-approved action at CAPA</div>
          <div style={{ marginTop: 14 }}>
            {m.byApproved.length ? <Bars rows={m.byApproved} max={max(m.byApproved)} /> : <div className="empty">ApprovedAction choice set not configured.</div>}
          </div>
        </section>
      </div>

      <section className="panel">
        <h2 className="section-title">Finance correction</h2>
        <div className="sub">Credit (we owe the customer) vs debit (customer owes us) — by effective disposition</div>
        <div className="kpi-row" style={{ marginTop: 14 }}>
          <div className="kpi"><div className="bar" style={{ background: '#d99100' }} /><div className="label">Credit notes</div><div className="value">{eur(m.credit)}</div></div>
          <div className="kpi"><div className="bar" style={{ background: '#d9620a' }} /><div className="label">Debit notes</div><div className="value">{eur(m.debit)}</div></div>
          <div className="kpi total"><div className="bar" /><div className="label">Net exposure</div><div className="value">{eur(m.credit - m.debit)}</div></div>
        </div>
      </section>
    </>
  );
}
