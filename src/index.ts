export { validateVAT } from './vat.js'
export { validateIBAN } from './iban.js'
export { validateBSN } from './bsn.js'
export { validateKvK } from './kvk.js'
export { validatePostalCode } from './postal.js'
export { validate, type ValidateOptions } from './validate.js'
export { MAX_INPUT_LENGTH } from './util.js'
export { IBAN_PATTERNS } from './iban-formats.js'
export { isValid, assertValid, ValidationError } from './helpers.js'

export {
  EU_COUNTRIES,
  VAT_CHECKSUM_SUPPORTED,
  VAT_PATTERNS,
  IBAN_LENGTHS,
  POSTAL_PATTERNS,
} from './countries.js'

export type {
  ValidationResult,
  InvalidOptionsResult,
  IdentifierType,
  CountryCode,
  ErrorCode,
  PostalCodeOptions,
} from './types.js'
