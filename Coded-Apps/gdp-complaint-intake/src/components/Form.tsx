import { useState, useEffect, ChangeEvent } from 'react';
import { Theme } from '@uipath/coded-action-app';
import { codedActionAppService } from '../uipath';
import './Form.css';

// One property per field across the schema sections, plus two UI-only fields
// (reviewerNotes / rejectionReason). The extracted details are read-only inputs
// supplied by the automation. The only output is `triageAction` (the decision) —
// its name MUST match the case variable it maps to: Maestro action-task output
// mapping is by exact field-name == case-variable-name (renaming Action->triageAction
// in the case binding silently dropped the value -> incident 170001).
interface FormData {
  // inputs (read-only, from the automation)
  email: string;
  emailBody: string;
  confidence: number;
  missingInformation: string[];
  Error: Record<string, unknown>;
  // inputs (read-only context)
  customer: string;
  product: string;
  batch: string;
  country: string;
  complaintType: string;
  category: string;
  summary: string;
  // output — name matches the case variable (Maestro maps outputs by matching name)
  triageAction: string;
  // UI-only reviewer fields
  reviewerNotes: string;
  rejectionReason: string;
}

// Editable detail fields rendered in the two-column grid, in display order.
const DETAIL_FIELDS: Array<[
  'customer' | 'product' | 'batch' | 'country' | 'complaintType' | 'category',
  string,
]> = [
  ['customer', 'Customer'],
  ['product', 'Product'],
  ['batch', 'Batch / Lot'],
  ['country', 'Country'],
  ['complaintType', 'Complaint type'],
  ['category', 'Category'],
];

// Example data so the standalone preview renders like a deployed task.
// At runtime getTask() overwrites these with the real task values.
const INITIAL: FormData = {
  email: 'cold@flandriahospital.be',
  emailBody:
    'Dear team,\n\n' +
    'Our receiving fridge failed overnight and the influenza vaccine shipment (SO-4004, ' +
    'batch P004-B01, 50 units) was warm for what looks like most of the night. Logger ' +
    'attached. Please advise - obviously we will not use these until cleared.\n\n' +
    'Flandria Hospital',
  confidence: 0.97,
  missingInformation: [],
  Error: {},
  customer: 'Flandria Hospital',
  product: 'Influenza vaccine',
  batch: 'P004-B01',
  country: '',
  complaintType: '',
  category: '',
  summary:
    'Flandria Hospital reports that 50 units of influenza vaccine (batch P004-B01, SO-4004) were exposed to warm temperatures overnight due to a fridge failure, with a data logger attached as evidence.',
  triageAction: '',
  reviewerNotes: '',
  rejectionReason: '',
};

const isDarkTheme = (theme: Theme) =>
  theme === Theme.Dark || theme === Theme.DarkHighContrast;

interface FormProps {
  onInitTheme: (isDark: boolean) => void;
}

