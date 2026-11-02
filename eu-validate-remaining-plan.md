# eu-validate — current remaining work

Updated 2026-11-02. This replaces the obsolete July implementation checklist.
The current references are [the documentation index](docs/README.md),
[maintenance follow-ups](docs/maintenance-follow-ups.md) and
[offline migration notes](docs/offline-validation.md).

## Completed

- VAT checksum handlers for all 27 EU prefixes, with documented per-number exceptions.
- Modernized development tools and CI on Node 22, 24 and 26.
- Pre-publish lint/build/tests, installed-tarball runtime/type checks and audit gating.
- Bounded input handling, structured option errors and corrected Greek country codes.
- Postal format-coverage reporting and opt-in strict validation.
- Validation errors omit sensitive identifiers from ordinary messages/serialization.
- National IBAN layouts and examples for all 89 SWIFT registry release-103 countries.
- 400 tests across seven suites; GitHub Linux checks passed at implementation commit 0023cac.

## Release 0.6.0

The maintenance and offline PRs (#1 and #2) are merged into main. Version 0.6.0
includes the completed offline improvements and their migration notes. Package,
lockfile and example references are updated together. Run `npm run verify`,
publish the package, verify npm's dist-tag, then deploy and verify the website
against that exact published package.

There is no outstanding offline implementation item from the completed review.

## Deferred maintenance

Track the 30 development-only audit entries and TypeScript 7 compatibility as
specified in the maintenance tracker. Production audit findings are zero at the
last check. Recheck upstream ranges rather than making another broad upgrade or
forcing incompatible dependency versions.

## Future backend

No backend is implemented or deployed. Follow [the Cloud service plan](docs/cloud-service-plan.md):
a separate service, private VIES pilot first, KvK after access/subscription and
response mappings are settled. The plan lists decisions still needed for a full
build handoff. This backend work is independent of offline library updates.
