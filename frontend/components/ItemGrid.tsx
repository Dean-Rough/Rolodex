'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { ChevronDown, Grid, List, Search, X, Filter } from 'lucide-react'
import Image from 'next/image'

// Types matching the backend schema
export interface Item {
  id: string
  img_url: string
  title?: string
  vendor?: string
  price?: number
  currency?: string
  description?: string
  colour_hex?: string
  category?: string
  material?: string
  created_at?: string
}

export interface ItemGridProps {
  items: Item[]
  loading?: boolean
  onSearch?: (query: string) => void
  onFilter?: (filters: FilterOptions) => void
  onSort?: (sortBy: SortOption) => void
  onItemClick?: (item: Item) => void
  onLoadMore?: () => void
  hasMore?: boolean
  loadingMore?: boolean
  searchQuery?: string
  className?: string
  viewMode?: 'grid' | 'list'
  onViewModeChange?: (mode: 'grid' | 'list') => void
}

export interface FilterOptions {
  category?: string
  priceRange?: { min?: number; max?: number }
  vendor?: string
  color?: string
}

export type SortOption = 'newest' | 'title' | 'vendor' | 'category' | 'price-asc' | 'price-desc'

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest First' },
  { value: 'title', label: 'Title A-Z' },
  { value: 'vendor', label: 'Vendor A-Z' },
  { value: 'category', label: 'Category' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
]

// Skeleton component for loading states
const ItemSkeleton = ({ viewMode }: { viewMode: 'grid' | 'list' }) => {
  if (viewMode === 'list') {
    return (
      <div className="flex gap-4 p-4 border rounded-lg animate-pulse">
        <div className="w-24 h-24 bg-gray-200 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-4 bg-gray-200 rounded w-1/4" />
        </div>
      </div>
    )
  }

  return (
    <div className="group border rounded-lg overflow-hidden animate-pulse">
      <div className="aspect-square bg-gray-200" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="h-4 bg-gray-200 rounded w-1/4" />
      </div>
    </div>
  )
}

