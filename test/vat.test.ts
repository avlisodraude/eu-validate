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
    ['AT', 'ATU33864707'],
    ['AT (ÖBB-TS)', 'ATU58119529'],
    ['AT (voestalpine)', 'ATU36905408'],
    ['AT (BMF example)', 'ATU13585627'],
    ['CZ (8-digit)', 'CZ00177041'],
    ['CZ (8-digit, ČEZ)', 'CZ45274649'],
    ['CZ (8-digit, appendix)', 'CZ25123891'],
    ['CZ (VAT group, 9-digit starting 6)', 'CZ699001182'],
    ['CZ (9-digit starting 6, appendix)', 'CZ640903926'],
    ['CZ (RČ, 10-digit)', 'CZ7103192745'],
    ['HR', 'HR81793146560'],
    ['HR (INA)', 'HR27759560625'],
    ['HR (Zagrebačka banka)', 'HR92963223473'],
    ['HR (appendix)', 'HR33392005961'],
    ['LT (9-digit)', 'LT230335113'],
    ['LT (Telia)', 'LT212154314'],
    ['LT (9-digit, appendix)', 'LT119511515'],
    ['LT (12-digit)', 'LT100001919017'],
    ['LT (12-digit, pass-2 + 10->0 collapse)', 'LT100004801610'],
    ['LV', 'LV40003245752'],
    ['LV (Latvenergo)', 'LV40003032949'],
    ['LV (RIMI)', 'LV40003053029'],
    ['LV (appendix)', 'LV40003521600'],
    ['IE (new style)', 'IE6388047V'],
    ['IE (Microsoft)', 'IE8256796U'],
    ['IE (Ryanair)', 'IE4749148U'],
    ['IE (2013 format)', 'IE4143435AH'],
    ['IE (old style)', 'IE8D79739I'],
    ['IE (Revenue doc example, W spouse-suffix zero)', 'IE1234567WH'],
    ['IE (appendix, new style)', 'IE6433435F'],
    ['IE (appendix, 2013 format)', 'IE6433435OA'],
    ['CY', 'CY90000005D'],
    ['CY (University of Cyprus)', 'CY90001673W'],
    ['CY (reference-library canonical example)', 'CY10259033P'],
    ['SK (Slovak Telekom)', 'SK2020273893'],
    ['SK (ESET)', 'SK2020317068'],
    ['SK (Tatra banka VAT group)', 'SK7020000944'],
    ['SK (appendix)', 'SK2022749619'],
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
  it('accepts a well-formed BG number with checksum null', () => {
    const r = validateVAT('BG123456789')
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

describe('validateVAT — AT/CZ/HR/LT/LV/IE/CY/SK invalid mutations', () => {
  // Every number below is a checksum-failing mutation of a verified-valid
  // fixture from vat-checksum-spec.md's "Invalid mutations" sections.
  const invalidChecksum: Array<[string, string]> = [
    ['AT', 'ATU33864708'], // last digit 7->8
    ['AT', 'ATU53119529'], // d2 8->3
    ['CZ (8-digit)', 'CZ00177042'],
    ['CZ (8-digit)', 'CZ46274649'], // d2 5->6
    ['CZ (9-digit group)', 'CZ699001183'],
    ['CZ (10-digit RČ)', 'CZ7103192746'],
    ['HR', 'HR81793146561'],
    ['HR', 'HR87793146560'], // d2 1->7
    ['LT (9-digit)', 'LT230335114'],
    ['LT (12-digit)', 'LT100001919016'],
    ['LV', 'LV40003245753'],
    ['LV', 'LV40003032948'],
    ['IE (new style)', 'IE6388047W'],
    ['IE (new style)', 'IE6388057V'], // d5 4->5
    ['IE (2013 format)', 'IE4143435AA'], // trailing letter participates in the checksum
    ['CY', 'CY90000005E'],
    ['CY', 'CY10259034P'], // d8 3->4
    ['SK', 'SK2020273894'],
    ['SK', 'SK2021273893'], // d4 0->1
  ]

  it.each(invalidChecksum)('rejects a bad %s checksum', (_label, vat) => {
    const r = validateVAT(vat)
    expect(r.valid).toBe(false)
    expect(r.checks.format).toBe(true)
    expect(r.checks.checksum).toBe(false)
    expect(r.errors).toContain('CHECKSUM_FAILED')
  })

  it('rejects CZ RČ month=13 as a checksum failure too (no separate date validation)', () => {
    // Spec frames this as a component/date defect; this library doesn't validate
    // the embedded calendar date, so it still surfaces as CHECKSUM_FAILED because
    // the arithmetic independently disagrees (r=8, expected check digit 5).
    const r = validateVAT('CZ7113392745')
    expect(r.valid).toBe(false)
    expect(r.errors).toContain('CHECKSUM_FAILED')
  })

  it('rejects LV numbers where the weighted sum lands on the unsatisfiable r === 4 remainder', () => {
    // Spec: body S = 180, r = 4 (first digit '4', not '9', so no VIES -45 adjustment
    // applies) — no check digit can make this valid, so any trailing digit fails.
    const r = validateVAT('LV40004245750')
    expect(r.valid).toBe(false)
    expect(r.checks.checksum).toBe(false)
    expect(r.errors).toContain('CHECKSUM_FAILED')
  })

  it('rejects LT numbers with a structurally invalid 8th digit as INVALID_FORMAT', () => {
    const r = validateVAT('LT230335123') // d8 1->2
    expect(r.valid).toBe(false)
    expect(r.errors).toContain('INVALID_FORMAT')
  })

  it('rejects CY numbers starting with the banned "12" prefix as INVALID_FORMAT', () => {
    const r = validateVAT('CY12345678X')
    expect(r.valid).toBe(false)
    expect(r.errors).toContain('INVALID_FORMAT')
  })

  it('rejects SK numbers with a disallowed 3rd digit as INVALID_FORMAT', () => {
    const r = validateVAT('SK2050273893') // d3 = 5
    expect(r.valid).toBe(false)
    expect(r.errors).toContain('INVALID_FORMAT')
  })
})

describe('validateVAT — CZ/LV CHECKSUM_NOT_VERIFIABLE sub-cases', () => {
  it('flags CZ 9-digit individuals not starting with 6 as not verifiable offline', () => {
    const r = validateVAT('CZ512345678')
    expect(r.valid).toBe(true)
    expect(r.checks.format).toBe(true)
    expect(r.checks.checksum).toBeNull()
    expect(r.errors).toEqual(['CHECKSUM_NOT_VERIFIABLE'])
  })

  it('flags LV natural-person numbers (first digit 0-3) as not verifiable offline', () => {
    const r = validateVAT('LV20553012345')
    expect(r.valid).toBe(true)
    expect(r.checks.format).toBe(true)
    expect(r.checks.checksum).toBeNull()
    expect(r.errors).toEqual(['CHECKSUM_NOT_VERIFIABLE'])
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
