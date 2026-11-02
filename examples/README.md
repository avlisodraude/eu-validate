# Examples

These small recipes use `@alosha/eu-validate`. Their dependency range is `^0.6.0`;
installing them normally uses the published release, including the input-safety,
postal-coverage and national IBAN improvements. See [release status](../docs/README.md).

| Directory | Purpose | Network behavior when running the example |
| --- | --- | --- |
| [reject-bad-vat](reject-bad-vat/index.mjs) | Reject format/checksum failures before a future VIES call | Offline; lookup response is mocked |
| [validate-onboarding](validate-onboarding/index.mjs) | Validate BSN and IBAN fields | Offline |
| [fail-fast-middleware](fail-fast-middleware/index.mjs) | Return a structured error at a route boundary | Offline; plain handler, no server is started |
| [dutch-kyc-bundle](dutch-kyc-bundle/index.mjs) | Validate several Dutch onboarding fields with the dispatcher | Offline; checks identifier format/checksum only |
| [bulk-vat-cleanup](bulk-vat-cleanup/index.mjs) | Split inline sample rows into accepted and rejected groups | Offline; no files are written |
| [confirm-vat-with-fallback](confirm-vat-with-fallback/index.mjs) | Handle Cloud registration failures separately from invalid input | Attempts real HTTP calls; hosted service is planned |

## Run against the published package

From the repository root, choose one example:

```sh
cd examples/validate-onboarding
npm install
npm start
```

The Cloud fallback recipe reads `ALOSHA_KEY` from the environment, falling back
to a demonstration value. That value is not a working service credential. The
recipe can return an unconfirmed status; it does not establish live service
availability. Keep real keys on a server, not in browser code.

## Run against the current checkout

To exercise local input guards, postal options or IBAN rules without
publishing, build and pack from the repository root into a temporary directory:

```sh
npm run build
package_dir=$(mktemp -d)
npm pack --ignore-scripts --pack-destination "$package_dir"
cd examples/validate-onboarding
npm install --no-save --package-lock=false "$package_dir/alosha-eu-validate-0.6.0.tgz"
npm start
```

The tarball filename reflects the current manifest version; adjust it after a
version bump. `--ignore-scripts` avoids publication lifecycle work during this
manual packing step; building first is required. The root `npm run test:package`
automates temporary installation and checks both runtime module formats and
their TypeScript declarations.

## Interpretation and privacy

Passing offline checks does not establish a registered company, a live bank
account or identity ownership. The scripts use demonstration rows and some print
full results; replace that logging before feeding real customer identifiers.
The simplified CSV recipe is not a general CSV parser.

For applications using the postal options, choose `strict: true` when
an unchecked country format must not pass. Inspect `checks.formatSupported` for
coverage and `checks.checksum === true` when a confirmed checksum is required.
See the [API reference](../docs/api.md) and [migration guide](../docs/offline-validation.md).
