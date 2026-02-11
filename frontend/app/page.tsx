'use client'

import { useState, useEffect, useCallback } from 'react'
import { AlertCircle, LogOut } from 'lucide-react'
import ItemGrid, { Item, FilterOptions } from '../components/ItemGrid'
import { api, ApiItem, SearchOptions } from '../lib/api'
import { useAuth } from '@/lib/auth-context'

export default function Home() {
  const { user, logout } = useAuth()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const loadItems = useCallback(async (options: SearchOptions = {}, append = false) => {
    try {
      if (!append) setLoading(true)
      setError(null)

      const response = await api.listItems('', {
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
  }, [])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  const handleSearch = async (query: string) => {
    setSearchQuery(query)

    if (query.trim()) {
      try {
        setLoading(true)
        setError(null)

        const response = await api.searchItems('', query, { limit: 50 })

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <header className="border-b bg-white">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <h2 className="text-lg font-semibold text-gray-900">Rolodex</h2>
          {user && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">{user.email}</span>
              <button
                onClick={logout}
                className="flex items-center gap-1 rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
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

      {!loading && items.length === 0 && !error && (
        <div className="container mx-auto px-4 pb-16">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Get Started</h2>
            <p className="text-gray-600 mb-4">
              Install the browser extension to start capturing products, or use the capture workspace to add items manually.
            </p>
            <button
              onClick={() => loadItems()}
              className="inline-flex items-center px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Refresh items
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
