# ComplaintIntakeAgent — corrected spec (v2)

Re-authoring spec for the intake agent, per the `CLAUDE.md` domain correction.
Apply in **Agent Builder** (or hand me the exported `agent.json` and I'll pattern-match
the edits). The exact-code resolution is done **downstream** by the tested
`intake-parser/resolve-entities.js` — the LLM extracts names, the resolver maps to codes.

> **Decisions taken:** classify into families **A / B / C** directly · **Counterfeit is NOT handled**
> (out of scope; absent from the 9 demo cases) · resolve customer/product/batch to `gdp_mockdata`
> codes (downstream resolver) · drop free-text `country`.

## Inputs (unchanged)
| name | type | required |
|---|---|---|
| emailFrom | string | yes |
| emailSubject | string | yes |
| emailBody | string | yes |
| receivedDateTime | string | no |

## Outputs (corrected)
| name | type | notes |
|---|---|---|
| **family** | string enum `A` \| `B` \| `C` | **replaces** the old `category`. A = Quality defect, B = Cold-chain, C = Logistics |
| severity | string enum `Low` \| `Medium` \| `High` \| `Critical` | new — drives prioritisation |
| customerName | string | free text; resolved to `customer_code` downstream |
| productName | string | free text; resolved to `product_code` downstream |
| batchNo | string | `P###-B##` if present, else "" |
| orderNo | string | `SO-####` if present, else "" |
| dispatchRef | string | `DISP-####` if present, else "" |
| qtyAffected | integer | affected units (for C: \|ordered − received\|), else null |
| complaintSummary | string | one-line plain summary |
| confidence | number | 0–1 extraction confidence |
| missingInformation | array<string> | mandatory fields not found (order / batch / quantity) |

**Removed from v1:** `category` (4-enum), `country`, `complaintType`, anything Counterfeit.

## System-prompt classification rules (families)
Decide `family` with this precedence (mirrors the verified `decision-logic/classifyFamily`):

1. **B — Cold-chain** if the complaint is about temperature / cold-chain: words like
   *temperature, excursion, cold chain, fridge, warm, alarm, logger, frozen, vaccine*.
   (Guard, enforced downstream: B only truly applies when the product is cold-chain —
   `products.csv.cold_chain == Y`. A temperature word about a non-cold-chain product
   is re-checked by the resolver/process.)
2. **A — Quality defect** else if: *damaged, crushed, split, broken, contaminated,
   defective, mislabeled, substandard, tampered*.
3. **C — Logistics** otherwise (default): *short, surplus, wrong, missing, quantity,
   received vs ordered, dispatch/delivery/pick errors*.

**Counterfeit:** do NOT emit a counterfeit category. (If a future requirement needs it,
that is a separate out-of-scope authority-notification process — not this agent.)

## System-prompt extraction rules
- `orderNo` = first `SO-####`; `dispatchRef` = first `DISP-####`; `batchNo` = first `P###-B##`.
- `qtyAffected`: for C, the discrepancy `|ordered − received|`; otherwise the "<n> units" figure.
- `customerName` / `productName`: the organisation and medicinal product as written.
- `missingInformation`: include `"order reference"`, `"batch number"`, `"affected quantity"`
  when not found (this drives the case's RFI / park path — e.g. CMP-1009).
- Output **strict JSON** matching the Outputs table; empty string / null when undeterminable;
  never invent values.

## v1 → v2 migration map (for whoever edits the agent)
| v1 output | v2 |
|---|---|
| `category` (GDP issue / Product quality issue / Counterfeit suspicion / Transport issue) | **delete** → replaced by `family` (A/B/C) |
| `country` | **delete** (not in our data model) |
| `complaintType` | fold into `complaintSummary` |
| `customer`, `product`, `batch`, `summary`, `confidence`, `missingInformation` | keep (rename `summary`→`complaintSummary`) |
| — | **add** `family`, `severity`, `orderNo`, `dispatchRef`, `qtyAffected` |

## Verification
The downstream resolver + parser are already tested against all 9 seed cases:
- `node "intake-parser/run-tests.js"` — 40/40 (family, refs, batch, qty, completeness)
- `node "intake-parser/run-resolve-tests.js"` — 28/28 (customer/product codes, batch validity)

So once the agent emits `family` + entity names, the codes + validation are guaranteed correct.

## Wiring back into the Maestro Case
After the agent emits `family`, bind it in `ExtractComplaint` (currently `category` is left
unbound due to the v1 mismatch): add an output row `family -> family`, and add
`qtyAffected -> qtyAffected`. Then the lane split (`vars.lane`) and policy router run on a real
intake family instead of defaults. The code-resolution outputs feed `customerCode` / `productCode`
once the resolver step is added as a `process` task.
