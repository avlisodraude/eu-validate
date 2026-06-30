import type { ValidationResult } from './types.js'

/**
 * Type guard / convenience check: `true` when `result.valid` is `true`.
 * Narrows `result` so TypeScript knows `errors` is informational-only past this point.
 *
 * @example
 * const r = validateVAT('NL123456782B01')
 * if (isValid(r)) {
 *   // r.valid is narrowed to `true` here
 * }
 */
export function isValid(result: ValidationResult): result is ValidationResult & { valid: true } {
  return result.valid === true
}

/** Thrown by {@link assertValid} when a `ValidationResult` is invalid. */
export class ValidationError extends Error {
  /** The failing result, for inspecting `errors`/`checks`/`normalized`. */
  readonly result: ValidationResult

  constructor(result: ValidationResult) {
    super(
      `eu-validate: invalid ${result.type} "${result.input}"` +
        (result.errors.length ? ` (${result.errors.join(', ')})` : '')
    )
    this.name = 'ValidationError'
    this.result = result
  }
}

/**
 * Throws {@link ValidationError} if `result.valid` is `false`; otherwise returns
 * `result` narrowed to `valid: true`. Handy when invalid input should abort the
 * caller's flow rather than be branched on.
 *
 * @example
 * const r = assertValid(validateIBAN(input)) // throws, or r.valid is true
 */
export function assertValid(result: ValidationResult): ValidationResult & { valid: true } {
  if (!isValid(result)) {
    throw new ValidationError(result)
  }
  return result
}
