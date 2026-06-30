// Recipe: Validate a full Dutch company-onboarding form in one pass
//
// The problem: a B2B signup form for the Netherlands collects four different
// identifier types — KvK, BSN, IBAN, VAT — and hand-wiring four separate
// validateX() calls means the field list and the validator list drift apart
// as the form grows.
import { validate } from "@alosha/eu-validate";

const ONBOARDING_FIELDS = {
  kvkNumber: { type: "kvk" },
  bsn: { type: "bsn" },
  iban: { type: "iban" },
  vatNumber: { type: "vat" },
};

function validateOnboardingForm(form) {
  const fields = Object.fromEntries(
    Object.entries(ONBOARDING_FIELDS).map(([field, options]) => [
      field,
      validate(form[field] ?? "", options),
    ])
  );

  return {
    valid: Object.values(fields).every((r) => r.valid),
    fields, // each entry is a full ValidationResult — keep `errors` for inline form feedback
  };
}

console.log(
  validateOnboardingForm({
    kvkNumber: "69599084",
    bsn: "111222333",
    iban: "NL91 ABNA 0417 1643 00",
    vatNumber: "NL123456782B01",
  })
);
console.log(validateOnboardingForm({ kvkNumber: "123", bsn: "000000000", iban: "", vatNumber: "" }));
