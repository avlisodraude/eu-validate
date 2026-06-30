import { VAT_CHECKSUM_SUPPORTED, VAT_PATTERNS } from './countries.js'
import type { ValidationResult } from './types.js'
import { clean, fail, isBlank, ok } from './util.js'

const DNI_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE'

/** NL: legal-entity VAT — first 9 digits pass the 11-proof. (Sole-trader BTW-id may not; see README.) */
function checkNL(body: string): boolean {
  const digits = body.slice(0, 9).split('').map(Number)
  const weights = [9, 8, 7, 6, 5, 4, 3, 2, -1]
  const sum = digits.reduce((acc, d, i) => acc + d * weights[i], 0)
  return sum % 11 === 0
}

/** BE: 97 - (first 8 digits mod 97) must equal the last 2 digits. */
function checkBE(body: string): boolean {
  const base = Number(body.slice(0, 8))
  const check = Number(body.slice(8, 10))
  return 97 - (base % 97) === check
}

/** DE: iterative Modulo 11,10 — last digit is the computed check digit. */
function checkDE(body: string): boolean {
  let product = 10
  for (let i = 0; i < 8; i++) {
    let sum = (Number(body[i]) + product) % 10
    if (sum === 0) sum = 10
    product = (2 * sum) % 11
  }
  const check = (11 - product) % 10
  return check === Number(body[8])
}

/** FR: key = (12 + 3 * (SIREN mod 97)) mod 97 when the key is numeric. Alphanumeric keys aren't formula-checkable. */
function checkFR(body: string): boolean | null {
  const key = body.slice(0, 2)
  const siren = body.slice(2)
  if (!/^\d{2}$/.test(key)) return null // can't verify alphabetic keys offline
  const expected = (12 + 3 * (Number(siren) % 97)) % 97
  return Number(key) === expected
}

/** ES: NIF (DNI), NIE, or CIF. */
function checkES(body: string): boolean {
  // DNI: 8 digits + control letter
  if (/^\d{8}[A-Z]$/.test(body)) {
    return DNI_LETTERS[Number(body.slice(0, 8)) % 23] === body[8]
  }
  // NIE: X/Y/Z + 7 digits + control letter
  if (/^[XYZ]\d{7}[A-Z]$/.test(body)) {
    const prefix = { X: '0', Y: '1', Z: '2' }[body[0] as 'X' | 'Y' | 'Z']
    return DNI_LETTERS[Number(prefix + body.slice(1, 8)) % 23] === body[8]
  }
  // CIF: entity letter + 7 digits + control (digit or letter)
  if (/^[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]$/.test(body)) {
    const digits = body.slice(1, 8)
    let total = 0
    for (let i = 0; i < 7; i++) {
      const d = Number(digits[i])
      if (i % 2 === 0) {
        const dbl = d * 2
        total += Math.floor(dbl / 10) + (dbl % 10)
      } else {
        total += d
      }
    }
    const control = (10 - (total % 10)) % 10
    const ctrl = body[8]
    return /\d/.test(ctrl) ? Number(ctrl) === control : ctrl === 'JABCDEFGHI'[control]
  }
  return false
}

/** IT: 11 digits, Luhn-style check on the first 10. */
function checkIT(body: string): boolean {
  let sum = 0
  for (let i = 0; i < 10; i++) {
    let d = Number(body[i])
    if (i % 2 === 1) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
  }
  return (10 - (sum % 10)) % 10 === Number(body[10])
}

/** Weighted modulo-11 helper: sum(digit[i] * weights[i]). */
function weightedSum(body: string, weights: number[]): number {
  return weights.reduce((acc, w, i) => acc + Number(body[i]) * w, 0)
}

/** LU: first 6 digits mod 89 must equal the last 2. */
function checkLU(body: string): boolean {
  return Number(body.slice(0, 6)) % 89 === Number(body.slice(6, 8))
}

/** PT: weights 9..2 over first 8 digits; check = 11 - (sum mod 11), 10/11 → 0. */
function checkPT(body: string): boolean {
  const mod = weightedSum(body, [9, 8, 7, 6, 5, 4, 3, 2]) % 11
  let check = 11 - mod
  if (check >= 10) check = 0
  return check === Number(body[8])
}

