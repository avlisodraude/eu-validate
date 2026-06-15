import { validateBSN } from './bsn.js'
import { validateIBAN } from './iban.js'
import { validateKvK } from './kvk.js'
import { validatePostalCode } from './postal.js'
import type { IdentifierType, ValidationResult } from './types.js'
import { validateVAT } from './vat.js'

export interface ValidateOptions {
  type: IdentifierType
  /** Required when type is 'postalCode'. */
  country?: string
}

/**
 * Dispatch to the right validator by type. Useful when the identifier kind is
 * known at runtime (e.g. driven by a form field).
 */
export function validate(value: string, options: ValidateOptions): ValidationResult {
  switch (options.type) {
    case 'vat':
      return validateVAT(value)
    case 'iban':
      return validateIBAN(value)
    case 'bsn':
      return validateBSN(value)
    case 'kvk':
      return validateKvK(value)
    case 'postalCode':
      return validatePostalCode(value, { country: options.country ?? '' })
  }
}
