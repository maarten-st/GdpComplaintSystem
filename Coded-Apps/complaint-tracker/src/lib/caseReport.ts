import { jsPDF } from 'jspdf';
import type { ChoiceMap, Complaint, GateEvent } from './types';
import { caseStatusName } from './config';

// Brand colours (mirror index.css). RoboRana rule: never green text on white,
// so body text is navy ink and only the rule/accents use green.
const NAVY: [number, number, number] = [0, 17, 38];
const GREEN: [number, number, number] = [83, 203, 0];
const MUTED: [number, number, number] = [91, 107, 122];

// Strip HTML from the email body to plain text (jsPDF can't render HTML).
function htmlToPlain(raw: string): string {
  if (!raw || !raw.trim()) return '';
  if (!/<[a-z!/][\s\S]*>/i.test(raw)) return raw.trim();
  try {
    const doc = new DOMParser().parseFromString(raw, 'text/html');
    doc.querySelectorAll('style, script, head, title, meta, link').forEach((el) => el.remove());
    doc.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
    doc.querySelectorAll('p, div, tr, li, h1, h2, h3, h4, h5, h6, blockquote').forEach((el) => el.append('\n'));
    return (doc.body?.textContent ?? '')
      .replace(/ /g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
  } catch {
    return raw;
  }
}

interface Findings {
  rootCause?: string;
  disposition?: string;
  financeDirection?: string;
  rationale?: string;
  gdp63?: Record<string, string>;
}
function parseFindings(raw: string): Findings | null {
  if (!raw || !raw.trim()) return null;
  try {
    const o = JSON.parse(raw);
    return o && typeof o === 'object' && !Array.isArray(o) ? (o as Findings) : null;
  } catch {
    return null;
  }
}
function parseHistory(raw: string): GateEvent[] {
  if (!raw || !raw.trim()) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as GateEvent[]).filter((e) => typeof e?.g === 'number') : [];
  } catch {
    return [];
  }
}

const fmtTime = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleString();
};

