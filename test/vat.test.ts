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
    ['BG (Kaufland & Co KD)', 'BG131129282'],
    ['BG (Medical University of Sofia)', 'BG831385737'],
    ['BG (Ontotext)', 'BG200356710'],
    ['BG (ESO, exercises pass 2)', 'BG175201304'],
    ['BG (Kaufland EOOD, exercises pass 2)', 'BG131058063'],
    ['BG (UNWE, leading zeros)', 'BG000670602'],
    ['BG (stdnum doctest)', 'BG175074752'],
    ['BG (10-digit, IEES-BAS, others branch)', 'BG1226046182'],
    ['BG (10-digit, NCIPD)', 'BG1223022223'],
    ['EL (OTE)', 'EL094019245'],
    ['EL (Hellenic Post)', 'EL094026421'],
    ['EL (University of Ioannina)', 'EL090029284'],
    ['EL (delivery.gr)', 'EL998708533'],
    ['EL (Ubitech, 10 -> 0 collapse)', 'EL998908360'],
    ['EL (Lamia Municipality, 10 -> 0 collapse)', 'EL997947640'],
    ['EL (stdnum doctest)', 'EL094259216'],
    ['HU (Wizz Air)', 'HU26648525'],
    ['HU (Óbuda University, check digit 0)', 'HU19308760'],
    ['HU (MATE)', 'HU15329767'],
    ['HU (stdnum doctest)', 'HU12892312'],
    ['MT (University of Malta)', 'MT12894031'],
    ['MT (MITA)', 'MT19134013'],
    ['MT (King)', 'MT18622630'],
    ['MT (Epic Malta)', 'MT12135215'],
    ['MT (Ministry for Finance)', 'MT17981218'],
    ['MT (stdnum doctest)', 'MT11679112'],
    ['RO (OMV Petrom, 7-digit padding)', 'RO1590082'],
    ['RO (CEC Bank, 6-digit padding)', 'RO361897'],
    ['RO (Dante International / eMAG)', 'RO14399840'],
    ['RO (ASE Bucharest)', 'RO4433775'],
    ['RO (Politehnica Bucharest)', 'RO14814742'],
    ['RO (stdnum doctest, 10 -> 0 collapse)', 'RO18547290'],
  ]

  it.each(valid)('accepts a valid %s VAT number', (_label, vat) => {
    const r = validateVAT(vat)
    expect(r.valid).toBe(true)
    expect(r.checks.format).toBe(true)
    expect(r.checks.checksum).toBe(true)
    expect(r.errors).toEqual([])
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

describe('validateVAT — GR/EL prefix mapping', () => {
  it('maps the Greek GR prefix to EL and still checksum-validates the body', () => {
    const r = validateVAT('GR094019245')
    expect(r.valid).toBe(true)
    expect(r.country).toBe('EL')
    expect(r.normalized).toBe('EL094019245')
    expect(r.checks.checksum).toBe(true)
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

describe('validateVAT — invalid checksum mutations (all checksum countries)', () => {
  // Every number below is a checksum-failing mutation of a verified-valid
  // fixture from vat-checksum-spec.md's "Invalid mutations" sections.
  const invalidChecksum: Array<[string, string]> = [
    ['DE', 'DE136695975'], // last digit 6->5
    ['LU', 'LU26375345'], // d6 2->3
    ['PT', 'PT511964843'], // d2 0->1
    ['FI', 'FI30774740'], // d1 2->3
    ['DK', 'DK23585628'], // d1 1->2
    ['SE', 'SE656036079301'], // d1 5->6
    ['PL', 'PL5360001246'], // d2 2->3
    ['SI', 'SI59182437'], // d3 0->1
    ['EE', 'EE200931558'], // d1 1->2
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
    ['BG (9-digit)', 'BG131129283'], // pass-1 r=2, got 3
    ['BG (9-digit)', 'BG175074751'], // stdnum's own doctest mutation
    ['BG (9-digit, pass-2 rejection)', 'BG175201305'], // pass 2 r=4, got 5
    ['BG (10-digit, all three branches fail)', 'BG1226046183'],
    ['BG (10-digit, all three branches fail)', 'BG1223022224'],
    ['EL', 'EL094019246'], // check 5, got 6
    ['EL', 'EL194019245'], // d1 0->1: S=1768, check 8
    ['EL (collapse case)', 'EL998908361'], // check 0, got 1
    ['HU', 'HU26648526'], // check 5, got 6
    ['HU', 'HU26649525'], // d5 8->9: S=204, check 6
    ['MT', 'MT12894032'], // pair 31, got 32
    ['MT', 'MT19234013'], // d3 1->2: expected pair 7, got 13
    ['RO', 'RO1590083'], // check 2, got 3
    ['RO', 'RO24399840'], // d1 1->2: S=157, check 8, got 0
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

  it('rejects MT numbers with a leading zero as INVALID_FORMAT', () => {
    const r = validateVAT('MT01234567')
    expect(r.valid).toBe(false)
    expect(r.errors).toContain('INVALID_FORMAT')
  })

  it('rejects RO numbers with a leading zero as INVALID_FORMAT', () => {
    const r = validateVAT('RO0590082')
    expect(r.valid).toBe(false)
    expect(r.errors).toContain('INVALID_FORMAT')
  })

  it('rejects a near-mutation of a 10-digit BG number only when all three branches fail', () => {
    // Spec 2's mutation-derivation warning: BG1226046189 LOOKS like a mutation of
    // the valid BG1226046182 but is itself valid via the EGN branch — assert the
    // union behaviour so a future "simplification" to one branch fails this test.
    expect(validateVAT('BG1226046189').valid).toBe(true)
    expect(validateVAT('BG1226046183').valid).toBe(false)
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
