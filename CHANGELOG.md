# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- `package.json` now declares `"sideEffects": false`, so bundlers can safely
  tree-shake unused validators (the README and landing page have claimed
  "tree-shakeable" since 0.1.0, but the field needed to back that up was missing).
- `createClient()` (`@alosha/eu-validate/cloud`) now fails fast with a clear
  message when `verifyVAT()` / `lookupKvK()` are called, instead of attempting
  a network request against the Phase 3 hosted endpoint before it exists.

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
