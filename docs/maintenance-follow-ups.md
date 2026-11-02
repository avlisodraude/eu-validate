# Maintenance follow-ups

Reviewed 2026-11-02. Recheck these facts before making dependency changes.
See the [documentation index](README.md) for release and implementation status.

## Completed work

The maintenance foundation and all six recommended offline improvements are
implemented. They cover input guards, ISO/VAT country separation, postal coverage
and opt-in strict mode, error privacy, national IBAN layouts and regression tests.
The implementation has 400 tests in seven suites; installed-package checks also
compile ESM and CJS TypeScript consumers. No further offline implementation item
from that review is pending. Review [the migration notes](offline-validation.md)
before releasing the behavior changes.


## Audit findings still open

`npm audit --json` reports 30 affected package entries (26 moderate, 4 low).
These propagate from three underlying packages, all development dependencies.
`npm audit --omit=dev` reports zero vulnerabilities. This describes dependency
exposure, not a complete application security assessment.

| Package locked | Introduction path | Advisory / patched version | Next action |
| --- | --- | --- | --- |
| minimatch 10.2.6 and 9.0.9 | ESLint, TypeScript ESLint, Jest/glob and coverage tooling | [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249); 11.0.1 | Wait for parent packages to accept minimatch 11, or evaluate a narrowly scoped migration with package and coverage checks. |
| glob 13.0.6 and 10.5.0 | Jest reporters/config/runtime; test-exclude via ts-jest coverage tooling | [GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4); 14.0.2 | Wait for Jest and test-exclude to accept glob 14; do not replace their major dependency versions blindly. |
| deepmerge 4.3.1 | jest-config | [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4); no patch listed | Watch for an upstream patch or Jest removing/replacing the dependency. |

Current parent ranges explain why ordinary audit fixes cannot clear these:
ESLint 10.14.0 requires minimatch `^10.2.6`; typescript-estree 8.72.1 requires
`^10.2.2`; Jest reporters 30.5.2 requires glob `^13.0.6`; test-exclude 7.0.2
requires glob `^10.4.1`. The latest published deepmerge is still 4.3.1.

Exposure is in tools processing repository configuration, glob patterns and test
coverage. The published library does not import them. Keep the warnings visible:
CI and pre-publish verification run `npm audit --audit-level=high`, so a new
high/critical finding fails the gate. Moderate/low findings remain open; a passing
gate does not mean the entire development dependency tree is vulnerability-free.

At the next maintenance review, run:

```sh
npm audit --json
npm audit --omit=dev
npm ls minimatch glob deepmerge --all
npm view eslint@latest dependencies.minimatch
npm view typescript-eslint@latest peerDependencies
npm view @jest/reporters@latest dependencies.glob
npm view test-exclude@latest dependencies
npm view deepmerge@latest version
```

Only change the dependencies that resolve a specific tracked finding. Validate
with `npm run verify`; changes to coverage tooling also require a coverage run.
Do not use the current forced audit proposals: they downgrade Jest to 25.1.0
and ESLint to 4.0.0.

## TypeScript 7 migration

Keep TypeScript 5.9.3 for now. The current typescript-eslint 8.72.1 peer range is
`>=4.8.4 <6.1.0`, and ts-jest 29.4.15 accepts `>=4.3 <7`. Both exclude TypeScript 7.

Revisit when **both** projects declare support for TypeScript 7. Use their
published peer ranges and migration notes, then run lint, all tests, declaration
generation and packed ESM/CJS checks on Node 22/24/26. Do not install with
`--force` or `--legacy-peer-deps` to bypass this blocker.

## Delivery and Cloud

- [PR #1](https://github.com/avlisodraude/eu-validate/pull/1) supplies the maintenance
  foundation; [PR #2](https://github.com/avlisodraude/eu-validate/pull/2) adds offline
  improvements and builds on it. Both implementation PRs are merged into main.
- The 400-test implementation at `0023cac` passed [GitHub Linux CI](https://github.com/avlisodraude/eu-validate/actions/runs/41487015230)
  on Node 22, 24 and 26, including package runtime/type checks and the audit gate.
  Recheck the latest commit's run before merging any later changes.
- The release version is 0.6.0. Package/lockfile versions, example references and
  [the changelog](../CHANGELOG.md) describe that release. Run `npm run verify`
  before publication, and verify the registry version and site deployment afterward.
- `npm run release` and ordinary `npm publish` run the pre-publish gate. None of
  the verification commands publishes the package by itself.
- The owner confirmed there is no existing backend. KvK production access has
  not been confirmed.
  Follow [the Cloud service plan](cloud-service-plan.md) for the next product step.