function Form({ onInitTheme }: FormProps) {
  const [formData, setFormData] = useState<FormData>(INITIAL);
  // Default to read-only so the preview matches a non-actionable task; a live
  // Action Center task resolves isReadOnly=false and enables editing + buttons.
  const [isReadOnly, setIsReadOnly] = useState(true);

  useEffect(() => {
    codedActionAppService
      .getTask()
      .then((task) => {
        if (task.data) {
          setFormData((prev) => ({ ...prev, ...(task.data as Partial<FormData>) }));
        }
        setIsReadOnly(task.isReadOnly);
        onInitTheme(isDarkTheme(task.theme));
      })
      .catch(() => {
        // No platform context (local preview). Default to editable so the form can
        // be exercised locally; append ?readonly=1 to preview the deployed
        // read-only state. In a real Action Center task, getTask() sets the value.
        const forceReadOnly =
          new URLSearchParams(window.location.search).get('readonly') === '1';
        setIsReadOnly(forceReadOnly);
      });
  }, [onInitTheme]);

  // Only the reviewer notes / rejection reason are editable now; the extracted
  // details are read-only context. Nothing is persisted back to the task — the
  // result is just the Action outcome (see buildResult), which keeps result
  // mapping from failing (error 170001).
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (isReadOnly) return;
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const rawConfidence = Number(formData.confidence) || 0;
  const pct = Math.max(0, Math.min(100, Math.round(rawConfidence <= 1 ? rawConfidence * 100 : rawConfidence)));

  const canApprove = !isReadOnly;
  const canReject = !isReadOnly && formData.rejectionReason.trim().length > 0;

  // The case maps ONLY the decision, via the `triageAction` output field (its name
  // must match the case variable — see FormData note). Return just that field;
  // echoing other fields as outputs breaks result mapping (error 170001).
  // setTaskData is called first so the value is in the task's persisted data, then
  // completeTask submits the same payload — covers both result-capture paths.
  const buildResult = (decision: string) => ({ triageAction: decision });

  const handleApprove = async () => {
    if (!canApprove) return;
    const result = buildResult('Approve');
    codedActionAppService.setTaskData(result);
    await codedActionAppService.completeTask('Approve', result);
  };

  const handleReject = async () => {
    if (!canReject) return;
    const result = buildResult('Reject');
    codedActionAppService.setTaskData(result);
    await codedActionAppService.completeTask('Reject', result);
  };

  return (
    <div className="app">
      <header className="masthead">
        <div className="brand">
          <span className="brand-dot" />
          <span className="brand-name">RoboRana</span>
          <span className="brand-sep">|</span>
          <span className="brand-app">GDP COMPLAINT INTAKE</span>
        </div>
        <h1 className="title">Validate complaint classification and confirm it is a genuine complaint.</h1>
        <p className="subtitle">Review the details extracted by the intake agent, then approve or reject this complaint.</p>
      </header>

      <div className="accent-bar" />

      <main className="body">
        {isReadOnly && (
          <div className="readonly-banner">This task is read-only. Editing and submission are disabled.</div>
        )}

        <section className="section email-section">
          <span className="section-label">Complaint email</span>
          <div className="email-meta">
            <span className="email-meta-label">From</span>
            <span className={formData.email && formData.email.trim() ? 'email-value' : 'email-value muted'}>
              {formData.email && formData.email.trim() ? formData.email : 'Not provided'}
            </span>
          </div>
          <div className={formData.emailBody && formData.emailBody.trim() ? 'email-body' : 'email-body muted'}>
            {formData.emailBody && formData.emailBody.trim() ? formData.emailBody : 'No email body provided.'}
          </div>
        </section>

        <section className="section confidence">
          <div className="confidence-head">
            <span className="section-label">Extraction confidence</span>
            <span className="confidence-pct">{pct}%</span>
          </div>
          <div className="confidence-track">
            <div className="confidence-fill" style={{ width: `${pct}%` }} />
          </div>
        </section>

        <section className="section details">
          <span className="section-label">Extracted details</span>
          <div className="details-grid">
            {DETAIL_FIELDS.map(([name, label]) => (
              <div className="detail" key={name}>
                <label className="detail-label" htmlFor={name}>{label}</label>
                <input
                  id={name}
                  name={name}
                  className="detail-input"
                  value={formData[name]}
                  readOnly
                  placeholder="Not provided"
                />
              </div>
            ))}
          </div>
        </section>

        <section className="section summary">
          <span className="section-label">Summary</span>
          <textarea
            name="summary"
            className="summary-edit"
            value={formData.summary}
            readOnly
            placeholder="Not provided"
          />
        </section>

        <section className="section decision">
          <span className="section-label">Reviewer decision</span>

          <label className="field-label" htmlFor="reviewerNotes">
            Reviewer notes <span className="opt">(optional)</span>
          </label>
          <textarea
            id="reviewerNotes"
            name="reviewerNotes"
            value={formData.reviewerNotes}
            onChange={handleChange}
            readOnly={isReadOnly}
            placeholder="Add any context or observations for the audit trail..."
          />

          <label className="field-label" htmlFor="rejectionReason">
            Rejection reason <span className="req">(required to reject)</span>
          </label>
          <textarea
            id="rejectionReason"
            name="rejectionReason"
            value={formData.rejectionReason}
            onChange={handleChange}
            readOnly={isReadOnly}
            placeholder="Explain why this intake is being rejected..."
          />
        </section>
      </main>

      <footer className="footer">
        <button type="button" className="btn btn-reject" onClick={handleReject} disabled={!canReject}>
          Reject
        </button>
        <button type="button" className="btn btn-approve" onClick={handleApprove} disabled={!canApprove}>
          Approve
        </button>
      </footer>
    </div>
  );
}

export default Form;
