import { validateVAT } from '../src/vat.js'

describe('validateVAT — checksum countries', () => {
  // All sample numbers below were checksum-verified by hand.
  const valid: Array<[string, string]> = [
    ['NL', 'NL123456782B01'],
    ['BE', 'BE0411905847'],
    ['DE', 'DE136695976'],
    ['FR', 'FR40303265045'],
    ['ES (CIF)', 'ESA12345674'],
    ['ES (DNI)', 'ES12345678Z'],
    ['IT', 'IT00743110157'],
    ['LU', 'LU26375245'],
    ['PT', 'PT501964843'],
    ['FI', 'FI20774740'],
    ['DK', 'DK13585628'],
    ['SE', 'SE556036079301'],
    ['PL', 'PL5260001246'],
    ['SI', 'SI59082437'],
    ['EE', 'EE100931558'],
  ]

  it.each(valid)('accepts a valid %s VAT number', (_label, vat) => {
    const r = validateVAT(vat)
    expect(r.valid).toBe(true)
    expect(r.checks.format).toBe(true)
    expect(r.checks.checksum).toBe(true)
    expect(r.errors).toEqual([])
  })

  it('rejects a bad checksum', () => {
    const r = validateVAT('DE136695975') // last digit wrong
    expect(r.valid).toBe(false)
    expect(r.checks.format).toBe(true)
    expect(r.checks.checksum).toBe(false)
    expect(r.errors).toContain('CHECKSUM_FAILED')
  })

  it('accepts lowercase / spaced / dotted input', () => {
    expect(validateVAT('nl 1234.567.82 b01').valid).toBe(true)
  })
})

describe('validateVAT — NL sole-trader BTW-id (mod-97)', () => {
  it('accepts a new-style sole-trader BTW-id that fails the 11-proof but passes mod-97', () => {
    const r = validateVAT('NL123456789B13')
    expect(r.valid).toBe(true)
    expect(r.checks.format).toBe(true)
    expect(r.checks.checksum).toBe(true)
    expect(r.errors).toEqual([])
  })

  it('still accepts a legal-entity number that passes the 11-proof', () => {
    const r = validateVAT('NL123456782B01')
    expect(r.valid).toBe(true)
    expect(r.checks.checksum).toBe(true)
  })

  it('rejects a number failing both the 11-proof and mod-97', () => {
    const r = validateVAT('NL123456789B12')
    expect(r.valid).toBe(false)
    expect(r.checks.checksum).toBe(false)
    expect(r.errors).toContain('CHECKSUM_FAILED')
  })
})

describe('validateVAT — format-only countries', () => {
  it('accepts a well-formed AT number with checksum null', () => {
    const r = validateVAT('ATU12345678')
    expect(r.valid).toBe(true)
    expect(r.checks.format).toBe(true)
    expect(r.checks.checksum).toBeNull()
  })

  it('maps Greek GR prefix to EL', () => {
    const r = validateVAT('GR123456789')
    expect(r.valid).toBe(true)
    expect(r.country).toBe('EL')
  })
})

describe('validateVAT — FR alphabetic key (CHECKSUM_NOT_VERIFIABLE)', () => {
  it('is valid but flags the checksum as not verifiable offline', () => {
    const r = validateVAT('FRXX123456789')
    expect(r.valid).toBe(true)
    expect(r.checks.format).toBe(true)
    expect(r.checks.checksum).toBeNull()
    expect(r.errors).toEqual(['CHECKSUM_NOT_VERIFIABLE'])
  })

  it('still rejects a numeric key with a wrong checksum as CHECKSUM_FAILED', () => {
    const r = validateVAT('FR00303265045') // numeric key, wrong value
    expect(r.valid).toBe(false)
    expect(r.errors).toContain('CHECKSUM_FAILED')
  })
})

describe('validateVAT — errors', () => {
  it('flags empty input', () => {
    expect(validateVAT('').errors).toContain('EMPTY_INPUT')
  })

  it('flags unknown country', () => {
    expect(validateVAT('ZZ123456789').errors).toContain('UNKNOWN_COUNTRY')
  })

  it('flags bad format', () => {
    const r = validateVAT('NL123B45')
    expect(r.valid).toBe(false)
    expect(r.errors).toContain('INVALID_FORMAT')
  })
})
