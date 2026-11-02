# Offline validation improvements and migration

Reviewed 2026-11-02. These changes are independent of the planned Cloud service.
No validator introduced here performs a network request or adds a runtime dependency.

## Input contract

- The maximum raw identifier input is 256 UTF-16 code units, exported as
  `MAX_INPUT_LENGTH`. Check length before trimming, case folding or pattern work.
  Oversized strings return `INPUT_TOO_LONG` and retain the original input by
  reference in the result; `normalized` is null.
- Non-string JavaScript values return `INVALID_INPUT`, with `input: ''` and
  `normalized: null`. Objects are never coerced with `toString`.
- Blank strings return the existing `EMPTY_INPUT` result.
- `validate` with missing or unrecognized type options returns an
  `InvalidOptionsResult`: `valid: false`, `type: null`, `INVALID_OPTIONS`.
  Valid typed dispatcher calls retain their `ValidationResult` return type.
  Callers accepting arbitrary options should handle the `type === null` case
  before passing the result to helpers expecting a known identifier type.
- Postal country values must be strings with two ASCII letters after trimming;
  malformed country/strict values return `INVALID_OPTIONS`. Missing country
  still returns `COUNTRY_REQUIRED`. Lowercase country codes are accepted.

## Postal compatibility and migration

`checks.formatSupported` reports whether a country format rule exists. A failed
supported pattern has `formatSupported: true` and `format: false`.

The default for EU countries without postal patterns preserves the previous
`valid: true`, `format: true`, `CHECKSUM_NOT_VERIFIABLE` response. Such a result
now has `formatSupported: false`; its legacy `format` flag must not be read as
evidence that a pattern was checked. This compatibility path also accepts junk
strings, which is why new applications should choose strict mode.

Pass `strict: true` to `validatePostalCode` or the postal dispatcher options to
reject unverified formats with `FORMAT_NOT_SUPPORTED`, `valid: false` and
`format: false`. This means coverage is absent, not that the postal code is known
to be invalid. Supported patterns behave the same in both modes.

`EU_COUNTRIES` now uses ISO `GR` for Greece. VAT's existing `EL` prefix is still
used in `VAT_PATTERNS` and `VAT_CHECKSUM_SUPPORTED`. Postal calls accept `GR` and
the historical `EL` alias, returning `GR`. Consumers that used `EU_COUNTRIES` to
enumerate VAT prefixes should use `VAT_CHECKSUM_SUPPORTED` instead.

## Error privacy

`ValidationError.message` and its stack no longer include the raw identifier.
The `.result` reference remains available deliberately but is non-enumerable, so
ordinary object serialization/inspection does not include the identifier.
Explicitly logging `error.result`, or the original validation result, still
exposes input. Applications must avoid logging sensitive result fields.

## IBAN source and limits of validation

Source: [SWIFT IBAN Registry release 103, September 2026](https://www.swift.com/swift-resource/9606/download?language=en),
reviewed 2026-11-02. The [registry landing page](https://www.swift.com/standards/data-standards/iban-international-bank-account-number)
provides subsequent releases. `src/iban-formats.ts` records national fixed-length
character rules and lengths. `test/fixtures/iban-registry.json` records the
registry's 89 electronic examples, with source/release metadata. Test examples
are independent of the implementation patterns.

Rules translate registry `n` to ASCII digits, `a` to uppercase ASCII letters,
and `c` to ASCII letters/digits after existing input normalization. They check
the entire national layout, then mod-97. They do not check bank allocation,
account existence, account ownership or every country's domestic check digits.
Fixtures described as synthetic in the tests only prove format/checksum
behavior, not the existence of bank accounts.

Costa Rica's length is corrected from the old table's 24 to the registry's 22.
Some checksum-correct strings previously accepted by the generic alphanumeric
rule are now rejected because letters or digits occur in the wrong positions.

For a future registry refresh, compare every country's structure and length
against the current official release, add or update official examples, and
record the new release/date. Do not generate valid fixtures from the same
patterns being tested. Run `npm run verify` after the data update; its packed
consumer checks cover ESM, CJS and their TypeScript declarations.

## Release notes

Review these observable changes before choosing the next release version:
non-string input codes, the raw input limit, malformed dispatcher options,
`EU_COUNTRIES`/Greek postal results, stricter IBAN acceptance and redacted error
messages. Postal strict mode is opt-in and coverage metadata is additive.
No package version is bumped or published by this maintenance change.
