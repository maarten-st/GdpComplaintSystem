# gdp-complaint-intake — Coded Action App

The Gate-1 (TriageValidation) HITL form for the GDP Maestro Case. React + Vite +
TypeScript, rendered inside UiPath Action Center. Recreated from the deployed app
(the original Studio Web project source was not accessible to pull).

## Data contract (`action-schema.json`)

- **inputs** (read-only, from the case): `email` (sender address) and `emailBody`
  (raw complaint text), both shown in the "Complaint email" section above the
  confidence bar; `confidence` (number, 0-1), `missingInformation` (string[]),
  `Error` (object).
- **inOuts** (pre-filled from the extraction, **editable** by the reviewer, returned
  as outputs): `customer`, `product`, `batch`, `country`, `complaintType`,
  `category`, `summary`. The reviewer can correct any extracted value; the corrected
  value flows back to the case. In the Maestro binding panel these appear under
  **both** Inputs and Outputs.
- **outputs**: `Action` (string) — set to `"Approve"` / `"Reject"`, bound to the
  case variable `triageAction`.
- **outcomes**: `Approve`, `Reject`.

`reviewerNotes` and `rejectionReason` are captured in the form for the reviewer but
are **not** declared schema outputs (matching the deployed app). Reject requires a
rejection reason; Approve does not.

## Develop / build / deploy

```bash
npm install                     # .npmrc pins @uipath:* to the public npm registry
npm run dev                     # local preview (renders with example data, read-only)
npm run build                   # produces dist/

uip codedapp pack dist -n gdp-complaint-intake -v 1.0.1
uip codedapp publish -t Action  # -t Action is required for Action Apps
uip codedapp deploy -n gdp-complaint-intake --folder-key <SHARED_FOLDER_GUID>
```

> Bump the version on re-publish. Resolve the folder GUID with
> `uip or folders list --output json` (match `Name` = "Shared").
