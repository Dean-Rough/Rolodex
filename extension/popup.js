import { environmentOptions } from './lib/environment.js'

const messages = {
  en: {
    eyebrow: 'Rolodex',
    headline: 'Capture at designer speed',
    subhead: 'Right-click an image to launch the capture workspace.',
    environmentLabel: 'Environment',
    environmentAuto: 'Auto ({{label}})',
    launchCapture: 'Launch capture workspace',
    openLibrary: 'Open my library',
    signIn: 'Sign in',
    signInCtaAuthenticated: 'Manage account',
    statusHeading: 'Account status',
    statusChecking: 'Checking your Rolodex session…',
    statusAuthenticated: 'Signed in and ready to capture.',
    statusAuthenticatedWithName: 'Signed in as {{name}}.',
    statusUnauthenticated: 'Not signed in. Launch the sign-in flow to continue.',
    statusError: 'Unable to confirm your session. Try again shortly.',
    statusUnknown: 'Session unknown. The status endpoint is unreachable.',
    lastCaptureHeading: 'Last capture',
    lastCaptureNone: 'No captures yet. Try saving an inspiration shot.',
    lastCaptureLaunched: 'Capture workspace opened in a new tab.',
    lastCaptureOpened: 'Capture workspace opened from the toolbar.',
    lastCaptureError: '{{message}}',
    timestampPrefix: 'Updated {{time}}'
  }
}

const locale = (navigator.language || 'en').split('-')[0]
const language = messages[locale] ? locale : 'en'

function t(key, vars = {}) {
  const template = messages[language][key]
  if (!template) return key
  return template.replace(/{{(.*?)}}/g, (_, token) => {
    const value = vars[token.trim()]
    return typeof value === 'undefined' ? '' : String(value)
  })
}

const elements = {
  environmentSelect: document.querySelector('[data-role="environment-select"]'),
  environmentBadge: document.getElementById('environmentBadge'),
  environmentHint: document.getElementById('environmentHint'),
  launchButton: document.getElementById('launchCapture'),
  libraryButton: document.getElementById('openLibrary'),
  signInButton: document.getElementById('openSignIn'),
  authMessage: document.getElementById('authMessage'),
  captureStatus: document.getElementById('captureStatus'),
  captureTimestamp: document.getElementById('captureTimestamp'),
  authPanel: document.getElementById('authPanel'),
  capturePanel: document.getElementById('capturePanel'),
  root: document.querySelector('main')
}


init()

async function init() {
  applyTranslations()
  initFocusTrap()
  bindEventHandlers()

  const status = await requestStatus()
  if (status) {
    renderStatus(status)
  }

  elements.launchButton?.focus()

  chrome.runtime.onMessage.addListener(message => {
    if (message?.type === 'rolodex:statusUpdated' && message.payload) {
      renderStatus(message.payload)
    }
  })
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(node => {
    const key = node.getAttribute('data-i18n')
    const translated = t(key)
    if (translated) {
      node.textContent = translated
    }
  })
}

function bindEventHandlers() {
  elements.environmentSelect?.addEventListener('change', async event => {
    const value = event.target.value
    const environmentKey = value === 'auto' ? null : value
    await sendMessage('rolodex:setEnvironment', { environmentKey })
  })

  elements.launchButton?.addEventListener('click', () => {
    sendMessage('rolodex:openCapture')
  })

  elements.libraryButton?.addEventListener('click', () => {
    sendMessage('rolodex:openCapture', { destination: 'library' })
  })

  elements.signInButton?.addEventListener('click', () => {
    sendMessage('rolodex:openCapture', { destination: 'auth' })
  })
}

function initFocusTrap() {
  if (!elements.root) return
  const focusableSelectors = 'button, [href], select, [tabindex]:not([tabindex="-1"])'
  const focusable = Array.from(elements.root.querySelectorAll(focusableSelectors))
    .filter(node => !node.hasAttribute('disabled'))

  elements.root.addEventListener('keydown', event => {
    if (event.key !== 'Tab' || focusable.length === 0) {
      return
    }

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  })
}

async function requestStatus() {
  return sendMessage('rolodex:getStatus')
}

function renderStatus(status) {
  renderEnvironment(status.environment, status.environmentOptions)
  renderAuth(status.auth)
  renderCapture(status.lastCapture)
}

function renderEnvironment(environment, options = environmentOptions()) {
  if (!elements.environmentSelect) {
    return
  }

  elements.environmentSelect.innerHTML = ''

  const autoOption = document.createElement('option')
  autoOption.value = 'auto'
  autoOption.textContent = t('environmentAuto', { label: environment.label })
  elements.environmentSelect.appendChild(autoOption)

  options.forEach(option => {
    const optionNode = document.createElement('option')
    optionNode.value = option.key
    optionNode.textContent = option.label
    elements.environmentSelect.appendChild(optionNode)
  })

  elements.environmentSelect.value = environment.isOverride ? environment.key : 'auto'
  elements.environmentBadge.textContent = environment.isOverride
    ? `${environment.label} mode`
    : `${environment.label} • auto`

  try {
    const host = new URL(environment.appBaseUrl).host
    elements.environmentHint.textContent = `${environment.label} • ${host}`
  } catch (error) {
    elements.environmentHint.textContent = environment.appBaseUrl
  }
}

function renderAuth(auth) {
  if (!auth) {
    elements.authMessage.textContent = t('statusChecking')
    elements.signInButton.textContent = t('signIn')
    return
  }

  if (auth.state === 'authenticated') {
    elements.authMessage.textContent = auth.profile?.name
      ? t('statusAuthenticatedWithName', { name: auth.profile.name })
      : t('statusAuthenticated')
    elements.signInButton.textContent = t('signInCtaAuthenticated')
  } else if (auth.state === 'unauthenticated') {
    elements.authMessage.textContent = t('statusUnauthenticated')
    elements.signInButton.textContent = t('signIn')
  } else if (auth.state === 'error') {
    elements.authMessage.textContent = t('statusError')
    elements.signInButton.textContent = t('signIn')
  } else {
    elements.authMessage.textContent = t('statusUnknown')
    elements.signInButton.textContent = t('signIn')
  }
}

function renderCapture(lastCapture) {
  if (!lastCapture) {
    elements.captureStatus.textContent = t('lastCaptureNone')
    elements.captureTimestamp.textContent = ''
    return
  }

  if (lastCapture.status === 'launched') {
    elements.captureStatus.textContent = t('lastCaptureLaunched')
  } else if (lastCapture.status === 'opened') {
    elements.captureStatus.textContent = t('lastCaptureOpened')
  } else if (lastCapture.status === 'error') {
    elements.captureStatus.textContent = t('lastCaptureError', {
      message: lastCapture.message || 'Capture failed'
    })
  } else {
    elements.captureStatus.textContent = t('lastCaptureNone')
  }

  const stamp = lastCapture.timestamp || lastCapture.updatedAt
  elements.captureTimestamp.textContent = stamp ? t('timestampPrefix', { time: formatTimestamp(stamp) }) : ''
}

function formatTimestamp(value) {
  try {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      return ''
    }
    return new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : language, {
      hour: '2-digit',
      minute: '2-digit',
      day: 'numeric',
      month: 'short'
    }).format(date)
  } catch (error) {
    return ''
  }
}

function sendMessage(type, payload = {}) {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ type, ...payload }, response => {
      if (chrome.runtime.lastError) {
        console.warn('Rolodex extension: message failed', chrome.runtime.lastError)
        resolve({ ok: false, error: chrome.runtime.lastError.message })
        return
      }
      resolve(response)
    })
  })
}