// Individual item component
const ItemCard = ({ item, viewMode, onClick }: { item: Item; viewMode: 'grid' | 'list'; onClick?: () => void }) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  const formatPrice = (price?: number, currency?: string) => {
    if (!price) return null
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(price)
    return formatted
  }

  const colorStyle = item.colour_hex ? { backgroundColor: item.colour_hex } : undefined

  if (viewMode === 'list') {
    return (
      <div className={`flex gap-4 p-4 border rounded-lg hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
        <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
          {!imageError && item.img_url && (
            <Image
              src={item.img_url}
              alt={item.title || 'Product image'}
              fill
              className={`object-cover transition-opacity duration-300 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              loading="lazy"
            />
          )}
          {item.colour_hex && (
            <div 
              className="absolute top-2 right-2 w-3 h-3 rounded-full border border-white shadow-sm"
              style={colorStyle}
            />
          )}
          {imageError && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-xs">
              No image
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">
            {item.title || 'Untitled Item'}
          </h3>
          {item.vendor && (
            <p className="text-sm text-gray-600 truncate">{item.vendor}</p>
          )}
          <div className="flex items-center gap-3 mt-2">
            {item.price && (
              <span className="text-sm font-medium text-gray-900">
                {formatPrice(item.price, item.currency)}
              </span>
            )}
            {item.category && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                {item.category}
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`group border rounded-lg overflow-hidden hover:shadow-lg transition-shadow ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
      <div className="relative aspect-square bg-gray-100">
        {!imageError && item.img_url && (
          <Image
            src={item.img_url}
            alt={item.title || 'Product image'}
            fill
            className={`object-cover transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            loading="lazy"
          />
        )}
        {item.colour_hex && (
          <div 
            className="absolute top-3 right-3 w-4 h-4 rounded-full border-2 border-white shadow-sm"
            style={colorStyle}
          />
        )}
        {imageError && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            No image available
          </div>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="font-medium text-gray-900 line-clamp-2 min-h-[3rem]">
          {item.title || 'Untitled Item'}
        </h3>
        {item.vendor && (
          <p className="text-sm text-gray-600 mt-1 truncate">{item.vendor}</p>
        )}
        <div className="flex items-center justify-between mt-3">
          {item.price ? (
            <span className="text-lg font-semibold text-gray-900">
              {formatPrice(item.price, item.currency)}
            </span>
          ) : (
            <div></div>
          )}
          {item.category && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
              {item.category}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// Main ItemGrid component
export default function ItemGrid({
  items,
  loading = false,
  onSearch,
  onFilter,
  onSort,
  onItemClick,
  onLoadMore,
  hasMore = false,
  loadingMore = false,
  searchQuery = '',
  className = '',
  viewMode = 'grid',
  onViewModeChange,
}: ItemGridProps) {
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery)
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<FilterOptions>({})

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onSearch && localSearchQuery !== searchQuery) {
        onSearch(localSearchQuery)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [localSearchQuery, onSearch, searchQuery])

  // Update local search when prop changes
  useEffect(() => {
    setLocalSearchQuery(searchQuery)
  }, [searchQuery])

  // Sort items locally if no onSort handler is provided
  const sortedItems = useMemo(() => {
    if (onSort) return items // Let parent handle sorting
    
    const sorted = [...items].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        case 'title':
          return (a.title || '').localeCompare(b.title || '')
        case 'vendor':
          return (a.vendor || '').localeCompare(b.vendor || '')
        case 'category':
          return (a.category || '').localeCompare(b.category || '')
        case 'price-asc':
          return (a.price || 0) - (b.price || 0)
        case 'price-desc':
          return (b.price || 0) - (a.price || 0)
        default:
          return 0
      }
    })
    return sorted
  }, [items, sortBy, onSort])

  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort)
    if (onSort) {
      onSort(newSort)
    }
  }

  const handleFilterChange = useCallback((newFilters: FilterOptions) => {
    setFilters(newFilters)
    if (onFilter) {
      onFilter(newFilters)
    }
  }, [onFilter])

  const clearSearch = () => {
    setLocalSearchQuery('')
    if (onSearch) onSearch('')
  }

  const clearFilters = () => {
    setFilters({})
    if (onFilter) onFilter({})
  }

  // Extract unique values for filter dropdowns
  const uniqueCategories = Array.from(new Set(items.map(item => item.category).filter(Boolean)))
  const uniqueVendors = Array.from(new Set(items.map(item => item.vendor).filter(Boolean)))

  const hasActiveFilters = Object.values(filters).some(value => 
    value && (typeof value === 'string' || (typeof value === 'object' && Object.values(value).some(v => v)))
  )

  return (
    <div className={`w-full ${className}`}>
      {/* Search and Controls */}
      <div className="mb-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search products, vendors, colors..."
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
          {localSearchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value as SortOption)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                {SORT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none" />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 ${
                hasActiveFilters ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  !
                </span>
              )}
            </button>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Results Count */}
            <span className="text-sm text-gray-600">
              {loading ? 'Loading...' : `${sortedItems.length} items`}
            </span>

            {/* View Mode Toggle */}
            {onViewModeChange && (
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => onViewModeChange('grid')}
                  className={`p-2 ${
                    viewMode === 'grid' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onViewModeChange('list')}
                  className={`p-2 ${
                    viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={filters.category || ''}
                  onChange={(e) => handleFilterChange({ ...filters, category: e.target.value || undefined })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All categories</option>
                  {uniqueCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Vendor Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vendor</label>
                <select
                  value={filters.vendor || ''}
                  onChange={(e) => handleFilterChange({ ...filters, vendor: e.target.value || undefined })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All vendors</option>
                  {uniqueVendors.map(vendor => (
                    <option key={vendor} value={vendor}>{vendor}</option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Price</label>
                <input
                  type="number"
                  placeholder="Max price"
                  value={filters.priceRange?.max || ''}
                  onChange={(e) => handleFilterChange({
                    ...filters,
                    priceRange: {
                      ...filters.priceRange,
                      max: e.target.value ? parseInt(e.target.value) : undefined
                    }
                  })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Color Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                <input
                  type="text"
                  placeholder="Color hex (e.g., #ff0000)"
                  value={filters.color || ''}
                  onChange={(e) => handleFilterChange({ ...filters, color: e.target.value || undefined })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Items Grid/List */}
      {loading ? (
        <div className={viewMode === 'grid' 
          ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          : "space-y-4"
        }>
          {Array.from({ length: 12 }, (_, i) => (
            <ItemSkeleton key={i} viewMode={viewMode} />
          ))}
        </div>
      ) : sortedItems.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Search className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {localSearchQuery || hasActiveFilters ? 'No items found' : 'No items yet'}
          </h3>
          <p className="text-gray-600">
            {localSearchQuery || hasActiveFilters
              ? 'Try adjusting your search or filters'
              : 'Start by adding items using the browser extension'
            }
          </p>
        </div>
      ) : (
        <>
          <div className={viewMode === 'grid'
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            : "space-y-4"
          }>
            {sortedItems.map((item) => (
              <ItemCard key={item.id} item={item} viewMode={viewMode} onClick={onItemClick ? () => onItemClick(item) : undefined} />
            ))}
            {loadingMore && Array.from({ length: 4 }, (_, i) => (
              <ItemSkeleton key={`loading-more-${i}`} viewMode={viewMode} />
            ))}
          </div>
          {hasMore && !loadingMore && onLoadMore && (
            <div className="mt-8 text-center">
              <button
                onClick={onLoadMore}
                className="px-6 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Load more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}