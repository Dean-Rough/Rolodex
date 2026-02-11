'use client'

import { ChangeEvent, FormEvent, useEffect, useMemo, useState, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { AlertCircle, ArrowLeft, CheckCircle, Loader2, Sparkles } from 'lucide-react'
import { api } from '../../lib/api'
import { useRolodexAuth } from '../../hooks/use-auth'

type CaptureFormState = {
  img_url: string
  title: string
  vendor: string
  price: string
  currency: string
  description: string
  colour_hex: string
  category: string
  material: string
  src_url: string
}

type SubmitState = 'idle' | 'saving' | 'success' | 'error'

const INITIAL_STATE: CaptureFormState = {
  img_url: '',
  title: '',
  vendor: '',
  price: '',
  currency: 'USD',
  description: '',
  colour_hex: '',
  category: '',
  material: '',
  src_url: '',
}

function CaptureForm() {
  const params = useSearchParams()
  const { getToken, isSignedIn, isLoaded } = useRolodexAuth()
  const prefilled = useMemo(() => {
    const defaults = { ...INITIAL_STATE }
    const image = params.get('image') || params.get('img_url')
    if (image) defaults.img_url = image
    const source = params.get('source') || params.get('src')
    if (source) defaults.src_url = source
    const title = params.get('title')
    if (title) defaults.title = title
    return defaults
  }, [params])

  const [form, setForm] = useState<CaptureFormState>(prefilled)
  const [status, setStatus] = useState<SubmitState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [createdId, setCreatedId] = useState<string | null>(null)
  const [extracting, setExtracting] = useState(false)

  const handleChange = (field: keyof CaptureFormState) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [field]: event.target.value }))
  }

  const handleExtract = async () => {
    if (!form.img_url.trim()) return
    setExtracting(true)
    setError(null)

    try {
      const token = await getToken()
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/api/items/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          imageUrl: form.img_url,
          sourceUrl: form.src_url || undefined,
          title: form.title || undefined,
        }),
      })

      if (!res.ok) throw new Error(`Extraction failed (${res.status})`)

      const data = await res.json()
      setForm(prev => ({
        ...prev,
        title: data.title || prev.title,
        vendor: data.vendor || prev.vendor,
        price: data.price ? String(data.price) : prev.price,
        currency: data.currency || prev.currency,
        description: data.description || prev.description,
        colour_hex: data.colour_hex || prev.colour_hex,
        category: data.category || prev.category,
        material: data.material || prev.material,
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI extraction failed')
    } finally {
      setExtracting(false)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus('saving')
    setError(null)

    const payload = {
      img_url: form.img_url,
      title: form.title || undefined,
      vendor: form.vendor || undefined,
      price: form.price ? Number(form.price) : undefined,
      currency: form.currency || undefined,
      description: form.description || undefined,
      colour_hex: form.colour_hex || undefined,
      category: form.category || undefined,
      material: form.material || undefined,
      src_url: form.src_url || undefined,
    }

    try {
      const token = await getToken()
      if (!token) {
        setError('Not authenticated. Please sign in.')
        setStatus('error')
        return
      }
      const created = await api.createItem(token, payload)
      setCreatedId(created.id)
      setStatus('success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save item'
      setError(message)
      setStatus('error')
    }
  }

  const canSubmit = form.img_url.trim().length > 0 && status !== 'saving' && isSignedIn

  return (
    <div className="grid gap-8 py-10 lg:grid-cols-[2fr,3fr]">
      <section className="space-y-6">
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          {form.img_url ? (
            <Image
              src={form.img_url}
              alt={form.title || 'Captured inspiration'}
              width={960}
              height={640}
              unoptimized
              className="h-80 w-full object-cover"
            />
          ) : (
            <div className="flex h-80 flex-col items-center justify-center bg-slate-100 text-center text-slate-500">
              <Sparkles className="mb-2 h-10 w-10" />
              <p className="px-12 text-sm">Paste an image URL or use the extension to start capturing.</p>
            </div>
          )}
        </div>

        {form.img_url && (
          <button
            type="button"
            onClick={handleExtract}
            disabled={extracting || !isSignedIn}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {extracting ? 'Extracting with AI...' : 'Auto-fill with AI'}
          </button>
        )}

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold text-slate-900">How this works</h2>
          <ul className="space-y-2 text-sm text-slate-600">
            <li>1. Paste or capture a product image URL.</li>
            <li>2. Click <strong>Auto-fill with AI</strong> to extract metadata.</li>
            <li>3. Review, tweak, and save to your library.</li>
          </ul>
        </div>
      </section>

      <section>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Image URL *</label>
            <input
              type="url"
              required
              value={form.img_url}
              onChange={handleChange('img_url')}
              placeholder="https://..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
              <input type="text" value={form.title} onChange={handleChange('title')} placeholder="Sculptural brass floor lamp" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Vendor</label>
              <input type="text" value={form.vendor} onChange={handleChange('vendor')} placeholder="Design House" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none" />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-[1fr,120px]">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
              <textarea rows={4} value={form.description} onChange={handleChange('description')} placeholder="Graceful arched profile with opal glass dome." className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none" />
            </div>
            <div className="grid gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Price</label>
                <input type="number" min={0} step="0.01" value={form.price} onChange={handleChange('price')} placeholder="1200" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Currency</label>
                <input type="text" value={form.currency} onChange={handleChange('currency')} placeholder="USD" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm uppercase shadow-sm focus:border-slate-400 focus:outline-none" />
              </div>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Colour Hex</label>
              <input type="text" value={form.colour_hex} onChange={handleChange('colour_hex')} placeholder="#C0A480" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
              <input type="text" value={form.category} onChange={handleChange('category')} placeholder="Lighting" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none" />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Material</label>
              <input type="text" value={form.material} onChange={handleChange('material')} placeholder="Brass" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Source URL</label>
              <input type="url" value={form.src_url} onChange={handleChange('src_url')} placeholder="https://retailer.com/product" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none" />
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {status === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              {status === 'saving' ? 'Saving...' : 'Save to library'}
            </button>
          </div>

          {status === 'success' && createdId && (
            <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <CheckCircle className="h-4 w-4" />
              Saved!{' '}
              <Link href="/" className="font-medium underline">
                View in library
              </Link>
            </div>
          )}

          {status === 'error' && error && (
            <div className="flex items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </form>
      </section>
    </div>
  )
}

export default function CapturePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-5xl px-6">
        <Suspense fallback={
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        }>
          <CaptureForm />
        </Suspense>
      </main>
    </div>
  )
}
