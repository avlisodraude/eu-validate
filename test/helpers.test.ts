import { isValid, assertValid, ValidationError } from '../src/helpers.js'
import { validateIBAN } from '../src/iban.js'
import { validateVAT } from '../src/vat.js'

describe('isValid', () => {
  it('returns true for a valid result', () => {
    const r = validateIBAN('NL91ABNA0417164300')
    expect(isValid(r)).toBe(true)
  })

  it('returns false for an invalid result', () => {
    const r = validateIBAN('NL00ABNA0417164300') // bad check digits
    expect(isValid(r)).toBe(false)
  })
})

describe('assertValid', () => {
  it('returns the result unchanged when valid', () => {
    const r = validateIBAN('NL91ABNA0417164300')
    expect(assertValid(r)).toBe(r)
  })

  it('throws ValidationError when invalid', () => {
    const r = validateVAT('NL123B45') // bad format
    expect(() => assertValid(r)).toThrow(ValidationError)
  })

  it('attaches the failing result to the thrown error', () => {
    const r = validateVAT('ZZ123456789') // unknown country
    expect.assertions(2)
    try {
      assertValid(r)
    } catch (e) {
      expect((e as ValidationError).result).toBe(r)
      expect((e as ValidationError).result.errors).toContain('UNKNOWN_COUNTRY')
    }
  })
})
