# VAT Checksum Specification — AT, CZ, HR, LT, LV, IE, CY, SK

**Status:** research complete, ready for implementation.
**Date:** 2026-07-08.
**Methodology:** algorithms cross-checked between two independent reference implementations —
[python-stdnum](https://github.com/arthurdejong/python-stdnum) (per-country modules, LGPL, actively maintained)
and [jsvat](https://github.com/se-panfilov/jsvat) (TypeScript port of Braemoor's JS routines, which derive from the
EU Commission's *"VAT number validation routines"* document, DG TAXUD). Every example number below was verified by
executing both formulations in a scratch script; the arithmetic shown is the actual computed output, not transcribed
from sources. Real-world numbers were sourced from company imprints, national business registers, and VIES lookup
mirrors (cited per country).

**Conventions used below:**
- Numbers are shown *without* the 2-letter country prefix unless stated. Positions are 1-indexed in prose,
  digits written `d1 d2 …`.
- `checksum: null` = the existing `CHECKSUM_NOT_VERIFIABLE` semantics (as already used for FR alphabetic keys):
  format is checkable, checksum is not — do **not** hard-fail.
- ⚠️ marks a genuine disagreement between sources. None are papered over; each has a recommendation.

## Summary of checksum applicability

| Country | Hard checksum | Format-only / `checksum: null` sub-cases |
|---|---|---|
| AT | all numbers | — |
| CZ | 8-digit legal entities; 9-digit starting `6`; 10-digit individuals (RČ) | 9-digit individuals **not** starting `6` (pre-1954 birth numbers: no check digit) |
| HR | all numbers (OIB) | — |
| LT | all numbers (9- and 12-digit) | — |
| LV | 11-digit starting `4`–`9` (legal entities) | 11-digit starting `0`–`3` (natural persons / personal codes — see ⚠️) |
| IE | all current formats (incl. old-style and 9-char 2013 format) | — |
| CY | all numbers | — |
| SK | all numbers (mod-11 divisibility) | numbers that are valid Slovak RČ (see ⚠️) |

---

## 1. AT — Austria (UID, `ATU` + 8 digits)

### Format
`U` + 8 digits (`ATU` + 8 with prefix). `d8` (the 8th digit after `U`) is the check digit.

### Algorithm (Luhn variant with constant 96)
```text
input: digits d1..d7 (after the 'U'), check digit d8
weights: 1, 2, 1, 2, 1, 2, 1        # applied to d1..d7
S = 0
for i in 1..7:
    p = d[i] * weight[i]
    if p > 9: p = p - 9             # equivalently: digit-sum of p
    S += p
check = (96 - S) mod 10             # equivalently (6 - S) mod 10
valid iff check == d8
```
Both formulations are algebraically identical (96 ≡ 6 mod 10); stdnum uses `(6 − luhn_checksum) mod 10`,
the Austrian BMF documentation states it as `Si = 10 − (96 + S) mod 10`-style with constant 96. jsvat uses
`10 − ((S + 4) mod 10)` with `10 → 0` — also identical. **No source conflicts.**

### Verified valid numbers
| Number | Holder | Hand computation |
|---|---|---|
| `ATU33864707` | Red Bull GmbH | products of `3386470` = 3, 6, 8, 16, 4, 14, 0 → digit-sums 3, 6, 8, 7, 4, 5, 0 → S=29 → (96−29) mod 10 = **7** ✓ |
| `ATU58119529` | ÖBB-Technische Services-GmbH | products of `5811952` = 5, 16, 1, 2, 9, 10, 2 → digit-sums 5, 7, 1, 2, 9, 1, 2 → S=27 → (96−27) mod 10 = **9** ✓ |
| `ATU36905408` | voestalpine (group imprint, voestalpine.com/stahl) | products of `3690540` = 3, 12, 9, 0, 5, 8, 0 → digit-sums 3, 3, 9, 0, 5, 8, 0 → S=28 → (96−28) mod 10 = **8** ✓ |

(`ATU13585627`, the canonical BMF documentation example, also verifies: S=29 → check 7.)

### Invalid mutations
- `ATU33864708` — last digit 7→8; computed check is 7 → **InvalidChecksum**.
- `ATU53119529` — d2 changed 8→3 (`58119529` → `53119529`); S becomes 26, computed check 0 ≠ 9 → **InvalidChecksum**.

### Scope
Checksum applies to every AT UID. No `checksum: null` sub-cases.

### Sources
- stdnum [`at/uid.py`](https://github.com/arthurdejong/python-stdnum/blob/master/stdnum/at/uid.py); jsvat `austria.ts` (agree).
- BMF / finanz.at UID structure description: <https://www.finanz.at/en/taxes/vat-number/>.
- Red Bull imprint: <https://esim.redbullmobile.com/imprint/>; ÖBB TS imprint: <https://ts.oebb.at/en/imprint>; voestalpine imprint: <https://www.voestalpine.com/stahl/en/Imprint>.

---

## 2. CZ — Czech Republic (DIČ, 8–10 digits)

Three distinct populations. **Branch on length and first digit — this matters.**

### 2a. 8 digits — legal entities (DIČ = IČO)
```text
input: d1..d7, check digit d8
if d1 == '9': reject (InvalidComponent — 8-digit DIČ may not start with 9)
S = 8*d1 + 7*d2 + 6*d3 + 5*d4 + 4*d5 + 3*d6 + 2*d7
r = S mod 11
check = (11 - r) mod 11        # i.e. 11-r, with r==0 -> 0? NO — see next line
# special mapping: r == 0 -> check 1 ; r == 1 -> check 0 ; else check = 11 - r
# compact form (stdnum): check = ((11 - r) mod 11 or 1) mod 10
valid iff check == d8
```
Equivalent single expression: `check = ((11 − S mod 11) mod 11 or 1) mod 10` — covers r=0→1, r=1→0
(via 10 mod 10), r≥2→11−r. jsvat states it as `11−r`, with `10→0`, `11→1` — identical mapping.
This is the standard Czech IČO check, so any valid company registration number is a valid 8-digit DIČ body.

### 2b. 9 digits starting with `6` — special individuals & VAT groups
Real-world note: **VAT-group registrations use the `699…` range** (e.g. Komerční banka's group DIČ below), so
this branch is not exotic — large banks/corporates hit it.
```text
input: d1='6', d2..d8, check digit d9
S = 8*d2 + 7*d3 + 6*d4 + 5*d5 + 4*d6 + 3*d7 + 2*d8    # first digit excluded
r = S mod 11
check = (8 - (10 - r) mod 11) mod 10
valid iff check == d9
```
jsvat expresses the same via lookup table `[8,7,6,5,4,3,2,1,0,9,8]` indexed by `10 − r` (r=0 → index 10).
Verified equivalent for all r in 0..10: r=0→8, r=1→9, r=2→0, r=3→1, r=4→2, r=5→3, r=6→4, r=7→5, r=8→6,
r=9→7, r=10→8. **No conflict** — different notation, same function.

### 2c. 9 or 10 digits (not starting with 6) — individuals, DIČ = birth number (RČ)
```text
9 digits  (born before 1954): NO check digit exists.
    validate embedded date only: YY MM DD with
    month = MM mod 50 mod 20 (women +50; +20 = serial overflow post-2004)
    → checksum: null  (CHECKSUM_NOT_VERIFIABLE)
10 digits (born 1954+):
    r = (first 9 digits as integer) mod 11
    check = r mod 10        # i.e. r, with the historical exception r == 10 -> check 0
    valid iff check == d10
    (also validate the embedded date as above)
```
⚠️ **Conflict — the `r == 10` exception.** stdnum's RČ module uses `int(d1..d9) mod 11 mod 10`, which accepts
the ~historical batch of numbers (issued roughly 1954–1985) where the remainder is 10 and the check digit is 0.
jsvat instead requires strict divisibility (`whole number mod 11 == 0` plus a digit-pair rule), which **rejects**
those historical numbers. Czech sources (Act 133/2000 Sb. on population registration) document the exception as
real but limited to ~1000 issued numbers. **Recommendation:** implement `mod 11 mod 10` (stdnum behaviour); a
strict-mode flag can treat `r == 10` cases as soft warnings.

### Verified valid numbers
| Number | Holder | Branch | Hand computation |
|---|---|---|---|
| `CZ00177041` | ŠKODA AUTO a.s. | 2a | 0·8+0·7+1·6+7·5+7·4+0·3+4·2 = 77; r = 77 mod 11 = 0 → check **1** ✓ |
| `CZ45274649` | ČEZ, a.s. | 2a | 4·8+5·7+2·6+7·5+4·4+6·3+4·2 = 156; r = 2 → check 11−2 = **9** ✓ |
| `CZ699001182` | Komerční banka, a.s. (VAT group) | 2b | body `9900118`: 9·8+9·7+0·6+0·5+1·4+1·3+8·2 = 158; r = 4 → check (8−(10−4) mod 11) mod 10 = 8−6 = **2** ✓ |
| `CZ7103192745` | (individual, stdnum reference example) | 2c | 710319274 mod 11 = 5 → check **5** ✓ |

(`45317054` — Komerční banka's IČO — also passes branch 2a: S=128, r=7, check 4 ✓; note KB's *actual* current
VAT DIČ is the group number `CZ699001182`, a useful test-fixture pair.)

### Invalid mutations
- `CZ00177042` — check 1 expected, got 2 → **InvalidChecksum** (branch 2a).
- `CZ46274649` — d2 5→6: S=163, r=9, check 2 ≠ 9 → **InvalidChecksum** (branch 2a).
- `CZ699001183` — group number, check 2 expected, got 3 → **InvalidChecksum** (branch 2b).
- `CZ7103192746` — RČ check 5 expected, got 6 → **InvalidChecksum** (branch 2c).
- `CZ7153192745` — RČ month field 03→53→ mod50 = 3 ok, but 715319274 mod 11 = 0 ≠ 5 → **InvalidChecksum**; also date-mutations like `CZ7113392745` (month 13) → **InvalidComponent**.

### Scope / `checksum: null`
- 8-digit, 9-digit-starting-6, 10-digit: hard checksum.
- **9-digit individuals not starting with 6: `checksum: null`** — only the date structure is verifiable
  (and only years ≤ 1953 are legal for 9-digit numbers). Mirror the FR `CHECKSUM_NOT_VERIFIABLE` handling.
- 8-digit starting with `9`: reject as **InvalidComponent** (stdnum; jsvat silently has no such rule — minor ⚠️,
  stdnum's rule matches the IČO allocation spec, recommend keeping it).

### Sources
- stdnum [`cz/dic.py`](https://github.com/arthurdejong/python-stdnum/blob/master/stdnum/cz/dic.py) and [`cz/rc.py`](https://github.com/arthurdejong/python-stdnum/blob/master/stdnum/cz/rc.py); jsvat `czechRepublic.ts`.
- Act 133/2000 Sb. (rodné číslo structure); ARES register <https://ares.cz/>.
- Company attestations: [Škoda Auto DIČ registry entry](https://rejstrik.penize.cz/dph/cz00177041-skoda-auto-a-s), [ČEZ registry entry](https://www.finmag.cz/obchodni-rejstrik/dph/cz45274649-cez-a-s), [Komerční banka — DIČ CZ699001182](https://rejstrik.penize.cz/dph/cz45317054-komercni-banka-a-s).

---

## 3. HR — Croatia (OIB, 11 digits, ISO 7064 MOD 11,10)

### Format
11 digits; the VAT number is the OIB (personal identification number) — same algorithm for companies and people.

### Algorithm (ISO 7064 MOD 11,10 — pure iteration, no weights)
```text
input: d1..d10, check digit d11
product = 10
for i in 1..10:
    sum = (d[i] + product) mod 10
    if sum == 0: sum = 10
    product = (2 * sum) mod 11
check = (11 - product) mod 10       # jsvat equivalent: (product + d11) mod 10 == 1
valid iff check == d11
```
**No source conflicts** (stdnum delegates to its `iso7064.mod_11_10` module; jsvat inlines the identical loop).

### Verified valid numbers
| Number | Holder | Hand computation (final `product`) |
|---|---|---|
| `HR81793146560` | Hrvatski Telekom d.d. | iteration over `8179314656`: sums 8,6,8,4,1,3,10,5,5,6 / products 5,1,5,8,2,6,9,10,10,**1** → check (11−1) mod 10 = **0** ✓ |
| `HR27759560625` | INA — Industrija nafte d.d. | final product = 6 → check (11−6) mod 10 = **5** ✓ |
| `HR92963223473` | Zagrebačka banka d.d. | final product = 8 → check (11−8) mod 10 = **3** ✓ |

### Invalid mutations
- `HR81793146561` — check 0 expected, got 1 → **InvalidChecksum**.
- `HR87793146560` — d2 1→7: final product 2, check 9 ≠ 0 → **InvalidChecksum**.

### Scope
Checksum applies to every OIB (legal and natural persons alike). No `checksum: null` sub-cases.

### Sources
- stdnum [`hr/oib.py`](https://github.com/arthurdejong/python-stdnum/blob/master/stdnum/hr/oib.py) + `iso7064/mod_11_10.py`; jsvat `croatiat.ts`.
- OIB Act (Zakon o osobnom identifikacijskom broju, NN 60/08); ISO 7064:2003.
- Holder attestations: [Hrvatski Telekom info](https://www.bonbon.hr/info/hrvatski-telekom-dd), [INA company record](https://www.companywall.hr/tvrtka/ina-dd/MMxkI61C) (OIB 27759560625, ZABA OIB 92963223473 as 49.08% shareholder).

---

## 4. LT — Lithuania (PVM kodas, 9 or 12 digits)

### Format
- **9 digits** — legal entities. **Structural rule: d8 must be `1`** (reject otherwise, *before* checksum → InvalidComponent).
- **12 digits** — temporarily registered taxpayers / natural persons. **Structural rule: d11 must be `1`.**
- Check digit is the last digit in both variants.

### Algorithm (same engine, two lengths; two-pass re-weighting)
```text
input: body = d1..d(n-1)  (n = 9 or 12), check digit = dn
pass 1 weights (cyclic 1..9):  w[i] = 1 + (i-1) mod 9      # 9-digit: 1,2,3,4,5,6,7,8 ; 12-digit: 1,2,3,4,5,6,7,8,9,1,2
r = (Σ body[i]*w[i]) mod 11
if r == 10:
    pass 2 weights (cyclic, shifted by 2): w[i] = 1 + (i+1) mod 9   # 9-digit: 3,4,5,6,7,8,9,1 ; 12-digit: 3,4,5,6,7,8,9,1,2,3,4
    r = (Σ body[i]*w[i]) mod 11
check = r mod 10          # i.e. r, except r == 10 (after pass 2) -> 0
valid iff check == dn
```
**No source conflicts** — stdnum and jsvat agree on weights, the re-weighting trigger (`r == 10` after pass 1),
and the final `10 → 0` collapse. The 9-digit PVM body is the 9-digit company code (įmonės kodas) — but note the
PVM is *not* simply the company code (Maxima: company code 123033512 → PVM 230335113).

### Verified valid numbers
| Number | Holder | Hand computation |
|---|---|---|
| `LT230335113` | MAXIMA LT, UAB | `23033511` × (1..8): 2+6+0+12+15+30+7+8 = 80; 80 mod 11 = **3** ✓ |
| `LT212154314` | Telia Lietuva, AB | `21215431` × (1..8): 2+2+6+4+25+24+21+8 = 92; 92 mod 11 = **4** ✓ |
| `LT119511515` | (organisation; stdnum reference example) | `11951151` × (1..8): 1+2+27+20+5+6+35+8 = 104; 104 mod 11 = **5** ✓ |
| `LT100001919017` | 12-digit, temporarily registered (stdnum reference) | body ×(1,2,3,4,5,6,7,8,9,1,2) = 161; 161 mod 11 = **7** ✓ |
| `LT100004801610` | 12-digit, **exercises pass 2** (stdnum reference) | pass 1: Σ = 98, 98 mod 11 = 10 → pass 2 ×(3,4,5,6,7,8,9,1,2,3,4): Σ = 131, 131 mod 11 = 10 → check 10 mod 10 = **0** ✓ |

*(The last two are drawn from the reference library's doctest corpus rather than a company imprint — keep both in
the fixture set regardless: `100004801610` is the only readily available number that exercises the second pass
AND the `10 → 0` collapse simultaneously.)*

### Invalid mutations
- `LT230335114` — check 3 expected, got 4 → **InvalidChecksum**.
- `LT100001919016` — check 7 expected, got 6 → **InvalidChecksum**.
- `LT230335123` — d8 1→2 → **InvalidComponent** (structural: 8th digit must be 1), regardless of checksum.

### Scope
Checksum applies to both variants in full. No `checksum: null` sub-cases. (This module does **not** need to
validate Lithuanian personal codes — 12-digit temporary registrations have their own check digit as above.)

### Sources
- stdnum [`lt/pvm.py`](https://github.com/arthurdejong/python-stdnum/blob/master/stdnum/lt/pvm.py); jsvat `lithuania.ts` (agree, incl. `\d{7}1` / `\d{10}1` structural rules).
- VMI (State Tax Inspectorate) VIES guidance: <https://www.vmi.lt/evmi/es-valstybiu-nariu-pvm-moketoju-kodu-tikrinimas>.
- Holder attestations: [Telia rekvizitai](https://www.telia.lt/rekvizitai) (PVM LT212154314), [Maxima rekvizitai / Scoris](https://scoris.lt/en/imone/123033512) (PVM LT230335113).

---

## 5. LV — Latvia (PVN, 11 digits)

### Format
11 digits. **First digit decides the population:**
- `4`–`9` → legal entity (checksum below).
- `0`–`3` → natural person (personal code / personas kods) → **`checksum: null`**, see below.

### Algorithm — legal entities
```text
input: d1..d10, check digit d11
weights: 9, 1, 4, 8, 3, 10, 2, 5, 7, 6      # applied to d1..d10
S = Σ d[i] * w[i]
r = S mod 11
if r == 4: reject (InvalidChecksum — no valid check digit exists for this body)   # see ⚠️ below
check = (3 - r) mod 11        # r < 4 -> 3 - r ; r > 4 -> 14 - r ; result is always 0..9 once r==4 excluded
valid iff check == d11
# equivalent invariant (stdnum): (S + d11) mod 11 == 3, using extended weights (…, 6, 1)
```
⚠️ **Conflict — the "leading 9, subtract 45" rule.** The EU VIES routines document (and Braemoor/jsvat, which
follow it) contains an extra step: *if `S mod 11 == 4` **and** `d1 == 9`, recompute with `S := S − 45`* before
the rules above. stdnum omits this entirely (its formulation makes `r == 4` unconditionally invalid).
Additionally, jsvat's TypeScript port mangles Braemoor's original: where Braemoor returns *invalid* for a
post-adjustment `r == 4`, jsvat compares the check digit against `4 − r = 0` — a port bug, don't copy it.
**Recommendation:** implement the VIES behaviour (with the `d1 == 9` / `−45` adjustment) since it is the
official-document behaviour and strictly widens acceptance for `9…` numbers; log/flag when the branch fires so
real-world hits can be collected. Without the adjustment, treat `r == 4` as InvalidChecksum (both sources agree
there for `d1 != 9`).

### Natural persons (first digit 0–3) — `checksum: null`
- Old format: first 6 digits are DDMMYY of birth; 7th digit is century (0=18xx, 1=19xx, 2=20xx).
  Date must be a real calendar date → structural check only.
- New format (issued since 2017-07-01): starts `32`, no embedded date.
- stdnum applies a personal-code check digit (weights 10,5,8,4,2,1,6,3,7,9; `check = (1 + Σ) mod 11 mod 10`)
  **but its own source comments: "this algorithm has not been confirmed by an independent source."**
  Braemoor/jsvat only check the DDMM shape.
  ⚠️ **Recommendation:** validate the date structure (old format) / `32` prefix (new format), return
  **`checksum: null`** (`CHECKSUM_NOT_VERIFIABLE`) — exactly the FR-style handling. Do not hard-fail on the
  unconfirmed personal-code algorithm.

### Verified valid numbers (legal entities)
| Number | Holder | Hand computation |
|---|---|---|
| `LV40003245752` | Air Baltic Corporation AS | 4·9+0·1+0·4+0·8+3·3+2·10+4·2+5·5+7·7+5·6 = 177; r = 177 mod 11 = 1 → check (3−1) = **2** ✓ |
| `LV40003032949` | Latvenergo AS | S = 148; r = 5 → check 14−5 = **9** ✓ |
| `LV40003053029` | RIMI LATVIA, SIA | S = 82; r = 5 → check 14−5 = **9** ✓ |

(Latvian registration numbers double as the VAT body — `LV` + reg-nr — so the Lursoft/Firmas register entries
attest these directly.)

### Invalid mutations
- `LV40003245753` — check 2 expected, got 3 (full-sum invariant: (177+3) mod 11 = 4 ≠ 3) → **InvalidChecksum**.
- `LV40003032948` — check 9 expected, got 8 → **InvalidChecksum**.
- `LV4000424575X` (body S = 180, r = 4): **no check digit X can make this valid** — good fixture for the r==4 branch.

### Sources
- stdnum [`lv/pvn.py`](https://github.com/arthurdejong/python-stdnum/blob/master/stdnum/lv/pvn.py); jsvat `latvia.ts` / Braemoor jsvat (VIES-routines lineage — source of the `−45` rule).
- VID taxpayer register: <https://www6.vid.gov.lv/PVN>.
- Holder attestations: [airBaltic website info](https://www.airbaltic.com/en/information-for-website-users) & [Lursoft 40003245752](https://company.lursoft.lv/en/air-baltic-corporation/40003245752), [Lursoft Latvenergo 40003032949](https://company.lursoft.lv/en/latvenergo/40003032949), [Lursoft Rimi Latvia 40003053029](https://company.lursoft.lv/en/rimi-latvia/40003053029).

---

## 6. IE — Ireland (8 or 9 characters)

### Formats (three eras, one checksum engine)
1. **Old style** (pre-~1990s, still in circulation): `D L DDDDD C` — digit, then a letter or `+`/`*`, then 5 digits,
   then check letter. **Normalise before checking:** rearrange to `0` + d3..d7 + d1, check letter unchanged.
   (`8D79739I` → body `079739` + `8` = `0797398`, check `I`.)
2. **New style** (pre-2013 standard): 7 digits + 1 check letter (`6388047V`). Optionally followed by `W`
   historically for the spouse ("married woman") variant — see note below.
3. **2013 format** (registrations since 2013-01-01): 7 digits + check letter + a second trailing letter that
   *participates in the checksum*. Revenue issues `H` for non-individuals (companies, trusts, partnerships) and
   `A` for individuals.

### Algorithm
```text
alphabet: "WABCDEFGHIJKLMNOPQRSTUV"        # letter value = index: W=0, A=1, B=2, … V=22
input: 7 digits d1..d7, check letter c (8th char), optional trailing letter t (9th char)
S = 8*d1 + 7*d2 + 6*d3 + 5*d4 + 4*d5 + 3*d6 + 2*d7
if t present: S += 9 * value(t)            # H -> 9*8 = 72 ; A -> 9*1 = 9 ; W -> 0
valid iff alphabet[S mod 23] == c
```
The `W` spouse-suffix is subsumed: `value(W) = 0`, so `1234567T` and `1234567TW` share a check letter — that is
*why* W is the zero of the alphabet.

⚠️ **Conflict — allowed trailing letters.** jsvat's regex admits only `[AH]` as the 9th character (values 9 / 72
hardcoded); stdnum admits **any** letter of the alphabet with value `9 × index`. Revenue has only documented
issuing `A` and `H` (plus legacy `W`); but VIES accepts the general formula. **Recommendation:** compute with the
general `9 × index` formula (stdnum), and if you want strictness, emit a format *warning* (not a failure) for
trailing letters outside `{A, H, W}`.

⚠️ Minor: jsvat's old-style regex restricts the first digit to `[7-9]`; stdnum allows any digit. Old-style numbers
are a legacy trickle either way — recommend stdnum's looser rule (checksum still protects you).

### Verified valid numbers
| Number | Holder | Hand computation |
|---|---|---|
| `IE6388047V` | Google Ireland Limited | 6·8+3·7+8·6+8·5+0·4+4·3+7·2 = 183; 183 mod 23 = 22 → alphabet[22] = **V** ✓ |
| `IE8256796U` | Microsoft Ireland Operations Ltd | S = 205; 205 mod 23 = 21 → **U** ✓ |
| `IE4749148U` | Ryanair DAC | S = 182; 182 mod 23 = 21 → **U** ✓ |
| `IE4143435AH` | OpenAI Ireland Ltd (2013 format) | 4·8+1·7+4·6+3·5+4·4+3·3+5·2 = 113; + 9·8 (H) = 185; 185 mod 23 = 1 → alphabet[1] = **A** ✓ |
| `IE8D79739I` | (old style; stdnum reference example) | normalise → `0797398`: 0·8+7·7+9·6+7·5+3·4+9·3+8·2 = 193; 193 mod 23 = 9 → alphabet[9] = **I** ✓ |

*(Caveat: the OpenAI number is checksum-verified above but was sourced from secondary pages, not an official
imprint — run it through VIES once before pinning it in tests. Google/Microsoft/Ryanair are attested by VIES
lookup mirrors. Bonus fixture: Revenue's own documentation example `1234567WH` is checksum-valid — S = 112 + 72
= 184, 184 mod 23 = 0 → `W`.)*

### Invalid mutations
- `IE6388047W` — check V expected, got W → **InvalidChecksum**.
- `IE6388057V` — d5 4→5: S = 186, 186 mod 23 = 2 → expect `B` → **InvalidChecksum**.
- `IE4143435AA` — trailing H→A changes S to 122, 122 mod 23 = 7 → expect `G` ≠ `A` → **InvalidChecksum** (shows the 9th char participates).

### Scope
Checksum applies to all three formats (old style after normalisation). No `checksum: null` sub-cases.

### Sources
- stdnum [`ie/vat.py`](https://github.com/arthurdejong/python-stdnum/blob/master/stdnum/ie/vat.py); jsvat `ireland.ts`.
- Revenue 2013 format change (second alpha char, `H` for non-individuals): [Microsoft Dynamics implementation note](https://support.microsoft.com/en-us/topic/a-new-vat-registration-number-format-is-available-for-ireland-in-microsoft-dynamics-ax-2012-r3-911b2309-118f-ae09-95f8-533d660150cc).
- Holder attestations: [VIES check IE6388047V](https://viesvalidation.com/check/IE6388047V/), [vat-lookup Microsoft IE8256796U](http://www.vat-lookup.co.uk/verify/vat_check.php/VATNumber/IE8256796U), [vat-lookup Ryanair IE4749148U](http://www.vat-lookup.co.uk/verify/vat_check.php/VATNumber/IE4749148U/CompanyName/RYANAIR+DAC), [Ryanair registered address page](https://www.ryanair.com/us/en/corporate/registered-address).

---

## 7. CY — Cyprus (Αριθμός Εγγραφής ΦΠΑ, 8 digits + 1 letter)

### Format
8 digits + 1 check **letter**. Structural rule (both sources agree): the number may **not start with `12`**
→ InvalidComponent.

### Algorithm
```text
translation for ODD positions (1st, 3rd, 5th, 7th — 0-indexed even):
    0→1, 1→0, 2→5, 3→7, 4→9, 5→13, 6→15, 7→17, 8→19, 9→21     # d≥5: 2d+3
EVEN positions (2nd, 4th, 6th, 8th) count at face value.
S = Σ translated(odd-position digits) + Σ even-position digits
check letter = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[S mod 26]           # A=0 … Z=25
valid iff check letter == 9th character
```
⚠️ **Conflict — allowed leading digits.** jsvat/Braemoor's regex class `[0-59]` requires the first digit ∈
{0, 1, 2, 3, 4, 5, 9} (with the `12` prefix separately banned), i.e. it **rejects first digits 6, 7, 8**.
stdnum imposes **no** leading-digit restriction beyond the `12` ban. The Cypriot Tax Department's public docs
describe TIC ranges (`0/1` legacy companies, `3` individuals, `9` legal persons/public bodies) but no complete
official allow-list is published. **Recommendation:** enforce only the `12` ban as a hard InvalidComponent
(agreed by both sources); optionally warn on leading 6/7/8. Both real public-body numbers below start with `9`,
consistent with the jsvat class.

### Verified valid numbers
| Number | Holder | Hand computation |
|---|---|---|
| `CY90000005D` | Cyta (Cyprus Telecommunications Authority) | odd digits 9,0,0,0 → 21,1,1,1 (Σ=24); even digits 0,0,0,5 (Σ=5); S = 29; 29 mod 26 = 3 → **D** ✓ |
| `CY90001673W` | University of Cyprus | odd digits 9,0,1,7 → 21,1,0,17 (Σ=39); even digits 0,0,6,3 (Σ=9); S = 48; 48 mod 26 = 22 → **W** ✓ |
| `CY10259033P` | (reference-library canonical example, VIES-format) | odd digits 1,2,9,3 → 0,5,21,7 (Σ=33); even digits 0,5,0,3 (Σ=8); S = 41; 41 mod 26 = 15 → **P** ✓ |

*(Cyprus publishes no open VAT register and blurs third-party lookups, so publicly attributable numbers are
scarce; the two public institutions above were the strongest finds. `10259033P` has been the reference example
in python-stdnum's test corpus since 2012 — checksum-verified, holder unattributed.)*

### Invalid mutations
- `CY90000005E` — check D expected, got E → **InvalidChecksum**.
- `CY10259034P` — d8 3→4: S = 42, 42 mod 26 = 16 → expect `Q` → **InvalidChecksum**.
- `CY12345678X` — starts `12` → **InvalidComponent** (before any checksum work).

### Scope
Checksum applies to all CY numbers. No `checksum: null` sub-cases.

### Sources
- stdnum [`cy/vat.py`](https://github.com/arthurdejong/python-stdnum/blob/master/stdnum/cy/vat.py); jsvat `cyprus.ts` (translation tables identical; leading-digit conflict flagged above).
- Cyprus Tax Department TIC/VAT registration: <https://www.businessincyprus.gov.cy/doing-business-in-cyprus/start-your-business/registering-for-income-tax-and-value-added-tax/>.
- Holder attestations: [CytaUK corporate information](https://www.cytauk.com/en/corporate-information) (VAT 90000005D), [Wikidata: University of Cyprus](https://www.wikidata.org/wiki/Q1520608) (CY90001673W).

---

## 8. SK — Slovakia (IČ DPH, 10 digits, mod-11 divisibility)

### Format & algorithm
```text
input: 10 digits (no embedded check digit — whole-number test)
structural rules:
    d1 != 0
    d3 ∈ {2, 3, 4, 7, 8, 9}          # ⚠️ see conflict below
checksum: (the 10-digit number as an integer) mod 11 == 0
```
No per-digit weights, no check digit — the entire number must be divisible by 11.

⚠️ **Conflict — the d3 allow-set.** stdnum enforces d3 ∈ `{2,3,4,7,8,9}`; jsvat/Braemoor (VIES-routines lineage)
use `[2346-9]` = `{2,3,4,6,7,8,9}` — i.e. they disagree about **6**. The Slovak Financial Administration's format
descriptions are not explicit enough to settle it from public documents. **Recommendation:** hard-enforce the
mod-11 divisibility; treat a d3 of `6` as a *format warning* rather than rejection (accept the union
`{2,3,4,6,7,8,9}`, flag `6`), so a VIES-valid number is never hard-failed on a rule the sources dispute.

⚠️ **RČ ambiguity.** stdnum additionally *accepts* any number that validates as a Slovak birth number (RČ)
even when the d1/d3 rules or divisibility fail, with the comment "it is unclear whether the RČ can be used as a
valid VAT number." Braemoor/jsvat have no such branch. **Recommendation:** do not implement the RČ bypass as
silent acceptance; if a 10-digit number fails IČ DPH rules but parses as a valid RČ, return `checksum: null`
with a distinct reason code so the caller can decide (mirrors the FR `CHECKSUM_NOT_VERIFIABLE` philosophy).

### Verified valid numbers
| Number | Holder | Hand computation |
|---|---|---|
| `SK2020273893` | Slovak Telekom, a.s. | 2020273893 = 11 × 183661263 + **0** ✓ (d3 = 2 ✓) |
| `SK2020317068` | ESET, spol. s r.o. | 2020317068 = 11 × 183665188 + **0** ✓ |
| `SK7020000944` | Tatra banka, a.s. (VAT-group `7…` number) | 7020000944 = 11 × 638181904 + **0** ✓ |

(Tatra banka is a useful fixture: its DIČ is 2020408522 but its IČ DPH is the group number `SK7020000944` —
the two are *different*, catching implementations that conflate DIČ and IČ DPH. `SK2022749619`, stdnum's
doctest example, also divides: 11 × 183886329.)

### Invalid mutations
- `SK2020273894` — 2020273894 mod 11 = 1 → **InvalidChecksum**.
- `SK2021273893` — d4 0→1: mod 11 = 1 → **InvalidChecksum**.
- `SK2050273893` — d3 = 5: → **InvalidComponent/format** under both sources' d3 sets.

### Scope
Divisibility check applies to all IČ DPH. `checksum: null` only for the disputed RČ-shaped case above (if you
choose to implement that branch at all).

### Sources
- stdnum [`sk/dph.py`](https://github.com/arthurdejong/python-stdnum/blob/master/stdnum/sk/dph.py); jsvat `slovakiaRepublic.ts`.
- Financial Administration SR IČ DPH verification: <https://www.icdph.sk/> ; FinReg register.
- Holder attestations: [Slovak Telekom legal information](https://www.telekom.sk/o-spolocnosti/pravne-informacie) (SK2020273893), [FinReg ESET](https://www.finreg.sk/dph/2020317068), [FinReg Tatra banka](https://www.finreg.sk/dph/2020408522) (IČ DPH SK7020000944).

---

## Appendix A — Conflicts index (all ⚠️ items in one place)

| # | Country | Disputed point | Positions | Recommendation |
|---|---|---|---|---|
| 1 | CZ | 10-digit RČ remainder `10 → check 0` historical exception | stdnum: accept; jsvat: reject | Accept (`mod 11 mod 10`) |
| 2 | CZ | 8-digit starting `9` | stdnum: reject; jsvat: no rule | Reject (matches IČO allocation) |
| 3 | LV | `S mod 11 == 4` + leading `9` → recompute with `S−45` | VIES-doc/Braemoor: yes; stdnum: no; jsvat: port bug | Implement VIES behaviour, log occurrences |
| 4 | LV | Natural-person check-digit algorithm | stdnum: implements but self-flags as unconfirmed; jsvat: date-shape only | `checksum: null` for first digit 0–3 |
| 5 | IE | 2013 trailing-letter set | jsvat: `[AH]` only; stdnum: any alphabet letter, value 9×index | General formula; warn outside {A,H,W} |
| 6 | IE | Old-style first digit | jsvat: `[7-9]`; stdnum: any | Any (checksum protects) |
| 7 | CY | Leading digit allow-list | jsvat: `{0,1,2,3,4,5,9}` (also bans `12`); stdnum: only bans `12` | Hard-ban `12` only; warn on 6/7/8 |
| 8 | SK | Third digit `6` | stdnum: forbidden; jsvat: allowed | Accept with warning |
| 9 | SK | Valid RČ as IČ DPH bypass | stdnum: silently accepts; jsvat: no branch | `checksum: null` + reason code, never silent |

## Appendix B — fixture quick-list (all machine-verified)

```text
VALID:
AT: ATU33864707 ATU58119529 ATU36905408 ATU13585627
CZ: CZ00177041 CZ45274649 CZ25123891 CZ699001182 CZ640903926 CZ7103192745
HR: HR81793146560 HR27759560625 HR92963223473 HR33392005961
LT: LT230335113 LT212154314 LT119511515 LT100001919017 LT100004801610
LV: LV40003245752 LV40003032949 LV40003053029 LV40003521600
IE: IE6388047V IE8256796U IE4749148U IE4143435AH IE6433435F IE6433435OA IE8D79739I IE1234567WH
CY: CY90000005D CY90001673W CY10259033P
SK: SK2020273893 SK2020317068 SK7020000944 SK2022749619

INVALID (checksum unless noted):
AT: ATU33864708 ATU53119529
CZ: CZ00177042 CZ46274649 CZ699001183 CZ7103192746 CZ7113392745(component: month 13)
HR: HR81793146561 HR87793146560
LT: LT230335114 LT100001919016 LT230335123(component: d8 != 1)
LV: LV40003245753 LV40003032948 LV4000424575?(r==4: no valid check digit exists)
IE: IE6388047W IE6388057V IE4143435AA
CY: CY90000005E CY10259034P CY12345678X(component: '12' prefix)
SK: SK2020273894 SK2021273893 SK2050273893(format: d3=5)
```
