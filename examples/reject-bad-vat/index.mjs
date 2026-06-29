// Recipe: Reject bad VAT numbers before you ever call VIES
//
// The problem: a B2B checkout must apply reverse-charge VAT, but VIES is
// slow, rate-limited, and rejects malformed input anyway.
//
// This example runs entirely offline (the live VIES call is mocked) so you
// can see the checksum-first filtering logic execute without an API key.
import { validateVAT } from "@alosha/eu-validate";

// Stand-in for `createClient({ apiKey }).verifyVAT(...)` from
// `@alosha/eu-validate/cloud` — swap this for the real client in production.
async function mockVerifyVat(vat) {
  return { registered: true, name: "Acme Trading B.V." };
}

async function resolveVat(input) {
  // 1. Offline first — structure + checksum, zero network, instant.
  const offline = validateVAT(input);
  if (!offline.valid) {
    return { ok: false, reason: offline.errors[0] }; // e.g. 'CHECKSUM_FAILED'
  }

  // 2. Spend a VIES round-trip only on numbers that already pass the checksum.
  const live = await mockVerifyVat(offline.normalized);
  return { ok: live.registered, company: live.name };
}

console.log(await resolveVat("NL123456782B01")); // passes checksum -> "calls" VIES
console.log(await resolveVat("NL123456781B01")); // fails checksum -> never leaves the process
