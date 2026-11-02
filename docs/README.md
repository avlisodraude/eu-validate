# Project documentation

Status reviewed 2026-11-02. These documents describe release 0.6.0.

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

- **Current release:** 0.6.0, dated 2026-11-02. Previous release: 0.5.0 (2026-07-09).
- **Included in 0.6.0:** input/option guards, the 256-code-unit raw limit,
  ISO Greek country handling, postal coverage and strict mode, redacted errors,
  and national IBAN formats for 89 registry countries.
- **Maintenance foundation:** modernized tools, Node 22/24/26 CI, a high/critical
  audit gate and pre-publish verification of installed tarballs and declarations.
- **Future work:** the hosted VIES/KvK service. Offline development, builds,
  testing and publication have no dependency on that service being deployed.

The merged implementation was delivered through [PR #1](https://github.com/avlisodraude/eu-validate/pull/1)
followed by [PR #2](https://github.com/avlisodraude/eu-validate/pull/2).
Publishing and website deployments are separate release steps; their recorded
versions and deployment results establish distribution status.

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
