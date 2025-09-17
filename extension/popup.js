const STORAGE_KEY = 'rolodexSettings'
const ERROR_KEY = 'rolodexLastError'

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

const manifest = chrome.runtime.getManifest()
const detectedEnvironment = detectDefaultEnvironment(manifest)

const environmentSelect = document.getElementById('environment')
const tokenInput = document.getElementById('token')
const expiryInput = document.getElementById('expires')
const statusEl = document.getElementById('status')
const hintEl = document.getElementById('environment-hint')
const environmentBadge = document.getElementById('environment-badge')
const saveButton = document.getElementById('save')
const clearButton = document.getElementById('clear')
const openButton = document.getElementById('open-capture')

let currentEnvironmentKey = detectedEnvironment

init()

async function init() {
  environmentSelect.addEventListener('change', () => {
    currentEnvironmentKey = environmentSelect.value === 'auto' ? detectedEnvironment : environmentSelect.value
    renderEnvironment()
  })

  saveButton.addEventListener('click', async event => {
    event.preventDefault()
    await persistSettings()
  })

  clearButton.addEventListener('click', async event => {
    event.preventDefault()
    tokenInput.value = ''
    expiryInput.value = ''
    await persistSettings()
  })

  openButton.addEventListener('click', async event => {
    event.preventDefault()
    const env = ENVIRONMENTS[currentEnvironmentKey]
    await chrome.tabs.create({ url: env.appBaseUrl })
  })

  await renderEnvironment()
}

async function renderEnvironment() {
  const { [STORAGE_KEY]: settings = {}, [ERROR_KEY]: lastError = null } = await chrome.storage.sync.get([STORAGE_KEY, ERROR_KEY])
  const override = settings.environmentOverride || null
  if (override) {
    environmentSelect.value = override
    currentEnvironmentKey = override
  } else {
    environmentSelect.value = 'auto'
    currentEnvironmentKey = detectedEnvironment
  }

  const env = ENVIRONMENTS[currentEnvironmentKey]
  hintEl.textContent = `${env.label} • ${env.appBaseUrl.replace(/^https?:\/\//, '')}`
  environmentBadge.textContent = override ? `${env.label} mode` : `${env.label} (auto)`

  const tokens = settings.tokens || {}
  const session = tokens[currentEnvironmentKey] || {}
  tokenInput.value = session.token || ''
  expiryInput.value = session.expiresAt ? toInputValue(session.expiresAt) : ''

  if (lastError?.message) {
    statusEl.textContent = `Last capture error: ${lastError.message}`
    statusEl.className = 'status error'
  } else {
    statusEl.textContent = 'Right-click an image to launch the capture workspace.'
    statusEl.className = 'status'
  }
}

async function persistSettings() {
  const override = environmentSelect.value === 'auto' ? null : environmentSelect.value
  const key = override || detectedEnvironment
  const token = tokenInput.value.trim()
  const expiresValue = expiryInput.value
  const expiresAt = expiresValue ? new Date(expiresValue).toISOString() : undefined

  const stored = await chrome.storage.sync.get(STORAGE_KEY)
  const settings = stored?.[STORAGE_KEY] || {}
  const tokens = { ...(settings.tokens || {}) }

  if (token) {
    tokens[key] = { token, expiresAt }
  } else {
    delete tokens[key]
  }

  await chrome.storage.sync.set({
    [STORAGE_KEY]: {
      ...settings,
      environmentOverride: override,
      tokens
    }
  })

  await chrome.action.setBadgeText({ text: '' })
  await chrome.storage.sync.remove(ERROR_KEY)

  statusEl.textContent = token ? 'Settings saved. Ready to capture.' : 'Token cleared. Add a token to capture items.'
  statusEl.className = token ? 'status success' : 'status'
}

function detectDefaultEnvironment(manifest) {
  const versionName = (manifest.version_name || '').toLowerCase()
  if (!manifest.update_url || versionName.includes('dev')) {
    return 'development'
  }
  if (versionName.includes('staging')) {
    return 'staging'
  }
  return 'production'
}

function toInputValue(isoString) {
  try {
    const date = new Date(isoString)
    if (Number.isNaN(date.getTime())) return ''
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  } catch (error) {
    console.warn('Rolodex: failed to parse expiry', error)
    return ''
  }
}
