# @alosha/eu-validate

Validate EU **VAT**, **IBAN**, and Dutch **BSN/KvK** numbers — offline, zero-dependency, fully typed. Add live **VIES + KvK** lookups with one API key.

[![npm](https://img.shields.io/npm/v/@alosha/eu-validate.svg)](https://www.npmjs.com/package/@alosha/eu-validate)

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

## Coverage (V1)

- **VAT checksum:** NL · BE · DE · FR · ES · IT · LU · PT · FI · DK · SE · PL · SI · EE (14 countries)
- **VAT format-only:** the rest of the EU-27 (`checks.checksum` is `null`)
- **IBAN:** all SEPA / IBAN-registry countries
- **BSN / KvK:** 🇳🇱 NL
- **Postal codes:** NL, DE, FR, BE, ES, IT

Country checksum coverage grows release over release.

### Note on NL VAT

The NL checksum uses the 11-proof on the first 9 digits, which validates company (legal-entity) numbers. Some sole-trader BTW-id numbers issued since 2020 are randomized and won't satisfy the 11-proof — use the Cloud `verifyVAT()` to confirm those against VIES.

## Develop

```bash
npm install
npm run build   # tsup → ESM + CJS + d.ts
npm test        # jest
npm run lint
```

## License

MIT © Eduardo Silvanavarrete
