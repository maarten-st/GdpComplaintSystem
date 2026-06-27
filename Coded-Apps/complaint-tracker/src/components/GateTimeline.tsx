import { Fragment } from 'react';
import type { ChoiceMap, GateEvent } from '../lib/types';

interface Props {
  gates: ChoiceMap;
  currentGate: number | null;
  history: GateEvent[];
  createTime?: string;
}

function fmt(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// Horizontal gate stepper shown at the top of a case. Completed + current gates
// are green-filled; gates still to do are white with a visible outer ring. Reached
// gates show the transition timestamp + who moved it (from GateHistory).
export function GateTimeline({ gates, currentGate, history, createTime }: Props) {
  const order = gates.values; // already numberId-sorted
  // Latest history entry per gate numberId.
  const latest = new Map<number, GateEvent>();
  for (const ev of history) latest.set(ev.g, ev); // later entries overwrite -> last wins

  return (
    <div className="timeline">
      {order.map((g, i) => {
        const done = currentGate != null && g.numberId < currentGate;
        const cur = currentGate != null && g.numberId === currentGate;
        const reached = done || cur;
        const lineDone = currentGate != null && g.numberId <= currentGate;
        const ev = latest.get(g.numberId);
        const at = ev?.at ?? (i === 0 ? createTime : undefined);
        const by = ev?.by;
        const state = cur ? 'cur' : done ? 'done' : 'todo';
        return (
          <Fragment key={g.numberId}>
            {i > 0 && <div className={`tl-line${lineDone ? ' done' : ''}`} />}
            <div className="tl-step">
              <div className={`tl-circle ${state}`}>{i + 1}</div>
              <div className={`tl-label${cur ? ' cur' : ''}`}>{g.displayName}</div>
              {reached && at && <div className="tl-time">{fmt(at)}</div>}
              {reached && by && <div className="tl-by" title={by}>{by}</div>}
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