/** FI: weights [7,9,10,5,8,4,2] over first 7; remainder 1 invalid, 0 → 0, else 11 - remainder. */
function checkFI(body: string): boolean {
  const remainder = weightedSum(body, [7, 9, 10, 5, 8, 4, 2]) % 11
  if (remainder === 1) return false
  const check = remainder === 0 ? 0 : 11 - remainder
  return check === Number(body[7])
}

/** DK: weights [2,7,6,5,4,3,2,1] over all 8 digits; sum mod 11 must be 0. */
function checkDK(body: string): boolean {
  return weightedSum(body, [2, 7, 6, 5, 4, 3, 2, 1]) % 11 === 0
}

/** SE: 12 digits ending in "01"; first 10 (org number) pass Luhn. */
function checkSE(body: string): boolean {
  if (body.slice(10) !== '01') return false
  let sum = 0
  for (let i = 0; i < 10; i++) {
    let d = Number(body[i])
    if (i % 2 === 0) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
  }
  return sum % 10 === 0
}

/** PL: weights [6,5,7,2,3,4,5,6,7] over first 9; sum mod 11 (10 invalid) = check digit. */
function checkPL(body: string): boolean {
  const mod = weightedSum(body, [6, 5, 7, 2, 3, 4, 5, 6, 7]) % 11
  if (mod === 10) return false
  return mod === Number(body[9])
}

/** SI: weights [8,7,6,5,4,3,2] over first 7; check = 11 - (sum mod 11), 11 → 0, 10 invalid. */
function checkSI(body: string): boolean {
  const mod = weightedSum(body, [8, 7, 6, 5, 4, 3, 2]) % 11
  let check = 11 - mod
  if (check === 11) check = 0
  if (check === 10) return false
  return check === Number(body[7])
}

/** EE: weights [3,7,1,3,7,1,3,7] over first 8; check = (10 - sum mod 10) mod 10. */
function checkEE(body: string): boolean {
  const check = (10 - (weightedSum(body, [3, 7, 1, 3, 7, 1, 3, 7]) % 10)) % 10
  return check === Number(body[8])
}

const CHECKSUMS: Record<string, (body: string) => boolean | null> = {
  NL: checkNL,
  BE: checkBE,
  DE: checkDE,
  FR: checkFR,
  ES: checkES,
  IT: checkIT,
  LU: checkLU,
  PT: checkPT,
  FI: checkFI,
  DK: checkDK,
  SE: checkSE,
  PL: checkPL,
  SI: checkSI,
  EE: checkEE,
}

/**
 * Validate an EU VAT number offline: country prefix, structure, and (for the
 * V1 priority set NL/BE/DE/FR/ES/IT) the checksum. All other EU-27 countries
 * are format-only — `checks.checksum` is `null`.
 *
 * This never asks VIES whether the number is *registered* — use the Cloud
 * client's `verifyVAT()` for that.
 */
export function validateVAT(input: string): ValidationResult {
  if (isBlank(input)) return fail('vat', input, ['EMPTY_INPUT'])

  const value = clean(input)
  const match = value.match(/^([A-Z]{2})(.+)$/)
  if (!match) return fail('vat', input, ['INVALID_FORMAT'], { normalized: value })

  // Greece's VAT prefix is EL, not its ISO code GR.
  const country = match[1] === 'GR' ? 'EL' : match[1]
  const body = match[2]
  const normalized = country + body

  const pattern = VAT_PATTERNS[country]
  if (!pattern) return fail('vat', input, ['UNKNOWN_COUNTRY'], { normalized, country })

  if (!pattern.test(body)) {
    return fail('vat', input, ['INVALID_FORMAT'], { normalized, country })
  }

  if (VAT_CHECKSUM_SUPPORTED.includes(country)) {
    const result = CHECKSUMS[country](body)
    if (result === false) {
      return fail('vat', input, ['CHECKSUM_FAILED'], {
        normalized,
        country,
        format: true,
        checksum: false,
      })
    }
    if (result === null) {
      // Not formula-checkable offline (e.g. FR alphabetic key). Format is valid,
      // so this is a non-blocking informational code, not a failure.
      return {
        valid: true,
        input,
        normalized,
        country,
        type: 'vat',
        checks: { format: true, checksum: null },
        errors: ['CHECKSUM_NOT_VERIFIABLE'],
      }
    }
    // result === true → checksum passed.
    return ok('vat', input, normalized, country, result)
  }

  // Format-only country.
  return ok('vat', input, normalized, country, null)
}
