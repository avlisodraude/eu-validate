# Cloud service implementation plan

Proposal dated 2026-11-02. No backend is deployed or provider account provisioned
by this change. The owner confirmed that there is no backend to extend.
This is a roadmap; it is not yet a complete executable build handoff. See
[the documentation index](README.md) for the implemented offline work.

## Independence from offline releases

The main package entry never imports the Cloud client. Offline validators can
be changed, tested, built and released while the hosted service is absent.
`/cloud` is an optional entry; only callers using its methods need an HTTP service.
Cloud tests use mocked responses, including in the installed-package checks.

A future backend should have its own package, dependency tree and deployment
configuration. Preserve the documented HTTP contract or introduce a new API
version when changing it. `baseUrl` supports a staging/self-hosted URL; the existing
client default can be routed to a separately deployed service at launch.
The offline input guards do not validate Cloud request bodies: the server must
validate authentication, identifier types, lengths and formats independently.

## Details to settle before implementation

- Write versioned request, success and error schemas and map each provider response
  to the current client fields. Decide which KvK name, status and address to return.
- Choose the hosting account/project, EU compute/store region, shared storage
  provider and current cost limits; define local setup commands and required
  environment variables without committing credentials.
- Specify key provisioning, hashing/storage, revocation and rotation. Decide the
  exact per-key quota, concurrency, cache and retention policies.
- Add deployment, domain routing, monitoring, rollback and provider-outage runbooks.
- Establish provider access: KvK production subscription/key access is unconfirmed.
  Keep staging fixture tests distinct from real provider acceptance.

The steps below provide the implementation order and acceptance criteria once
these decisions are recorded. They do not block offline package maintenance.

## Recommended approach

Build a small, separately deployed TypeScript API, starting with **VIES VAT
verification for a private pilot**. Add KvK after its subscription and response
mapping are settled. Keep server dependencies outside this npm library so its
offline, zero-runtime-dependency guarantee remains intact.

Default hosting recommendation: **Hono on Vercel Functions, Node 24, one EU
region**, with a shared Redis-compatible store for per-key quotas and short-lived
cache entries before public access. Hono has a [supported Vercel integration](https://vercel.com/docs/frameworks/backend/hono),
and Vercel documents [Node runtime selection](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
and [region configuration](https://vercel.com/docs/functions/configuring-functions/region).
This request/response workload does not need an always-running server or a queue
for its first release. Use a separate deployment project and release cycle from
the docs website. Select the actual hosting account and store during setup.

For a commercial service, budget for an appropriate paid hosting plan; Vercel's
[Hobby plan](https://vercel.com/docs/plans/hobby) is for personal, non-commercial
use. Compare current hosting/store pricing before provisioning. This document provisions no hosting or provider subscription.

## Preserve the existing client contract

The public contract is already defined in `src/cloud.ts`:

| Route | Input | Successful output |
| --- | --- | --- |
| `POST /api/v1/vat/verify` | `{ vat: string }` | `registered`, `countryCode`, `vatNumber`, `name`, `address`, `requestDate`, `source: 'VIES'` |
| `POST /api/v1/kvk/lookup` | `{ kvkNumber: string }` | `found`, `kvkNumber`, `name`, `status`, `address`, `source: 'KVK'` |

Use the existing `Authorization: Bearer` header. Pilot clients can point `baseUrl`
at a staging host. At launch, route `https://eu-validate.alosha.dev/api/v1` to the
new service so existing clients keep their default URL. Inspect the website's
actual hosting and routing before selecting the final routing mechanism.

An explicit negative provider result can return `registered: false` or
`found: false`. Provider outages, rate limits, timeouts, disabled adapters and
malformed responses must return errors, never an invented negative result.
In particular, a temporarily disabled KvK route should return `503` rather than
`404`, since the current client maps any `404` to `CloudNotAvailableError`.

## Small implementation steps

1. Create a separate service package/repository with independent dependency and
   deployment configuration. Add HTTP contract tests using the existing library
   client against a local server; stub provider responses only in tests.
2. Implement authentication and request validation before provider calls. For a
   private pilot, provision one random server-held token and support rotation;
   keep provider credentials separate from customer keys. Reject oversized JSON
   bodies and invalid identifier formats before performing lookups.
3. Implement a VIES adapter against the Commission service. Confirm the current
   REST schema before choosing REST; the official [SOAP WSDL](https://ec.europa.eu/taxation_customs/vies/checkVatService.wsdl)
   is another integration reference. Normalize Greek `GR`/`EL` consistently with
   the library. Bound provider calls below the client's default 10-second timeout
   (initial provider budget: 6 seconds). Map provider failures explicitly and
   avoid unbounded retries or user-supplied upstream URLs.
4. Add shared, atomic per-key quotas and bounded concurrency. Start with
   conservative pilot limits and a short VAT result cache (proposed: 5 minutes),
   preserving the original provider request date on cache hits. Cache neither
   errors nor provider outages. Fail closed if quota state is unavailable.
   Use the same EU region for compute and data storage. Select retention and
   allowed cached fields before public rollout.
5. Deploy a protected preview and verify a real VIES positive/negative case and
   provider error handling. Keep identifiers, company responses, tokens and
   authorization headers out of logs; record only request IDs, timings, outcome
   codes and aggregate usage needed to operate the pilot.
6. Add KvK behind an independent enable flag after provider access is available.
   [KvK requires an account and API key](https://developers.kvk.nl/documentation/quickstart)
   and a [production subscription](https://www.kvk.nl/en/ordering-products/get-business-data-with-kvk-apis/).
   Use its [free test environment](https://developers.kvk.nl/nl/documentation/testing)
   with fictitious records for adapter development. Explicitly map registration
   status, legal/trade names and address selection from the selected KvK product;
   do not scrape the public register or infer an active status from a name alone.
7. Before public access, add individually revocable customer keys, durable usage
   records, spend alerts and an operator procedure for provider outages. Add
   self-service signup/billing only after the pilot proves demand. Review KvK's
   current subscription terms for the intended caching and customer-facing use.

## Acceptance evidence

- Client-to-service contract tests cover authentication, invalid input, positive
  and negative results, provider timeout, malformed provider output, and outages.
- Concurrent quota tests prove limits are shared across service instances; a
  cache hit does not change the original provider request date.
- A real staging VIES call is recorded separately from fixture-based tests.
  KvK test-environment evidence is not production KvK acceptance.
- Domain routing, secret storage, rotation, redacted logging, quotas and spending
  limits are checked before inviting public users.
- Update the README availability wording only after the corresponding live
  endpoint is verified. The offline package remains usable independently.
