# @alosha/eu-validate

Validate EU **VAT**, **IBAN**, and Dutch **BSN/KvK** numbers — offline, zero-dependency, fully typed. VAT checksums for all 27 EU countries. Live **VIES + KvK** lookups coming soon.

[![npm version](https://img.shields.io/npm/v/@alosha/eu-validate)](https://www.npmjs.com/package/@alosha/eu-validate)
[![npm downloads](https://img.shields.io/npm/dm/@alosha/eu-validate)](https://www.npmjs.com/package/@alosha/eu-validate)
[![Gzip size](https://img.shields.io/bundlephobia/minzip/@alosha/eu-validate)](https://unpkg.com/@alosha/eu-validate/dist/index.js)
[![Types included](https://img.shields.io/badge/types-included-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**▶ [Try the live demo](https://eu-validate.alosha.dev/demo)** — validate VAT, IBAN, BSN, KvK and postal codes right in your browser. No install, nothing uploaded.

- ✅ **Zero runtime dependencies** — pure, deterministic checks. Nothing is fetched.
- 🧮 **Real checksums**, not just regex — VAT for all 27 EU countries, IBAN (national structure + ISO 13616 mod-97), Dutch BSN (11-proof).
- 🌍 **Country format rules:** all 27 EU VAT prefixes and 89 national IBAN layouts.
- 🔠 **One consistent result shape** across every identifier type.
- 🧩 **Tree-shakeable** ESM + CJS, TypeScript types included.
- ☁️ **Optional Cloud client included** for future VIES registration and KvK lookups — the hosted service is planned.

## Release 0.6.0

Version **0.6.0** includes the input-safety, postal-coverage, error-privacy and
national IBAN improvements described below. Upgrade from 0.5.0 using the
[offline migration notes](https://github.com/avlisodraude/eu-validate/blob/main/docs/offline-validation.md).
The maintenance and offline changes were merged through
[PR #1](https://github.com/avlisodraude/eu-validate/pull/1) and
[PR #2](https://github.com/avlisodraude/eu-validate/pull/2).
See the [changelog](https://github.com/avlisodraude/eu-validate/blob/main/CHANGELOG.md)
and [documentation index](https://github.com/avlisodraude/eu-validate/blob/main/docs/README.md)
for release history and implementation status. The hosted Cloud service remains planned.

## Install

```bash
npm i @alosha/eu-validate
```

## Usage

```ts
import { validateVAT, validateIBAN, validateBSN } from '@alosha/eu-validate'

validateVAT('NL123456782B01')
// { valid: true, normalized: 'NL123456782B01', country: 'NL', type: 'vat',
//   checks: { format: true, checksum: true }, errors: [] }

validateIBAN('NL91 ABNA 0417 1643 00')
// { valid: true, normalized: 'NL91ABNA0417164300', country: 'NL', ... }

validateBSN('111222333')
// { valid: true, ... }
```

VAT, IBAN, BSN and KvK inputs are cleaned automatically (spaces, dots, dashes, slashes and casing); postal inputs are trimmed and uppercased. For example, `nl 1234.567.82 b01` works too.

### The result shape

Offline validators share this result shape. Postal results add an optional format-coverage field:

```ts
interface ValidationResult {
  valid: boolean              // offline format + checksum validity
  input: string               // original string, or empty for a non-string input
  normalized: string | null   // canonical form
  country: string | null      // ISO alpha-2; VAT uses EL for Greece
  type: 'vat' | 'iban' | 'bsn' | 'kvk' | 'postalCode'
  checks: {
    format: boolean
    formatSupported?: boolean // postal only: whether a country rule is available
    checksum: boolean | null  // null = not checked / not available for this case
  }
  errors: string[]            // 'INVALID_FORMAT' | 'CHECKSUM_FAILED' | ...
}
```

Import the full `ValidationResult`, `InvalidOptionsResult` and `ErrorCode` types
from the package when building integrations. `valid` confirms only the checks
that could run; it does not establish registration, existence or ownership.

### Dispatcher

When the type is known at runtime (e.g. a form field):

```ts
import { validate } from '@alosha/eu-validate'

validate('1011 AB', { type: 'postalCode', country: 'NL' })
```

Missing or unknown dispatcher types return `valid: false`, `type: null` and
`errors: ['INVALID_OPTIONS']`. This is the separate `InvalidOptionsResult` shape.
For options coming from an untyped source, handle `type === null` before using
helpers that require `ValidationResult`.

### Input safety and postal coverage

Offline validators accept at most `MAX_INPUT_LENGTH` (256) UTF-16 code units of
raw input, before trimming or normalization. Longer strings return `INPUT_TOO_LONG`.
JavaScript callers passing a non-string get `INVALID_INPUT` with `input: ''`;
no automatic string coercion is performed. Empty and whitespace-only strings within the limit still return `EMPTY_INPUT`.
Malformed dispatcher options return `INVALID_OPTIONS` with `type: null` instead of
throwing or returning undefined. Typed calls with a valid `ValidateOptions` retain
the existing `ValidationResult` return type.

Postal results include `checks.formatSupported`. The default preserves historical
acceptance for EU countries without a format rule; a true `valid` value with
`formatSupported: false` does **not** confirm the postal format. New applications
that require a verified format should opt into strict mode:

```ts
import { validatePostalCode, validate } from '@alosha/eu-validate'

validatePostalCode('D02 AF30', { country: 'IE', strict: true })
// valid: false, errors: ['FORMAT_NOT_SUPPORTED'], checks.formatSupported: false
validate('1011 AB', { type: 'postalCode', country: 'NL', strict: true })
// valid: true, checks.formatSupported: true
```

`EU_COUNTRIES` uses ISO codes (`GR` for Greece). VAT results and
`VAT_CHECKSUM_SUPPORTED` keep `EL`; postal validation accepts `EL` as an alias and
returns `GR`. `ValidationError` messages omit the identifier and its `result`
property is non-enumerable; deliberate access through `error.result` is preserved.
Avoid explicitly logging that result if it contains sensitive data.

See the [API reference](https://github.com/avlisodraude/eu-validate/blob/main/docs/api.md)
for all error codes and the [offline validation migration notes](https://github.com/avlisodraude/eu-validate/blob/main/docs/offline-validation.md)
for behavior changes and registry provenance.

### Convenience helpers

For call sites that want to branch or throw instead of checking `.valid` by hand:

```ts
import { validateIBAN, isValid, assertValid, ValidationError } from '@alosha/eu-validate'

const input = 'NL91ABNA0417164300'
const r = validateIBAN(input)

if (isValid(r)) {
  // r narrowed to valid: true
}

try {
  const checked = assertValid(validateIBAN(input)) // throws ValidationError if invalid
} catch (e) {
  if (e instanceof ValidationError) {
    console.log(e.result.errors) // codes only; result.input contains the identifier
  }
}
```

## Production recipes

Offline recipes are ready to run. Recipes using `/cloud` illustrate the client API for future hosted lookups; the hosted VIES/KvK service is coming soon. Keep API keys on your server.

### Reject bad VAT numbers before you ever call VIES

**The problem:** a B2B checkout must apply reverse-charge VAT, but VIES is slow, rate-limited, and rejects malformed input anyway.

```ts
import { validateVAT } from '@alosha/eu-validate'
import { createClient } from '@alosha/eu-validate/cloud'

const eu = createClient({ apiKey: process.env.ALOSHA_KEY! })

export async function resolveVat(input: string) {
  // 1. Offline first — structure + checksum, zero network, instant.
  const offline = validateVAT(input)
  if (!offline.valid) {
    return { ok: false, reason: offline.errors[0] } // e.g. 'CHECKSUM_FAILED'
  }

  // 2. Spend a VIES round-trip only on numbers that already pass the checksum.
  const live = await eu.verifyVAT(offline.normalized!)
  return { ok: live.registered, company: live.name }
}
```

**Why it works:** offline checks reject malformed values and checksum failures before a future live lookup, so the slow, rate-limited VIES call only ever runs on structurally valid input. You cut checkout latency and stop burning your VIES quota on garbage.

### Validate Dutch BSN and IBAN without sending PII anywhere

**The problem:** an onboarding form needs to check a BSN and IBAN without sending those identifiers to a third-party validator.

```ts
import { validateBSN, validateIBAN } from '@alosha/eu-validate'

// Pure, synchronous, offline — the values never leave the user's session.
export function validateOnboarding(form: { bsn: string; iban: string }) {
  const bsn = validateBSN(form.bsn)
  const iban = validateIBAN(form.iban)

  return {
    valid: bsn.valid && iban.valid,
    fields: {
      bsn: bsn.valid ? null : bsn.errors[0],   // e.g. 'CHECKSUM_FAILED'
      iban: iban.valid ? null : iban.errors[0] // e.g. 'INVALID_FORMAT'
    }
  }
}
```

**Why it works:** every validator is a pure function with no network call, so sensitive identifiers like a BSN never reach an external processor. The application still controls how those values are stored or logged.

### Confirm VAT registration when you can, fall back gracefully when you can't

**The problem:** a live VIES registration check on top of the offline checksum can fail for reasons that have nothing to do with the VAT number — the hosted endpoint isn't live yet, a timeout, a bad response — and none of those should look like "this VAT is invalid."

```ts
import { validateVAT } from '@alosha/eu-validate'
import { createClient, CloudNotAvailableError, CloudTimeoutError, CloudApiError } from '@alosha/eu-validate/cloud'

const eu = createClient({ apiKey: process.env.ALOSHA_KEY! })

export async function checkVat(input: string) {
  const offline = validateVAT(input)
  if (!offline.valid) {
    return { status: 'invalid' as const, reason: offline.errors[0] }
  }

  try {
    const live = await eu.verifyVAT(offline.normalized!)
    return { status: live.registered ? 'registered' as const : 'not_registered' as const, company: live.name }
  } catch (err) {
    if (err instanceof CloudNotAvailableError) {
      // Hosted lookups aren't live yet — the offline checksum already passed, so degrade
      // instead of failing the request.
      return { status: 'format_valid_unconfirmed' as const, reason: 'cloud_not_available' }
    }
    if (err instanceof CloudTimeoutError || err instanceof CloudApiError) {
      // Transient — don't tell the user their VAT number is wrong because VIES hiccuped.
      return { status: 'format_valid_unconfirmed' as const, reason: 'cloud_error' }
    }
    throw err
  }
}
```

**Why it works:** `verifyVAT()` throws typed errors instead of a generic `Error`, so a Cloud outage or a not-yet-deployed hosted endpoint never gets confused with "the VAT number is wrong." The offline checksum already did the hard rejection work, so every Cloud failure mode here degrades to "unconfirmed" instead of blocking the user.

### Reject malformed identifiers at the edge of your API

This integration example assumes Express is installed in your application; it is
not a dependency of this package.

**The problem:** every route that accepts a VAT, IBAN or BSN re-implements the same `if (!result.valid) return res.status(400)...` boilerplate, and it's easy for one route to forget a field.

```ts
import express from 'express'
import { validateIBAN, validateVAT, assertValid, ValidationError } from '@alosha/eu-validate'

const app = express()
app.use(express.json())

app.post('/payouts', (req, res) => {
  try {
    const iban = assertValid(validateIBAN(req.body.iban))
    const vat = assertValid(validateVAT(req.body.vat))
    return res.json({ ok: true, iban: iban.normalized, vat: vat.normalized })
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).json({ ok: false, type: err.result.type, errors: err.result.errors })
    }
    throw err
  }
})
```

**Why it works:** `assertValid()` turns the usual "check `.valid`, then branch" dance into a single throw, so one `catch` block at the route boundary handles every identifier field the same way. `ValidationError` carries the full failing `ValidationResult`, so the 400 response tells the caller exactly which field and error code failed — no per-route boilerplate.

### Validate a full Dutch company-onboarding form in one pass

**The problem:** a B2B signup form for the Netherlands collects four different identifier types — KvK, BSN, IBAN, VAT — and hand-wiring four separate `validateX()` calls means the field list and the validator list drift apart as the form grows.

```ts
import { validate, type ValidateOptions } from '@alosha/eu-validate'

const ONBOARDING_FIELDS: Record<string, ValidateOptions> = {
  kvkNumber: { type: 'kvk' },
  bsn: { type: 'bsn' },
  iban: { type: 'iban' },
  vatNumber: { type: 'vat' }
}

export function validateOnboardingForm(form: Record<string, string>) {
  const fields = Object.fromEntries(
    Object.entries(ONBOARDING_FIELDS).map(([field, options]) => [
      field,
      validate(form[field] ?? '', options)
    ])
  )

  return {
    valid: Object.values(fields).every((r) => r.valid),
    fields // each entry is a full ValidationResult — keep `errors` for inline form feedback
  }
}
```

**Why it works:** the dispatcher means the field list is the single source of truth — add a row to `ONBOARDING_FIELDS` and the loop picks it up, instead of a fifth hand-written `validateX()` call drifting out of sync with the form. Every field still gets the same typed `ValidationResult`, so existing per-field error rendering keeps working unchanged.

### Clean up a customer VAT list before a VIES batch run

This small example assumes unquoted comma-separated fields. Use a CSV parser
when handling quoted fields, embedded commas or line breaks, and protect files
containing customer identifiers. The standalone example in `examples/` uses
inline demonstration rows and writes no files.

**The problem:** a finance team exports thousands of customer VAT numbers for a quarterly VIES re-verification, and running every row through VIES — typos, copy-paste artifacts and all — wastes the rate-limited quota on input that was never going to pass.

```ts
import { readFileSync, writeFileSync } from 'node:fs'
import { validateVAT } from '@alosha/eu-validate'

const rows = readFileSync('customers.csv', 'utf8')
  .trim()
  .split('\n')
  .slice(1) // drop header
  .map((line) => line.split(','))

const clean: string[] = ['customer_id,vat_number']
const rejected: string[] = ['customer_id,vat_number,error']

for (const [customerId, vat] of rows) {
  const result = validateVAT(vat)
  if (result.valid) {
    clean.push(`${customerId},${result.normalized}`)
  } else {
    rejected.push(`${customerId},${vat},${result.errors[0]}`)
  }
}

writeFileSync('clean.csv', clean.join('\n'))
writeFileSync('rejected.csv', rejected.join('\n'))
console.log(`${clean.length - 1} clean, ${rejected.length - 1} rejected — only clean.csv needs a VIES call.`)
```

**Why it works:** the offline pass separates checksum or format failures from values eligible for a future registration lookup. Passing an offline check does not establish that a company or identifier exists.

## What "valid" means

The main entry reports offline format/checksum results for its implemented rules. Postal coverage must also be considered as described above. It never makes a network request and cannot establish whether a number is *registered* or belongs to a real company. The separate `/cloud` client makes network requests for those lookups; the hosted service is coming soon.

| | Offline (this library) | Cloud (`/cloud`, coming soon) |
|---|---|---|
| VAT | format + checksum | VIES lookup — registered & active, with name/address |
| KvK | format (8 digits) | KvK register — company name, status, address |
| IBAN | national layout + length + mod-97 | — (no existence/ownership check) |
| BSN | 11-proof | — (no public lookup) |

```ts
import { createClient } from '@alosha/eu-validate/cloud'

const eu = createClient({ apiKey: process.env.ALOSHA_KEY! })
await eu.verifyVAT('NL123456782B01') // → VIES result
await eu.lookupKvK('69599084')       // → KvK company data
```

> The hosted Cloud API is coming soon. The client already attempts HTTP requests, but the examples above do not establish service availability. Handle `CloudNotAvailableError` as shown in the fallback recipe.

If the hosted endpoint isn't deployed yet (404, or the connection fails at the DNS/socket level), `verifyVAT()` / `lookupKvK()` throw a typed `CloudNotAvailableError` (rather than a generic `Error`) so you can catch it specifically. The client already throws `CloudTimeoutError` when a request exceeds `timeoutMs` and `CloudApiError` for other non-2xx responses (with `status`/`statusText`/`body`) — all three are exported from `@alosha/eu-validate/cloud`.

## Offline coverage in this checkout

- **VAT checksum:** all 27 EU countries. `checks.checksum` is `null` only for
  per-number sub-cases with no offline-checkable formula (FR alphabetic keys,
  CZ pre-1954 birth numbers, LV natural persons).
- **IBAN:** national character rules, length and mod-97 for all 89 countries in SWIFT IBAN Registry release 103 (September 2026)
- **BSN / KvK:** 🇳🇱 NL
- **Postal format rules:** NL, DE, FR, BE, ES, IT. Other EU countries are unverified in default mode and return `FORMAT_NOT_SUPPORTED` in strict mode.

### Note on NL VAT

The NL checksum validates both number styles offline. Company (legal-entity) numbers pass the 11-proof on the first 9 digits. Sole-trader BTW-id numbers issued since 2020 are randomized and deliberately fail the 11-proof, but instead satisfy a mod-97 check over the full `NL`-prefixed string (letters converted to digits, A=10..Z=35). `checkNL` accepts a number if *either* check passes.

### Note on Greece: GR vs EL

Greece's ISO 3166-1 country code is `GR`, but its VAT prefix is `EL`. `validateVAT()` accepts a `GR...` input and normalizes it to `EL...` — so a Greek VAT result's `country` field is `'EL'`. `validateIBAN()` (and `validatePostalCode()`) instead use the ISO code, so a Greek IBAN/postal result's `country` field is `'GR'`. This isn't a bug — VIES itself uses `EL` — but if you're cross-referencing a VAT result against an IBAN result for the same Greek business, map VAT `EL` to ISO `GR` before comparing country fields. `EU_COUNTRIES` uses `GR`; `VAT_CHECKSUM_SUPPORTED` uses `EL`.

### Note on FR VAT and `CHECKSUM_NOT_VERIFIABLE`

French VAT numbers can have either a numeric key (formula-checkable) or an alphabetic key (not formula-checkable offline). For the alphabetic-key case, `validateVAT()` returns `valid: true` with `checks.checksum: null` and `errors: ['CHECKSUM_NOT_VERIFIABLE']` — the format is confirmed correct, but the checksum itself couldn't be confirmed. Other VAT sub-cases and legacy acceptance of unsupported postal formats can also carry this informational code; use `checks.checksum === true` to require a confirmed checksum, and inspect `checks.formatSupported` for postal coverage.

## Develop

Use Node 22.22.1+ (or a supported Node 24.11+ / 26 release) for development.
CI checks Node 22, 24, and 26. `nvm use` selects the Node 22 development line.
The library build retains its Node 18 syntax target for compatibility; development tooling requires a newer Node version.

```bash
npm ci
npm run verify  # lint, build, 400 tests, packed runtime/types checks, audit gate
npm run build   # tsup → ESM + CJS + d.ts
npm test        # jest
npm run lint
```

`npm run release` publishes manually and runs the complete verification gate through
`prepublishOnly` before uploading. Ordinary `npm publish` uses the same gate.
Before publishing, choose the next version, review the behavior changes in the
migration notes, and move the matching changelog entries out of Unreleased.
No new version is published by running build, tests or verification.

Remaining development audit findings and the TypeScript migration blockers are tracked in
[maintenance follow-ups](https://github.com/avlisodraude/eu-validate/blob/main/docs/maintenance-follow-ups.md). The proposed backend work is described
in the [Cloud service plan](https://github.com/avlisodraude/eu-validate/blob/main/docs/cloud-service-plan.md).

## Support & custom work

`@alosha/eu-validate` is free and MIT-licensed, and always will be. When you need more than offline validation, there's a paid path backed by the maintainer — not a ticket queue:

- **Cloud lookups** — hosted VIES VAT registration and KvK company lookups via `@alosha/eu-validate/cloud` (coming soon).
- **Priority support** — a direct line to the person who wrote it, with prioritised fixes.
- **Custom work** — extra country coverage or custom validators on request.

Get in touch at [alosha.dev/support](https://alosha.dev/support).

## License

MIT © Eduardo Silva Navarrete

---

Docs & live demo: [eu-validate.alosha.dev](https://eu-validate.alosha.dev) · Built by [Alosha](https://alosha.dev)
