# Handover — `gdp-complaint-intake` Coded Action App

A self-contained handover for the **UiPath Coded Action App** that backs **Gate 1
(TriageValidation)** of the GDP Maestro Case. React + Vite + TypeScript, rendered inside
UiPath Action Center. This single document contains **every source file** — recreate the
project from it and run it in VS Code.

---

## 1. Recreate & run in VS Code

1. Create a folder `gdp-complaint-intake` and open it in VS Code (**File → Open Folder…**).
2. Create each file listed in **§4 Full source** at the path shown in its heading, pasting the
   contents verbatim (create the `src/` and `src/components/` subfolders).
3. Open a terminal (**Terminal → New Terminal**) and run:

   ```bash
   npm install      # restores dependencies (.npmrc pins @uipath/* to the public npm registry)
   npm run dev      # starts Vite
   # -- end of example
   ```

4. Open the printed URL:
   - **http://localhost:5173/** — interactive preview (edit the detail fields, try Approve/Reject)
   - **http://localhost:5173/?readonly=1** — the deployed read-only look (banner + disabled controls)

> Requires **Node 18+** (developed on Node 24, npm 11). Nothing else is needed to run locally.

Type-check and production build:

```bash
npm run typecheck   # tsc --noEmit
npm run build       # produces dist/
# -- end of example
```

---

## 2. Data contract (`action-schema.json`)

- **inputs** (read-only, from the case): `email`, `emailBody`, `confidence`,
  `missingInformation`, `Error`.
- **inOuts** (pre-filled from the extraction, **editable**, returned as outputs):
  `customer`, `product`, `batch`, `country`, `complaintType`, `category`, `summary`.
  In the Maestro binding panel these appear under **both** Inputs and Outputs.
- **outputs**: `Action` (string) — set to `"Approve"` / `"Reject"`.
- **outcomes**: `Approve`, `Reject`.

`reviewerNotes` and `rejectionReason` are captured in the form but are **not** schema outputs.
Reject requires a rejection reason; Approve does not.

Suggested Maestro variable bindings:

| Schema field | Section | Case variable |
|---|---|---|
| `email` | input | `emailFrom` |
| `emailBody` | input | `emailBody` |
| `confidence` | input | `intakeConfidence` |
| `customer` | inOut | `customerName` |
| `product` | inOut | `productName` |
| `batch` | inOut | `batchNo` |
| `country` | inOut | `country` |
| `complaintType` | inOut | `complaintType` |
| `category` | inOut | `family` (or a dedicated category var) |
| `summary` | inOut | `complaintSummary` |
| `Action` | output | `triageAction` |

---

## 3. Deploy to UiPath (optional — needs the `uip` CLI + `uip login`)

```bash
npm run build
uip codedapp pack dist -n gdp-complaint-intake -v 1.0.0
uip codedapp publish -t Action          # -t Action is required for Action Apps
uip codedapp deploy -n gdp-complaint-intake --folder-key <SHARED_FOLDER_GUID>
# -- end of example
```

Publishing creates a **new** app + App ID, so rebind Gate 1 in the Maestro case to it (the
previously deployed app was ID `6de89ba2-5251-4797-b90f-4596c4739736`). Resolve the Shared
folder GUID with `uip or folders list --output json` (match `Name` = "Shared"). Bump the
version on every re-publish.

---

## 4. Full source

Project layout:

```
gdp-complaint-intake/
  .npmrc
  .gitignore
  package.json
  tsconfig.json
  vite.config.ts
  index.html
  action-schema.json
  src/
    main.tsx
    index.css
    App.tsx
    uipath.ts
    components/
      Form.tsx
      Form.css
```

### `package.json`

```json
{
  "name": "gdp-complaint-intake",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "typecheck": "tsc --noEmit",
    "preview": "vite preview"
  },
  "dependencies": {
    "@uipath/coded-action-app": "^1.0.0-beta.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.6.3",
    "vite": "^6.0.5"
  }
}
```

### `.npmrc`

```ini
@uipath:registry=https://registry.npmjs.org
```

### `.gitignore`

