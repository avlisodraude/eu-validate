import { validateIBAN } from '../src/iban.js'

describe('validateIBAN', () => {
  it('accepts valid IBANs', () => {
    expect(validateIBAN('NL91 ABNA 0417 1643 00').valid).toBe(true)
    expect(validateIBAN('DE89 3704 0044 0532 0130 00').valid).toBe(true)
    expect(validateIBAN('BE68 5390 0754 7034').valid).toBe(true)
  })

  it('normalizes formatting', () => {
    const r = validateIBAN('nl91 abna 0417 1643 00')
    expect(r.normalized).toBe('NL91ABNA0417164300')
    expect(r.country).toBe('NL')
  })

  it('rejects a bad check digit', () => {
    const r = validateIBAN('NL92ABNA0417164300')
    expect(r.valid).toBe(false)
    expect(r.checks.format).toBe(true)
    expect(r.errors).toContain('CHECKSUM_FAILED')
  })

  it('rejects wrong length for country', () => {
    expect(validateIBAN('NL91ABNA04171643').errors).toContain('INVALID_FORMAT')
  })

  it('rejects unknown country', () => {
    expect(validateIBAN('ZZ00ABNA0417164300').errors).toContain('UNKNOWN_COUNTRY')
  })
})
