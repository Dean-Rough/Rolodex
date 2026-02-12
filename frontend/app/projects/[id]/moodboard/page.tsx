'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { api, type ApiProjectDetail } from '@/lib/api'
import { useRolodexAuth } from '@/hooks/use-auth'

const LAYOUTS = {
  grid: 'Grid',
  masonry: 'Masonry',
  collage: 'Collage',
} as const

type LayoutType = keyof typeof LAYOUTS

export default function MoodboardPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const canvasRef = useRef<HTMLDivElement>(null)
  const { getToken, isLoaded } = useRolodexAuth()

  const [project, setProject] = useState<ApiProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [layout, setLayout] = useState<LayoutType>('grid')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (isLoaded) loadProject()
  }, [isLoaded, projectId])

  async function loadProject() {
    setLoading(true)
    try {
      const token = await getToken()
      const data = await api.getProject(token, projectId)
      setProject(data)
    } catch (err) {
      console.error('Failed to load project:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleExportPDF() {
    if (!canvasRef.current || !project) return

    setExporting(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const jsPDF = (await import('jspdf')).default

      const canvas = await html2canvas(canvasRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      })

      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height],
      })

      pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height)
      pdf.save(`${project.name.replace(/[^a-z0-9]/gi, '_')}_moodboard.pdf`)
    } catch (err) {
      console.error('Failed to export PDF:', err)
    } finally {
      setExporting(false)
    }
  }

  async function handleExportJPG() {
    if (!canvasRef.current || !project) return

    setExporting(true)
    try {
      const html2canvas = (await import('html2canvas')).default

      const canvas = await html2canvas(canvasRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      })

      canvas.toBlob((blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${project.name.replace(/[^a-z0-9]/gi, '_')}_moodboard.jpg`
        a.click()
        URL.revokeObjectURL(url)
      }, 'image/jpeg', 0.95)
    } catch (err) {
      console.error('Failed to export JPG:', err)
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">Loading project...</div>
      </div>
    )
  }

  if (!project || project.items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">No items to create moodboard.</p>
          <Link
            href={`/projects/${projectId}`}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm"
          >
            Back to Project
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <Link
            href={`/projects/${projectId}`}
            className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to Project
          </Link>

          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {project.name} — Moodboard
              </h1>
              <p className="text-sm text-gray-500">{project.items.length} items</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleExportJPG}
                disabled={exporting}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm disabled:opacity-50"
              >
                {exporting ? 'Exporting...' : 'Export JPG'}
              </button>
              <button
                onClick={handleExportPDF}
                disabled={exporting}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm disabled:opacity-50"
              >
                {exporting ? 'Exporting...' : 'Export PDF'}
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            {Object.entries(LAYOUTS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setLayout(key as LayoutType)}
                className={`px-4 py-2 rounded-lg transition-colors text-sm ${
                  layout === key
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8">
          <div ref={canvasRef} className="bg-white p-8">
            <div className="mb-8 text-center">
              <h2 className="text-4xl font-bold text-gray-900 mb-2">{project.name}</h2>
              <p className="text-gray-600">Created {new Date().toLocaleDateString()}</p>
            </div>

            {layout === 'grid' && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {project.items.map((item) => (
                  <div key={item.id} className="relative aspect-square bg-gray-100">
                    <img
                      src={item.img_url}
                      alt={item.title || 'Product'}
                      className="w-full h-full object-cover"
                      crossOrigin="anonymous"
                    />
                    {item.title && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 text-sm">
                        {item.title}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {layout === 'masonry' && (
              <div className="columns-2 md:columns-3 gap-4 space-y-4">
                {project.items.map((item) => (
                  <div key={item.id} className="break-inside-avoid mb-4">
                    <div className="relative bg-gray-100">
                      <img
                        src={item.img_url}
                        alt={item.title || 'Product'}
                        className="w-full h-auto"
                        crossOrigin="anonymous"
                      />
                      {item.title && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 text-sm">
                          {item.title}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {layout === 'collage' && (
              <div className="grid grid-cols-4 grid-rows-4 gap-2 h-[800px]">
                {project.items.slice(0, 6).map((item, index) => {
                  const spans = [
                    'col-span-2 row-span-2',
                    'col-span-1 row-span-1',
                    'col-span-2 row-span-1',
                    'col-span-1 row-span-2',
                    'col-span-1 row-span-1',
                    'col-span-2 row-span-2',
                  ]
                  return (
                    <div key={item.id} className={`relative bg-gray-100 ${spans[index % spans.length]}`}>
                      <img
                        src={item.img_url}
                        alt={item.title || 'Product'}
                        className="w-full h-full object-cover"
                        crossOrigin="anonymous"
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
