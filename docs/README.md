# Project documentation

Status reviewed 2026-11-02. These documents describe the current development
checkout, including changes that have not yet been published to npm.

## Start here

| Document | Purpose |
| --- | --- |
| [Main README](../README.md) | Installation, usage, examples and coverage |
| [API reference](api.md) | Exported validators, results, error codes and data |
| [Offline migration](offline-validation.md) | Compatibility changes, strict postal mode and IBAN provenance |
| [Changelog](../CHANGELOG.md) | Unreleased changes and published version history |
| [Example guide](../examples/README.md) | Run the recipes against npm or this checkout |
| [Maintenance follow-ups](maintenance-follow-ups.md) | Remaining audit findings, TypeScript blockers and release tasks |
| [Cloud service plan](cloud-service-plan.md) | Future backend architecture, independence and outstanding decisions |
| [VAT research: AT/CZ/HR/LT/LV/IE/CY/SK](vat-checksum-spec.md) | Implemented algorithms, source disagreements and fixture provenance |
| [VAT research: BG/EL/HU/MT/RO](vat-checksum-spec-2.md) | Implemented algorithms completing EU-27 coverage |

## Release and implementation status

- **Published npm package:** 0.5.0, published 2026-07-09. The manifest remains
  0.5.0 while the next release is being prepared.
- **Implemented, unreleased:** input/option guards, the 256-code-unit raw limit,
  ISO Greek country handling, postal coverage and strict mode, redacted errors,
  and national IBAN formats for 89 registry countries.
- **Maintenance foundation:** modernized tools, Node 22/24/26 CI, a high/critical
  audit gate and pre-publish verification of installed tarballs and declarations.
- **Future work:** the hosted VIES/KvK service. Offline development, builds,
  testing and publication have no dependency on that service being deployed.

The delivery order is [PR #1](https://github.com/avlisodraude/eu-validate/pull/1)
followed by [PR #2](https://github.com/avlisodraude/eu-validate/pull/2). Verify the
current PR state before merging; these links are delivery records, not evidence
that a new npm version is already available.

## Verification evidence

At implementation commit `0023cac`, `npm run verify` passed locally and
[GitHub Linux CI](https://github.com/avlisodraude/eu-validate/actions/runs/41487015230)
passed on Node 22, 24 and 26. The checks include lint, ESM/CJS/declaration builds,
400 tests in seven suites, installed-tarball runtime checks and strict TypeScript
consumers in both module formats.

The audited development tree has 30 affected package entries (26 moderate,
4 low), originating from minimatch, glob and deepmerge. The production audit
reports zero vulnerabilities. These are dated results; recheck them before a
release. They do not verify the hosted Cloud service or the deployed demo.
