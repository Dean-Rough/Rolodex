export function sanitizeUrl(value) {
  if (typeof value !== 'string') {
    return null
  }
  try {
    const url = new URL(value)
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url.toString()
    }
    return null
  } catch (error) {
    return null
  }
}

export function normalizeBaseUrl(baseUrl) {
  if (!baseUrl) {
    return ''
  }
  try {
    const url = new URL(baseUrl)
    url.pathname = '/'
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  } catch (error) {
    return ''
  }
}

export function buildContextPayload({ info = {}, tab = {}, now = Date.now } = {}) {
  const timestamp = new Date(Number(now()) || Date.now()).toISOString()
  const imageUrl = sanitizeUrl(info.srcUrl)
  const sourceUrl = sanitizeUrl(info.pageUrl || tab.url)
  const rawTitle = (tab.title || info.selectionText || '').trim()
  const title = rawTitle ? rawTitle.slice(0, 120) : null
  const selection = (info.selectionText || '').trim()
  const note = selection && selection !== rawTitle ? selection.slice(0, 180) : null

  return {
    imageUrl,
    sourceUrl,
    title,
    note,
    capturedAt: timestamp
  }
}

export function buildCaptureUrl(appBaseUrl, payload) {
  const base = normalizeBaseUrl(appBaseUrl)
  const captureUrl = new URL('/capture', base || 'https://app.rolodex.app')
  captureUrl.searchParams.set('utm_source', 'rolodex-extension')
  captureUrl.searchParams.set('utm_medium', 'context-menu')

  if (payload?.imageUrl) {
    captureUrl.searchParams.set('image', payload.imageUrl)
  }

  if (payload?.sourceUrl) {
    captureUrl.searchParams.set('src', payload.sourceUrl)
  }

  if (payload?.title) {
    captureUrl.searchParams.set('title', payload.title)
  }

  if (payload?.note) {
    captureUrl.searchParams.set('note', payload.note)
  }

  if (payload?.capturedAt) {
    captureUrl.searchParams.set('capturedAt', payload.capturedAt)
  }

  return captureUrl.toString()
}