```gitignore
node_modules
dist
.uipath
*.local
.env
.DS_Store
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

### `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' is required — UiPath handles URL routing; assets must be relative.
export default defineConfig({
  plugins: [react()],
  base: './',
});
```

### `index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>GDP Complaint Intake</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### `action-schema.json`

```json
{
  "inputs": {
    "type": "object",
    "properties": {
      "email": { "type": "string", "required": false, "description": "Sender email address of the inbound complaint." },
      "emailBody": { "type": "string", "required": false, "description": "Raw body text of the inbound complaint email." },
      "confidence": { "type": "number", "required": false, "description": "Intake agent extraction confidence (0-1)." },
      "missingInformation": { "type": "array", "required": false, "items": { "type": "string" }, "description": "Fields the intake agent could not resolve." },
      "Error": { "type": "object", "required": false, "properties": {}, "description": "Upstream error details, if any." }
    }
  },
  "outputs": {
    "type": "object",
    "properties": {
      "Action": { "type": "string", "required": false, "description": "Reviewer decision: Approve or Reject." }
    }
  },
  "inOuts": {
    "type": "object",
    "properties": {
      "customer": { "type": "string", "required": false, "description": "Customer organization name (editable; corrected value returned)." },
      "product": { "type": "string", "required": false, "description": "Product name (editable; corrected value returned)." },
      "batch": { "type": "string", "required": false, "description": "Affected batch / lot number (editable; corrected value returned)." },
      "country": { "type": "string", "required": false, "description": "Customer country (editable; corrected value returned)." },
      "complaintType": { "type": "string", "required": false, "description": "Complaint type (editable; corrected value returned)." },
      "category": { "type": "string", "required": false, "description": "Complaint category (editable; corrected value returned)." },
      "summary": { "type": "string", "required": false, "description": "One-line complaint summary (editable; corrected value returned)." }
    }
  },
  "outcomes": {
    "type": "object",
    "properties": {
      "Approve": { "type": "string" },
      "Reject": { "type": "string" }
    }
  }
}
```

### `src/main.tsx`

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

### `src/index.css`

```css
:root {
  color-scheme: light;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: 'Aptos', 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  background: #eef0f3;
  color: #001126;
  -webkit-font-smoothing: antialiased;
}
```

### `src/App.tsx`

```tsx
import { useState, useCallback } from 'react';
import Form from './components/Form';

function App() {
  const [darkTheme, setDarkTheme] = useState(false);

  const handleInitTheme = useCallback((isDark: boolean) => {
    setDarkTheme(isDark);
    document.body.className = isDark ? 'dark' : 'light';
  }, []);

  return (
    <div className={darkTheme ? 'dark' : 'light'}>
      <Form onInitTheme={handleInitTheme} />
    </div>
  );
}

export default App;
```

### `src/uipath.ts`

```typescript
import { CodedActionAppService } from '@uipath/coded-action-app';

// No platform SDK services are needed — the form only reads task inputs and
// completes with an outcome. Add @uipath/uipath-typescript services here later
// if the form ever needs Orchestrator / Data Fabric / Maestro calls.
export const codedActionAppService = new CodedActionAppService();
```

### `src/components/Form.tsx`

