'use client'

import { useState, useEffect, useCallback, ChangeEvent } from 'react'
import Image from 'next/image'
import {
  X,
  Pencil,
  Trash2,
  FolderPlus,
  Check,
  Loader2,
  ExternalLink,
  ChevronDown,
} from 'lucide-react'
import { api, type ApiItem, type ApiProject, type ItemUpdatePayload } from '@/lib/api'
import { useRolodexAuth } from '@/hooks/use-auth'

interface ItemDetailModalProps {
  item: ApiItem
  onClose: () => void
  onItemUpdated: (item: ApiItem) => void
  onItemDeleted: (itemId: string) => void
}

type Tab = 'details' | 'edit'

export default function ItemDetailModal({
  item,
  onClose,
  onItemUpdated,
  onItemDeleted,
}: ItemDetailModalProps) {
  const { getToken } = useRolodexAuth()
  const [tab, setTab] = useState<Tab>('details')
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Edit state
  const [editForm, setEditForm] = useState({
    title: item.title || '',
    vendor: item.vendor || '',
    price: item.price != null ? String(item.price) : '',
    currency: item.currency || 'USD',
    description: item.description || '',
    colour_hex: item.colour_hex || '',
    category: item.category || '',
    material: item.material || '',
    notes: item.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Add to project state
  const [projects, setProjects] = useState<ApiProject[]>([])
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const [addingToProject, setAddingToProject] = useState<string | null>(null)
  const [addedToProject, setAddedToProject] = useState<string | null>(null)

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const loadProjects = useCallback(async () => {
    try {
      const token = await getToken()
      const data = await api.listProjects(token)
      setProjects(data)
    } catch (err) {
      console.error('Failed to load projects:', err)
    }
  }, [getToken])

  const handleEditChange = (field: string) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setEditForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const token = await getToken()
      const payload: ItemUpdatePayload = {}
      if (editForm.title !== (item.title || '')) payload.title = editForm.title || undefined
      if (editForm.vendor !== (item.vendor || '')) payload.vendor = editForm.vendor || undefined
      if (editForm.description !== (item.description || '')) payload.description = editForm.description || undefined
      if (editForm.colour_hex !== (item.colour_hex || '')) payload.colour_hex = editForm.colour_hex || undefined
      if (editForm.category !== (item.category || '')) payload.category = editForm.category || undefined
      if (editForm.material !== (item.material || '')) payload.material = editForm.material || undefined
      if (editForm.notes !== (item.notes || '')) payload.notes = editForm.notes || undefined
      if (editForm.currency !== (item.currency || 'USD')) payload.currency = editForm.currency || undefined

      const priceNum = editForm.price ? Number(editForm.price) : undefined
      if (priceNum !== item.price) payload.price = priceNum

      if (Object.keys(payload).length === 0) {
        setTab('details')
        return
      }

      const updated = await api.updateItem(token, item.id, payload)
      onItemUpdated(updated)
      setTab('details')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const token = await getToken()
      await api.deleteItem(token, item.id)
      onItemDeleted(item.id)
    } catch (err) {
      console.error('Failed to delete item:', err)
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleAddToProject = async (projectId: string) => {
    setAddingToProject(projectId)
    try {
      const token = await getToken()
      await api.addItemToProject(token, projectId, item.id)
      setAddedToProject(projectId)
      setTimeout(() => {
        setAddedToProject(null)
        setShowProjectDropdown(false)
      }, 1500)
    } catch (err) {
      console.error('Failed to add to project:', err)
    } finally {
      setAddingToProject(null)
    }
  }

  const formatPrice = (price?: number, currency?: string) => {
    if (price == null) return null
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(price)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 truncate pr-4">
            {item.title || 'Untitled Item'}
          </h2>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => {
                if (tab === 'edit') {
                  setTab('details')
                } else {
                  setTab('edit')
                  setEditForm({
                    title: item.title || '',
                    vendor: item.vendor || '',
                    price: item.price != null ? String(item.price) : '',
                    currency: item.currency || 'USD',
                    description: item.description || '',
                    colour_hex: item.colour_hex || '',
                    category: item.category || '',
                    material: item.material || '',
                    notes: item.notes || '',
                  })
                }
              }}
              className={`p-2 rounded-lg transition-colors ${
                tab === 'edit'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              }`}
              title={tab === 'edit' ? 'Cancel editing' : 'Edit item'}
            >
              <Pencil className="w-4 h-4" />
            </button>
            <div className="relative">
              <button
                onClick={() => {
                  if (!showProjectDropdown) {
                    loadProjects()
                  }
                  setShowProjectDropdown(!showProjectDropdown)
                }}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                title="Add to project"
              >
                <FolderPlus className="w-4 h-4" />
              </button>
              {showProjectDropdown && (
                <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                  {projects.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-500">No projects yet</p>
                  ) : (
                    projects.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => handleAddToProject(project.id)}
                        disabled={addingToProject === project.id}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <span className="truncate">{project.name}</span>
                        {addingToProject === project.id && (
                          <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />
                        )}
                        {addedToProject === project.id && (
                          <Check className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
              title="Delete item"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid md:grid-cols-[1fr,1fr] gap-0">
            {/* Image */}
            <div className="relative aspect-square bg-gray-100 md:aspect-auto md:min-h-[400px]">
              <Image
                src={item.img_url}
                alt={item.title || 'Product image'}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 50vw"
                unoptimized
              />
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              {tab === 'details' ? (
                <>
                  {/* Title + Vendor */}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {item.title || 'Untitled Item'}
                    </h3>
                    {item.vendor && (
                      <p className="text-sm text-gray-500 mt-1">{item.vendor}</p>
                    )}
                  </div>

                  {/* Price */}
                  {item.price != null && (
                    <p className="text-2xl font-bold text-gray-900">
                      {formatPrice(item.price, item.currency)}
                    </p>
                  )}

                  {/* Description */}
                  {item.description && (
                    <div>
                      <h4 className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-1">Description</h4>
                      <p className="text-sm text-gray-700 leading-relaxed">{item.description}</p>
                    </div>
                  )}

                  {/* Metadata grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {item.category && (
                      <div>
                        <h4 className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-1">Category</h4>
                        <span className="inline-block px-2.5 py-1 bg-gray-100 text-gray-700 rounded text-sm">{item.category}</span>
                      </div>
                    )}
                    {item.material && (
                      <div>
                        <h4 className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-1">Material</h4>
                        <span className="inline-block px-2.5 py-1 bg-gray-100 text-gray-700 rounded text-sm">{item.material}</span>
                      </div>
                    )}
                    {item.colour_hex && (
                      <div>
                        <h4 className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-1">Color</h4>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-full border border-gray-200"
                            style={{ backgroundColor: item.colour_hex }}
                          />
                          <span className="text-sm text-gray-700 font-mono">{item.colour_hex}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  {item.tags && item.tags.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-2">Tags</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {item.tags.map((tag) => (
                          <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Style Tags */}
                  {item.style_tags && item.style_tags.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-2">Style</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {item.style_tags.map((tag) => (
                          <span key={tag} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {item.notes && (
                    <div>
                      <h4 className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-1">Notes</h4>
                      <p className="text-sm text-gray-700">{item.notes}</p>
                    </div>
                  )}

                  {/* Source link */}
                  {item.src_url && (
                    <a
                      href={item.src_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View source
                    </a>
                  )}

                  {/* Date */}
                  {item.created_at && (
                    <p className="text-xs text-gray-400">
                      Added {new Date(item.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  )}
                </>
              ) : (
                /* Edit Form */
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={handleEditChange('title')}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                    <input
                      type="text"
                      value={editForm.vendor}
                      onChange={handleEditChange('vendor')}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={editForm.price}
                        onChange={handleEditChange('price')}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                      <input
                        type="text"
                        value={editForm.currency}
                        onChange={handleEditChange('currency')}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm uppercase focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      rows={3}
                      value={editForm.description}
                      onChange={handleEditChange('description')}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <input
                        type="text"
                        value={editForm.category}
                        onChange={handleEditChange('category')}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
                      <input
                        type="text"
                        value={editForm.material}
                        onChange={handleEditChange('material')}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Color Hex</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editForm.colour_hex}
                        onChange={handleEditChange('colour_hex')}
                        placeholder="#C0A480"
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      />
                      {editForm.colour_hex && /^#[0-9A-Fa-f]{6}$/.test(editForm.colour_hex) && (
                        <div
                          className="w-8 h-8 rounded border border-gray-200 flex-shrink-0"
                          style={{ backgroundColor: editForm.colour_hex }}
                        />
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      rows={2}
                      value={editForm.notes}
                      onChange={handleEditChange('notes')}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                  </div>

                  {saveError && (
                    <p className="text-sm text-red-600">{saveError}</p>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setTab('details')}
                      className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Delete confirmation overlay */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-white/95 flex items-center justify-center z-20 rounded-xl">
            <div className="text-center max-w-sm mx-auto px-6">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete this item?</h3>
              <p className="text-sm text-gray-500 mb-6">
                This will permanently remove &ldquo;{item.title || 'this item'}&rdquo; from your library. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
