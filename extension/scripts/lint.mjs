import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

function fail(message) {
  console.error(`✖ ${message}`)
  process.exitCode = 1
}

function checkFileExists(relativePath) {
  const target = path.join(rootDir, relativePath)
  return fs.existsSync(target)
}

try {
  const manifestPath = path.join(rootDir, 'manifest.json')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

  if (manifest.manifest_version !== 3) {
    fail('manifest_version must be 3 for MV3 extensions')
  }

  if (!manifest.background?.service_worker) {
    fail('background.service_worker must be defined in manifest.json')
  } else if (!checkFileExists(manifest.background.service_worker)) {
    fail(`service worker file ${manifest.background.service_worker} not found`)
  }

  if (!Array.isArray(manifest.permissions) || manifest.permissions.length === 0) {
    fail('permissions array must include at least one Chrome API permission')
  }

  if (!Array.isArray(manifest.host_permissions) || manifest.host_permissions.length === 0) {
    fail('host_permissions must include the API origin list used for deep links')
  }

  if (!manifest.action?.default_popup) {
    fail('action.default_popup must be defined')
  } else if (!checkFileExists(manifest.action.default_popup)) {
    fail(`default popup file ${manifest.action.default_popup} not found`)
  }

  if (!checkFileExists('popup.js')) {
    fail('popup.js must exist next to popup.html')
  }

  if (process.exitCode && process.exitCode !== 0) {
    process.exit(process.exitCode)
  } else {
    console.log('✔ Manifest and extension assets look good for MV3 packaging')
  }
} catch (error) {
  console.error('✖ Failed to validate extension manifest')
  console.error(error)
  process.exitCode = 1
}
