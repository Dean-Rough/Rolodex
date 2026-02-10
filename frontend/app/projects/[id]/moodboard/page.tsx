'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { api, type ApiProjectDetail } from '@/lib/api'

// Moodboard layouts
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

  const [project, setProject] = useState<ApiProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [layout, setLayout] = useState<LayoutType>('grid')
  const [exporting, setExporting] = useState(false)

  const token = typeof window !== 'undefined'
    ? (localStorage.getItem('rolodex_token') || process.env.NEXT_PUBLIC_DEMO_TOKEN || 'demo-token-12345')
    : 'demo-token-12345'

  useEffect(() => {
    loadProject()
  }, [projectId])

  async function loadProject() {
    setLoading(true)
    try {
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
      // Dynamic import to reduce bundle size
      const html2canvas = (await import('html2canvas')).default
      const jsPDF = (await import('jspdf')).default

      // Capture the canvas as an image
      const canvas = await html2canvas(canvasRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      })

      // Create PDF
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
      alert('Failed to export moodboard. Please try again.')
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

      // Convert to blob and download
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
      alert('Failed to export moodboard. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-500">Loading project...</div>
      </div>
    )
  }

  if (!project || project.items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500 mb-4">No items to create moodboard.</div>
          <button
            onClick={() => router.push(`/projects/${projectId}`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Project
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <button
            onClick={() => router.push(`/projects/${projectId}`)}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Project
          </button>

          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {project.name} - Moodboard
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {project.items.length} items
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleExportJPG}
                disabled={exporting}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting ? 'Exporting...' : 'Export JPG'}
              </button>
              <button
                onClick={handleExportPDF}
                disabled={exporting}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting ? 'Exporting...' : 'Export PDF'}
              </button>
            </div>
          </div>

          {/* Layout Selector */}
          <div className="flex gap-2">
            {Object.entries(LAYOUTS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setLayout(key as LayoutType)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  layout === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Moodboard Canvas */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8">
          <div ref={canvasRef} className="bg-white p-8">
            <div className="mb-8 text-center">
              <h2 className="text-4xl font-bold text-gray-900 mb-2">{project.name}</h2>
              <p className="text-gray-600">Created {new Date().toLocaleDateString()}</p>
            </div>

            {/* Grid Layout */}
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
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white p-2 text-sm">
                        {item.title}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Masonry Layout */}
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
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white p-2 text-sm">
                          {item.title}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Collage Layout */}
            {layout === 'collage' && (
              <div className="grid grid-cols-4 grid-rows-4 gap-2 h-[800px]">
                {project.items.slice(0, 6).map((item, index) => {
                  const spans = [
                    'col-span-2 row-span-2', // Large
                    'col-span-1 row-span-1', // Small
                    'col-span-2 row-span-1', // Wide
                    'col-span-1 row-span-2', // Tall
                    'col-span-1 row-span-1', // Small
                    'col-span-2 row-span-2', // Large
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
