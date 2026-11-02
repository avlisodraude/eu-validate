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

## Release preparation

1. Review and merge [PR #1](https://github.com/avlisodraude/eu-validate/pull/1),
   then [PR #2](https://github.com/avlisodraude/eu-validate/pull/2). Confirm checks
   for their latest commits before merging.
2. Choose a new version after reviewing the observable behavior changes, then
   update package/lockfile versions, example references and release notes.
3. Run `npm run verify`. Publication remains a separate manual action.

The manifest and published npm package remain 0.5.0. No later version was
published by this work. There is no outstanding offline implementation item
from the completed review.

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
