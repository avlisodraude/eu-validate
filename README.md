# @alosha/eu-validate

Validate EU **VAT**, **IBAN**, and Dutch **BSN/KvK** numbers — offline, zero-dependency, fully typed. Add live **VIES + KvK** lookups with one API key.

[![npm version](https://img.shields.io/npm/v/@alosha/eu-validate)](https://www.npmjs.com/package/@alosha/eu-validate)
[![npm downloads](https://img.shields.io/npm/dm/@alosha/eu-validate)](https://www.npmjs.com/package/@alosha/eu-validate)
[![Gzip size](https://img.shields.io/bundlephobia/minzip/@alosha/eu-validate)](https://unpkg.com/@alosha/eu-validate/dist/index.js)
[![Types included](https://img.shields.io/badge/types-included-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**▶ [Try the live demo](https://eu-validate.alosha.dev/demo)** — validate VAT, IBAN, BSN, KvK and postal codes right in your browser. No install, nothing uploaded.

- ✅ **Zero runtime dependencies** — pure, deterministic checks. Nothing is fetched.
- 🧮 **Real checksums**, not just regex — VAT (NL, BE, DE, FR, ES, IT), IBAN (ISO 13616 mod-97), Dutch BSN (11-proof).
- 🌍 **Format validation for all 27 EU VAT formats** + SEPA IBAN lengths.
- 🔠 **One consistent result shape** across every identifier type.
- 🧩 **Tree-shakeable** ESM + CJS, TypeScript types included.
- ☁️ **Optional Cloud client** for VIES registration checks and KvK company lookups.

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

Input is cleaned automatically (spaces, dots, dashes, casing), so `nl 1234.567.82 b01` works too.

### The result shape

Every validator returns the same object:

```ts
interface ValidationResult {
  valid: boolean              // offline format + checksum validity
  input: string               // your original input
  normalized: string | null   // canonical form
  country: string | null      // ISO alpha-2
  type: 'vat' | 'iban' | 'bsn' | 'kvk' | 'postalCode'
  checks: { format: boolean; checksum: boolean | null }  // null = no checksum for this case
  errors: string[]            // 'INVALID_FORMAT' | 'CHECKSUM_FAILED' | ...
}
```

### Dispatcher

When the type is known at runtime (e.g. a form field):

```ts
import { validate } from '@alosha/eu-validate'

validate('1011 AB', { type: 'postalCode', country: 'NL' })
```

### Convenience helpers

For call sites that want to branch or throw instead of checking `.valid` by hand:

```ts
import { validateIBAN, isValid, assertValid, ValidationError } from '@alosha/eu-validate'

const r = validateIBAN('NL91ABNA0417164300')

if (isValid(r)) {
  // r narrowed to valid: true
}

try {
  const checked = assertValid(validateIBAN(input)) // throws ValidationError if invalid
} catch (e) {
  if (e instanceof ValidationError) {
    console.log(e.result.errors) // the failing ValidationResult
  }
}
```

## Production recipes

Real problems, complete solutions — copy, paste, ship.

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

**Why it works:** the offline checksum filters out typos and fabricated numbers for free, so the slow, rate-limited VIES call only ever runs on structurally valid input. You cut checkout latency and stop burning your VIES quota on garbage.

### Validate Dutch BSN and IBAN without sending PII anywhere

**The problem:** an onboarding form collects a BSN and IBAN, but shipping those to a third-party validation API is a GDPR data-egress problem.

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

**Why it works:** every validator is a pure function with no network call, so sensitive identifiers like a BSN never reach an external processor. You get instant inline form feedback and one fewer data-processing agreement to sign.

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
    return { status: (live.registered ? 'registered' : 'not_registered') as const, company: live.name }
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

**Why it works:** `verifyVAT()` throws typed errors instead of a generic `Error`, so a Cloud outage or the not-yet-shipped Phase 3 endpoint never gets confused with "the VAT number is wrong." The offline checksum already did the hard rejection work, so every Cloud failure mode here degrades to "unconfirmed" instead of blocking the user.

### Reject malformed identifiers at the edge of your API

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

**Why it works:** the checksum pass is synchronous and free, so a list of 10,000 numbers is sorted into "worth a VIES call" and "already known bad" in milliseconds, with the specific error code attached to every rejected row for the finance team to act on. You spend VIES quota only on numbers that have a chance of being real.

## What "valid" means

This library answers **"is this well-formed?"** — it never makes a network request, so it cannot tell you whether a number is *registered* or belongs to a real company. For that, use the Cloud client.

| | Offline (this library) | Cloud (`/cloud`) |
|---|---|---|
| VAT | format + checksum | VIES lookup — registered & active, with name/address |
| KvK | format (8 digits) | KvK register — company name, status, address |
| IBAN | mod-97 + length | — (offline is enough) |
| BSN | 11-proof | — (no public lookup) |

```ts
import { createClient } from '@alosha/eu-validate/cloud'

const eu = createClient({ apiKey: process.env.ALOSHA_KEY! })
await eu.verifyVAT('NL123456782B01') // → VIES result
await eu.lookupKvK('69599084')       // → KvK company data
```

> The Cloud API ships in a later release. The client surface is stable today.

Calling `verifyVAT()` / `lookupKvK()` today throws a typed `CloudNotAvailableError` (rather than a generic `Error`) so you can catch it specifically while the hosted API is still in Phase 3. Once it ships, the client throws `CloudTimeoutError` (request exceeded `timeoutMs`) or `CloudApiError` (non-2xx response, with `status`/`statusText`/`body`) — all three are exported from `@alosha/eu-validate/cloud`.

## Coverage (V1)

- **VAT checksum:** NL · BE · DE · FR · ES · IT · LU · PT · FI · DK · SE · PL · SI · EE (14 countries)
- **VAT format-only:** the rest of the EU-27 (`checks.checksum` is `null`)
- **IBAN:** all SEPA / IBAN-registry countries
- **BSN / KvK:** 🇳🇱 NL
- **Postal codes:** NL, DE, FR, BE, ES, IT

Country checksum coverage grows release over release.

### Note on NL VAT

The NL checksum uses the 11-proof on the first 9 digits, which validates company (legal-entity) numbers. Some sole-trader BTW-id numbers issued since 2020 are randomized and won't satisfy the 11-proof — use the Cloud `verifyVAT()` to confirm those against VIES.

### Note on Greece: GR vs EL

Greece's ISO 3166-1 country code is `GR`, but its VAT prefix is `EL`. `validateVAT()` accepts a `GR...` input and normalizes it to `EL...` — so a Greek VAT result's `country` field is `'EL'`. `validateIBAN()` (and `validatePostalCode()`) instead use the ISO code, so a Greek IBAN/postal result's `country` field is `'GR'`. This isn't a bug — VIES itself uses `EL` — but if you're cross-referencing a VAT result against an IBAN result for the same Greek business, compare on `'EL' === 'GR' ? ...` logic rather than assuming the `country` fields match.

### Note on FR VAT and `CHECKSUM_NOT_VERIFIABLE`

French VAT numbers can have either a numeric key (formula-checkable) or an alphabetic key (not formula-checkable offline). For the alphabetic-key case, `validateVAT()` returns `valid: true` with `checks.checksum: null` and `errors: ['CHECKSUM_NOT_VERIFIABLE']` — the format is confirmed correct, but the checksum itself couldn't be confirmed. This is the one case where `errors` is non-empty on a valid result; check `checks.checksum === null` if you want to distinguish "checksum verified" from "checksum not checkable" programmatically.

## Develop

```bash
npm install
npm run build   # tsup → ESM + CJS + d.ts
npm test        # jest
npm run lint
```

## Support & custom work

`@alosha/eu-validate` is free and MIT-licensed, and always will be. When you need more than offline validation, there's a paid path backed by the maintainer — not a ticket queue:

- **Cloud lookups** — hosted VIES VAT registration and KvK company lookups via `@alosha/eu-validate/cloud` (coming soon).
- **Priority support** — a direct line to the person who wrote it, with prioritised fixes.
- **Custom work** — extra country coverage or custom validators on request.

Get in touch at [alosha.dev/support](https://alosha.dev/support).

## License

MIT © Eduardo Silvanavarrete

---

Docs & live demo: [eu-validate.alosha.dev](https://eu-validate.alosha.dev) · Built by [Alosha](https://alosha.dev)
