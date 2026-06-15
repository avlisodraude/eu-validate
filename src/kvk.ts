import type { ValidationResult } from './types.js'
import { clean, fail, ok } from './util.js'

/**
 * Validate the *format* of a Dutch KvK (Chamber of Commerce) number: 8 digits.
 *
 * KvK numbers have no public checksum, so format is the most an offline check
 * can assert. Real existence / company details require the KvK register —
 * use the Cloud client's `lookupKvK()`.
 */
export function validateKvK(input: string): ValidationResult {
  if (!input || !input.trim()) return fail('kvk', input, ['EMPTY_INPUT'])

  const value = clean(input)
  if (!/^\d{8}$/.test(value)) {
    return fail('kvk', input, ['INVALID_FORMAT'], { normalized: value, country: 'NL' })
  }

  // No checksum exists for KvK numbers.
  return ok('kvk', input, value, 'NL', null)
}
