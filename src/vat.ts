import { VAT_CHECKSUM_SUPPORTED, VAT_PATTERNS } from './countries.js'
import type { ValidationResult } from './types.js'
import { clean, fail, isBlank, lettersToDigits, mod97, ok } from './util.js'

const DNI_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE'

/**
 * NL: legal-entity VAT — first 9 digits pass the 11-proof. Sole-trader BTW-ids
 * issued since Jan 2020 deliberately fail the 11-proof but instead satisfy a
 * mod-97 check over the full "NL"+body string (letters converted to digits,
 * A=10..Z=35). Either check passing is valid.
 */
function checkNL(body: string, normalized: string): boolean {
  const digits = body.slice(0, 9).split('').map(Number)
  const weights = [9, 8, 7, 6, 5, 4, 3, 2, -1]
  const sum = digits.reduce((acc, d, i) => acc + d * weights[i], 0)
  if (sum % 11 === 0) return true
  return mod97(lettersToDigits(normalized)) === 1
}

/** BE: 97 - (first 8 digits mod 97) must equal the last 2 digits. */
function checkBE(body: string): boolean {
  const base = Number(body.slice(0, 8))
  const check = Number(body.slice(8, 10))
  return 97 - (base % 97) === check
}

/** Iterative ISO 7064 MOD 11,10 check-digit computation (shared by DE and HR). */
function mod1110CheckDigit(digits: string): number {
  let product = 10
  for (const ch of digits) {
    let sum = (Number(ch) + product) % 10
    if (sum === 0) sum = 10
    product = (2 * sum) % 11
  }
  return (11 - product) % 10
}

