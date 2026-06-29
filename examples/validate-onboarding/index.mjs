// Recipe: Validate Dutch BSN and IBAN without sending PII anywhere
//
// The problem: an onboarding form collects a BSN and IBAN, but shipping
// those to a third-party validation API is a GDPR data-egress problem.
import { validateBSN, validateIBAN } from "@alosha/eu-validate";

// Pure, synchronous, offline — the values never leave the user's session.
function validateOnboarding(form) {
  const bsn = validateBSN(form.bsn);
  const iban = validateIBAN(form.iban);

  return {
    valid: bsn.valid && iban.valid,
    fields: {
      bsn: bsn.valid ? null : bsn.errors[0], // e.g. 'CHECKSUM_FAILED'
      iban: iban.valid ? null : iban.errors[0], // e.g. 'INVALID_FORMAT'
    },
  };
}

console.log(validateOnboarding({ bsn: "111222333", iban: "NL91 ABNA 0417 1643 00" }));
console.log(validateOnboarding({ bsn: "123456789", iban: "NL00 BAD" }));
