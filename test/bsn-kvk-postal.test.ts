import { validateBSN } from '../src/bsn.js'
import { validateKvK } from '../src/kvk.js'
import { validatePostalCode } from '../src/postal.js'
import { validate } from '../src/validate.js'

describe('validateBSN', () => {
  it('accepts a number passing the 11-proof', () => {
    expect(validateBSN('111222333').valid).toBe(true)
  })

  it('left-pads 8-digit input', () => {
    const r = validateBSN('11122233') // 8 digits
    expect(r.checks.format).toBe(true)
  })

  it('rejects a failing 11-proof', () => {
    const r = validateBSN('111222334')
    expect(r.valid).toBe(false)
    expect(r.errors).toContain('CHECKSUM_FAILED')
  })

  it('rejects the all-zero number', () => {
    expect(validateBSN('000000000').valid).toBe(false)
  })
})

describe('validateKvK', () => {
  it('accepts 8 digits with checksum null (no checksum exists)', () => {
    const r = validateKvK('69599084')
    expect(r.valid).toBe(true)
    expect(r.checks.checksum).toBeNull()
  })

  it('rejects non-8-digit input', () => {
    expect(validateKvK('1234567').errors).toContain('INVALID_FORMAT')
  })
})

describe('validatePostalCode', () => {
  it('validates NL postal codes', () => {
    expect(validatePostalCode('1011 AB', { country: 'NL' }).valid).toBe(true)
    expect(validatePostalCode('1011AB', { country: 'NL' }).valid).toBe(true)
  })

  it('requires a country', () => {
    expect(validatePostalCode('1011AB', { country: '' }).errors).toContain('COUNTRY_REQUIRED')
  })

  it('flags an unknown (non-EU) country code as unsupported', () => {
    const r = validatePostalCode('1011AB', { country: 'XX' })
    expect(r.valid).toBe(false)
    expect(r.errors).toContain('UNSUPPORTED_COUNTRY')
  })

  it('does not hard-fail an EU country with no postal pattern implemented (IE)', () => {
    const r = validatePostalCode('D02 AF30', { country: 'IE' })
    expect(r.valid).toBe(true)
    expect(r.checks.checksum).toBeNull()
    expect(r.errors).toEqual(['CHECKSUM_NOT_VERIFIABLE'])
  })
})

describe('validate dispatcher', () => {
  it('routes by type', () => {
    expect(validate('NL123456782B01', { type: 'vat' }).valid).toBe(true)
    expect(validate('111222333', { type: 'bsn' }).valid).toBe(true)
    expect(validate('1011AB', { type: 'postalCode', country: 'NL' }).valid).toBe(true)
  })
})
