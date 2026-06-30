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
