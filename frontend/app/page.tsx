'use client'

import { useState, useEffect, useCallback } from 'react'
import { AlertCircle, Sparkles, MousePointerClick, Search, FolderOpen, Image as ImageIcon, Palette, Zap } from 'lucide-react'
import Link from 'next/link'
import ItemGrid, { Item, FilterOptions } from '../components/ItemGrid'
import ItemDetailModal from '../components/ItemDetailModal'
import { api, ApiItem, SearchOptions } from '../lib/api'
import { useRolodexAuth } from '../hooks/use-auth'

export default function Home() {
  const { getToken, isSignedIn, isLoaded } = useRolodexAuth()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedItem, setSelectedItem] = useState<ApiItem | null>(null)

  const loadItems = useCallback(async (options: SearchOptions = {}, append = false) => {
    try {
      if (!append) setLoading(true)
      setError(null)

      const token = await getToken()
      const response = await api.listItems(token, {
        limit: 50,
        ...options,
      })

      const transformedItems: Item[] = response.items.map((apiItem: ApiItem) => ({
        id: apiItem.id,
        img_url: apiItem.img_url,
        title: apiItem.title,
        vendor: apiItem.vendor,
        price: apiItem.price,
        currency: apiItem.currency,
        description: apiItem.description,
        colour_hex: apiItem.colour_hex,
        category: apiItem.category,
        material: apiItem.material,
        created_at: apiItem.created_at,
      }))

      if (append) {
        setItems(prev => [...prev, ...transformedItems])
      } else {
        setItems(transformedItems)
      }
    } catch (err) {
      console.error('Failed to load items:', err)
      setError(err instanceof Error ? err.message : 'Failed to load items')
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      loadItems()
    } else if (isLoaded && !isSignedIn) {
      setLoading(false)
    }
  }, [isLoaded, isSignedIn, loadItems])

  const handleSearch = async (query: string) => {
    setSearchQuery(query)

    if (query.trim()) {
      try {
        setLoading(true)
        setError(null)

        const token = await getToken()
        const response = await api.searchItems(token, query, { limit: 50 })

        const transformedItems: Item[] = response.items.map((apiItem: ApiItem) => ({
          id: apiItem.id,
          img_url: apiItem.img_url,
          title: apiItem.title,
          vendor: apiItem.vendor,
          price: apiItem.price,
          currency: apiItem.currency,
          description: apiItem.description,
          colour_hex: apiItem.colour_hex,
          category: apiItem.category,
          material: apiItem.material,
          created_at: apiItem.created_at,
        }))

        setItems(transformedItems)
      } catch (err) {
        console.error('Search failed:', err)
        setError(err instanceof Error ? err.message : 'Search failed')
      } finally {
        setLoading(false)
      }
    } else {
      await loadItems()
    }
  }

  const handleFilter = async (filters: FilterOptions) => {
    const searchOptions: SearchOptions = {
      query: searchQuery,
      category: filters.category,
      vendor: filters.vendor,
      price_max: filters.priceRange?.max,
      hex: filters.color,
    }

    await loadItems(searchOptions)
  }

  const handleSort = async () => {
    // Sorting handled client-side in ItemGrid
  }

  const handleItemClick = (item: Item) => {
    setSelectedItem(item as ApiItem)
  }

  const handleItemUpdated = (updated: ApiItem) => {
    setItems(prev => prev.map(i => i.id === updated.id ? {
      id: updated.id,
      img_url: updated.img_url,
      title: updated.title,
      vendor: updated.vendor,
      price: updated.price,
      currency: updated.currency,
      description: updated.description,
      colour_hex: updated.colour_hex,
      category: updated.category,
      material: updated.material,
      created_at: updated.created_at,
    } : i))
    setSelectedItem(updated)
  }

  const handleItemDeleted = (itemId: string) => {
    setItems(prev => prev.filter(i => i.id !== itemId))
    setSelectedItem(null)
  }

  if (isLoaded && !isSignedIn) {
    return (
      <div className="min-h-screen bg-white">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-white" />
          <div className="relative container mx-auto px-4 py-24 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600 mb-8">
              <Sparkles className="w-3.5 h-3.5" />
              AI-powered product capture for designers
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 tracking-tight">
              Your FF&amp;E library,<br />curated by AI
            </h1>
            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              Right-click any product image on the web. AI extracts the title, price, materials,
              and colors — then stores it in your searchable library, ready for client projects
              and moodboards.
            </p>
            <div className="flex items-center justify-center gap-4">
              <p className="text-sm text-gray-500">Sign in to get started</p>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
              Three steps. Zero manual data entry.
            </h2>
            <p className="text-gray-600 text-center mb-16 max-w-lg mx-auto">
              From browsing to moodboard in seconds, not hours.
            </p>
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="w-14 h-14 mx-auto mb-4 bg-gray-900 text-white rounded-2xl flex items-center justify-center">
                  <MousePointerClick className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Right-click to capture</h3>
                <p className="text-sm text-gray-600">
                  Browse supplier sites normally. When you spot something, right-click the image
                  and send it to Rolodex.
                </p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 mx-auto mb-4 bg-gray-900 text-white rounded-2xl flex items-center justify-center">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">AI fills in the details</h3>
                <p className="text-sm text-gray-600">
                  Title, vendor, price, materials, colors, category — all extracted automatically
                  from the image and page context.
                </p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 mx-auto mb-4 bg-gray-900 text-white rounded-2xl flex items-center justify-center">
                  <FolderOpen className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Organize &amp; present</h3>
                <p className="text-sm text-gray-600">
                  Search by color, material, or style. Drag items into project boards.
                  Export polished moodboards as PDF or JPG.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-16">
              Built for how designers actually work
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {[
                {
                  icon: Search,
                  title: 'Semantic search',
                  description: 'Search "warm minimalist lighting" and find items by meaning, not just keywords.',
                },
                {
                  icon: Palette,
                  title: 'Color matching',
                  description: 'Filter your library by hex code or let AI cluster items by palette.',
                },
                {
                  icon: ImageIcon,
                  title: 'Moodboard export',
                  description: 'Grid, masonry, or collage layouts. Export as high-res PDF or JPG in one click.',
                },
                {
                  icon: FolderOpen,
                  title: 'Project boards',
                  description: 'Group items by client, room, or scheme. Track budgets against project limits.',
                },
                {
                  icon: Zap,
                  title: 'AI extraction',
                  description: 'GPT-4 Vision reads product pages so you never have to copy-paste specs again.',
                },
                {
                  icon: MousePointerClick,
                  title: 'Chrome extension',
                  description: 'One right-click from any supplier website. Works on 1stDibs, Architonic, Made, and more.',
                },
              ].map(({ icon: Icon, title, description }) => (
                <div key={title} className="p-6 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors">
                  <Icon className="w-5 h-5 text-gray-900 mb-3" />
                  <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-gray-900">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Stop losing products in browser tabs
            </h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              Join designers who save hours every week with AI-powered product management.
            </p>
            <p className="text-sm text-gray-500">Sign in above to create your free account.</p>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Your Product Library</h1>
          <p className="text-lg text-gray-600">
            Discover and organize FF&amp;E products with intelligent search and filtering
          </p>
        </div>

        {error && !items.length && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Error</span>
            </div>
            <p className="text-red-700 mt-1">{error}</p>
          </div>
        )}

        <ItemGrid
          items={items}
          loading={loading}
          onSearch={handleSearch}
          onFilter={handleFilter}
          onSort={handleSort}
          onItemClick={handleItemClick}
          searchQuery={searchQuery}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        />
      </div>

      {!loading && items.length === 0 && !error && isSignedIn && (
        <div className="container mx-auto px-4 pb-16">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Get Started</h2>
            <p className="text-gray-600 mb-4">
              Install the browser extension to start capturing products, or use the capture workspace to add items manually.
            </p>
            <Link
              href="/capture"
              className="inline-flex items-center px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Open Capture Workspace
            </Link>
          </div>
        </div>
      )}

      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onItemUpdated={handleItemUpdated}
          onItemDeleted={handleItemDeleted}
        />
      )}
    </div>
  )
}
