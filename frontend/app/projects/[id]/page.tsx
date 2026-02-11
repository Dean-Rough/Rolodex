'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Trash2, Image as ImageIcon } from 'lucide-react'
import { api, type ApiProjectDetail } from '@/lib/api'
import { useRolodexAuth } from '@/hooks/use-auth'

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const { getToken, isLoaded } = useRolodexAuth()

  const [project, setProject] = useState<ApiProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isLoaded) loadProject()
  }, [isLoaded, projectId])

  async function loadProject() {
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
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
    if (!window.confirm('Remove this item from the project?')) return

    try {
      const token = await getToken()
      await api.removeItemFromProject(token, projectId, itemId)
      await loadProject()
    } catch (err) {
      console.error('Failed to remove item:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">Loading project...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
            <button
              onClick={() => router.push('/projects')}
              className="mt-2 text-sm text-red-600 hover:text-red-800"
            >
              Back to Projects
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!project) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href="/projects"
              className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              Back to Projects
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {project.items.length} {project.items.length === 1 ? 'item' : 'items'}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/projects/${projectId}/moodboard`)}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm disabled:opacity-50"
              disabled={project.items.length === 0}
            >
              Export Moodboard
            </button>
          </div>
        </div>

        {project.items.length === 0 && (
          <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
            <ImageIcon className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <p className="text-gray-500 mb-4">No items in this project yet.</p>
            <Link
              href="/"
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
            >
              Browse Library
            </Link>
          </div>
        )}

        {project.items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {project.items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="relative aspect-square bg-gray-100">
                  <Image
                    src={item.img_url}
                    alt={item.title || 'Product image'}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    unoptimized
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 text-sm">
                    {item.title || 'Untitled'}
                  </h3>
                  {item.vendor && (
                    <p className="text-xs text-gray-500 mb-2">{item.vendor}</p>
                  )}
                  {item.price != null && (
                    <p className="text-sm font-bold text-gray-900 mb-3">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: item.currency || 'USD',
                      }).format(item.price)}
                    </p>
                  )}
                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Remove from Project
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
