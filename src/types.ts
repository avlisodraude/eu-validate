/** The identifier kinds this library can validate offline. */
export type IdentifierType = 'vat' | 'iban' | 'bsn' | 'kvk' | 'postalCode'

/** ISO 3166-1 alpha-2 country code (uppercase). */
export type CountryCode = string

/**
 * Machine-readable error codes returned in {@link ValidationResult.errors}.
 * Kept stable so consumers can branch on them.
 */
export type ErrorCode =
  | 'EMPTY_INPUT'
  | 'INVALID_FORMAT'
  | 'UNKNOWN_COUNTRY'
  | 'UNSUPPORTED_COUNTRY'
  | 'CHECKSUM_FAILED'
  | 'COUNTRY_REQUIRED'

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
  /** The original, untrimmed input. */
  input: string
  /** Cleaned / canonical form, or null if it could not be parsed. */
  normalized: string | null
  /** Detected country (ISO alpha-2), or null when not derivable. */
  country: CountryCode | null
  /** Which identifier type was checked. */
  type: IdentifierType
  /** Which layers ran. `checksum: null` = no checksum implemented for this case yet. */
  checks: {
    format: boolean
    checksum: boolean | null
  }
  /** Machine-readable error codes; empty when `valid` is true. */
  errors: ErrorCode[]
}

export interface PostalCodeOptions {
  /** Required: postal code formats are country-specific. */
  country: CountryCode
}
