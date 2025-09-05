"use client"
import React, { createContext, useContext, useMemo, useRef, useState, useEffect } from 'react'

type CacheEntry<T> = { data?: T; error?: unknown; loading: boolean; ts: number }

const QueryContext = createContext<Map<string, CacheEntry<unknown>> | null>(null)

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const cache = useMemo(() => new Map<string, CacheEntry<unknown>>(), [])
  return <QueryContext.Provider value={cache}>{children}</QueryContext.Provider>
}

export function useQuery<T>(key: string, fn: () => Promise<T>) {
  const cache = useContext(QueryContext)
  if (!cache) throw new Error('useQuery must be used within QueryProvider')
  const [, setTick] = useState(0)
  const entryRef = useRef<CacheEntry<T>>(cache.get(key) as CacheEntry<T> || { loading: false, ts: 0 })

  // Ensure cache has an entry
  if (!cache.has(key)) cache.set(key, entryRef.current)

  async function run() {
    if (!cache) return
    const entry = cache.get(key) as CacheEntry<T>
    if (!entry) return
    entry.loading = true
    setTick((t) => t + 1)
    try {
      const data = await fn()
      entry.data = data
      entry.error = undefined
    } catch (e) {
      entry.error = e
    } finally {
      entry.loading = false
      entry.ts = Date.now()
      setTick((t) => t + 1)
    }
  }

  useEffect(() => {
    const existing = cache.get(key) as CacheEntry<T>
    if (!existing || (!existing.data && !existing.loading)) {
      run()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return {
    data: (cache.get(key) as CacheEntry<T>)?.data,
    error: (cache.get(key) as CacheEntry<T>)?.error,
    loading: (cache.get(key) as CacheEntry<T>)?.loading ?? false,
    refetch: run,
  }
}

