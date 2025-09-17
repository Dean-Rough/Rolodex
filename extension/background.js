const CONTEXT_MENU_ID = 'rolodex-capture-image'
const STORAGE_KEY = 'rolodexSettings'
const ERROR_KEY = 'rolodexLastError'
const BADGE_COLOR = '#f97316'

const ENVIRONMENTS = {
  production: {
    key: 'production',
    label: 'Production',
    appBaseUrl: 'https://app.rolodex.app',
    apiBaseUrl: 'https://api.rolodex.app'
  },
  staging: {
    key: 'staging',
    label: 'Staging',
    appBaseUrl: 'https://staging.rolodex.app',
    apiBaseUrl: 'https://staging.api.rolodex.app'
  },
  development: {
    key: 'development',
    label: 'Development',
    appBaseUrl: 'http://localhost:3000',
    apiBaseUrl: 'http://localhost:8000'
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: 'Capture in Rolodex',
    contexts: ['image']
  })

  await chrome.action.setBadgeText({ text: '' })
})

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== CONTEXT_MENU_ID) {
    return
  }

  const imageUrl = info.srcUrl
  if (!isHttpUrl(imageUrl)) {
    await setError('Rolodex only supports http(s) images right now.')
    return
  }

  const sourceUrl = info.pageUrl || tab?.url || null
  const environment = await resolveEnvironment()

  try {
    const session = await getSession(environment.key)
    if (!session?.token || isExpired(session.expiresAt)) {
      await promptForAuth(environment)
      await setError('Add your Rolodex session token in the popup to continue.')
      return
    }

    const deepLink = await requestDeepLink({
      environment,
      sessionToken: session.token,
      imageUrl,
      sourceUrl,
      title: tab?.title || info?.selectionText || ''
    })

    await clearError()
    await chrome.tabs.create({ url: deepLink.capture_url })
  } catch (error) {
    console.error('Rolodex: failed to launch capture workspace', error)
    const message = error instanceof Error ? error.message : 'Unexpected error'
    await setError(message)
  }
})

async function requestDeepLink({ environment, sessionToken, imageUrl, sourceUrl, title }) {
  const safeSource = isHttpUrl(sourceUrl) ? sourceUrl : null

  const response = await fetch(`${environment.apiBaseUrl}/api/extension/deeplink`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionToken}`
    },
    body: JSON.stringify({
      image: imageUrl,
      source: safeSource,
      title: title ? title.slice(0, 180) : undefined,
      environment: environment.key
    })
  })

  if (response.status === 401 || response.status === 403) {
    await clearSession(environment.key)
    throw new Error('Your Rolodex session expired. Update it from the popup.')
  }

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to create capture link (${response.status}): ${text}`)
  }

  return response.json()
}

async function resolveEnvironment() {
  const manifest = chrome.runtime.getManifest()
  const versionName = (manifest.version_name || '').toLowerCase()

  let suggestedKey = 'production'
  if (!manifest.update_url || versionName.includes('dev')) {
    suggestedKey = 'development'
  } else if (versionName.includes('staging')) {
    suggestedKey = 'staging'
  }

  const stored = await chrome.storage.sync.get(STORAGE_KEY)
  const settings = stored?.[STORAGE_KEY] || {}
  const override = settings.environmentOverride
  const key = override || suggestedKey
  return {
    ...ENVIRONMENTS[key] || ENVIRONMENTS.production,
    key
  }
}

async function getSession(environmentKey) {
  const stored = await chrome.storage.sync.get(STORAGE_KEY)
  const settings = stored?.[STORAGE_KEY] || {}
  const tokens = settings.tokens || {}
  return tokens[environmentKey] || null
}

async function clearSession(environmentKey) {
  const stored = await chrome.storage.sync.get(STORAGE_KEY)
  const settings = stored?.[STORAGE_KEY] || {}
  const tokens = settings.tokens || {}
  delete tokens[environmentKey]
  await chrome.storage.sync.set({
    [STORAGE_KEY]: {
      ...settings,
      tokens
    }
  })
}

async function promptForAuth(environment) {
  await chrome.tabs.create({ url: `${environment.appBaseUrl}/auth/extension` })
}

function isExpired(expiresAt) {
  if (!expiresAt) return false
  const expires = new Date(expiresAt).getTime()
  if (Number.isNaN(expires)) return false
  return Date.now() > expires
}

function isHttpUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value)
}

async function setError(message) {
  await chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR })
  await chrome.action.setBadgeText({ text: '!' })
  await chrome.storage.sync.set({ [ERROR_KEY]: { message, timestamp: new Date().toISOString() } })
}

async function clearError() {
  await chrome.action.setBadgeText({ text: '' })
  await chrome.storage.sync.remove(ERROR_KEY)
}
