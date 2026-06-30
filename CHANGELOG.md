# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-06-30

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
