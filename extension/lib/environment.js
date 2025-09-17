export const ENVIRONMENTS = {
  production: {
    key: 'production',
    label: 'Production',
    appBaseUrl: 'https://app.rolodex.app'
  },
  staging: {
    key: 'staging',
    label: 'Staging',
    appBaseUrl: 'https://staging.rolodex.app'
  },
  development: {
    key: 'development',
    label: 'Development',
    appBaseUrl: 'http://localhost:3000'
  }
}

export function detectDefaultEnvironment(manifest = {}) {
  const versionName = (manifest.version_name || '').toLowerCase()
  if (!manifest.update_url || versionName.includes('dev')) {
    return 'development'
  }
  if (versionName.includes('staging')) {
    return 'staging'
  }
  return 'production'
}

export function resolveEnvironmentKey(manifest, override) {
  if (override && ENVIRONMENTS[override]) {
    return override
  }
  return detectDefaultEnvironment(manifest)
}

export function getEnvironmentByKey(key) {
  return ENVIRONMENTS[key] || ENVIRONMENTS.production
}

export function environmentOptions() {
  return Object.values(ENVIRONMENTS).map(env => ({
    key: env.key,
    label: env.label
  }))
}
