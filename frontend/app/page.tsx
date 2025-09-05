'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, Download, ExternalLink } from 'lucide-react'
import ItemGrid, { Item, FilterOptions, SortOption } from '../components/ItemGrid'
import { api, ApiItem, SearchOptions } from '../lib/api'

// Demo token for development - replace with real auth
const DEMO_TOKEN = 'demo-token-12345'

export default function Home() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showExtensionBanner, setShowExtensionBanner] = useState(true)

  // Load items from API
  const loadItems = async (options: SearchOptions = {}, append = false) => {
    try {
      if (!append) setLoading(true)
      setError(null)

      const response = await api.listItems(DEMO_TOKEN, {
        limit: 50, // Load more items for testing
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
      
      // For demo purposes, create some mock items if API is not available
      if (!append) {
        setItems(generateMockItems())
      }
    } finally {
      setLoading(false)
    }
  }

  // Generate mock items for demonstration
  const generateMockItems = (): Item[] => {
    const categories = ['Sofa', 'Chair', 'Table', 'Lamp', 'Cabinet', 'Rug', 'Mirror', 'Artwork']
    const vendors = ['West Elm', 'CB2', 'Room & Board', 'Article', 'Design Within Reach', 'Herman Miller']
    const colors = ['#4A90E2', '#7ED321', '#F5A623', '#D0021B', '#9013FE', '#50E3C2', '#B8E986', '#4A4A4A']
    
    return Array.from({ length: 24 }, (_, i) => ({
      id: `mock-${i + 1}`,
      img_url: `https://picsum.photos/300/300?random=${i + 1}`,
      title: `Designer Product ${i + 1}`,
      vendor: vendors[Math.floor(Math.random() * vendors.length)],
      price: Math.floor(Math.random() * 2000) + 200,
      currency: 'USD',
      description: `High-quality ${categories[Math.floor(Math.random() * categories.length)].toLowerCase()} perfect for modern interiors`,
      colour_hex: colors[Math.floor(Math.random() * colors.length)],
      category: categories[Math.floor(Math.random() * categories.length)],
      material: ['Wood', 'Metal', 'Fabric', 'Leather', 'Glass'][Math.floor(Math.random() * 5)],
      created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    }))
  }

  // Initial load
  useEffect(() => {
    loadItems()
  }, []) // loadItems is stable, doesn't need to be in deps

  // Handle search with semantic similarity
  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    
    if (query.trim()) {
      // Use semantic search for queries
      try {
        setLoading(true)
        setError(null)
        
        const response = await api.searchItems(DEMO_TOKEN, query, {
          limit: 50,
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
        
        setItems(transformedItems)
      } catch (err) {
        console.error('Search failed:', err)
        setError(err instanceof Error ? err.message : 'Search failed')
        // Fallback to mock data for demonstration
        setItems(generateMockItems().filter(item => 
          item.title?.toLowerCase().includes(query.toLowerCase()) ||
          item.vendor?.toLowerCase().includes(query.toLowerCase()) ||
          item.category?.toLowerCase().includes(query.toLowerCase())
        ))
      } finally {
        setLoading(false)
      }
    } else {
      // Empty query - load all items
      await loadItems()
    }
  }

  // Handle filtering
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

  // Handle sorting
  const handleSort = async (_sortBy: SortOption) => {
    // For now, sorting is handled client-side in ItemGrid
    // In a full implementation, this could be server-side
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Extension Banner */}
      {showExtensionBanner && (
        <div className="bg-gradient-to-r from-blue-600 to-green-600 text-white">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  <span className="font-medium">New Extension v2.0.0 Available!</span>
                </div>
                <div className="hidden sm:flex items-center gap-4">
                  <a 
                    href="/rolodex-extension-v2.0.0.zip" 
                    download
                    className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-sm transition-colors"
                  >
                    Download
                  </a>
                  <a 
                    href="https://chrome.google.com/webstore/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm hover:underline"
                  >
                    Chrome Store <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
              <button
                onClick={() => setShowExtensionBanner(false)}
                className="text-white/80 hover:text-white text-xl leading-none"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Your Product Library</h1>
          <p className="text-lg text-gray-600">
            Discover and organize FF&E products with intelligent search and filtering
          </p>
        </div>

        {/* Error State */}
        {error && !items.length && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Connection Error</span>
            </div>
            <p className="text-red-700 mt-1">
              {error}. Showing demo data for preview.
            </p>
          </div>
        )}

        {/* Item Grid */}
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

      {/* Getting Started Section */}
      {!loading && items.length === 0 && !error && (
        <div className="container mx-auto px-4 pb-16">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Get Started</h2>
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-3 text-blue-600">Install Extension</h3>
                <p className="text-gray-600 mb-4">
                  Right-click any product image on the web to instantly save it to your personal library. 
                  AI extracts product details automatically.
                </p>
                <a 
                  href="/rolodex-extension-v2.0.0.zip" 
                  download
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Extension
                </a>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-3 text-green-600">Smart Search</h3>
                <p className="text-gray-600 mb-4">
                  Find products by color, style, vendor, or any attribute. 
                  Create mood boards and export them for client presentations.
                </p>
                <button 
                  onClick={() => loadItems()}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Load Demo Items
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
