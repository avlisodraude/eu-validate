import { IBAN_LENGTHS } from './countries.js'
import type { ValidationResult } from './types.js'
import { clean, fail, isBlank, lettersToDigits, mod97, ok } from './util.js'

/**
 * Validate an IBAN offline: structure, country length, and the ISO 13616
 * mod-97 check digits. No network call.
 */
export function validateIBAN(input: string): ValidationResult {
  if (isBlank(input)) return fail('iban', input, ['EMPTY_INPUT'])

  const value = clean(input)
  const country = value.slice(0, 2)

  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(value)) {
    return fail('iban', input, ['INVALID_FORMAT'], { normalized: value })
  }

  const expectedLength = IBAN_LENGTHS[country]
  if (expectedLength === undefined) {
    return fail('iban', input, ['UNKNOWN_COUNTRY'], { normalized: value, country })
  }
  if (value.length !== expectedLength) {
    return fail('iban', input, ['INVALID_FORMAT'], { normalized: value, country })
  }

  // Move the first 4 chars to the end, convert letters to digits, mod-97 must be 1.
  const rearranged = value.slice(4) + value.slice(0, 4)
  const checksumOk = mod97(lettersToDigits(rearranged)) === 1

  if (!checksumOk) {
    return fail('iban', input, ['CHECKSUM_FAILED'], {
      normalized: value,
      country,
      format: true,
      checksum: false,
    })
  }

  return ok('iban', input, value, country, true)
}
