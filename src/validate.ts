import { validateBSN } from './bsn.js'
import { validateIBAN } from './iban.js'
import { validateKvK } from './kvk.js'
import { validatePostalCode } from './postal.js'
import type { IdentifierType, InvalidOptionsResult, ValidationResult } from './types.js'
import { validateVAT } from './vat.js'

export interface ValidateOptions {
  type: IdentifierType
  /** Required when type is 'postalCode'. */
  country?: string
  /** Postal only: reject countries without format rules. */
  strict?: boolean
}

/** Dispatch by identifier type; malformed options return type: null and INVALID_OPTIONS. */
export function validate(value: string, options: ValidateOptions): ValidationResult
export function validate(value: string, options?: unknown): ValidationResult | InvalidOptionsResult
export function validate(value: string, options?: unknown): ValidationResult | InvalidOptionsResult {
  const opts = options && typeof options === 'object' && !Array.isArray(options)
    ? options as Partial<ValidateOptions> : undefined
  switch (opts?.type) {
    case 'vat': return validateVAT(value)
    case 'iban': return validateIBAN(value)
    case 'bsn': return validateBSN(value)
    case 'kvk': return validateKvK(value)
    case 'postalCode':
      return validatePostalCode(value, { country: opts.country ?? '', strict: opts.strict })
    default:
      return {
        valid: false,
        input: typeof value === 'string' ? value : '',
        normalized: null,
        country: null,
        type: null,
        checks: { format: false, checksum: null },
        errors: ['INVALID_OPTIONS'],
      }
  }
}
