import {
  buildCaptureUrl,
  buildContextPayload,
  sanitizeUrl
} from './lib/capture.js'
import {
  ENVIRONMENTS,
  environmentOptions,
  getEnvironmentByKey,
  resolveEnvironmentKey
} from './lib/environment.js'

const CONTEXT_MENU_ID = 'rolodex-capture-image'
const SETTINGS_KEY = 'rolodexExtensionSettings'
const LAST_CAPTURE_KEY = 'rolodexLastCapture'
const BADGE_COLOR = '#818cf8'
const STATUS_TIMEOUT = 3500

chrome.runtime.onInstalled.addListener(async () => {
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: 'Capture in Rolodex',
    contexts: ['image']
  })

  await chrome.action.setBadgeText({ text: '' })
  await chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR })
})

chrome.action.onClicked.addListener(async () => {
  const environment = await resolveEnvironment()
  const captureUrl = `${environment.appBaseUrl}/capture?utm_source=rolodex-extension&utm_medium=toolbar`
  await chrome.tabs.create({ url: captureUrl })
  await recordCapture({
    status: 'opened',
    captureUrl,
    environment: environment.key,
    timestamp: new Date().toISOString()
  })
  await broadcastStatus()
})

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== CONTEXT_MENU_ID) {
    return
  }

  const payload = buildContextPayload({ info, tab })
  if (!payload.imageUrl) {
    await recordError('Rolodex supports http(s) images only.')
    await broadcastStatus()
    return
  }

  const environment = await resolveEnvironment()
  const captureUrl = buildCaptureUrl(environment.appBaseUrl, payload)

  try {
    await chrome.tabs.create({ url: captureUrl })
    await recordCapture({
      status: 'launched',
      captureUrl,
      environment: environment.key,
      timestamp: payload.capturedAt,
      context: payload
    })
    await chrome.action.setBadgeText({ text: '' })
  } catch (error) {
    await recordError('Failed to open capture workspace.')
    console.error('Rolodex: failed to open capture workspace', error)
  }

  await broadcastStatus()
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message.type !== 'string') {
    return
  }

  if (message.type === 'rolodex:getStatus') {
    handleStatusRequest().then(sendResponse)
    return true
  }

  if (message.type === 'rolodex:setEnvironment') {
    const key = message.environmentKey && String(message.environmentKey)
    handleEnvironmentChange(key).then(sendResponse)
    return true
  }

  if (message.type === 'rolodex:openCapture') {
    handleOpenCapture(message).then(sendResponse)
    return true
  }
})

async function handleOpenCapture(message) {
  const environment = await resolveEnvironment()
  let destination = '/capture'
  if (message?.destination === 'library') {
    destination = '/'
  } else if (message?.destination === 'auth') {
    destination = '/auth/extension'
  }
  const url = new URL(destination, environment.appBaseUrl)
  url.searchParams.set('utm_source', 'rolodex-extension')
  url.searchParams.set('utm_medium', 'popup')
  await chrome.tabs.create({ url: url.toString() })
  return { ok: true }
}

async function handleEnvironmentChange(environmentKey) {
  const manifest = chrome.runtime.getManifest()
  const resolvedKey = resolveEnvironmentKey(manifest, environmentKey)
  if (environmentKey && !ENVIRONMENTS[environmentKey]) {
    return { ok: false, error: 'Unknown environment key' }
  }

  if (environmentKey) {
    await chrome.storage.sync.set({
      [SETTINGS_KEY]: { environmentOverride: environmentKey }
    })
  } else {
    await chrome.storage.sync.remove(SETTINGS_KEY)
  }

  await broadcastStatus()
  const environment = getEnvironmentByKey(resolvedKey)
  return { ok: true, environment }
}

async function handleStatusRequest() {
  const environment = await resolveEnvironment()
  const [lastCapture, auth] = await Promise.all([
    getLastCapture(),
    fetchAuthStatus(environment.appBaseUrl)
  ])

  return {
    environment,
    environmentOptions: environmentOptions(),
    lastCapture,
    auth
  }
}

async function resolveEnvironment() {
  const manifest = chrome.runtime.getManifest()
  const stored = await chrome.storage.sync.get(SETTINGS_KEY)
  const override = stored?.[SETTINGS_KEY]?.environmentOverride
  const key = resolveEnvironmentKey(manifest, override)
  const environment = getEnvironmentByKey(key)
  return { ...environment, key, isOverride: Boolean(override) }
}

async function fetchAuthStatus(appBaseUrl) {
  const baseUrl = sanitizeUrl(appBaseUrl) || 'https://app.rolodex.app'
  const statusUrl = `${baseUrl.replace(/\/$/, '')}/auth/extension/status`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), STATUS_TIMEOUT)

  try {
    const response = await fetch(statusUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'include',
      signal: controller.signal
    })

    if (!response.ok) {
      return {
        state: 'error',
        message: `Status request failed (${response.status})`
      }
    }

    const data = await response.json().catch(() => ({}))
    const authenticated = Boolean(data.authenticated)
    return {
      state: authenticated ? 'authenticated' : 'unauthenticated',
      profile: data.profile || null,
      checkedAt: new Date().toISOString()
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { state: 'unknown', message }
  } finally {
    clearTimeout(timeout)
  }
}

async function getLastCapture() {
  const stored = await chrome.storage.local.get(LAST_CAPTURE_KEY)
  return stored?.[LAST_CAPTURE_KEY] || null
}

async function recordCapture(entry) {
  const payload = {
    ...entry,
    type: 'capture',
    updatedAt: new Date().toISOString()
  }
  await chrome.storage.local.set({ [LAST_CAPTURE_KEY]: payload })
  await chrome.action.setBadgeText({ text: '' })
}

async function recordError(message) {
  const payload = {
    status: 'error',
    message,
    type: 'error',
    timestamp: new Date().toISOString()
  }
  await chrome.storage.local.set({ [LAST_CAPTURE_KEY]: payload })
  await chrome.action.setBadgeText({ text: '!' })
}

async function broadcastStatus() {
  const status = await handleStatusRequest()
  try {
    await chrome.runtime.sendMessage({
      type: 'rolodex:statusUpdated',
      payload: status
    })
  } catch (error) {
    // Ignore: no active listeners (e.g., popup closed)
  }
  return status
}
