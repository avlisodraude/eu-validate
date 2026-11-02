/** The identifier kinds this library can validate offline. */
export type IdentifierType = 'vat' | 'iban' | 'bsn' | 'kvk' | 'postalCode'

/** ISO 3166-1 alpha-2 country code (uppercase). */
export type CountryCode = string

/**
 * Machine-readable error codes returned in {@link ValidationResult.errors}.
 * Kept stable so consumers can branch on them.
 */
export type ErrorCode =
  | 'INVALID_INPUT'
  | 'INPUT_TOO_LONG'
  | 'INVALID_OPTIONS'
  | 'FORMAT_NOT_SUPPORTED'
  | 'EMPTY_INPUT'
  | 'INVALID_FORMAT'
  | 'UNKNOWN_COUNTRY'
  | 'UNSUPPORTED_COUNTRY'
  | 'CHECKSUM_FAILED'
  | 'COUNTRY_REQUIRED'
  | 'CHECKSUM_NOT_VERIFIABLE'

/**
 * The single result shape returned by every offline validator.
 *
 * `valid` reflects offline format/checksum validity only — it never means
 * "registered" or "real". Use the Cloud client (`@alosha/eu-validate/cloud`)
 * for VIES / KvK registration lookups.
 */
export interface ValidationResult {
  /** Offline format + checksum validity. */
  valid: boolean
  /** Original string input; empty for a non-string supplied by a JavaScript caller. */
  input: string
  /** Cleaned / canonical form, or null if it could not be parsed. */
  normalized: string | null
  /** Country code; VAT uses Greece's EL prefix, other identifiers use ISO GR. */
  country: CountryCode | null
  /** Which identifier type was checked. */
  type: IdentifierType
  /** Which layers ran. `checksum: null` = no checksum implemented for this case yet. */
  checks: {
    format: boolean
    /** Postal only: whether a country format rule exists; separate from its pass/fail result. */
    formatSupported?: boolean
    checksum: boolean | null
  }
  /**
   * Machine-readable error codes. Empty when `valid` is true, EXCEPT for the
   * informational `CHECKSUM_NOT_VERIFIABLE` code: a result can be `valid: true`
   * with that single code present when the identifier is structurally well
   * formed but this specific value's checksum couldn't be computed offline
   * (e.g. a French VAT number with an alphabetic key). Legacy postal acceptance
   * also uses this code when formatSupported is false. Check `checks.checksum`
   * (`null`) if you need to branch on "verified" vs. "format-only".
   */
  errors: ErrorCode[]
}

export interface PostalCodeOptions {
  /** Required: postal code formats are country-specific. */
  country: CountryCode
  /** Reject countries without postal format rules. Default false for compatibility. */
  strict?: boolean
}

/** A dispatcher call without a recognized identifier type. */
export interface InvalidOptionsResult extends Omit<ValidationResult, 'type' | 'valid'> {
  valid: false
  type: null
}
