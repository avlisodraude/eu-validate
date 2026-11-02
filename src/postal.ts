import { EU_COUNTRIES, POSTAL_PATTERNS } from './countries.js'
import type { PostalCodeOptions, ValidationResult } from './types.js'
import { fail, inputFailure, ok } from './util.js'

/** Validate postal formats; strict mode rejects countries without format coverage. */
export function validatePostalCode(input: string, options: PostalCodeOptions): ValidationResult {
  const finish = (result: ValidationResult, supported = false): ValidationResult => ({
    ...result,
    checks: { ...result.checks, formatSupported: supported },
  })
  const failure = inputFailure('postalCode', input)
  if (failure) return finish(failure)
  if (options != null && (typeof options !== 'object' || Array.isArray(options))) {
    return finish(fail('postalCode', input, ['INVALID_OPTIONS']))
  }
  if (!options || options.country === undefined || options.country === '') {
    return finish(fail('postalCode', input, ['COUNTRY_REQUIRED']))
  }
  if (typeof options.country !== 'string' || options.country.length > 16 ||
      (options.strict !== undefined && typeof options.strict !== 'boolean')) {
    return finish(fail('postalCode', input, ['INVALID_OPTIONS']))
  }
  const code = options.country.trim().toUpperCase()
  if (!code) return finish(fail('postalCode', input, ['COUNTRY_REQUIRED']))
  if (!/^[A-Z]{2}$/.test(code)) return finish(fail('postalCode', input, ['INVALID_OPTIONS']))
  // Accept the historical VAT-style alias, but return the ISO country code.
  const country = code === 'EL' ? 'GR' : code
  const value = input.trim().toUpperCase()
  const pattern = POSTAL_PATTERNS[country]
  if (!EU_COUNTRIES.includes(country)) {
    return finish(fail('postalCode', input, ['UNSUPPORTED_COUNTRY'], { normalized: value, country }))
  }
  if (!pattern) {
    if (options.strict) {
      return finish(fail('postalCode', input, ['FORMAT_NOT_SUPPORTED'], { normalized: value, country }))
    }
    // Preserve legacy acceptance while explicitly reporting that no format was checked.
    return finish({
      ...ok('postalCode', input, value, country, null),
      errors: ['CHECKSUM_NOT_VERIFIABLE'],
    })
  }
  if (!pattern.test(value)) {
    return finish(fail('postalCode', input, ['INVALID_FORMAT'], { normalized: value, country }), true)
  }
  return finish(ok('postalCode', input, value, country, null), true)
}
