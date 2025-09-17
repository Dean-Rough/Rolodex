// Enhanced types matching backend schema
export type ApiItem = {
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
  src_url?: string
  created_at?: string
}

export interface SearchOptions {
  query?: string
  hex?: string
  price_max?: number
  limit?: number
  cursor?: string
  category?: string
  vendor?: string
  [key: string]: string | number | undefined // Index signature for flexibility
}

export interface ListItemsResponse {
  items: ApiItem[]
  nextCursor?: string
  total?: number
}

export interface CreateItemPayload {
  img_url: string
  title?: string
  vendor?: string
  price?: number
  currency?: string
  description?: string
  colour_hex?: string
  category?: string
  material?: string
  src_url?: string
}

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`
  
  try {
    const res = await fetch(url, {
      ...init,
      headers: { 
        'Content-Type': 'application/json', 
        ...(init.headers || {}) 
      },
    })
    
    if (!res.ok) {
      let message = `HTTP ${res.status}`
      let code = 'http_error'
      
      try {
        const errorData = await res.json()
        message = errorData?.error?.message || errorData?.message || message
        code = errorData?.error?.code || errorData?.code || code
      } catch {}
      
      throw new ApiError(message, res.status, code)
    }
    
    const data = await res.json()
    return data as T
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    
    // Network or other errors
    throw new ApiError(
      error instanceof Error ? error.message : 'Network request failed'
    )
  }
}

function toQuery(params: Record<string, string | number | undefined | null>) {
  const entries = Object.entries(params).filter(([, v]) => 
    v !== undefined && v !== null && v !== ''
  )
  if (!entries.length) return ''
  
  const usp = new URLSearchParams()
  entries.forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      usp.append(key, String(value))
    }
  })
  
  return `?${usp.toString()}`
}

// Cache for API responses
const cache = new Map<string, { data: unknown; timestamp: number; ttl: number }>()

const CACHE_TTL = {
  items: 5 * 60 * 1000, // 5 minutes
  search: 2 * 60 * 1000, // 2 minutes
}

function getCacheKey(endpoint: string, params: Record<string, unknown>): string {
  return `${endpoint}:${JSON.stringify(params)}`
}

function getFromCache<T>(key: string): T | null {
  const cached = cache.get(key)
  if (!cached) return null
  
  if (Date.now() - cached.timestamp > cached.ttl) {
    cache.delete(key)
    return null
  }
  
  return cached.data as T
}

function setCache<T>(key: string, data: T, ttl: number): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  })
  
  // Cleanup old cache entries periodically
  if (cache.size > 100) {
    const cutoff = Date.now() - Math.max(...Object.values(CACHE_TTL))
    const entriesToDelete: string[] = []
    cache.forEach((v, k) => {
      if (v.timestamp < cutoff) {
        entriesToDelete.push(k)
      }
    })
    entriesToDelete.forEach(k => cache.delete(k))
  }
}

export const api = {
  // List items with comprehensive filtering and caching
  async listItems(
    token: string, 
    opts: SearchOptions = {},
    useCache = true
  ): Promise<ListItemsResponse> {
    const cacheKey = getCacheKey('items', opts)
    
    if (useCache) {
      const cached = getFromCache<ListItemsResponse>(cacheKey)
      if (cached) return cached
    }
    
    const queryParams = toQuery({
      query: opts.query,
      hex: opts.hex,
      price_max: opts.price_max,
      limit: opts.limit || 20,
      cursor: opts.cursor,
      category: opts.category,
      vendor: opts.vendor,
    })
    
    const response = await request<ListItemsResponse>(`/api/items${queryParams}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    
    if (useCache) {
      setCache(cacheKey, response, CACHE_TTL.items)
    }
    
    return response
  },

  // Search items with semantic similarity
  async searchItems(
    token: string, 
    query: string, 
    opts: Omit<SearchOptions, 'query'> = {},
    useCache = true
  ): Promise<ListItemsResponse> {
    if (!query.trim()) {
      return this.listItems(token, opts, useCache)
    }
    
    const cacheKey = getCacheKey('search', { query, ...opts })
    
    if (useCache) {
      const cached = getFromCache<ListItemsResponse>(cacheKey)
      if (cached) return cached
    }
    
    // Use semantic search via the items endpoint with semantic=true
    const queryParams = toQuery({
      query,
      hex: opts.hex,
      price_max: opts.price_max,
      limit: opts.limit || 20,
      cursor: opts.cursor,
      category: opts.category,
      vendor: opts.vendor,
      semantic: 'true', // Enable semantic search
    })
    
    const response = await request<ListItemsResponse>(`/api/items${queryParams}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    
    if (useCache) {
      setCache(cacheKey, response, CACHE_TTL.search)
    }
    
    return response
  },

  // Get item details
  async getItem(token: string, itemId: string): Promise<ApiItem> {
    return request<ApiItem>(`/api/items/${itemId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  async createItem(token: string, payload: CreateItemPayload): Promise<ApiItem> {
    const response = await request<ApiItem>(`/api/items`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    })
    cache.clear()
    return response
  },

  // Health check
  async health(): Promise<{ status: string; db: string }> {
    return request<{ status: string; db: string }>('/health')
  },

  // Clear API cache
  clearCache(): void {
    cache.clear()
  },

  // Get cache statistics
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: cache.size,
      keys: Array.from(cache.keys()),
    }
  },
}
