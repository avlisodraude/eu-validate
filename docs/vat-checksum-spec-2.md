# VAT Checksum Specification 2 — BG, EL, HU, MT, RO

**Status:** research complete, ready for implementation. Completes the EU-27: after this batch every
member state has checksum validation (subject to the per-country `checksum: null` sub-cases already
documented in [spec 1](./vat-checksum-spec.md) for CZ/LV/FR — this batch adds **no** new ones).
**Date:** 2026-07-09.
**Methodology:** same as spec 1, tightened one notch — algorithms cross-checked between
[python-stdnum](https://github.com/arthurdejong/python-stdnum) **2.2** and
[jsvat](https://github.com/se-panfilov/jsvat) **2.5.4**, but this time both libraries were *installed and
executed* over every fixture below (not just their source read): all 33 valid numbers pass both, all 16
invalid mutations fail both, zero disagreements on any fixture. The arithmetic shown is computed output
from the scratch harness, not transcribed. Real-world numbers come from company imprints, national
business registers, and Wikidata's *EU VAT number* property (P3608), cited per country.

**Conventions:** as in spec 1 — numbers shown without the 2-letter prefix unless stated, positions
1-indexed (`d1 d2 …`), ⚠️ marks a genuine source disagreement.

**EL/GR guard-rail:** Greece's VAT prefix is `EL`; `GR` is its ISO code. `validateVAT` already
normalises `GR` → `EL` (`src/vat.ts`, "Greece's VAT prefix is EL" comment) and `test/vat.test.ts`
covers it ("maps Greek GR prefix to EL"). **Nothing in this spec changes that mapping** — the checksum
below applies to the 9-digit body regardless of which prefix the caller typed.

## Summary of checksum applicability

| Country | Hard checksum | Format-only / `checksum: null` sub-cases |
|---|---|---|
| BG | all numbers (9-digit legal entities; 10-digit persons/foreigners/others via a 3-branch union) | — |
| EL | all numbers | — |
| HU | all numbers | — |
| MT | all numbers | — |
| RO | all numbers | — |

No `checksum: null` sub-cases anywhere in this batch: every one of the five is a hard checksum for
every syntactically valid number.

---

## 1. BG — Bulgaria (Идентификационен номер по ДДС, 9 or 10 digits)

### Format
- **9 digits** — legal entities (the body is the ЕИК/BULSTAT code). Leading zeros are real
  (state institutions' codes start `000…`).
- **10 digits** — physical persons (ЕГН), foreigners (ЛНЧ/PNF) and "others" — three distinct
  check-digit schemes; a number is valid if **any** branch accepts it (both sources implement
  exactly this union).

### 1a. 9 digits — legal entities (two-pass weighted mod 11)
```text
input: d1..d8, check digit d9
pass 1: S = Σ d[i] * i          # weights 1,2,3,4,5,6,7,8
r = S mod 11
if r == 10:
    pass 2: S = Σ d[i] * (i+2)  # weights 3,4,5,6,7,8,9,10
    r = S mod 11
check = r mod 10                # only pass 2 can still yield 10 -> 0
valid iff check == d9
```
stdnum (`calc_check_digit_legal`) and jsvat (`_checkNineLengthVat`) agree exactly, including the
re-weighting trigger and the final `10 → 0` collapse. **No conflicts.**

### 1b. 10 digits — union of three branches
```text
branch EGN (physical persons):
    weights 2,4,8,5,10,9,7,3,6 over d1..d9 ; check = S mod 11 mod 10
    AND the embedded birth date must be a real calendar date:
    YY MM DD with month 1-12 → 1900s, 21-32 (month-20) → 1800s, 41-52 (month-40) → 2000s
branch PNF (foreigners):
    weights 21,19,17,13,11,9,7,3,1 over d1..d9 ; check = S mod 10
branch OTHER ("miscellaneous"):
    weights 4,3,2,7,6,5,4,3,2 over d1..d9 ; check = (11 - S mod 11)
    with (11 - r) == 10 -> no valid check digit ; (11 - r) == 11 -> 0
valid iff ANY branch's check == d10
```
Both sources try the branches in the same order and accept on the first hit. Legal entities whose
BULSTAT is 10-digit (e.g. Bulgarian Academy of Sciences institutes) land in the OTHER branch.

⚠️ **Conflict — EGN date strictness.** stdnum validates the embedded date as a real calendar date
(`datetime.date`, leap years included); jsvat only range-checks the digits by regex and month windows
(e.g. it would take Feb 30). The gap almost never matters because a date-invalid number still falls
through to PNF/OTHER in both libraries; it disagrees only for a number that passes EGN weights, has a
bogus date, and fails the other two branches. **Recommendation:** real calendar-date check (stdnum) —
a few lines, strictly more correct.

**Mutation-derivation warning:** a 10-digit mutation must be verified to fail **all three** branches.
Machine-checked example: `1226046182` (valid via OTHER) mutated to `122604618`**`9`** becomes valid
again *via the EGN branch* (EGN check = 9, date 1812-06-04 parses) — both libraries accept it. Never
assume a single-digit change of a 10-digit BG number is invalid without running all three branches.

### Verified valid numbers
| Number | Holder | Hand computation |
|---|---|---|
| `BG131129282` | Kaufland Bulgaria EOOD & Co KD (imprint/Trade Register) | pass 1: 1·1+3·2+1·3+1·4+2·5+9·6+2·7+8·8 = 156; r = 156 mod 11 = **2** ✓ |
| `BG831385737` | Medical University of Sofia (Wikidata P3608) | pass 1: S = 172; r = **7** ✓ |
| `BG200356710` | Ontotext AD (Wikidata P3608) | pass 1: S = 132; r = **0** ✓ |
| `BG175201304` | Electricity System Operator EAD — **exercises pass 2** (Wikidata P3608) | pass 1: S = 65, r = 10 → pass 2: S = 103, r = **4** ✓ |
| `BG131058063` | Kaufland Bulgaria EOOD — **exercises pass 2** (Trade Register via papagal.bg) | pass 1: S = 131, r = 10 → pass 2: S = 179, r = **3** ✓ |
| `BG000670602` | Univ. of National and World Economy — leading zeros (Wikidata P3608) | pass 1: S = 101; r = **2** ✓ |
| `BG175074752` | (stdnum doctest example) | pass 1: S = 178; r = **2** ✓ |
| `BG1226046182` | Institute of Electrochemistry and Energy Systems, BAS — 10-digit OTHER branch (Wikidata P3608) | EGN check 9 ✗, PNF check 0 ✗, OTHER: S = 119, 119 mod 11 = 9 → 11−9 = **2** ✓ |
| `BG1223022223` | National Center of Infectious and Parasitic Diseases — 10-digit (Wikidata P3608) | OTHER: S = 63, 63 mod 11 = 8 → 11−8 = **3** ✓ (EGN arithmetic also happens to match) |

### Invalid mutations
- `BG131129283` — pass-1 r = 2, got 3 → **InvalidChecksum**.
- `BG175074751` — pass-1 r = 2, got 1 → **InvalidChecksum** (stdnum's own doctest mutation).
- `BG175201305` — pass 1 r = 10 → pass 2 r = 4, got 5 → **InvalidChecksum** (exercises pass-2 rejection).
- `BG1226046183` — 10-digit: EGN 9 ✗, PNF 0 ✗, OTHER 2 ✗ → all three branches fail → **InvalidChecksum**.
- `BG1223022224` — 10-digit: EGN 3 ✗, PNF 2 ✗, OTHER 3 ✗ → **InvalidChecksum**.

### Scope
Hard checksum for all lengths. No `checksum: null` sub-cases.

### Sources
- stdnum [`bg/vat.py`](https://github.com/arthurdejong/python-stdnum/blob/master/stdnum/bg/vat.py), [`bg/egn.py`](https://github.com/arthurdejong/python-stdnum/blob/master/stdnum/bg/egn.py), [`bg/pnf.py`](https://github.com/arthurdejong/python-stdnum/blob/master/stdnum/bg/pnf.py); jsvat `bulgaria.ts`.
- Kaufland Bulgaria imprints/register: [papagal.bg ЕИК 131129282](https://papagal.bg/eik/131129282/1df5), [papagal.bg ЕИК 131058063](https://papagal.bg/eik/131058063/fe90).
- Wikidata P3608: [Medical University of Sofia](https://www.wikidata.org/wiki/Q2454952), Ontotext, Electricity System Operator, UNWE, IEES-BAS, NCIPD (SPARQL over `wdt:P3608`, prefix `BG`).

---

## 2. EL — Greece (ΑΦΜ / ΦΠΑ, 9 digits)

### Format
9 digits. Legacy 8-digit AFMs exist but their canonical VIES form is zero-padded to 9 — stdnum's
`compact()` pads automatically; jsvat's regex demands 9 digits. **Keep our pattern at `^\d{9}$`**
(VIES canonical); callers with a legacy 8-digit AFM must pad it. Prefix note: see the EL/GR
guard-rail at the top — bodies validate identically under either typed prefix.

### Algorithm (powers of two, mod 11 mod 10)
```text
input: d1..d8, check digit d9
S = Σ d[i] * 2^(9-i)            # weights 256,128,64,32,16,8,4,2
check = S mod 11 mod 10         # i.e. remainder 10 collapses to 0
valid iff check == d9
```
stdnum computes the same sum by Horner iteration then `*2 % 11 % 10`; jsvat uses the explicit weight
table `[256,128,64,32,16,8,4,2]` with `total > 9 → 0` after mod 11 — algebraically identical.
**No conflicts.**

### Verified valid numbers
| Number | Holder | Hand computation |
|---|---|---|
| `EL094019245` | OTE S.A. (VIES lookup mirrors) | S = 0·256+9·128+4·64+0·32+1·16+9·8+2·4+4·2 = 1512; 1512 mod 11 = 5 → check **5** ✓ |
| `EL094026421` | Hellenic Post (ELTA) (Wikidata P3608) | S = 1508; mod 11 = 1 → check **1** ✓ |
| `EL090029284` | University of Ioannina (Wikidata P3608) | S = 1280; mod 11 = 4 → check **4** ✓ |
| `EL998708533` | delivery.gr (Wikidata P3608) | S = 4282; mod 11 = 3 → check **3** ✓ |
| `EL998908360` | Ubitech — **exercises the 10 → 0 collapse** (Wikidata P3608) | S = 4344; 4344 mod 11 = 10 → check 10 mod 10 = **0** ✓ |
| `EL997947640` | Lamia Municipality — also collapses 10 → 0 (Wikidata P3608) | S = 4344; mod 11 = 10 → check **0** ✓ |
| `EL094259216` | (stdnum doctest example) | S = 1634; mod 11 = 6 → check **6** ✓ |

(`GR094019245` must also validate and normalise to country `EL` — regression fixture for the
existing mapping, not a new number.)

### Invalid mutations
- `EL094019246` — check 5 expected, got 6 → **InvalidChecksum**.
- `EL194019245` — d1 0→1: S = 1768, mod 11 = 8 ≠ 5 → **InvalidChecksum**.
- `EL998908361` — collapse case mutated: check 0 expected, got 1 → **InvalidChecksum**.

### Scope
Hard checksum for every EL number. No sub-cases.

### Sources
- stdnum [`gr/vat.py`](https://github.com/arthurdejong/python-stdnum/blob/master/stdnum/gr/vat.py); jsvat `greece.ts`.
- OTE attestation: VIES mirrors ([vatnode](https://vatnode.dev/check/GR), [vatify.eu](https://www.vatify.eu/greece-vat-number.html) lineage).
- Wikidata P3608: Hellenic Post, University of Ioannina, delivery.gr, Ubitech, Lamia Municipality.

---

## 3. HU — Hungary (Közösségi adószám, 8 digits)

### Format
8 digits. The EU VAT body is the **first 8 digits** of the domestic 11-digit adószám
(`xxxxxxxx-y-zz`) — the `-y-zz` VAT-status and county suffix never appears in the EU form
(Wizz Air's imprint prints `26648525-2-44`; its EU VAT is `HU26648525`). Neither source
restricts the first digit.

### Algorithm (weighted mod 10)
```text
input: d1..d7, check digit d8
S = Σ d[i] * w[i]               # weights 9,7,3,1,9,7,3
check = (10 - S mod 10) mod 10
valid iff check == d8
```
stdnum states it as Σ over all 8 digits with weights `9,7,3,1,9,7,3,1` ≡ 0 (mod 10) — identical,
since d8's weight is 1. **No conflicts.**

### Verified valid numbers
| Number | Holder | Hand computation |
|---|---|---|
| `HU26648525` | Wizz Air Hungary Zrt. (wizzair.com company-information imprint) | S = 2·9+6·7+6·3+4·1+8·9+5·7+2·3 = 195; (10 − 5) mod 10 = **5** ✓ |
| `HU19308760` | Óbuda University — **check digit 0** (Wikidata P3608) | S = 220; (10 − 0) mod 10 = **0** ✓ |
| `HU15329767` | Hungarian University of Agriculture and Life Sciences (Wikidata P3608) | S = 203; (10 − 3) mod 10 = **7** ✓ |
| `HU12892312` | (stdnum doctest example) | S = 98; (10 − 8) mod 10 = **2** ✓ |

### Invalid mutations
- `HU26648526` — check 5 expected, got 6 → **InvalidChecksum** (stdnum doctests use the same style: `12892313`).
- `HU26649525` — d5 8→9: S = 204, check (10 − 4) = 6 ≠ 5 → **InvalidChecksum**.

### Scope
Hard checksum for every HU number. No sub-cases.

### Sources
- stdnum [`hu/anum.py`](https://github.com/arthurdejong/python-stdnum/blob/master/stdnum/hu/anum.py); jsvat `hungary.ts`.
- Wizz Air imprint: [wizzair.com company information](https://www.wizzair.com/en-gb/information-and-services/about-us/company-information) (tax number 26648525-2-44).
- Wikidata P3608: Óbuda University, MATE.

---

## 4. MT — Malta (VAT Reg. No., 8 digits)

### Format
8 digits, **no leading zero** (stdnum raises InvalidFormat on `0…`; jsvat's regex is `[1-9]\d{7}` —
sources agree). The check is the last **two** digits read as one number `C = 10·d7 + d8`.

### Algorithm (weighted mod 37, two-digit check)
```text
input: d1..d6, check pair C = 10*d7 + d8
S = Σ d[i] * w[i]               # weights 3,4,6,7,8,9 over d1..d6
valid iff (S + C) mod 37 == 0   # stdnum form: full weights 3,4,6,7,8,9,10,1 sum ≡ 0 (mod 37)
# jsvat form: C == 37 - (S mod 37), i.e. requires the canonical representative C ∈ 1..37
```
⚠️ **Conflict — congruence vs canonical range.** stdnum accepts any pair congruent to `−S` mod 37
(so `C`, `C+37`, `C+74` all pass, including `C = 0` when `S ≡ 0`); jsvat (Braemoor / EU-routines
lineage) computes `37 − (S mod 37)` and requires equality, restricting valid pairs to 1..37. All six
real fixtures below have pairs in 1..37, so the disagreement is unobserved in the wild — the tax
office appears to *assign* check pairs by the `37 − (S mod 37)` formula. **Recommendation:** implement
the stdnum congruence (`(S + C) mod 37 == 0`) for the same reason spec 1 chose the widening LV
behaviour: it never hard-fails a number the other source would accept, and a false-accept requires a
typo of exactly ±37 in the final pair, which no single-digit mutation can produce.

### Verified valid numbers
| Number | Holder | Hand computation |
|---|---|---|
| `MT12894031` | University of Malta (Wikidata P3608) | S = 1·3+2·4+8·6+9·7+4·8+0·9 = 154; 154 mod 37 = 6; 37 − 6 = **31** ✓ |
| `MT19134013` | Malta Information Technology Agency (Wikidata P3608) | S = 98; mod 37 = 24; 37 − 24 = **13** ✓ |
| `MT18622630` | King (game company) (Wikidata P3608) | S = 155; mod 37 = 7; 37 − 7 = **30** ✓ |
| `MT12135215` | Epic Malta (telecom) (Wikidata P3608) | S = 96; mod 37 = 22; 37 − 22 = **15** ✓ |
| `MT17981218` | Ministry for Finance (Wikidata P3608) | S = 167; mod 37 = 19; 37 − 19 = **18** ✓ |
| `MT11679112` | (stdnum doctest example) | S = 173; mod 37 = 25; 37 − 25 = **12** ✓ |

*(Caveat: `MT11679112` is checksum-valid in both libraries but a VIES mirror reports it not currently
registered — fine as an algorithm fixture, don't present it as a live registration. Malta publishes no
open VAT register; Wikidata P3608 was the strongest public attestation source.)*

### Invalid mutations
- `MT12894032` — pair 31 expected, got 32 → **InvalidChecksum**.
- `MT19234013` — d3 1→2: S = 104, mod 37 = 30 → expected pair 7 ≠ 13 → **InvalidChecksum**.
- `MT01234567` — leading zero → **InvalidComponent/format** (both sources), before any checksum work.

### Scope
Hard checksum for every MT number. No sub-cases.

### Sources
- stdnum [`mt/vat.py`](https://github.com/arthurdejong/python-stdnum/blob/master/stdnum/mt/vat.py); jsvat `malta.ts` (conflict flagged above).
- Wikidata P3608: [University of Malta](https://www.wikidata.org/wiki/Q470880), MITA, King, Epic Malta, Ministry for Finance (SPARQL over `wdt:P3608`, prefix `MT`).

---

## 5. RO — Romania (Cod de înregistrare în scopuri de TVA, 2–10 digits)

### Format
2 to 10 digits, **no leading zero** (stdnum raises InvalidFormat on `0…`; jsvat's regex is
`[1-9]\d{1,9}` — sources agree). The body is the CUI/CIF company identifier.
**Our current `VAT_PATTERNS.RO` (`/^\d{2,10}$/`) must be tightened to `/^[1-9]\d{1,9}$/`.**

⚠️ Minor — stdnum's `ro/cf.py` additionally accepts a 13-digit CNP (personal code) as a VAT number,
with its own comment "not all sources agree"; jsvat and the VIES format spec cap RO at 10 digits.
**Recommendation:** keep 2–10 digits only; a 13-digit input stays INVALID_FORMAT.

### Algorithm (zero-pad, weighted, ×10 mod 11)
```text
input: body b (2..10 digits); check digit = last digit; head = the rest
padded = head zero-filled to 9 digits
S = Σ padded[i] * w[i]          # weights 7,5,3,2,1,7,5,3,2
check = (10 * S) mod 11 mod 10  # i.e. remainder 10 collapses to 0
valid iff check == last digit
```
jsvat slices its weight table by `10 − length`, which is exactly equivalent to the zero-fill.
**No conflicts** on the algorithm itself.

### Verified valid numbers
| Number | Holder | Hand computation |
|---|---|---|
| `RO1590082` | OMV Petrom SA — 7 digits, exercises padding (listafirme.eu / termene.ro) | padded `000159008`: S = 1·2+5·1+9·7+0·5+0·3+8·2 = 86; 860 mod 11 = 2 → check **2** ✓ |
| `RO361897` | CEC Bank — 6 digits, deepest padding (Wikidata P3608) | padded `000036189`: S = 92; 920 mod 11 = 7 → check **7** ✓ |
| `RO14399840` | Dante International SA (eMAG) (risco.ro register) | padded `001439984`: S = 154; 1540 mod 11 = 0 → check **0** ✓ |
| `RO4433775` | Bucharest University of Economic Studies (Wikidata P3608) | padded `000443377`: S = 83; 830 mod 11 = 5 → check **5** ✓ |
| `RO14814742` | Politehnica University of Bucharest (Wikidata P3608) | padded `001481474`: S = 75; 750 mod 11 = 2 → check **2** ✓ |
| `RO18547290` | (stdnum doctest example) — **exercises the 10 → 0 collapse** | padded `001854729`: S = 111; 1110 mod 11 = 10 → check **0** ✓ |

### Invalid mutations
- `RO1590083` — check 2 expected, got 3 → **InvalidChecksum**.
- `RO24399840` — d1 1→2: padded `002439984`, S = 157, 1570 mod 11 = 8 ≠ 0 → **InvalidChecksum**.
- `RO0590082` — leading zero → **InvalidComponent/format** under the tightened pattern (both sources agree).

### Scope
Hard checksum for every RO number. No sub-cases.

### Sources
- stdnum [`ro/cf.py`](https://github.com/arthurdejong/python-stdnum/blob/master/stdnum/ro/cf.py) + [`ro/cui.py`](https://github.com/arthurdejong/python-stdnum/blob/master/stdnum/ro/cui.py); jsvat `romania.ts`.
- Register attestations: [listafirme.eu OMV Petrom CUI 1590082](https://listafirme.eu/omv-petrom-sa-1590082/), [termene.ro OMV Petrom](https://termene.ro/firma/1590082-OMV-PETROM-SA), [risco.ro Dante International CUI 14399840](https://www.risco.ro/en/verifica-firma/dante-international-cui-14399840).
- Wikidata P3608: CEC Bank, ASE Bucharest, Politehnica Bucharest.

---

## Appendix A — Conflicts index (all ⚠️ items in one place)

| # | Country | Disputed point | Positions | Recommendation |
|---|---|---|---|---|
| 1 | BG | EGN embedded-date strictness (10-digit, EGN branch) | stdnum: real calendar date; jsvat: digit ranges only | Real calendar date (cheap, strictly more correct; rarely observable — failures fall through to PNF/OTHER) |
| 2 | MT | Check pair: congruence vs canonical 1..37 | stdnum: `(S+C) mod 37 == 0`; jsvat: `C == 37 − (S mod 37)` | Congruence (stdnum) — never hard-fails; divergence unobserved in real numbers |
| 3 | RO | 13-digit CNP accepted as VAT | stdnum: accepts (self-doubting comment); jsvat/VIES: 2–10 digits only | Keep 2–10 digits; CNP stays INVALID_FORMAT |

Plus one **format correction** to this repo (not a source conflict): `VAT_PATTERNS.RO` must ban the
leading zero (`/^[1-9]\d{1,9}$/`) — both sources agree on the ban; our current pattern is looser.

## Appendix B — fixture quick-list (all machine-verified through installed python-stdnum 2.2 AND jsvat 2.5.4)

```text
VALID:
BG: BG131129282 BG831385737 BG200356710 BG175201304 BG131058063 BG000670602
    BG175074752 BG1226046182 BG1223022223
EL: EL094019245 EL094026421 EL090029284 EL998708533 EL998908360 EL997947640 EL094259216
    (+ GR094019245 must normalise to EL and validate)
HU: HU26648525 HU19308760 HU15329767 HU12892312
MT: MT12894031 MT19134013 MT18622630 MT12135215 MT17981218 MT11679112
RO: RO1590082 RO361897 RO14399840 RO4433775 RO14814742 RO18547290

INVALID (checksum unless noted):
BG: BG131129283 BG175074751 BG175201305 BG1226046183 BG1223022224
EL: EL094019246 EL194019245 EL998908361
HU: HU26648526 HU26649525
MT: MT12894032 MT19234013 MT01234567(format: leading zero)
RO: RO1590083 RO24399840 RO0590082(format: leading zero)

DO NOT use as an invalid fixture (looks like a mutation, actually VALID):
BG1226046189 — passes via the EGN branch; see the BG mutation-derivation warning.
```
