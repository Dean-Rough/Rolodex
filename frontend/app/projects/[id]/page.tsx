'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { api, type ApiProjectDetail, type ApiItem } from '@/lib/api'

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [project, setProject] = useState<ApiProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const token = typeof window !== 'undefined'
    ? (localStorage.getItem('rolodex_token') || process.env.NEXT_PUBLIC_DEMO_TOKEN || 'demo-token-12345')
    : 'demo-token-12345'

  useEffect(() => {
    loadProject()
  }, [projectId])

  async function loadProject() {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getProject(token, projectId)
      setProject(data)
    } catch (err) {
      console.error('Failed to load project:', err)
      setError(err instanceof Error ? err.message : 'Failed to load project')
    } finally {
      setLoading(false)
    }
  }

  async function handleRemoveItem(itemId: string) {
    if (!confirm('Remove this item from the project?')) return

    try {
      await api.removeItemFromProject(token, projectId, itemId)
      await loadProject()
    } catch (err) {
      console.error('Failed to remove item:', err)
      alert('Failed to remove item. Please try again.')
    }
  }

  function handleExportMoodboard() {
    router.push(`/projects/${projectId}/moodboard`)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">Loading project...</div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
            <button
              onClick={() => router.back()}
              className="mt-2 text-blue-600 hover:text-blue-800"
            >
              ← Go back
            </button>
          </div>
        )}

        {!loading && !error && project && (
          <>
            <div className="flex items-center justify-between mb-8">
              <div>
                <button
                  onClick={() => router.push('/projects')}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-2 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Projects
                </button>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {project.name}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {project.items.length} {project.items.length === 1 ? 'item' : 'items'}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleExportMoodboard}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={project.items.length === 0}
                  title={project.items.length === 0 ? 'Add items to create a moodboard' : 'Export moodboard'}
                >
                  Export Moodboard
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  + Add Items
                </button>
              </div>
            </div>

            {project.items.length === 0 && (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="text-gray-500 dark:text-gray-400 mb-4">
                  No items in this project yet. Add items from your library.
                </div>
                <button
                  onClick={() => router.push('/')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Browse Library
                </button>
              </div>
            )}

            {project.items.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {project.items.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="relative aspect-square">
                      <Image
                        src={item.img_url}
                        alt={item.title || 'Product image'}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">
                        {item.title || 'Untitled'}
                      </h3>
                      {item.vendor && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {item.vendor}
                        </p>
                      )}
                      {item.price && (
                        <p className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: item.currency || 'USD',
                          }).format(item.price)}
                        </p>
                      )}
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="w-full px-3 py-2 text-sm bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                      >
                        Remove from Project
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