```tsx
import { useState, useEffect, ChangeEvent } from 'react';
import { Theme } from '@uipath/coded-action-app';
import { codedActionAppService } from '../uipath';
import './Form.css';

// One property per field across the schema sections, plus two UI-only fields
// (reviewerNotes / rejectionReason). The extracted details are inOuts — they are
// pre-filled from the automation, editable here, and returned as outputs. The
// only pure output is `Action`.
interface FormData {
  // inputs (read-only, from the automation)
  email: string;
  emailBody: string;
  confidence: number;
  missingInformation: string[];
  Error: Record<string, unknown>;
  // inOuts (pre-filled, editable, returned as outputs)
  customer: string;
  product: string;
  batch: string;
  country: string;
  complaintType: string;
  category: string;
  summary: string;
  // output
  Action: string;
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
  Action: '',
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

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (isReadOnly) return;
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };
    setFormData(updated);
    // Persist the (possibly corrected) inOut values + reviewer fields back to the task.
    codedActionAppService.setTaskData(updated);
  };

  const rawConfidence = Number(formData.confidence) || 0;
  const pct = Math.max(0, Math.min(100, Math.round(rawConfidence <= 1 ? rawConfidence * 100 : rawConfidence)));

  const canApprove = !isReadOnly;
  const canReject = !isReadOnly && formData.rejectionReason.trim().length > 0;

  const handleApprove = async () => {
    if (!canApprove) return;
    await codedActionAppService.completeTask('Approve', { ...formData, Action: 'Approve' });
  };

  const handleReject = async () => {
    if (!canReject) return;
    await codedActionAppService.completeTask('Reject', { ...formData, Action: 'Reject' });
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
                  onChange={handleChange}
                  readOnly={isReadOnly}
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
            onChange={handleChange}
            readOnly={isReadOnly}
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
```

### `src/components/Form.css`

