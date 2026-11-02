import { inspect } from 'node:util'
import { validateVAT, validateIBAN, validateBSN, validateKvK, validatePostalCode,
  validate, assertValid, ValidationError, MAX_INPUT_LENGTH, EU_COUNTRIES,
  VAT_CHECKSUM_SUPPORTED } from '../src/index.js'

const validators = [validateVAT, validateIBAN, validateBSN, validateKvK,
  (input: string) => validatePostalCode(input, { country: 'NL' })]

describe('offline input boundaries', () => {
  it.each(validators.map((fn, i) => [i, fn] as const))('guards validator %i without coercing input', (_i, fn) => {
    for (const input of [null, undefined, 0, false, [], {}, Symbol('input'),
      { toString() { throw new Error('must not coerce') } }]) {
      const result = fn(input as never)
      expect(result.valid).toBe(false)
      expect(result.errors).toEqual(['INVALID_INPUT'])
      expect(result.input).toBe('')
    }
    expect(fn(' \n\t').errors).toEqual(['EMPTY_INPUT'])
    expect(fn(' '.repeat(MAX_INPUT_LENGTH) + '1').errors).toEqual(['INPUT_TOO_LONG'])
    expect(fn(' '.repeat(MAX_INPUT_LENGTH)).errors).toEqual(['EMPTY_INPUT'])
    expect(fn('1'.repeat(MAX_INPUT_LENGTH)).errors).not.toContain('INPUT_TOO_LONG')
  })

  it.each([undefined, null, false, 1, [], {}, 'vat', { type: 'unknown' }, { type: null }])(
    'returns a structured result for invalid dispatcher options: %p', options => {
      expect(validate('value', options)).toMatchObject({
        valid: false, type: null, normalized: null, errors: ['INVALID_OPTIONS'],
      })
    })

  it.each([123, false, {}, [], Symbol('country'), 'NETHERLANDS', 'N'.repeat(1000)])(
    'guards malformed postal country: %p', country => {
      expect(validatePostalCode('1011AB', { country: country as never }).errors)
        .toEqual(['INVALID_OPTIONS'])
    })

  it.each([1, false, 'NL', []])('rejects a malformed postal options container: %p', options => {
    expect(validatePostalCode('1011AB', options as never).errors).toEqual(['INVALID_OPTIONS'])
  })

  it('rejects malformed postal strict options through both APIs', () => {
    expect(validatePostalCode('1011AB', { country: 'NL', strict: 'yes' as never }).errors)
      .toEqual(['INVALID_OPTIONS'])
    expect(validate('1011AB', { type: 'postalCode', country: 123 }).errors)
      .toEqual(['INVALID_OPTIONS'])
    expect(validatePostalCode('1011AB', undefined as never).errors).toEqual(['COUNTRY_REQUIRED'])
  })
})

describe('postal coverage and ISO countries', () => {
  it('keeps ISO country data separate from VAT prefixes', () => {
    expect(EU_COUNTRIES).toHaveLength(27)
    expect(EU_COUNTRIES).toContain('GR')
    expect(EU_COUNTRIES).not.toContain('EL')
    expect(VAT_CHECKSUM_SUPPORTED).toContain('EL')
    expect(validateVAT('GR094019245')).toMatchObject({ valid: true, country: 'EL' })
  })
  it.each(['GR', ' gr ', 'EL', 'el'])('accepts Greek country alias %s without claiming coverage', country => {
    expect(validatePostalCode('10558', { country })).toMatchObject({
      valid: true, country: 'GR', checks: { formatSupported: false },
    })
  })
  it('reports legacy acceptance explicitly and offers strict validation', () => {
    expect(validatePostalCode('???', { country: 'IE' })).toMatchObject({
      valid: true, checks: { format: true, formatSupported: false },
    })
    expect(validate('D02 AF30', { type: 'postalCode', country: 'IE', strict: true })).toMatchObject({
      valid: false, errors: ['FORMAT_NOT_SUPPORTED'],
      checks: { format: false, formatSupported: false },
    })
    expect(validatePostalCode('1011 AB', { country: ' nl ', strict: true })).toMatchObject({
      valid: true, country: 'NL', checks: { format: true, formatSupported: true },
    })
    expect(validatePostalCode('???', { country: 'NL' })).toMatchObject({
      valid: false, checks: { format: false, formatSupported: true },
    })
  })
})

describe('normalization and privacy', () => {
  it.each([
    [validateVAT, 'nl 1234.567.82-b01'],
    [validateIBAN, 'nl91 abna 0417 1643 00'],
    [validateBSN, '111.222.333'],
    [validateKvK, '6959-9084'],
  ])('normalization is idempotent', (fn, input) => {
    const result = fn(input)
    expect(result.valid).toBe(true)
    expect(fn(result.normalized!).normalized).toBe(result.normalized)
  })
  it.each([
    validateBSN('111222334'), validateIBAN('NL00ABNA0417164300'),
  ])('keeps identifiers out of ordinary error logging', result => {
    const error = new ValidationError(result)
    expect(error.message).toContain(result.errors[0])
    for (const output of [error.message, error.stack!, String(error), inspect(error), JSON.stringify(error)]) {
      expect(output).not.toContain(result.input)
    }
    expect(error.result).toBe(result)
    expect(() => assertValid(result)).toThrow(ValidationError)
  })
})
