# Offline API reference

This reference describes the current unreleased checkout. The published npm
version is still 0.5.0; see [release status](README.md#release-and-implementation-status)
before relying on new options or error codes in an installed package.

## Functions

Import offline APIs from `@alosha/eu-validate`. They are synchronous and do not
perform network requests.

| Function | Checks |
| --- | --- |
| `validateVAT(input)` | EU VAT prefix, country format and an available country checksum |
| `validateIBAN(input)` | Registry country, exact length, national character layout and mod-97 |
| `validateBSN(input)` | Dutch 8/9-digit format and 11-proof; all-zero values fail |
| `validateKvK(input)` | Eight-digit Dutch KvK format; checksum is null |
| `validatePostalCode(input, { country, strict? })` | A supported country postal pattern or explicit coverage result |
| `validate(input, { type, country?, strict? })` | Dispatch to the requested validator; `country`/`strict` apply to postal codes |
| `isValid(result)` | Check and narrow `valid: true`; it does not require a confirmed checksum |
| `assertValid(result)` | Return the valid result or throw `ValidationError` |

The identifier argument is a string in TypeScript. Runtime guards handle ordinary
non-string JavaScript inputs without coercion. Valid dispatcher options use
`type: 'vat' | 'iban' | 'bsn' | 'kvk' | 'postalCode'`.

## Results

`ValidationResult` has `valid`, `input`, `normalized`, `country`, `type`, `checks`
and `errors`. The original string is preserved in `input`; a non-string runtime
input is represented as an empty string. `normalized` is null when validation
stops before normalization. The country is null when it cannot be derived.

- `checks.format`: whether the format passed. For legacy postal acceptance when
  no pattern exists, this remains true for compatibility; inspect coverage too.
- `checks.formatSupported`: postal metadata. For a call reaching country-format
  checks, true means a pattern exists and false means there is no supported rule.
  Early input/option failures do not establish country coverage.
- `checks.checksum`: true/false for a performed checksum, null if a checksum did
  not run or cannot be checked for the specific identifier.
- `errors`: machine-readable codes. A valid result may contain the informational
  `CHECKSUM_NOT_VERIFIABLE` code. An empty array alone does not prove registration.

Missing or unknown dispatcher types return `InvalidOptionsResult`, with the same
base fields but `valid: false`, `type: null` and `INVALID_OPTIONS`. For arbitrary
options, handle this case before calling helpers that require `ValidationResult`.

```ts
import { validate, assertValid } from '@alosha/eu-validate'

const options: unknown = { type: 'iban' }
const result = validate('NL91ABNA0417164300', options)
if (result.type === null) {
  console.log(result.errors) // invalid options; no recognized identifier type
} else if (result.valid) {
  const accepted = assertValid(result)
  console.log(accepted.type) // identifier kind only
}
```

## Error codes

| Code | Meaning |
| --- | --- |
| `INVALID_INPUT` | A non-string was supplied to an offline validator |
| `INPUT_TOO_LONG` | Raw input exceeds 256 UTF-16 code units |
| `EMPTY_INPUT` | Input is empty or whitespace-only within the raw length limit |
| `INVALID_OPTIONS` | Dispatcher type/options or postal country/strict options are malformed |
| `COUNTRY_REQUIRED` | Postal country is missing or blank |
| `UNKNOWN_COUNTRY` | VAT/IBAN country has no supported rule |
| `UNSUPPORTED_COUNTRY` | Postal country is outside the supported EU country set |
| `FORMAT_NOT_SUPPORTED` | Postal strict mode requires a format rule that is not available |
| `INVALID_FORMAT` | A supported identifier fails its format or country-length rules |
| `CHECKSUM_FAILED` | The performed checksum failed |
| `CHECKSUM_NOT_VERIFIABLE` | Informational VAT checksum exception or legacy postal coverage gap |

Recognized validators check non-string input, raw length and blank input before
normalization. Thus even an all-whitespace string longer than the limit produces
`INPUT_TOO_LONG`. Malformed dispatcher options are rejected before routing.
Validation reports the first applicable failure; it does not collect every
possible problem with the request.

## Postal options

Country codes are trimmed and uppercased. `GR` is Greece's ISO code; the historical
`EL` postal alias is accepted and normalized to `GR`. Country values must be
strings of at most 16 raw code units and contain two ASCII letters after trimming.
`strict`, if supplied, must be a boolean.

Format rules currently exist for NL, DE, FR, BE, ES and IT. Other EU countries
have `formatSupported: false`. Default mode retains historical acceptance;
strict mode returns `FORMAT_NOT_SUPPORTED` and `valid: false`. That error means
coverage is absent, not that the postal code is known to be invalid.

```ts
import { validatePostalCode } from '@alosha/eu-validate'

validatePostalCode('1011 AB', { country: 'NL', strict: true }) // supported, valid
validatePostalCode('D02 AF30', { country: 'IE', strict: true }) // unverified, rejected
validatePostalCode('D02 AF30', { country: 'IE' }) // accepted with formatSupported: false
```

## Data and types

The main entry also exports `MAX_INPUT_LENGTH`, `EU_COUNTRIES`,
`VAT_CHECKSUM_SUPPORTED`, `VAT_PATTERNS`, `IBAN_PATTERNS`, `IBAN_LENGTHS` and
`POSTAL_PATTERNS`. Treat exported validation tables as reference data; mutating
them can change validation behavior. `POSTAL_PATTERNS` is partial.

`EU_COUNTRIES` uses ISO `GR`; the VAT-specific tables use `EL`. The runtime
`CountryCode` type remains a string, so country support is determined by the
validator's data. Exported types include `ValidationResult`, `InvalidOptionsResult`,
`ValidateOptions`, `PostalCodeOptions`, `IdentifierType`, `CountryCode` and `ErrorCode`.

IBAN data comes from SWIFT registry release 103, September 2026, with 89 official
examples in the tests. These checks do not establish bank allocation, account
existence, ownership or every domestic account checksum. See [source and migration
details](offline-validation.md#iban-source-and-limits-of-validation).

## Privacy and Cloud boundary

`ValidationError` messages and stacks omit the raw identifier. The `.result`
reference remains deliberately accessible but is non-enumerable. Validation
results themselves still contain input and normalized values; avoid logging them
when they contain sensitive identifiers.

`@alosha/eu-validate/cloud` is a separate optional entry and the only entry that
makes HTTP requests. Its client exposes `createClient`, `CloudNotAvailableError`,
`CloudTimeoutError` and `CloudApiError`. The offline input guard does not validate
Cloud request bodies; a future server must validate those independently. The
[backend plan](cloud-service-plan.md) is a roadmap, not a deployed service.


The Cloud client options are `apiKey` (required), `baseUrl` (optional; default
`https://eu-validate.alosha.dev/api/v1`) and `timeoutMs` (optional; default 10000).
Only method calls perform requests; creating a client does not perform a lookup.
A missing API key throws a regular `Error` during client creation.

| Cloud error | Current client trigger |
| --- | --- |
| `CloudNotAvailableError` | HTTP 404 or a connection failure |
| `CloudTimeoutError` | Request abort after the configured timeout; includes `timeoutMs` |
| `CloudApiError` | Other non-2xx response; includes `status`, `statusText` and best-effort `body` |

These are implemented client behaviors, not evidence that the hosted service is
live. Preserve failure handling while the backend is built independently.
