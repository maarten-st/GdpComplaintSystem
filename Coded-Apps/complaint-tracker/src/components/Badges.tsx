import { badgeForGate, chipForType, chipForAction } from '../lib/config';
import type { ChoiceMap } from '../lib/types';

export function GateBadge({ gate, gates }: { gate: number | null; gates: ChoiceMap }) {
  if (gate === null) return <span className="chip chip-slate">—</span>;
  const v = gates.byNumberId.get(gate);
  return (
    <span className={`badge ${badgeForGate(v?.name)}`}>
      <span className="dot" />
      {v?.displayName ?? `#${gate}`}
    </span>
  );
}

export function TypeChip({ type, types }: { type: number | null; types: ChoiceMap }) {
  if (type === null) return <span className="chip chip-slate">Unclassified</span>;
  const v = types.byNumberId.get(type);
  return <span className={`chip ${chipForType(v?.name)}`}>{v?.displayName ?? `#${type}`}</span>;
}

export function ActionChip({ action, actions }: { action: number | null; actions: ChoiceMap }) {
  if (action === null) return <span className="chip chip-slate">—</span>;
  const v = actions.byNumberId.get(action);
  return <span className={`chip ${chipForAction(v?.name)}`}>{v?.displayName ?? `#${action}`}</span>;
}
