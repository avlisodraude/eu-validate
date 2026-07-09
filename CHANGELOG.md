# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- VAT checksum validation for BG, EL, HU, MT, and RO — **every EU-27 member
  state now has checksum validation** (27 of 27). No new `checksum: null`
  sub-cases: all five are hard checksums for every syntactically valid number.
  Algorithms cross-verified by executing python-stdnum 2.2 and jsvat 2.5.4
  over every fixture; see `docs/vat-checksum-spec-2.md` for provenance.

### Changed

- `VAT_PATTERNS.MT` and `VAT_PATTERNS.RO` now reject a leading zero
  (`MT01234567`, `RO0…` were previously format-valid). Both reference
  implementations agree no real Maltese or Romanian number starts with 0.

## [0.4.0] - 2026-07-09

### Added

- VAT checksum validation for AT, CZ, HR, LT, LV, IE, CY, and SK, bringing
  the checksum-verified country count from 14 to 22. CZ and LV each retain
  a `checksum: null` (`CHECKSUM_NOT_VERIFIABLE`) sub-case for populations
  with no independently-confirmed check digit (CZ 9-digit individuals not
  starting `6`; LV natural-person personal codes).

### Changed

- **Breaking (type-level):** `POSTAL_PATTERNS` is now typed
  `Partial<Record<CountryCode, RegExp>>` instead of `Record<CountryCode, RegExp>`,
  reflecting that only six countries actually have a pattern — indexing it
  directly for any other country now correctly types as `RegExp | undefined`.
  `validatePostalCode()` no longer hard-fails a real EU country just because
  it lacks a pattern: it now returns `valid: true` with `checks.checksum: null`
  and `errors: ['CHECKSUM_NOT_VERIFIABLE']` (mirroring the FR VAT alphabetic-key
  handling), reserving `UNSUPPORTED_COUNTRY` for country codes outside the EU-27.
- `@alosha/eu-validate/cloud` no longer gates requests behind a compile-time
  `CLOUD_API_LIVE` flag — `request()` now hits the hosted endpoint for real,
  so the hosted API can go live without requiring users to upgrade the
  package. A 404 response or a connection failure at the DNS/socket level
  (endpoint not deployed yet) is still translated into `CloudNotAvailableError`
  so callers keep one obvious error type for "not live yet"; `CloudTimeoutError`
  and `CloudApiError` behavior is unchanged for all other cases.

### Fixed

- NL VAT false negative: `validateVAT()` was rejecting valid sole-trader
  BTW-id numbers issued since Jan 2020, which deliberately fail the 11-proof
  (elfproef) on the first 9 digits. `checkNL` now also accepts a number when
  a mod-97 check over the full `NL`-prefixed string passes, so both
  legal-entity and sole-trader BTW-id styles validate correctly offline.

## [0.3.0] - 2026-06-30

> **Note on the missing 0.2.0.** A `v0.2.0` tag exists in git, but 0.2.0 was never
> published to npm — the registry goes 0.1.0 → 0.3.0. The changes listed below were
> developed under the 0.2.0 heading, then released as 0.3.0; this section is their
> single, correct home. The tag is retained for historical accuracy and points at the
> commit that bumped `package.json` to 0.2.0.

### Added

- New `CHECKSUM_NOT_VERIFIABLE` error code: `validateVAT()` now returns
  `valid: true` with `checks.checksum: null` and `errors: ['CHECKSUM_NOT_VERIFIABLE']`
  for FR VAT numbers with an alphabetic key (previously indistinguishable from
  a checksum-verified result — both had `errors: []`).
- Typed Cloud client errors (`@alosha/eu-validate/cloud`): `CloudNotAvailableError`,
  `CloudTimeoutError`, `CloudApiError` replace the generic `Error` previously
  thrown on Phase-3-not-shipped / request timeout / non-2xx response, so
  callers can `catch` and branch on a specific error type.
- `isValid()` and `assertValid()` convenience helpers, exported from the main
  entry: `isValid()` narrows a `ValidationResult` to `valid: true`;
  `assertValid()` returns the same narrowed result or throws `ValidationError`
  (which carries the failing `result`).
- README: documented the `GR`/`EL` country-code mismatch between VAT results
  (`EL`) and IBAN/postal-code results (`GR`) for Greece, and the new
  `CHECKSUM_NOT_VERIFIABLE` behavior for FR VAT alphabetic keys.

### Changed

- `package.json` now declares `"sideEffects": false`, so bundlers can safely
  tree-shake unused validators (the README and landing page have claimed
  "tree-shakeable" since 0.1.0, but the field needed to back that up was missing).
- `createClient()` (`@alosha/eu-validate/cloud`) now fails fast with a clear
  message when `verifyVAT()` / `lookupKvK()` are called, instead of attempting
  a network request against the Phase 3 hosted endpoint before it exists.
- Every validator's empty-input guard now uses a shared `isBlank()` helper
  that checks `typeof input === 'string'` first, so a plain-JS caller passing
  `null`/`undefined`/a number gets a clean `EMPTY_INPUT` result instead of a
  thrown `TypeError` from calling `.trim()` on a non-string.

### Removed

- Stray `pnpm-lock.yaml` and `pnpm-workspace.yaml` — CI and all `npm run`
  scripts use npm exclusively, and the workspace file still contained unfilled
  scaffold placeholder text (`allowBuilds: esbuild: set this to true or false`)
  that would error on `pnpm install`. `package-lock.json` remains the single
  source of truth.

## [0.1.0] - 2026-06-15

Initial release.

### Added

- Offline VAT validation: format checks for all EU-27, full checksum for 14
  member states (NL, BE, DE, FR, ES, IT, LU, PT, FI, DK, SE, PL, SI, EE).
- Offline IBAN validation (ISO 13616 mod-97 + per-country length) for all
  SEPA / IBAN-registry countries.
- Dutch BSN validation (11-proef) and KvK number format validation.
- Postal code validation for NL, DE, FR, BE, ES, IT.
- Single `ValidationResult` shape and a `validate()` dispatcher.
- `@alosha/eu-validate/cloud` client surface (`createClient().verifyVAT()` /
  `.lookupKvK()`) — hosted endpoints land in a later release (Phase 3).
- TypeScript types (ESM + CJS), zero runtime dependencies.