// Build and trigger download of a detailed case-closure report PDF.
export function generateCaseReport(
  c: Complaint,
  gates: ChoiceMap,
  types: ChoiceMap,
  actions: ChoiceMap,
): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentW = pageW - margin * 2;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // ---- header band ----
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 70, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('GDP Complaint — Case Report', margin, 34);
  doc.setTextColor(...GREEN);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(c.ComplaintId || '(no id)', margin, 52);
  doc.setTextColor(220, 226, 232);
  doc.setFontSize(8);
  doc.text(`Generated ${new Date().toLocaleString()}`, pageW - margin, 52, { align: 'right' });
  y = 92;

  const sectionTitle = (label: string) => {
    ensureSpace(34);
    doc.setDrawColor(...GREEN);
    doc.setLineWidth(2);
    doc.line(margin, y - 4, margin + 26, y - 4);
    doc.setTextColor(...NAVY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(label, margin, y + 10);
    y += 24;
  };

  // A label/value pair row, value wraps.
  const kv = (label: string, value: string) => {
    const labelW = 130;
    const lines = doc.splitTextToSize(value || '—', contentW - labelW);
    ensureSpace(lines.length * 13 + 4);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    doc.text(lines, margin + labelW, y);
    y += lines.length * 13 + 4;
  };

  // A free-flowing paragraph block.
  const paragraph = (text: string) => {
    const lines = doc.splitTextToSize(text || '—', contentW);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    for (const line of lines) {
      ensureSpace(14);
      doc.text(line, margin, y);
      y += 13;
    }
    y += 4;
  };

  const gateName = c.Gate != null ? gates.byNumberId.get(c.Gate)?.displayName : undefined;
  const typeName = c.ExtractedType != null ? types.byNumberId.get(c.ExtractedType)?.displayName : undefined;
  const suggestedName = c.SuggestedAction != null ? actions.byNumberId.get(c.SuggestedAction)?.displayName : undefined;
  const approvedName = c.ApprovedAction != null ? actions.byNumberId.get(c.ApprovedAction)?.displayName : undefined;
  const statusName = caseStatusName(c.CaseStatus);

  // ---- Case ----
  sectionTitle('Case');
  kv('Complaint ID', c.ComplaintId);
  kv('Company', c.Company);
  kv('Sender', c.Sender);
  kv('Sales order', c.SalesOrder);
  kv('Batch number', c.BatchNumber);
  kv('Product', c.ProductName);
  kv('Qty affected', c.QtyAffected != null ? String(c.QtyAffected) : '—');
  kv('Extracted type', typeName ?? (c.ExtractedType != null ? `#${c.ExtractedType}` : '—'));
  kv('Current gate', gateName ?? '—');
  if (statusName) kv('Case status', statusName === 'NoComplaint' ? 'No complaint (rejected)' : statusName);
  kv('Created', fmtTime(c.CreateTime));
  y += 6;

  // ---- Email summary ----
  sectionTitle('Customer email');
  if (c.Summary?.trim()) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    ensureSpace(14);
    doc.text('Summary', margin, y);
    y += 14;
    paragraph(c.Summary);
  }
  const email = htmlToPlain(c.EmailBody);
  if (email) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    ensureSpace(14);
    doc.text('Original message', margin, y);
    y += 14;
    paragraph(email);
  }
  if (!c.Summary?.trim() && !email) paragraph('(no email body)');

  // ---- Investigation findings ----
  sectionTitle('Investigation findings');
  const f = parseFindings(c.InvestigationFindings);
  if (f) {
    if (f.rootCause) kv('Root cause', f.rootCause);
    if (f.disposition) kv('Disposition', f.disposition);
    if (f.financeDirection) kv('Finance direction', f.financeDirection);
    if (f.rationale) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...MUTED);
      ensureSpace(14);
      doc.text('Rationale', margin, y);
      y += 14;
      paragraph(f.rationale);
    }
  } else if (c.InvestigationFindings?.trim()) {
    paragraph(c.InvestigationFindings);
  } else {
    paragraph('(no investigation findings recorded)');
  }
  if (c.DeliveryNoteMatch?.trim()) kv('Delivery-note match', c.DeliveryNoteMatch);
  kv('Return planned', c.ReturnPlanned ? 'Yes (logged)' : 'No');

  // ---- Disposition & finance ----
  sectionTitle('Disposition & finance');
  kv('Suggested action', suggestedName ?? (c.SuggestedAction != null ? `#${c.SuggestedAction}` : '—'));
  kv('Approved action', approvedName ?? (c.ApprovedAction != null ? `#${c.ApprovedAction}` : '—'));
  kv('Finance amount', c.FinanceAmount != null ? String(c.FinanceAmount) : '—');
  const steps = [
    c.ApproveAdjustInventory && 'Adjust inventory',
    c.ApproveCredit && 'Credit note',
    c.ApproveDebit && 'Debit note',
  ].filter(Boolean).join(', ') || 'None';
  kv('Approved steps', steps);

  // ---- Gate history ----
  sectionTitle('Gate transition history');
  const history = parseHistory(c.GateHistory);
  if (history.length === 0) {
    paragraph('(no transitions recorded)');
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    ensureSpace(16);
    doc.text('Gate', margin, y);
    doc.text('When', margin + 150, y);
    doc.text('By', margin + 330, y);
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    for (const ev of history) {
      ensureSpace(14);
      const g = gates.byNumberId.get(ev.g)?.displayName ?? `#${ev.g}`;
      doc.text(g, margin, y);
      doc.text(fmtTime(ev.at), margin + 150, y);
      doc.text(ev.by ?? '—', margin + 330, y);
      y += 13;
    }
  }

  doc.save(`${c.ComplaintId || 'case'}-report.pdf`);
}
// -- end of example
