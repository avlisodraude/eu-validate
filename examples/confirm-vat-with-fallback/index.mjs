// Recipe: Confirm VAT registration when you can, fall back gracefully when you can't
//
// The problem: a live VIES registration check on top of the offline checksum
// can fail for reasons that have nothing to do with the VAT number — the
// hosted endpoint isn't live yet, a timeout, a bad response — and none of
// those should look like "this VAT is invalid".
import { validateVAT } from "@alosha/eu-validate";
import {
  createClient,
  CloudNotAvailableError,
  CloudTimeoutError,
  CloudApiError,
} from "@alosha/eu-validate/cloud";

const eu = createClient({ apiKey: process.env.ALOSHA_KEY ?? "demo-key" });

async function checkVat(input) {
  const offline = validateVAT(input);
  if (!offline.valid) {
    return { status: "invalid", reason: offline.errors[0] };
  }

  try {
    const live = await eu.verifyVAT(offline.normalized);
    return { status: live.registered ? "registered" : "not_registered", company: live.name };
  } catch (err) {
    if (err instanceof CloudNotAvailableError) {
      // A missing endpoint or connection failure becomes CloudNotAvailableError.
      // The offline checksum already passed, so degrade instead of failing the request.
      return { status: "format_valid_unconfirmed", reason: "cloud_not_available" };
    }
    if (err instanceof CloudTimeoutError || err instanceof CloudApiError) {
      return { status: "format_valid_unconfirmed", reason: "cloud_error" };
    }
    throw err;
  }
}

console.log(await checkVat("NL123456782B01")); // passes checksum -> attempts a cloud call -> falls back if unavailable
console.log(await checkVat("NL123456781B01")); // fails checksum -> rejected before ever touching the cloud client
