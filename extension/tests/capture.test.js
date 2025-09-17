import { describe, expect, it } from 'vitest'
import {
  buildCaptureUrl,
  buildContextPayload,
  normalizeBaseUrl,
  sanitizeUrl
} from '../lib/capture.js'

const FIXED_NOW = () => Date.parse('2024-01-01T10:30:00.000Z')

describe('sanitizeUrl', () => {
  it('allows http and https URLs', () => {
    expect(sanitizeUrl('https://example.com/image.jpg')).toBe('https://example.com/image.jpg')
    expect(sanitizeUrl('http://example.com')).toBe('http://example.com/')
  })

  it('rejects non-http protocols and invalid strings', () => {
    expect(sanitizeUrl('ftp://example.com')).toBeNull()
    expect(sanitizeUrl('notaurl')).toBeNull()
    expect(sanitizeUrl(null)).toBeNull()
  })
})

describe('normalizeBaseUrl', () => {
  it('normalises to origin without trailing slash', () => {
    expect(normalizeBaseUrl('https://app.rolodex.app/dashboard')).toBe('https://app.rolodex.app')
  })

  it('returns empty string when invalid', () => {
    expect(normalizeBaseUrl('notaurl')).toBe('')
  })
})

describe('buildContextPayload', () => {
  it('maps context menu info and tab metadata into payload', () => {
    const payload = buildContextPayload({
      info: {
        srcUrl: 'https://cdn.example.com/image.png',
        pageUrl: 'https://gallery.example.com',
        selectionText: 'Nordic lounge chair'
      },
      tab: {
        title: 'Scandinavian inspiration'
      },
      now: FIXED_NOW
    })

    expect(payload).toEqual({
      imageUrl: 'https://cdn.example.com/image.png',
      sourceUrl: 'https://gallery.example.com/',
      title: 'Scandinavian inspiration',
      note: 'Nordic lounge chair',
      capturedAt: '2024-01-01T10:30:00.000Z'
    })
  })

  it('drops invalid URLs and trims long titles/notes', () => {
    const payload = buildContextPayload({
      info: {
        srcUrl: 'data:image/png;base64,abc',
        pageUrl: 'notaurl',
        selectionText: '   '.padEnd(10, ' ') + 'Focus'
      },
      tab: {
        title: ' '.repeat(10) + 'Minimalist sofa'.repeat(20)
      },
      now: FIXED_NOW
    })

    expect(payload.imageUrl).toBeNull()
    expect(payload.sourceUrl).toBeNull()
    expect(payload.title.length).toBeLessThanOrEqual(120)
    expect(payload.note).toBe('Focus')
  })
})

describe('buildCaptureUrl', () => {
  it('builds a capture URL with encoded params', () => {
    const payload = {
      imageUrl: 'https://cdn.example.com/soft%20chair.png',
      sourceUrl: 'https://gallery.example.com/sets/2024?ref=hero',
      title: 'Soft chair',
      note: 'Warm oak frame',
      capturedAt: '2024-01-01T10:30:00.000Z'
    }

    const url = buildCaptureUrl('https://app.rolodex.app', payload)
    const parsed = new URL(url)

    expect(parsed.pathname).toBe('/capture')
    expect(parsed.searchParams.get('image')).toBe(payload.imageUrl)
    expect(parsed.searchParams.get('src')).toBe(payload.sourceUrl)
    expect(parsed.searchParams.get('title')).toBe(payload.title)
    expect(parsed.searchParams.get('note')).toBe(payload.note)
    expect(parsed.searchParams.get('capturedAt')).toBe(payload.capturedAt)
    expect(parsed.searchParams.get('utm_source')).toBe('rolodex-extension')
  })

  it('falls back to production base when invalid', () => {
    const url = buildCaptureUrl('notaurl', { capturedAt: '2024-01-01T10:30:00.000Z' })
    expect(new URL(url).origin).toBe('https://app.rolodex.app')
  })
})
