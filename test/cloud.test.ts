import { jest } from '@jest/globals'
import { createClient, CloudNotAvailableError, CloudTimeoutError, CloudApiError } from '../src/cloud.js'

function jsonResponse(status: number, statusText: string, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => body,
  } as Response
}

describe('createClient', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('throws if no apiKey is provided', () => {
    // @ts-expect-error — intentionally omitting the required option
    expect(() => createClient({})).toThrow('createClient requires an apiKey')
  })

  it('verifyVAT() resolves with parsed JSON on a 200 response', async () => {
    const result = {
      registered: true,
      countryCode: 'NL',
      vatNumber: '123456782B01',
      name: 'Acme BV',
      address: null,
      requestDate: '2026-07-08',
      source: 'VIES',
    }
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(200, 'OK', result))

    const eu = createClient({ apiKey: 'test-key' })
    await expect(eu.verifyVAT('NL123456782B01')).resolves.toEqual(result)
  })

  it('throws CloudNotAvailableError on a 404 response', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(404, 'Not Found', null))

    const eu = createClient({ apiKey: 'test-key' })
    await expect(eu.verifyVAT('NL123456782B01')).rejects.toBeInstanceOf(CloudNotAvailableError)
  })

  it('throws CloudNotAvailableError when the connection fails at the DNS/socket level', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('fetch failed'))

    const eu = createClient({ apiKey: 'test-key' })
    await expect(eu.lookupKvK('69599084')).rejects.toBeInstanceOf(CloudNotAvailableError)
  })

  it('CloudNotAvailableError carries a helpful message pointing at the docs site', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(404, 'Not Found', null))

    const eu = createClient({ apiKey: 'test-key' })
    try {
      await eu.verifyVAT('NL123456782B01')
      throw new Error('expected verifyVAT to reject')
    } catch (e) {
      expect(e).toBeInstanceOf(CloudNotAvailableError)
      expect((e as Error).message).toMatch(/eu-validate\.alosha\.dev/)
      expect((e as Error).name).toBe('CloudNotAvailableError')
    }
  })

  it('throws CloudApiError with the parsed body on a 401 response', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(401, 'Unauthorized', { error: 'invalid api key' }))

    const eu = createClient({ apiKey: 'test-key' })
    await expect(eu.verifyVAT('NL123456782B01')).rejects.toMatchObject({
      name: 'CloudApiError',
      status: 401,
      statusText: 'Unauthorized',
      body: { error: 'invalid api key' },
    })
  })

  it('throws CloudApiError with the parsed body on a 500 response', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(500, 'Internal Server Error', { error: 'boom' }))

    const eu = createClient({ apiKey: 'test-key' })
    await expect(eu.lookupKvK('69599084')).rejects.toMatchObject({
      name: 'CloudApiError',
      status: 500,
      statusText: 'Internal Server Error',
      body: { error: 'boom' },
    })
  })

  it('throws CloudTimeoutError when the request exceeds timeoutMs', async () => {
    jest.spyOn(globalThis, 'fetch').mockImplementation((_url, init) => {
      return new Promise((_resolve, reject) => {
        const signal = (init as RequestInit).signal
        signal?.addEventListener('abort', () => {
          const err = new Error('The operation was aborted')
          err.name = 'AbortError'
          reject(err)
        })
      })
    })

    const eu = createClient({ apiKey: 'test-key', timeoutMs: 10 })
    await expect(eu.verifyVAT('NL123456782B01')).rejects.toBeInstanceOf(CloudTimeoutError)
  })
})

describe('CloudTimeoutError', () => {
  it('carries the timeout value and a descriptive message', () => {
    const err = new CloudTimeoutError(5000)
    expect(err.name).toBe('CloudTimeoutError')
    expect(err.timeoutMs).toBe(5000)
    expect(err.message).toMatch(/5000ms/)
  })
})

describe('CloudApiError', () => {
  it('carries status, statusText, and the parsed body', () => {
    const err = new CloudApiError(404, 'Not Found', { error: 'no such VAT number' })
    expect(err.name).toBe('CloudApiError')
    expect(err.status).toBe(404)
    expect(err.statusText).toBe('Not Found')
    expect(err.body).toEqual({ error: 'no such VAT number' })
    expect(err.message).toMatch(/404/)
  })
})
