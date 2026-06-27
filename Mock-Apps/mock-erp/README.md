# GDP Mock ERP (Electron)

The mock ERP desktop app the **RPA robot drives by its UI** (desktop-app UI
automation — explicitly rewarded in the hackathon scoring).

**Self-contained:** the master CSVs + temperature logs are bundled in `./data`, so the
app no longer depends on the sibling `02. Mock Data` folder. Runtime writes go to the
OS user-data dir, so the packaged app works from any (even read-only) location.

## Data & state locations

- **Read-only master data** is resolved in this order (`main.js → resolveDataRoot`):
  1. `GDP_MOCKDATA` env var (path to a `gdp_mockdata` dir), 2. bundled `./data`
  (also `resources/app/data` packaged), 3. the original `../02. Mock Data/gdp_mockdata`.
- **Writable state** (`batch-overrides.json`, `postings.json`) lives in
  **`%APPDATA%\GDP Mock ERP`** (Electron `userData`). Delete those two files to reset the demo.
  The startup console logs the exact `data root` and `state dir`.

> `./data` is a copy of `02. Mock Data/gdp_mockdata/{master_data,temperature_logs}`. If you
> change the source CSVs, re-copy them into `mock-erp/data` before repackaging.

## Run (dev)

```
cd mock-erp
npm install
npm start
```

## Package for a VM (no Node needed on the VM)

```
npm run dist        # @electron/packager -> dist\GDP Mock ERP-win32-x64\  (folder with the .exe)
```

Copy that folder (or the zipped `dist\GDP-Mock-ERP-win-x64.zip`) to the VM and run
`GDP Mock ERP.exe`. Single-file portable build (needs Windows **Developer Mode**/admin so
electron-builder can extract its signing cache):

```
npm run dist:exe    # electron-builder -> dist\GDP-Mock-ERP-1.0.0-portable.exe
```

## Screens (with stable selectors for the robot)

1. **Sales Orders** — `#orderSearch` + `#btnSearchOrder` → looks up by order no
   (`SO-4001`) or dispatch ref (`DISP-9031`). Shows header (`#orderDispatchRef`)
   and the ordered-vs-shipped lines (`#orderLines`) with the discrepancy — the
   Family-C investigation view. Try `DISP-9031` (the CMP-1006/1007 correlation pair).
2. **Inventory / Batch State Machine** — `#batchTable`; each row has
   `#sel-<batch>` (Available / Quarantine / Blocked) + a Set button. This is the
   batch state machine the robot drives: QUARANTINE on return → AVAILABLE (FEFO)
   or BLOCKED (awaiting destruction). Writes persist to `batch-overrides.json`.
3. **Postings** — credit/debit note form (`#noteType`, `#postCase`, `#postCustomer`,
   `#postProduct`, `#postBatch`, `#postQty`, `#postAmount`, `#postReason`,
   `#btnPostNote`). Posts to `postings.json` and returns an `ERP-…` ref — the
   Gate-5 finance posting + the Saga reversal target (CMP-1008).

## Robot automation notes
- Every actionable element has a stable `id` (inputs, buttons) or
  `data-batch` attribute (per-row Set buttons) so UI selectors stay robust.
- Selectors and the window title (`GDP Mock ERP`) are unchanged by packaging, so existing
  `ErpRobots` `.xaml` selectors keep working against the packaged app.
- Runtime state lives in `%APPDATA%\GDP Mock ERP\{batch-overrides,postings}.json`
  (created on first write) — delete them to reset the demo.
- Read-only master data is never mutated; the app layers overrides on top.

## Maps to the Maestro Case tasks
| Case `rpa` task | ERP screen |
|---|---|
| LookupSalesOrder, GatherEvidence | Sales Orders |
| SetBatchQuarantine, ExecuteDisposition | Inventory / Batch State Machine |
| PostToErp, IssueReversingNote | Postings |
