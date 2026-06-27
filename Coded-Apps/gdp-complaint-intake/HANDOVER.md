# Handover — `gdp-complaint-intake` Coded Action App

The UiPath **Coded Action App** for Gate 1 (TriageValidation) of the GDP Maestro Case.
React + Vite + TypeScript. This bundle contains the full source; `node_modules/` and
`dist/` were left out to keep it small — you regenerate them with `npm install` / `npm run build`.

## Run it in VS Code

1. Unzip `handoverapp.zip` somewhere convenient.
2. In VS Code: **File → Open Folder…** → select the unzipped `gdp-complaint-intake` folder.
3. Open a terminal (**Terminal → New Terminal**) and run:

   ```bash
   npm install      # restores dependencies (.npmrc pins @uipath/* to the public registry)
   npm run dev      # starts Vite
   # -- end of example
   ```

4. Open the printed URL:
   - **http://localhost:5173/** — interactive preview (edit the detail fields, try Approve/Reject)
   - **http://localhost:5173/?readonly=1** — the deployed read-only look (read-only banner, disabled buttons)

> Requires Node 18+ (developed on Node 24, npm 11). No other global tooling needed to run locally.

## Build / type-check

```bash
npm run typecheck   # tsc --noEmit
npm run build       # produces dist/
# -- end of example
```

## Deploy to UiPath (optional — needs the `uip` CLI + login)

```bash
npm run build
uip codedapp pack dist -n gdp-complaint-intake -v 1.0.0
uip codedapp publish -t Action          # -t Action is required for Action Apps
uip codedapp deploy -n gdp-complaint-intake --folder-key <SHARED_FOLDER_GUID>
# -- end of example
```

Publishing creates a **new** app + App ID; rebind Gate 1 in the Maestro case to it (the old
deployed app was ID `6de89ba2-5251-4797-b90f-4596c4739736`).

## Data contract (`action-schema.json`)

- **inputs** (read-only): `email`, `emailBody`, `confidence`, `missingInformation`, `Error`
- **inOuts** (pre-filled, editable, returned as outputs): `customer`, `product`, `batch`,
  `country`, `complaintType`, `category`, `summary`
- **outputs**: `Action` → case var `triageAction`
- **outcomes**: `Approve`, `Reject`

Maestro bindings: `email`↔`emailFrom`, `emailBody`↔`emailBody`, `customer`↔`customerName`,
`product`↔`productName`, `batch`↔`batchNo`, `summary`↔`complaintSummary`,
`confidence`↔`intakeConfidence`, `Action`↔`triageAction`.

## Project map

```
gdp-complaint-intake/
  action-schema.json         data contract (inputs / inOuts / outputs / outcomes)
  index.html                 Vite entry
  vite.config.ts             base: './' (required by UiPath)
  package.json               scripts: dev / build / typecheck / preview
  .npmrc                     @uipath:* -> public npm registry
  src/
    main.tsx                 React bootstrap
    App.tsx                  theme wrapper
    uipath.ts                CodedActionAppService instance
    index.css                global styles
    components/
      Form.tsx               the task form (loads task, renders fields, completes outcome)
      Form.css               RoboRana navy/green styling
  README.md                  reference
  HANDOVER.md                this file
```
