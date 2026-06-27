import { badgeForGate } from '../lib/config';
import type { ChoiceMap } from '../lib/types';

const DOT: Record<string, string> = {
  'b-slate': '#5b6b7a',
  'b-blue': '#001126',
  'b-amber': '#d99100',
  'b-orange': '#d9620a',
  'b-green': '#6fbf39',
  'b-red': '#c0392b',
};

interface Props {
  gates: ChoiceMap;
  counts: Map<number, number>;
  activeGate: number | null;
  onSelect: (gate: number | null) => void;
}

export function PipelineStrip({ gates, counts, activeGate, onSelect }: Props) {
  return (
    <div className="pipeline">
      {gates.values.map((g) => {
        const dotColor = DOT[badgeForGate(g.name)] ?? '#5b6b7a';
        const isActive = activeGate === g.numberId;
        return (
          <div
            key={g.numberId}
            className={`stage${isActive ? ' active' : ''}`}
            onClick={() => onSelect(isActive ? null : g.numberId)}
            title={isActive ? 'Clear filter' : `Filter by ${g.displayName}`}
          >
            <div className="gname">
              <span className="gdot" style={{ background: dotColor }} />
              {g.displayName}
            </div>
            <div className="gcount">{counts.get(g.numberId) ?? 0}</div>
          </div>
        );
      })}
    </div>
  );
}