/** DE: iterative Modulo 11,10 — last digit is the computed check digit. */
function checkDE(body: string): boolean {
  return mod1110CheckDigit(body.slice(0, 8)) === Number(body[8])
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

/**
 * AT: Luhn-variant weights [1,2,1,2,1,2,1] over d1..d7 (digit-sum reduction when a
 * product exceeds 9); check = (96 - S) mod 10. Applies to every AT UID.
 */
function checkAT(body: string): boolean {
  const digits = body.slice(1) // strip leading 'U'
  const weights = [1, 2, 1, 2, 1, 2, 1]
  let sum = 0
  for (let i = 0; i < 7; i++) {
    let p = Number(digits[i]) * weights[i]
    if (p > 9) p -= 9
    sum += p
  }
  return (96 - sum) % 10 === Number(digits[7])
}

const CY_ODD_TRANSLATE = [1, 0, 5, 7, 9, 13, 15, 17, 19, 21] // digit -> translated value, 1st/3rd/5th/7th positions
const CY_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/**
 * CY: odd positions (1st/3rd/5th/7th) translate through a fixed table, even positions
 * count at face value; check letter = alphabet[S mod 26]. Only the '12' leading prefix
 * is banned (enforced by VAT_PATTERNS) — sources disagree on also banning 6/7/8, and
 * the spec's real-world fixtures don't settle it, so we don't hard-reject those.
 */
function checkCY(body: string): boolean {
  let sum = 0
  for (let i = 0; i < 8; i++) {
    const d = Number(body[i])
    sum += i % 2 === 0 ? CY_ODD_TRANSLATE[d] : d
  }
  return CY_ALPHABET[sum % 26] === body[8]
}

/**
 * CZ: DIČ has three populations by length/lead digit.
 * - 8 digits: legal entities (IČO check), weights [8..2]; remainder 0/1 map to check
 *   digits 1/0 (8-digit numbers starting '9' are rejected at the format layer).
 * - 9 digits starting '6': VAT groups / special individuals, weights [8..2] over d2..d8.
 * - 9 digits not starting '6': individuals born pre-1954 with no check digit at all —
 *   CHECKSUM_NOT_VERIFIABLE.
 * - 10 digits: individuals (birth number/RČ), mod-11-mod-10. The `r === 10 -> check 0`
 *   historical exception is accepted (stdnum behaviour); jsvat rejects it — spec
 *   recommends accepting since it matches ~1000 real numbers issued 1954-1985.
 */
function checkCZ(body: string): boolean | null {
  if (body.length === 8) {
    const r = weightedSum(body, [8, 7, 6, 5, 4, 3, 2]) % 11
    let check = (11 - r) % 11
    if (check === 0) check = 1
    return check % 10 === Number(body[7])
  }
  if (body.length === 9) {
    if (body[0] !== '6') return null
    const r = weightedSum(body.slice(1), [8, 7, 6, 5, 4, 3, 2]) % 11
    const check = (8 - ((10 - r) % 11) + 10) % 10
    return check === Number(body[8])
  }
  const r = Number(body.slice(0, 9)) % 11
  return r % 10 === Number(body[9])
}

/**
 * HR: ISO 7064 MOD 11,10 over d1..d10 (OIB) — same iterative engine as DE, reused via
 * mod1110CheckDigit(). Applies to every OIB, legal and natural persons alike.
 */
function checkHR(body: string): boolean {
  return mod1110CheckDigit(body.slice(0, 10)) === Number(body[10])
}

const IE_ALPHABET = 'WABCDEFGHIJKLMNOPQRSTUV'

/**
 * IE: normalises old-style numbers (`D L DDDDD C`) to the 7-digit form (0 + d3..d7 + d1),
 * then weights [8..2] over the 7 digits; a 2013-format trailing letter (9th char) adds
 * 9x its alphabet index before mod 23. Per spec, any alphabet letter is accepted as the
 * trailing char (stdnum's general formula), not just A/H (jsvat hardcodes those two).
 */
function checkIE(body: string): boolean {
  const oldStyle = /^\d[A-Z+*]\d{5}[A-Z]$/.test(body)
  const digits = oldStyle ? '0' + body.slice(2, 7) + body[0] : body.slice(0, 7)
  const checkLetter = body[7]
  const trailing = oldStyle ? undefined : body[8]
  let sum = weightedSum(digits, [8, 7, 6, 5, 4, 3, 2])
  if (trailing) sum += 9 * IE_ALPHABET.indexOf(trailing)
  return IE_ALPHABET[sum % 23] === checkLetter
}

/**
 * LT: two-pass re-weighted mod-11 (9- and 12-digit PVM kodas share one engine).
 * Pass-1 cyclic weights 1..9; if the remainder is 10, retry with weights shifted by 2.
 * Final check digit collapses remainder 10 -> 0.
 */
function checkLT(body: string): boolean {
  const n = body.length - 1
  const pass1 = Array.from({ length: n }, (_, i) => 1 + (i % 9))
  let r = weightedSum(body, pass1) % 11
  if (r === 10) {
    const pass2 = Array.from({ length: n }, (_, i) => 1 + ((i + 2) % 9))
    r = weightedSum(body, pass2) % 11
  }
  return r % 10 === Number(body[n])
}

/**
 * LV: legal entities (first digit 4-9) use weights [9,1,4,8,3,10,2,5,7,6]; check = (3-r) mod 11.
 * A remainder of 4 has no valid check digit UNLESS d1 === '9', in which case the VIES-documented
 * routines recompute S -= 45 before re-deriving r (stdnum omits this; jsvat's port of it is
 * buggy) — spec recommends the VIES behaviour since it strictly widens acceptance.
 * Natural persons (first digit 0-3) have no independently-confirmed checksum algorithm, so
 * they're CHECKSUM_NOT_VERIFIABLE (mirrors the FR alphabetic-key handling).
 */
function checkLV(body: string): boolean | null {
  const first = body[0]
  if (first >= '0' && first <= '3') return null
  let sum = weightedSum(body, [9, 1, 4, 8, 3, 10, 2, 5, 7, 6])
  let r = sum % 11
  if (r === 4 && first === '9') {
    sum -= 45
    r = ((sum % 11) + 11) % 11
  }
  if (r === 4) return false
  const check = (((3 - r) % 11) + 11) % 11
  return check === Number(body[10])
}

/**
 * SK: whole 10-digit number must be divisible by 11 (no discrete check digit); d3 in
 * {2,3,4,6,7,8,9} is enforced by VAT_PATTERNS (union of stdnum's and jsvat's allow-sets,
 * since sources disagree on '6'). The spec's optional "valid Slovak RČ" bypass for
 * non-divisible numbers is intentionally NOT implemented here — it requires a separate
 * birth-number algorithm outside this table's scope, and the spec itself frames it as
 * optional ("if you choose to implement that branch at all").
 */
function checkSK(body: string): boolean {
  return Number(body) % 11 === 0
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

const CHECKSUMS: Record<string, (body: string, normalized: string) => boolean | null> = {
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
  AT: checkAT,
  CY: checkCY,
  CZ: checkCZ,
  HR: checkHR,
  IE: checkIE,
  LT: checkLT,
  LV: checkLV,
  SK: checkSK,
}

/**
 * Validate an EU VAT number offline: country prefix, structure, and (for the
 * countries listed in VAT_CHECKSUM_SUPPORTED) the checksum. All other EU-27
 * countries are format-only — `checks.checksum` is `null`.
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
    const result = CHECKSUMS[country](body, normalized)
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
