# Maintenance follow-ups

Reviewed 2026-11-02. Recheck these facts before making dependency changes.

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

- Local checks pass on Node 22, 24 and 26; GitHub/Linux CI must pass on the PR
  before merging. The PR/run record is the source of truth for hosted checks.
- Publishing the npm package remains a separate, manual action.
- The owner confirmed there is no existing backend. KvK production access has
  not been confirmed.
  Follow [the Cloud service plan](cloud-service-plan.md) for the next product step.
