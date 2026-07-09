import { EU_COUNTRIES, POSTAL_PATTERNS } from './countries.js'
import type { PostalCodeOptions, ValidationResult } from './types.js'
import { fail, isBlank, ok } from './util.js'

/**
 * Validate a postal code against a country-specific pattern.
 * The country is required because formats overlap across countries.
 */
export function validatePostalCode(input: string, options: PostalCodeOptions): ValidationResult {
  if (isBlank(input)) return fail('postalCode', input, ['EMPTY_INPUT'])
  if (!options || !options.country) {
    return fail('postalCode', input, ['COUNTRY_REQUIRED'], { normalized: input.trim() })
  }

  const country = options.country.toUpperCase()
  const value = input.trim().toUpperCase()
  const pattern = POSTAL_PATTERNS[country]

  if (!pattern) {
    if (!EU_COUNTRIES.includes(country)) {
      return fail('postalCode', input, ['UNSUPPORTED_COUNTRY'], { normalized: value, country })
    }
    // A real EU country, but we don't have a pattern for it yet. Don't
    // hard-fail on missing coverage — mirror checkFR's "checkable format,
    // unverifiable checksum" handling: valid, informational-only error code.
    return {
      valid: true,
      input,
      normalized: value,
      country,
      type: 'postalCode',
      checks: { format: true, checksum: null },
      errors: ['CHECKSUM_NOT_VERIFIABLE'],
    }
  }

  if (!pattern.test(value)) {
    return fail('postalCode', input, ['INVALID_FORMAT'], { normalized: value, country })
  }

  return ok('postalCode', input, value, country, null)
}
