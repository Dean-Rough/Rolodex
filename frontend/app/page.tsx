'use client'

import { useState, useEffect, useCallback } from 'react'
import { AlertCircle, Sparkles } from 'lucide-react'
import Link from 'next/link'
import ItemGrid, { Item, FilterOptions } from '../components/ItemGrid'
import { api, ApiItem, SearchOptions } from '../lib/api'
import { useRolodexAuth } from '../hooks/use-auth'

export default function Home() {
  const { getToken, isSignedIn, isLoaded } = useRolodexAuth()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

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

  if (isLoaded && !isSignedIn) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-16 text-center">
          <Sparkles className="mx-auto mb-6 h-12 w-12 text-gray-400" />
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Your FF&E Product Library</h1>
          <p className="text-lg text-gray-600 mb-8 max-w-xl mx-auto">
            Right-click any product image on the web. AI captures, tags, and stores it in your
            personal searchable library, ready for client projects and moodboards.
          </p>
          <p className="text-sm text-gray-500">Sign in to get started.</p>
        </div>
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
    </div>
  )
}
