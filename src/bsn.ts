import type { ValidationResult } from './types.js'
import { clean, fail, ok } from './util.js'

/**
 * Validate a Dutch BSN (Burgerservicenummer) with the 11-proof (elfproef).
 *
 * Accepts 8 or 9 digits (8-digit numbers are left-padded to 9). The weighted
 * sum uses [9,8,7,6,5,4,3,2,-1] and must be divisible by 11.
 */
export function validateBSN(input: string): ValidationResult {
  if (!input || !input.trim()) return fail('bsn', input, ['EMPTY_INPUT'])

  const value = clean(input)
  if (!/^\d{8,9}$/.test(value)) {
    return fail('bsn', input, ['INVALID_FORMAT'], { normalized: value, country: 'NL' })
  }

  const digits = value.padStart(9, '0').split('').map(Number)
  const weights = [9, 8, 7, 6, 5, 4, 3, 2, -1]
  const sum = digits.reduce((acc, d, i) => acc + d * weights[i], 0)

  // Must be divisible by 11 and not the trivial all-zero number.
  const checksumOk = sum % 11 === 0 && digits.some((d) => d !== 0)

  if (!checksumOk) {
    return fail('bsn', input, ['CHECKSUM_FAILED'], {
      normalized: value,
      country: 'NL',
      format: true,
      checksum: false,
    })
  }

  return ok('bsn', input, value, 'NL', true)
}
