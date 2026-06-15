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
 */

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
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${options.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      if (!res.ok) {
        throw new Error(`eu-validate cloud request failed: ${res.status} ${res.statusText}`)
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
