'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Trash2, Image as ImageIcon, Pencil, Check, X, DollarSign } from 'lucide-react'
import { api, type ApiItem, type ApiProjectDetail } from '@/lib/api'
import { useRolodexAuth } from '@/hooks/use-auth'
import ItemDetailModal from '@/components/ItemDetailModal'

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const { getToken, isLoaded } = useRolodexAuth()

  const [project, setProject] = useState<ApiProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null)
  const [removing, setRemoving] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ApiItem | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [editName, setEditName] = useState('')
  const [editingBudget, setEditingBudget] = useState(false)
  const [editBudget, setEditBudget] = useState('')

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
    setRemoving(true)
    try {
      const token = await getToken()
      await api.removeItemFromProject(token, projectId, itemId)
      setRemoveConfirmId(null)
      await loadProject()
    } catch (err) {
      console.error('Failed to remove item:', err)
    } finally {
      setRemoving(false)
    }
  }

  function handleItemUpdated(updated: ApiItem) {
    if (project) {
      setProject({
        ...project,
        items: project.items.map(i => i.id === updated.id ? updated : i),
      })
    }
    setSelectedItem(updated)
  }

  function handleItemDeleted(itemId: string) {
    if (project) {
      setProject({
        ...project,
        items: project.items.filter(i => i.id !== itemId),
      })
    }
    setSelectedItem(null)
  }

  async function handleSaveName() {
    if (!editName.trim() || !project) return
    try {
      const token = await getToken()
      await api.updateProject(token, projectId, { name: editName.trim() })
      setProject({ ...project, name: editName.trim() })
      setEditingName(false)
    } catch (err) {
      console.error('Failed to update project name:', err)
    }
  }

  async function handleSaveBudget() {
    if (!project) return
    try {
      const token = await getToken()
      const budgetVal = editBudget ? Number(editBudget) : undefined
      await api.updateProject(token, projectId, { budget: budgetVal })
      setProject({ ...project, budget: budgetVal })
      setEditingBudget(false)
    } catch (err) {
      console.error('Failed to update budget:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="h-4 w-28 bg-gray-200 rounded animate-pulse mb-4" />
            <div className="h-9 w-72 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 overflow-hidden animate-pulse">
                <div className="aspect-square bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
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
        <div className="mb-8">
          <Link
            href="/projects"
            className="text-sm text-gray-500 hover:text-gray-700 mb-3 inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to Projects
          </Link>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              {editingName ? (
                <div className="flex items-center gap-2 mb-1">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName()
                      if (e.key === 'Escape') setEditingName(false)
                    }}
                    className="text-3xl font-bold text-gray-900 border-b-2 border-gray-900 bg-transparent outline-none w-full"
                    autoFocus
                  />
                  <button onClick={handleSaveName} className="p-1.5 text-gray-600 hover:text-gray-900"><Check className="w-5 h-5" /></button>
                  <button onClick={() => setEditingName(false)} className="p-1.5 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group mb-1">
                  <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
                  <button
                    onClick={() => { setEditName(project.name); setEditingName(true) }}
                    className="p-1 text-gray-300 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Edit project name"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>{project.items.length} {project.items.length === 1 ? 'item' : 'items'}</span>
                {project.items.some(i => i.price != null) && (
                  <span className="text-gray-400">
                    Total: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
                      project.items.reduce((sum, item) => sum + (item.price || 0), 0)
                    )}
                  </span>
                )}

                {editingBudget ? (
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <DollarSign className="w-3.5 h-3.5" />
                    <input
                      type="number"
                      min={0}
                      step="100"
                      value={editBudget}
                      onChange={(e) => setEditBudget(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveBudget()
                        if (e.key === 'Escape') setEditingBudget(false)
                      }}
                      className="w-28 px-2 py-0.5 border border-gray-300 rounded text-sm"
                      placeholder="Budget"
                      autoFocus
                    />
                    <button onClick={handleSaveBudget} className="text-gray-600 hover:text-gray-900"><Check className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setEditingBudget(false)} className="text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ) : project.budget != null ? (
                  <button
                    onClick={() => { setEditBudget(String(project.budget || '')); setEditingBudget(true) }}
                    className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                    title="Edit budget"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    Budget: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(project.budget)}
                    {(() => {
                      const totalSpend = project.items.reduce((sum, item) => sum + (item.price || 0), 0)
                      const pct = project.budget ? Math.round((totalSpend / project.budget) * 100) : 0
                      return (
                        <span className={`ml-1 ${pct > 100 ? 'text-red-600 font-medium' : pct > 80 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          ({pct}% used)
                        </span>
                      )
                    })()}
                  </button>
                ) : (
                  <button
                    onClick={() => { setEditBudget(''); setEditingBudget(true) }}
                    className="text-gray-400 hover:text-gray-600 transition-colors text-xs"
                  >
                    + Set budget
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-3 flex-shrink-0 ml-4">
              <button
                onClick={() => router.push(`/projects/${projectId}/moodboard`)}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm disabled:opacity-50"
                disabled={project.items.length === 0}
              >
                Export Moodboard
              </button>
            </div>
          </div>
        </div>

        {/* Budget progress bar */}
        {project.budget != null && project.budget > 0 && project.items.length > 0 && (() => {
          const totalSpend = project.items.reduce((sum, item) => sum + (item.price || 0), 0)
          const pct = Math.min(Math.round((totalSpend / project.budget!) * 100), 100)
          const overBudget = totalSpend > project.budget!
          return (
            <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2 text-sm">
                <span className="text-gray-600">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalSpend)}
                  {' '}of{' '}
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(project.budget!)}
                </span>
                <span className={`font-medium ${overBudget ? 'text-red-600' : pct > 80 ? 'text-amber-600' : 'text-gray-600'}`}>
                  {overBudget
                    ? `$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(totalSpend - project.budget!)} over budget`
                    : `$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(project.budget! - totalSpend)} remaining`
                  }
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${overBudget ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })()}

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
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedItem(item as ApiItem)}
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
                  {item.colour_hex && (
                    <div
                      className="absolute top-2 right-2 w-5 h-5 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: item.colour_hex }}
                    />
                  )}
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
                  {removeConfirmId === item.id ? (
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setRemoveConfirmId(null)}
                        disabled={removing}
                        className="flex-1 px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={removing}
                        className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {removing ? 'Removing...' : 'Confirm'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setRemoveConfirmId(item.id) }}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Remove from Project
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedItem && project && (() => {
        const idx = project.items.findIndex(i => i.id === selectedItem.id)
        return (
          <ItemDetailModal
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onItemUpdated={handleItemUpdated}
            onItemDeleted={handleItemDeleted}
            onPrev={idx > 0 ? () => setSelectedItem(project.items[idx - 1] as ApiItem) : undefined}
            onNext={idx < project.items.length - 1 ? () => setSelectedItem(project.items[idx + 1] as ApiItem) : undefined}
          />
        )
      })()}
    </div>
  )
}
