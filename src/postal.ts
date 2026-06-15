import { POSTAL_PATTERNS } from './countries.js'
import type { PostalCodeOptions, ValidationResult } from './types.js'
import { fail, ok } from './util.js'

/**
 * Validate a postal code against a country-specific pattern.
 * The country is required because formats overlap across countries.
 */
export function validatePostalCode(input: string, options: PostalCodeOptions): ValidationResult {
  if (!input || !input.trim()) return fail('postalCode', input, ['EMPTY_INPUT'])
  if (!options || !options.country) {
    return fail('postalCode', input, ['COUNTRY_REQUIRED'], { normalized: input.trim() })
  }

  const country = options.country.toUpperCase()
  const pattern = POSTAL_PATTERNS[country]
  if (!pattern) {
    return fail('postalCode', input, ['UNSUPPORTED_COUNTRY'], {
      normalized: input.trim(),
      country,
    })
  }

  const value = input.trim().toUpperCase()
  if (!pattern.test(value)) {
    return fail('postalCode', input, ['INVALID_FORMAT'], { normalized: value, country })
  }

  return ok('postalCode', input, value, country, null)
}
