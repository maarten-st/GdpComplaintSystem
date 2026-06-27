# Testing GatherTempLogs in UiPath Studio

`GatherTempLogs.xaml` scrapes the NordCold Logistics transport temperature portal
(`https://nord-cold-logistics.vercel.app/`) for a given Sales Order. It validates and builds;
selectors are grounded against the live DOM (Playwright-inspected). This guide runs it in Studio Desktop.

## Prerequisites
- Open the **ErpRobots** project in UiPath Studio Desktop (`…/uipath-maestro-test/ErpRobots`).
- `UiPath.UIAutomation.Activities 26.4.4-preview` is already a dependency.
- A Chrome browser available (the workflow attaches to, or opens, the portal). The **UiPath browser
  extension** must be enabled for Chrome (Studio → Tools → UiPath Extensions → Chrome) so web selectors resolve.

## Run it
1. Open `GatherTempLogs.xaml`.
2. Open the **Arguments** panel and set default values for the run (In arguments):
   | Argument | Value |
   |---|---|
   | `in_SalesOrder` | `"SO-4004"` (vaccine excursion; or any seeded SO from the complaint emails) |
   | `in_PortalUrl` | `"https://nord-cold-logistics.vercel.app/"` |
   | `in_Username` | `"demo"` |
   | `in_Password` | `"demo"` |
3. **Debug File** (F6 on the open file, not the project's Main). It will: attach/open the portal →
   log in if the login form is present → navigate to `/transports/<SalesOrder>` →
   read the detail fields + temperature-log table (throws BusinessRuleException if the SO isn't found).

## Expected output (Output panel / Locals)
- `out_TransportRef` = `TRX-4004`
- `out_TempMinC` = `3.8`, `out_TempMaxC` = `14.6`, `out_ExcursionHours` = `7`
- `out_LoggerPresent` = `True`
- `out_RawLogJson` = the full temperature-log table text (24 rows)
- `out_TempLog` = empty placeholder DataTable (see "Structured rows" below)

## Test the business exception
Run again with `in_SalesOrder = "SO-9999"`. Search returns no `transport-row`, so the row click fails
and the workflow throws **`BusinessRuleException: "Sales Order SO-9999 not found in NordCold portal"`** — the
intended not-found behavior.

## Selectors — if a step can't find its element
Selectors were authored from the live DOM, not captured via Indicate, so they have no UiPath capture
artifacts (screenshots/anchors). They should resolve, but if one fails:
- Click the activity → **Indicate Target on Screen** against the live portal to re-capture it.
- The grounded selectors used: login `#username`/`#password`/`#login-submit`; search `#so-search`/`#so-search-btn`;
  row `<webctrl tag='TR' class='clickable'/>` (search filters to the match); fields
  `<webctrl css-selector='[data-testid="field-…"]'/>` (the 5 summary DIVs); table `#temp-log-table`.

## Structured rows (optional upgrade)
`out_RawLogJson` already returns the full table as text. For a structured `out_TempLog`
(Timestamp + TempC columns), replace the "temp-log-table" **Get Text** activity with an
**Extract Table Data** activity targeting `#temp-log-table` and bind its output to `out_TempLog`.
(Extract Table Data must be configured interactively in Studio against the live table.)
