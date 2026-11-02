import type { CountryCode } from './types.js'

/** The 27 EU member-state country codes. */
export const EU_COUNTRIES: CountryCode[] = [
  'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GR',
  'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO',
  'SE', 'SI', 'SK',
]

/**
 * VAT number structure per country (the digits/letters AFTER the 2-letter prefix).
 * Note: Greece uses the VAT prefix `EL`, not its ISO code `GR`.
 * Source: EU VIES / national VAT number specifications.
 */
export const VAT_PATTERNS: Record<CountryCode, RegExp> = {
  AT: /^U\d{8}$/,
  BE: /^0\d{9}$/,
  BG: /^\d{9,10}$/,
  // Structural rule (both checksum sources agree): TIC may not start '12'.
  CY: /^(?!12)\d{8}[A-Z]$/,
  // 8-digit legal entities may not start '9' (IČO allocation rule); 9- and
  // 10-digit individuals/groups have no such restriction.
  CZ: /^(?:[0-8]\d{7}|\d{9,10})$/,
  DE: /^\d{9}$/,
  DK: /^\d{8}$/,
  EE: /^\d{9}$/,
  EL: /^\d{9}$/,
  ES: /^[A-Z0-9]\d{7}[A-Z0-9]$/,
  FI: /^\d{8}$/,
  FR: /^[A-Z0-9]{2}\d{9}$/,
  HR: /^\d{11}$/,
  HU: /^\d{8}$/,
  // New/2013 style: 7 digits + 1-2 check letters. Old style: digit, letter/+/*,
  // 5 digits, check letter.
  IE: /^\d{7}[A-Z]{1,2}$|^\d[A-Z+*]\d{5}[A-Z]$/,
  IT: /^\d{11}$/,
  // 9-digit: 7 digits + structural '1' (8th digit) + check digit.
  // 12-digit: 10 digits + structural '1' (11th digit) + check digit.
  LT: /^(?:\d{7}1\d|\d{10}1\d)$/,
  LU: /^\d{8}$/,
  LV: /^\d{11}$/,
  // No leading zero (stdnum and jsvat agree).
  MT: /^[1-9]\d{7}$/,
  NL: /^\d{9}B\d{2}$/,
  PL: /^\d{10}$/,
  PT: /^\d{9}$/,
  // 2-10 digits, no leading zero (stdnum and jsvat agree).
  RO: /^[1-9]\d{1,9}$/,
  SE: /^\d{12}$/,
  SI: /^\d{8}$/,
  // d1 != 0; d3 in the union of both checksum sources' allow-sets (they
  // disagree on '6' — see checkSK).
  SK: /^[1-9]\d[2346789]\d{7}$/,
}

/**
 * Countries with full checksum validation — all 27 EU member states.
 * `checksum: null` now only occurs for per-number sub-cases that are not
 * formula-checkable offline (FR alphabetic keys, CZ pre-1954 birth numbers,
 * LV natural persons).
 */
export const VAT_CHECKSUM_SUPPORTED: CountryCode[] = [
  'NL', 'BE', 'DE', 'FR', 'ES', 'IT',
  'LU', 'PT', 'FI', 'DK', 'SE', 'PL', 'SI', 'EE',
  'AT', 'CY', 'CZ', 'HR', 'IE', 'LT', 'LV', 'SK',
  'BG', 'EL', 'HU', 'MT', 'RO',
]

// Kept as a re-export for callers importing the existing country data module.
export { IBAN_LENGTHS } from './iban-formats.js'

/**
 * Postal-code formats (V1 core set). Only six countries have a pattern so far —
 * indexing with a country outside this set legitimately yields `undefined`.
 */
export const POSTAL_PATTERNS: Partial<Record<CountryCode, RegExp>> = {
  NL: /^\d{4} ?[A-Z]{2}$/i,
  DE: /^\d{5}$/,
  FR: /^\d{5}$/,
  BE: /^\d{4}$/,
  ES: /^\d{5}$/,
  IT: /^\d{5}$/,
}
