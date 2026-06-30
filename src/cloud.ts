/**
 * Cloud client for @alosha/eu-validate.
 *
 * This is the ONLY part of the package that makes network requests. It talks to
 * the hosted Alosha API (eu-validate.alosha.dev) for things an offline library
 * cannot answer:
 *   - VIES VAT *registration* lookups (is this number live, and to whom?)
 *   - KvK company lookups (Dutch Chamber of Commerce register)
 *
 * The offline validators in the main entry never import this file, so the
 * zero-dependency / no-network guarantee of `@alosha/eu-validate` holds.
 *
 * V1 status: client surface is defined; the hosted endpoints ship in Phase 3.
 * Until then, `request()` fails fast with a clear message instead of letting
 * calls hit a real but not-yet-implemented endpoint on eu-validate.alosha.dev.
 */

/**
 * Flip to `true` once the Phase 3 hosted endpoints
 * (`/api/v1/vat/verify`, `/api/v1/kvk/lookup`) are live.
 */
const CLOUD_API_LIVE = false

export interface CloudClientOptions {
  apiKey: string
  /** Override for self-hosting / testing. */
  baseUrl?: string
  /** Request timeout in ms (default 10000). */
  timeoutMs?: number
}

export interface VatVerificationResult {
  /** Whether the VAT number is registered and active in VIES. */
  registered: boolean
  countryCode: string
  vatNumber: string
  name: string | null
  address: string | null
  /** Date VIES was queried (YYYY-MM-DD). */
  requestDate: string
  source: 'VIES'
}

export interface KvkLookupResult {
  found: boolean
  kvkNumber: string
  name: string | null
  status: string | null
  address: string | null
  source: 'KVK'
}

const DEFAULT_BASE_URL = 'https://eu-validate.alosha.dev/api/v1'

export interface EuValidateCloudClient {
  verifyVAT(vat: string): Promise<VatVerificationResult>
  lookupKvK(kvkNumber: string): Promise<KvkLookupResult>
}

/** Thrown when the Cloud client is called before the Phase 3 hosted API has shipped. */
export class CloudNotAvailableError extends Error {
  constructor() {
    super(
      '@alosha/eu-validate/cloud: the hosted API has not shipped yet (Phase 3). ' +
        'This client\'s surface is stable for future use, but calling it today would only ' +
        'fail against a non-existent endpoint. Track availability at https://eu-validate.alosha.dev.'
    )
    this.name = 'CloudNotAvailableError'
  }
}

/** Thrown when a Cloud request exceeds `timeoutMs` without a response. */
export class CloudTimeoutError extends Error {
  /** The timeout, in milliseconds, that was exceeded. */
  readonly timeoutMs: number

  constructor(timeoutMs: number) {
    super(`eu-validate cloud request timed out after ${timeoutMs}ms`)
    this.name = 'CloudTimeoutError'
    this.timeoutMs = timeoutMs
  }
}

/** Thrown when the hosted API responds with a non-2xx status. */
export class CloudApiError extends Error {
  /** HTTP status code returned by the API. */
  readonly status: number
  /** HTTP status text returned by the API. */
  readonly statusText: string
  /** Best-effort parsed response body (JSON if possible, else text, else null). */
  readonly body: unknown

  constructor(status: number, statusText: string, body: unknown) {
    super(`eu-validate cloud request failed: ${status} ${statusText}`)
    this.name = 'CloudApiError'
    this.status = status
    this.statusText = statusText
    this.body = body
  }
}

/**
 * Create a Cloud client bound to an API key.
 *
 * @example
 * const eu = createClient({ apiKey: process.env.ALOSHA_KEY! })
 * const r = await eu.verifyVAT('NL123456782B01')
 */
export function createClient(options: CloudClientOptions): EuValidateCloudClient {
  if (!options || !options.apiKey) {
    throw new Error('createClient requires an apiKey')
  }
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL
  const timeoutMs = options.timeoutMs ?? 10000

  async function request<T>(path: string, body: unknown): Promise<T> {
    if (!CLOUD_API_LIVE) {
      throw new CloudNotAvailableError()
    }
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      let res: Response
      try {
        res = await fetch(`${baseUrl}${path}`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${options.apiKey}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        })
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          throw new CloudTimeoutError(timeoutMs)
        }
        throw err
      }
      if (!res.ok) {
        let parsedBody: unknown = null
        try {
          parsedBody = await res.json()
        } catch {
          try {
            parsedBody = await res.text()
          } catch {
            parsedBody = null
          }
        }
        throw new CloudApiError(res.status, res.statusText, parsedBody)
      }
      return (await res.json()) as T
    } finally {
      clearTimeout(timer)
    }
  }

  return {
    verifyVAT(vat: string) {
      return request<VatVerificationResult>('/vat/verify', { vat })
    },
    lookupKvK(kvkNumber: string) {
      return request<KvkLookupResult>('/kvk/lookup', { kvkNumber })
    },
  }
}