```css
/* RoboRana house style: deep navy #001126 + bright green #53CB00, Aptos type. */

.app {
  max-width: 880px;
  margin: 24px auto;
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 6px 24px rgba(0, 17, 38, 0.12);
}

/* ---- Masthead ---- */
.masthead {
  background: #001126;
  color: #ffffff;
  padding: 22px 28px 26px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
}

.brand-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #53cb00;
}

.brand-name {
  font-weight: 800;
  font-size: 0.95rem;
}

.brand-sep {
  color: #3a4a63;
}

.brand-app {
  color: #53cb00;
  font-weight: 700;
  font-size: 0.78rem;
  letter-spacing: 1.5px;
}

.title {
  margin: 0 0 8px;
  font-size: 1.5rem;
  font-weight: 800;
  line-height: 1.25;
}

.subtitle {
  margin: 0;
  color: #aeb7c4;
  font-size: 0.9rem;
}

/* ---- Green accent bar ---- */
.accent-bar {
  height: 5px;
  background: #53cb00;
}

/* ---- Body ---- */
.body {
  padding: 4px 28px 0;
}

.readonly-banner {
  margin: 18px 0 0;
  padding: 12px 16px;
  background: #eef8e6;
  border: 1px solid #cde8b4;
  border-radius: 8px;
  color: #2f6b00;
  font-size: 0.85rem;
}

.section {
  padding: 20px 0;
  border-bottom: 1px solid #eceef1;
}

.section-label {
  display: block;
  margin-bottom: 12px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 1.2px;
  color: #8a94a6;
  text-transform: uppercase;
}

/* ---- Confidence ---- */
.confidence-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.confidence-head .section-label {
  margin-bottom: 0;
}

.confidence-pct {
  font-weight: 800;
  color: #53cb00;
  font-size: 1rem;
}

.confidence-track {
  height: 8px;
  background: #e6e8eb;
  border-radius: 999px;
  overflow: hidden;
}

.confidence-fill {
  height: 100%;
  background: #53cb00;
  border-radius: 999px;
  transition: width 0.3s ease;
}

/* ---- Extracted details ---- */
.details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px 32px;
}

.detail-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.8px;
  color: #8a94a6;
  text-transform: uppercase;
  margin-bottom: 5px;
}

.detail-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #d5dae1;
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 600;
  color: #0b1b33;
  background: #fbfcfd;
}

.detail-input::placeholder {
  color: #aab2bd;
  font-weight: 400;
  font-style: italic;
}

.detail-input:focus {
  outline: none;
  border-color: #53cb00;
  box-shadow: 0 0 0 3px rgba(83, 203, 0, 0.15);
}

.detail-input:read-only {
  background: #f1f3f5;
  color: #334155;
  cursor: default;
}

/* ---- Complaint email ---- */
.email-meta {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 10px;
}

.email-meta-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.8px;
  color: #8a94a6;
  text-transform: uppercase;
}

.email-value {
  font-size: 0.95rem;
  font-weight: 600;
  color: #0b1b33;
  word-break: break-all;
}

.email-value.muted {
  font-weight: 400;
  font-style: italic;
  color: #9aa3b0;
}

.email-body {
  white-space: pre-wrap;
  background: #f6f8fa;
  border: 1px solid #e6e9ee;
  border-radius: 8px;
  padding: 14px 16px;
  font-size: 0.9rem;
  line-height: 1.55;
  color: #1d2a3d;
  max-height: 280px;
  overflow: auto;
}

.email-body.muted {
  font-style: italic;
  color: #9aa3b0;
}

/* ---- Summary (editable) ---- */
.summary-edit {
  width: 100%;
  min-height: 84px;
  resize: vertical;
  background: #f6f8fa;
  border: 1px solid #d5dae1;
  border-left: 4px solid #53cb00;
  border-radius: 0 8px 8px 0;
  padding: 14px 16px;
  font-family: inherit;
  font-size: 0.92rem;
  line-height: 1.5;
  color: #1d2a3d;
}

.summary-edit::placeholder {
  color: #aab2bd;
  font-style: italic;
}

.summary-edit:focus {
  outline: none;
  border-color: #53cb00;
  box-shadow: 0 0 0 3px rgba(83, 203, 0, 0.15);
}

.summary-edit:read-only {
  background: #f1f3f5;
}

/* ---- Reviewer decision ---- */
.decision {
  border-bottom: none;
}

.field-label {
  display: block;
  font-size: 0.9rem;
  font-weight: 700;
  color: #0b1b33;
  margin: 14px 0 6px;
}

.field-label .opt {
  color: #8a94a6;
  font-weight: 400;
}

.field-label .req {
  color: #d23b3b;
  font-weight: 600;
}

textarea {
  width: 100%;
  min-height: 84px;
  resize: vertical;
  padding: 10px 12px;
  border: 1px solid #d5dae1;
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.9rem;
  color: #0b1b33;
  background: #fbfcfd;
}

textarea::placeholder {
  color: #aab2bd;
}

textarea:focus {
  outline: none;
  border-color: #53cb00;
  box-shadow: 0 0 0 3px rgba(83, 203, 0, 0.15);
}

textarea:read-only {
  background: #f1f3f5;
  color: #8a94a6;
  cursor: default;
}

/* ---- Footer / actions ---- */
.footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 18px 28px;
  background: #f6f7f9;
  border-top: 1px solid #eceef1;
}

.btn {
  padding: 9px 22px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid transparent;
}

.btn-reject {
  background: #ffffff;
  border-color: #e7c3c3;
  color: #c0392b;
}

.btn-reject:hover:not(:disabled) {
  background: #fdf3f3;
}

.btn-approve {
  background: #53cb00;
  color: #ffffff;
}

.btn-approve:hover:not(:disabled) {
  background: #49b400;
}

.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* ---- Dark theme (Action Center dark mode) ---- */
.dark .app {
  background: #0f1726;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4);
}

.dark .body {
  color: #e6eaf0;
}

.dark .section {
  border-bottom-color: #1e293b;
}

.dark .email-value {
  color: #f1f5f9;
}

.dark .email-body {
  background: #15203a;
  border-color: #29364d;
  color: #d7deea;
}

.dark .detail-input {
  background: #15203a;
  border-color: #29364d;
  color: #f1f5f9;
}

.dark .detail-input:read-only {
  background: #111a2c;
  color: #b6c0d0;
}

.dark .summary-edit {
  background: #15203a;
  border-color: #29364d;
  border-left-color: #53cb00;
  color: #d7deea;
}

.dark .summary-edit:read-only {
  background: #111a2c;
}

.dark .field-label {
  color: #e6eaf0;
}

.dark textarea {
  background: #15203a;
  border-color: #29364d;
  color: #f1f5f9;
}

.dark textarea:read-only {
  background: #111a2c;
  color: #8a94a6;
}

.dark .footer {
  background: #0c1320;
  border-top-color: #1e293b;
}
```

---

*The same files already exist on disk under `uipath-maestro-test/gdp-complaint-intake/` — this
document is the portable, copy-pasteable mirror of that project.*
