import { readFileSync } from 'node:fs'
import { validateIBAN } from '../src/iban.js'

const registry = JSON.parse(readFileSync(new URL('./fixtures/iban-registry.json', import.meta.url), 'utf8')) as {
  examples: Record<string, string>
}

// Independent BigInt arithmetic: create checksum-correct *invalid-format* cases.
function checkDigits(country: string, body: string): string {
  const numeric = (body + country + '00').replace(/[A-Z]/g, c => String(c.charCodeAt(0) - 55))
  return country + String(98n - BigInt(numeric) % 97n).padStart(2, '0') + body
}

describe('SWIFT registry national IBAN formats (release 103)', () => {
  it.each(Object.entries(registry.examples))('accepts the official %s example', (country, example) => {
    expect(validateIBAN(example)).toMatchObject({ valid: true, country,
      checks: { format: true, checksum: true } })
  })
  it.each(Object.entries(registry.examples))('rejects zero check digits for %s', (_country, example) => {
    expect(validateIBAN(example.slice(0, 2) + '00' + example.slice(4)).valid).toBe(false)
  })
  it.each([
    ['NL', '1'], // bank identifier must be alphabetic
    ['DE', 'A'], // national body must be numeric
    ['GB', '1'], // bank identifier must be alphabetic
    ['IT', '1'], // domestic check character must be alphabetic
    ['FR', 'A'], // bank/branch identifiers must be numeric
  ])('rejects a mod-97-correct but structurally invalid %s IBAN', (country, character) => {
    const original = registry.examples[country]
    const value = checkDigits(country, character + original.slice(5))
    expect(value.length).toBe(original.length)
    const numeric = (value.slice(4) + value.slice(0, 4)).replace(/[A-Z]/g, c => String(c.charCodeAt(0) - 55))
    expect(BigInt(numeric) % 97n).toBe(1n)
    expect(validateIBAN(value)).toMatchObject({ valid: false, errors: ['INVALID_FORMAT'] })
  })
  it('accepts alphanumeric account sections allowed by the national format', () => {
    expect(validateIBAN(checkDigits('FR', '2004101005ABCDEF1234567')).valid).toBe(true)
  })
})
