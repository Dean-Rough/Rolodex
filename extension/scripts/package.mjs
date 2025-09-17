import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import archiver from 'archiver'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const distDir = path.join(rootDir, 'dist')

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true })
}

async function createArchive() {
  const manifestPath = path.join(rootDir, 'manifest.json')
  const manifest = JSON.parse(await fs.promises.readFile(manifestPath, 'utf8'))
  const envTag = manifest.version_name ? `-${manifest.version_name}` : ''
  const filename = `rolodex-extension-v${manifest.version}${envTag ? `-${envTag}` : ''}.zip`
  const outputPath = path.join(distDir, filename)

  await ensureDir(distDir)

  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath)
    const archive = archiver('zip', { zlib: { level: 9 } })

    output.on('close', () => {
      console.log(`Created ${outputPath} (${archive.pointer()} bytes)`) // eslint-disable-line no-console
      resolve()
    })

    archive.on('error', error => {
      reject(error)
    })

    archive.pipe(output)
    archive.glob('**/*', {
      cwd: rootDir,
      dot: true,
      ignore: ['dist/**', 'node_modules/**', 'scripts/**', 'package-lock.json', 'package.json']
    })

    archive.finalize()
  })
}

createArchive().catch(error => {
  console.error('Failed to package extension', error)
  process.exitCode = 1
})
