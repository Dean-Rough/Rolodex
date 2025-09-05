import { API_BASE_URL } from '@/lib/api'

describe('api config', () => {
  it('exposes API_BASE_URL', () => {
    expect(typeof API_BASE_URL).toBe('string')
  })
})

