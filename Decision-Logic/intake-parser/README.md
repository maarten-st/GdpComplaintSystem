# Email Intake Parser

Deterministic parser over the inbound complaint emails — a verifiable fallback /
test oracle for the LLM `ComplaintIntakeAgent`. Extracts: sender, subject, order
no (`SO-####`), dispatch ref (`DISP-####`), batch (`P###-B##`), product, affected
quantity, complaint family (A/B/C via `decision-logic/classifyFamily`), a
confidence score, and the list of missing mandatory fields.

## Run
```
node "intake-parser/run-tests.js"
```
Parses all 9 `INBOUND_complaint_CMP-100x.txt` samples and asserts against the seed
cases. **40 assertions, all passing**, including:
- Family-C quantity computed from ordered-vs-received (CMP-1005/06/07 → 20).
- CMP-1009 ("a box arrived damaged", no refs) flagged `complete: false` — the
  RFI / park-the-case trigger (interruption-survival demo).

## Use
```js
const { parseComplaintEmail } = require('./parse-email');
const rec = parseComplaintEmail(rawEmailText);
// -> { from, subject, date, orderNo, dispatchRef, batchNo, productName,
//      qtyAffected, family, confidence, missingInformation[], complete }
```
`complete === false` drives the Acknowledge-&-Completeness stage's RFI path in the
Maestro Case (`t6 RequestForInformation` + `t7 ParkOnSlaTimer`).
