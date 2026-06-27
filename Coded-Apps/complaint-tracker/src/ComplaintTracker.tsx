import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { ComplaintsApi } from './lib/api';
import type { ChoiceMap, Complaint, ComplaintInput, ComplaintUpdate } from './lib/types';
import { PAGE_SIZE } from './lib/config';
import { GateBadge, TypeChip } from './components/Badges';
import { PipelineStrip } from './components/PipelineStrip';
import { ComplaintDrawer } from './components/ComplaintDrawer';
import { NewComplaintModal } from './components/NewComplaintModal';
import { ReportsPage } from './components/ReportsPage';
import { generateCaseReport } from './lib/caseReport';

export function ComplaintTracker() {
  const { sdk, logout, user } = useAuth();
  const api = useMemo(() => new ComplaintsApi(sdk), [sdk]);

  // Reference data
  const [gates, setGates] = useState<ChoiceMap | null>(null);
  const [types, setTypes] = useState<ChoiceMap | null>(null);
  const [actions, setActions] = useState<ChoiceMap | null>(null);
  const [approved, setApproved] = useState<ChoiceMap | null>(null);

  // Which page is showing.
  const [view, setView] = useState<'pipeline' | 'reports'>('pipeline');
  const [counts, setCounts] = useState<Map<number, number>>(new Map());
  const [total, setTotal] = useState(0);

  // Query state
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [gateFilter, setGateFilter] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  // Results
  const [items, setItems] = useState<Complaint[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState<string | null>(null);

  // UI
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Debounce the search box.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setSearch(searchInput); setPage(1); }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput]);

  // Load reference data once.
  useEffect(() => {
    (async () => {
      try {
        const [g, t, a, ap] = await Promise.all([api.loadGates(), api.loadTypes(), api.loadSuggestedActions(), api.loadApprovedActions()]);
        setGates(g);
        setTypes(t);
        setActions(a);
        setApproved(ap);
      } catch (e) {
        console.error('[reference-data load] full error:', e);
        setFatal(e instanceof Error ? e.message : 'Failed to load choice sets');
      }
    })();
  }, [api]);

  const refreshSummary = useCallback(async () => {
    try {
      const [c, n] = await Promise.all([api.countsByGate(), api.total()]);
      setCounts(c);
      setTotal(n);
    } catch {
      /* summary is non-critical; ignore */
    }
  }, [api]);

  const runQuery = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.query({ search, gate: gateFilter, type: typeFilter, page });
      setItems(res.items);
      setTotalCount(res.totalCount);
      setTotalPages(res.totalPages);
      setFatal(null);
    } catch (e) {
      console.error('[query] full error:', e);
      setFatal(e instanceof Error ? e.message : 'Failed to load complaints');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [api, search, gateFilter, typeFilter, page]);

  // Once reference data is ready, run query + summary.
  useEffect(() => { if (gates && types) runQuery(); }, [gates, types, runQuery]);
  useEffect(() => { if (gates && types) refreshSummary(); }, [gates, types, refreshSummary]);

  const onUpdate = async (recordId: string, patch: ComplaintUpdate) => {
    await api.updateRecord(recordId, patch);
    // Keep the case drawer open and reflect the saved values in place
    // (merging the patch) — the user stays on the case after saving.
    setSelected((prev) => (prev && prev.Id === recordId ? ({ ...prev, ...patch } as Complaint) : prev));
    await Promise.all([runQuery(), refreshSummary()]);
  };

  const onCreate = async (input: ComplaintInput) => {
    await api.insert(input, user);
    setShowModal(false);
    setPage(1);
    await Promise.all([runQuery(), refreshSummary()]);
  };

  // Permanently delete a complaint after confirmation. Refreshes the list and
  // summary, and closes the drawer if the deleted record is the open one.
  const onDelete = async (c: Complaint) => {
    if (!window.confirm(`Permanently delete complaint ${c.ComplaintId || c.Id}? This cannot be undone.`)) return;
    try {
      await api.deleteRecord(c.Id);
      setSelected((prev) => (prev && prev.Id === c.Id ? null : prev));
      await Promise.all([runQuery(), refreshSummary()]);
    } catch (e) {
      console.error('[delete] full error:', e);
      setFatal(e instanceof Error ? e.message : 'Failed to delete complaint');
    }
  };

  const suggestedId = useMemo(() => {
    const n = total + 1;
    return `CMP-2026-${String(n).padStart(4, '0')}`;
  }, [total]);

  const setGate = (g: number | null) => { setGateFilter(g); setPage(1); };
  const setType = (t: number | null) => { setTypeFilter(t); setPage(1); };

  const from = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, totalCount);

  const ready = gates && types;

  return (
    <div>
      <header className="masthead">
        <div className="brand">Robo<span className="accent">Rana</span></div>
        <div className="divider" />
        <div>
          <h1>GDP Complaint Tracker</h1>
          <p className="tagline">Pharmaceutical product complaint intake & handling — Data Fabric</p>
        </div>
        <div className="spacer" />
        <button className="btn btn-ghost btn-sm" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.4)' }} onClick={logout}>
          Sign out
        </button>
      </header>

      <main>
        <div className="tabs">
          <button className={`tab${view === 'pipeline' ? ' active' : ''}`} onClick={() => setView('pipeline')}>Pipeline</button>
          <button className={`tab${view === 'reports' ? ' active' : ''}`} onClick={() => setView('reports')}>Reports</button>
        </div>

        {fatal && <div className="banner-error">{fatal}</div>}

        {!ready ? (
          <section className="panel"><div className="empty"><div className="spinner" /><p style={{ marginTop: 12 }}>Loading reference data…</p></div></section>
        ) : view === 'reports' ? (
          <ReportsPage
            api={api}
            gates={gates}
            types={types}
            suggested={actions ?? { values: [], byNumberId: new Map(), byName: new Map() }}
            approved={approved ?? { values: [], byNumberId: new Map(), byName: new Map() }}
          />
        ) : (
          <>
            {/* Pipeline / KPIs */}
            <section className="panel">
              <h2 className="section-title">Pipeline</h2>
              <div className="sub">Complaints by gate · click a stage to filter · {total} total</div>
              <div style={{ marginTop: 14 }}>
                <PipelineStrip gates={gates} counts={counts} activeGate={gateFilter} onSelect={setGate} />
              </div>
            </section>

            {/* Toolbar */}
            <section className="panel">
              <div className="toolbar">
                <div className="grow" style={{ minWidth: 220 }}>
                  <label className="field-label">Search</label>
                  <input
                    className="input"
                    placeholder="ID, company, sender, batch, sales order…"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                </div>
                <div style={{ minWidth: 180 }}>
                  <label className="field-label">Gate</label>
                  <select className="select" value={gateFilter ?? ''} onChange={(e) => setGate(e.target.value === '' ? null : Number(e.target.value))}>
                    <option value="">All gates</option>
                    {gates.values.map((g) => <option key={g.numberId} value={g.numberId}>{g.displayName}</option>)}
                  </select>
                </div>
                <div style={{ minWidth: 200 }}>
                  <label className="field-label">Type</label>
                  <select className="select" value={typeFilter ?? ''} onChange={(e) => setType(e.target.value === '' ? null : Number(e.target.value))}>
                    <option value="">All types</option>
                    {types.values.map((t) => <option key={t.numberId} value={t.numberId}>{t.displayName}</option>)}
                  </select>
                </div>
                <div style={{ alignSelf: 'flex-end' }}>
                  <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New complaint</button>
                </div>
              </div>
            </section>

            {/* Table */}
            <section className="panel">
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Complaint ID</th>
                      <th>Company</th>
                      <th>Sender</th>
                      <th>Type</th>
                      <th>Batch</th>
                      <th>Sales Order</th>
                      <th>Gate</th>
                      <th>Report</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={9}><div className="empty"><div className="spinner" /></div></td></tr>
                    ) : items.length === 0 ? (
                      <tr><td colSpan={9}><div className="empty">No complaints match your filters.</div></td></tr>
                    ) : (
                      items.map((c) => {
                        const isClosed = c.Gate != null && gates.byNumberId.get(c.Gate)?.name === 'Closed';
                        return (
                          <tr key={c.Id} onClick={() => setSelected(c)}>
                            <td className="cid">{c.ComplaintId}</td>
                            <td>{c.Company}</td>
                            <td className="truncate">{c.Sender}</td>
                            <td><TypeChip type={c.ExtractedType} types={types} /></td>
                            <td className="cell-mono">{c.BatchNumber}</td>
                            <td className="cell-mono">{c.SalesOrder}</td>
                            <td><GateBadge gate={c.Gate} gates={gates} /></td>
                            <td>
                              {isClosed ? (
                                <button
                                  className="btn btn-ghost btn-sm"
                                  title="Download case report (PDF)"
                                  onClick={(e) => { e.stopPropagation(); generateCaseReport(c, gates, types, actions ?? { values: [], byNumberId: new Map(), byName: new Map() }); }}
                                >
                                  ⬇ Report
                                </button>
                              ) : (
                                <span className="count">—</span>
                              )}
                            </td>
                            <td>
                              <button
                                className="btn btn-ghost btn-sm"
                                title="Delete complaint"
                                onClick={(e) => { e.stopPropagation(); onDelete(c); }}
                              >
                                🗑
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="pager">
                <div className="count">{totalCount === 0 ? 'No results' : `Showing ${from}–${to} of ${totalCount}`}</div>
                <div className="controls">
                  <button className="pg" disabled={page <= 1 || loading} onClick={() => setPage(1)}>«</button>
                  <button className="pg" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹</button>
                  <span className="count" style={{ padding: '0 6px' }}>Page {page} / {totalPages}</span>
                  <button className="pg" disabled={page >= totalPages || loading} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>›</button>
                  <button className="pg" disabled={page >= totalPages || loading} onClick={() => setPage(totalPages)}>»</button>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {selected && ready && (
        <ComplaintDrawer
          complaint={selected}
          gates={gates}
          types={types}
          actions={actions ?? { values: [], byNumberId: new Map(), byName: new Map() }}
          currentUser={user}
          api={api}
          onClose={() => setSelected(null)}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      )}

      {showModal && ready && (
        <NewComplaintModal
          gates={gates}
          types={types}
          suggestedId={suggestedId}
          onClose={() => setShowModal(false)}
          onCreate={onCreate}
        />
      )}
    </div>
  );
}
