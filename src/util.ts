import type { CountryCode, ErrorCode, IdentifierType, ValidationResult } from './types.js'

/** Strip spaces, dots, dashes and uppercase. */
export function clean(input: string): string {
  return input.replace(/[\s.\-/]/g, '').toUpperCase()
}

/**
 * True when input is not a usable, non-empty string. Guards every validator's
 * entry point so a plain-JS caller passing `null`/`undefined`/a number gets a
 * clean `EMPTY_INPUT` result instead of a thrown TypeError from `.trim()`.
 */
export function isBlank(input: unknown): boolean {
  return typeof input !== 'string' || input.trim() === ''
}

/** Build a failing result in one call. */
export function fail(
  type: IdentifierType,
  input: string,
  errors: ErrorCode[],
  opts: { normalized?: string | null; country?: CountryCode | null; format?: boolean; checksum?: boolean | null } = {},
): ValidationResult {
  return {
    valid: false,
    input,
    normalized: opts.normalized ?? null,
    country: opts.country ?? null,
    type,
    checks: { format: opts.format ?? false, checksum: opts.checksum ?? null },
    errors,
  }
}

/** Build a passing result in one call. */
export function ok(
  type: IdentifierType,
  input: string,
  normalized: string,
  country: CountryCode | null,
  checksum: boolean | null,
): ValidationResult {
  return {
    valid: true,
    input,
    normalized,
    country,
    type,
    checks: { format: true, checksum },
    errors: [],
  }
}

/** Convert IBAN/VAT letters to digits (A=10 … Z=35) for mod-97 math. */
export function lettersToDigits(s: string): string {
  let out = ''
  for (const ch of s) {
    const code = ch.charCodeAt(0)
    if (code >= 65 && code <= 90) out += (code - 55).toString()
    else out += ch
  }
  return out
}

/** mod-97 on an arbitrarily long numeric string (avoids BigInt for portability). */
export function mod97(numeric: string): number {
  let remainder = 0
  for (const digit of numeric) {
    remainder = (remainder * 10 + (digit.charCodeAt(0) - 48)) % 97
  }
  return remainder
}
