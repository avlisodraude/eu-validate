import { createClient, CloudNotAvailableError, CloudTimeoutError, CloudApiError } from '../src/cloud.js'

describe('createClient', () => {
  it('throws if no apiKey is provided', () => {
    // @ts-expect-error — intentionally omitting the required option
    expect(() => createClient({})).toThrow('createClient requires an apiKey')
  })

  it('verifyVAT() throws CloudNotAvailableError before Phase 3 ships', async () => {
    const eu = createClient({ apiKey: 'test-key' })
    await expect(eu.verifyVAT('NL123456782B01')).rejects.toBeInstanceOf(CloudNotAvailableError)
  })

  it('lookupKvK() throws CloudNotAvailableError before Phase 3 ships', async () => {
    const eu = createClient({ apiKey: 'test-key' })
    await expect(eu.lookupKvK('69599084')).rejects.toBeInstanceOf(CloudNotAvailableError)
  })

  it('CloudNotAvailableError carries a helpful message', async () => {
    const eu = createClient({ apiKey: 'test-key' })
    try {
      await eu.verifyVAT('NL123456782B01')
      throw new Error('expected verifyVAT to reject')
    } catch (e) {
      expect(e).toBeInstanceOf(CloudNotAvailableError)
      expect((e as Error).message).toMatch(/Phase 3/)
      expect((e as Error).name).toBe('CloudNotAvailableError')
    }
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
