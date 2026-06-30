// Recipe: Reject malformed identifiers at the edge of your API
//
// The problem: every route that accepts a VAT, IBAN or BSN re-implements the
// same "if (!result.valid) return res.status(400)..." boilerplate, and it's
// easy for one route to forget a field.
import { validateIBAN, validateVAT, assertValid, ValidationError } from "@alosha/eu-validate";

// Stand-in for an Express/Fastify route handler — swap the plain object
// return for your framework's res.status()/res.json(), the validation logic
// stays identical.
function handlePayoutRequest(body) {
  try {
    const iban = assertValid(validateIBAN(body.iban));
    const vat = assertValid(validateVAT(body.vat));
    return { status: 200, body: { ok: true, iban: iban.normalized, vat: vat.normalized } };
  } catch (err) {
    if (err instanceof ValidationError) {
      return { status: 400, body: { ok: false, type: err.result.type, errors: err.result.errors } };
    }
    throw err;
  }
}

console.log(handlePayoutRequest({ iban: "NL91 ABNA 0417 1643 00", vat: "NL123456782B01" }));
console.log(handlePayoutRequest({ iban: "NL00 BAD", vat: "NL123456782B01" }));
