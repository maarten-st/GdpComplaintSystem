// Local intake smoke test: parse inbound complaint emails with the local oracle
// (parse-email.js — mirrors what the ExtractComplaint agent extracts), build
// Complaints records, and write them to a JSON file ready for
// `uip df records insert`. No Maestro / Studio Web / Integration Service needed.
//
//   node intake-parser/intake-local-test.js            # ALL inbound emails (batch)
//   node intake-parser/intake-local-test.js <file.txt> # a single email
//
// Then:
//   uip df records insert e28dd0a9-c065-f111-8fcb-000d3ab1a7ac --file intake-parser/intake-local-records.json
//
// Maps only the 8 columns that exist on the live entity today (Summary /
// Confidence / ProductName / QtyAffected are NOT created yet). Gate=1 = Triage.
const fs = require('fs');
const path = require('path');
const { parseComplaintEmail } = require('./parse-email');

const EMAIL_DIR = path.resolve(__dirname, '../02. Mock Data/gdp_mockdata/email_templates');
const ENTITY = 'e28dd0a9-c065-f111-8fcb-000d3ab1a7ac';

// Single run-stamp so a batch is unique but stable within one run.
const ts = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);

function toRecord(file) {
  const raw = fs.readFileSync(path.join(EMAIL_DIR, file), 'utf8');
  const p = parseComplaintEmail(raw);
  const srcNum = (file.match(/CMP-(\d+)/) || [, file.replace(/\W+/g, '')])[1];
  const rec = {
    ComplaintId: `CMP-2026-L${srcNum}-${ts}`,
    EmailBody: raw,
    Sender: p.from || '',
    Company: p.from || '',
    SalesOrder: p.orderNo || '',
    BatchNumber: p.batchNo || '',
    ProductName: p.productName || '',
    Summary: p.subject || '',
    Gate: 1, // Triage
    _parsed: { family: p.family, productName: p.productName, qtyAffected: p.qtyAffected, confidence: p.confidence },
  };
  // Numeric fields only when present (INTEGER / DECIMAL).
  if (typeof p.qtyAffected === 'number') rec.QtyAffected = p.qtyAffected;
  if (typeof p.confidence === 'number') rec.Confidence = p.confidence;
  return rec;
}

const arg = process.argv[2];
const files = arg
  ? [path.basename(arg)]
  : fs.readdirSync(EMAIL_DIR).filter((f) => /^INBOUND_complaint_.*\.txt$/i.test(f)).sort();

const records = files.map(toRecord);
// Strip the _parsed debug field before writing the insert payload.
const payload = records.map(({ _parsed, ...r }) => r);

const outPath = path.resolve(__dirname, 'intake-local-records.json');
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));

console.log(`Parsed ${records.length} email(s):`);
for (const r of records) {
  console.log(`  ${r.ComplaintId}  SO=${r.SalesOrder || '-'}  batch=${r.BatchNumber || '-'}  ` +
    `family=${r._parsed.family}  product=${r._parsed.productName || '-'}  qty=${r._parsed.qtyAffected ?? '-'}  conf=${r._parsed.confidence}`);
}
console.log(`\nWrote ${payload.length} record(s) -> ${outPath}`);
console.log(`Insert: uip df records insert ${ENTITY} --file intake-parser/intake-local-records.json`);
// -- end of example
