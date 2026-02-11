"use client"
import { useCallback, useEffect, useState } from 'react'
import { api, type ApiItem } from '@/lib/api'

export default function ItemsPage() {
  const [items, setItems] = useState<ApiItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [q, setQ] = useState('')
  const [hex, setHex] = useState('')
  const [priceMax, setPriceMax] = useState<number | ''>('')

  const fetchItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.listItems('', {
        query: q || undefined,
        hex: hex || undefined,
        price_max: typeof priceMax === 'number' ? priceMax : undefined,
      })
      setItems(response.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load items')
    } finally {
      setLoading(false)
    }
  }, [q, hex, priceMax])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Items</h1>
      <form
        className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault()
          fetchItems()
        }}
      >
        <div>
          <label className="block text-sm text-gray-600">Search</label>
          <input value={q} onChange={(e) => setQ(e.target.value)} className="border rounded px-2 py-1 w-64" placeholder="query" />
        </div>
        <div>
          <label className="block text-sm text-gray-600">Hex</label>
          <input value={hex} onChange={(e) => setHex(e.target.value)} className="border rounded px-2 py-1 w-28" placeholder="#4A6B3C" />
        </div>
        <div>
          <label className="block text-sm text-gray-600">Price &le;</label>
          <input
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value ? Number(e.target.value) : '')}
            className="border rounded px-2 py-1 w-28"
            type="number"
            min={0}
            step={1}
            placeholder="2000"
          />
        </div>
        <button type="submit" className="bg-blue-600 text-white px-3 py-2 rounded">
          Apply
        </button>
      </form>

      {loading && <p>Loading...</p>}
      {error && <p className="text-red-600">Error: {error}</p>}
      {!loading && !error && items.length === 0 && <p>No items yet.</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {items.map((it) => (
          <div key={it.id} className="border rounded p-3">
            <div className="text-xs text-gray-500 mb-1">{it.id}</div>
            <a href={it.img_url} className="text-blue-600 break-all" target="_blank" rel="noreferrer">
              {it.img_url}
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
