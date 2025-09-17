'use client'

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { AlertCircle, ArrowLeft, CheckCircle, Loader2, Sparkles } from 'lucide-react'

import { api } from '../../lib/api'

const FALLBACK_TOKEN = process.env.NEXT_PUBLIC_DEMO_TOKEN || 'demo-token-12345'
const CAPTURE_TOKEN_KEY = 'rolodex_capture_token'

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

function usePrefilledState(): CaptureFormState {
  const params = useSearchParams()
  return useMemo(() => {
    const defaults = { ...INITIAL_STATE }
    const image = params.get('image') || params.get('img_url')
    if (image) defaults.img_url = image
    const source = params.get('source') || params.get('src')
    if (source) defaults.src_url = source
    const title = params.get('title')
    if (title) defaults.title = title
    return defaults
  }, [params])
}

export default function CapturePage() {
  const prefilled = usePrefilledState()
  const [form, setForm] = useState<CaptureFormState>(prefilled)
  const [status, setStatus] = useState<SubmitState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [createdId, setCreatedId] = useState<string | null>(null)
  const [captureToken, setCaptureToken] = useState<string | null>(null)
  const usingFallbackToken = captureToken === FALLBACK_TOKEN && Boolean(FALLBACK_TOKEN)

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const urlToken = params.get('token')

      if (urlToken) {
        sessionStorage.setItem(CAPTURE_TOKEN_KEY, urlToken)
        setCaptureToken(urlToken)
        return
      }

      const stored =
        sessionStorage.getItem(CAPTURE_TOKEN_KEY) ||
        localStorage.getItem('rolodex_dev_token') ||
        null

      if (stored) {
        setCaptureToken(stored)
      } else if (FALLBACK_TOKEN) {
        setCaptureToken(FALLBACK_TOKEN)
      } else {
        setCaptureToken(null)
      }
    } catch (tokenError) {
      console.warn('Unable to access capture token storage', tokenError)
      setCaptureToken(FALLBACK_TOKEN || null)
    }
  }, [])

  const handleChange = (field: keyof CaptureFormState) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [field]: event.target.value }))
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

    if (!captureToken) {
      setError('Missing capture token. Launch this page from the extension or sign in again.')
      setStatus('error')
      return
    }

    try {
      const created = await api.createItem(captureToken, payload)
      setCreatedId(created.id)
      setStatus('success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save item'
      setError(message)
      setStatus('error')
    }
  }

  const canSubmit = form.img_url.trim().length > 0 && status !== 'saving' && Boolean(captureToken)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center text-sm text-gray-500 hover:text-gray-700">
              <ArrowLeft className="mr-1 h-4 w-4" /> Back to library
            </Link>
            <div className="inline-flex items-center rounded-full bg-slate-900/90 px-3 py-1 text-xs font-medium uppercase tracking-wide text-white">
              Capture Workspace
            </div>
          </div>
          <Sparkles className="h-5 w-5 text-emerald-500" />
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-8 px-6 py-10 lg:grid-cols-[2fr,3fr]">
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
                <p className="px-12 text-sm">Drop a URL from the extension or paste an image link to preview it here.</p>
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-lg font-semibold text-slate-900">How this works</h2>
            <p className="text-sm text-slate-600">
              The Chrome extension passes the page context into this workspace. Double-check the AI suggestion, tweak the details,
              and press save to add the item to your library. Tokens last a few minutes for security—refresh if your session
              expires.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li>• Paste a product image URL or use the extension to launch this screen.</li>
              <li>• Fill in vendor, pricing, colour, and material details.</li>
              <li>• Hit <strong>Save to library</strong> and jump back to the main grid.</li>
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
                placeholder="https://…"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={handleChange('title')}
                  placeholder="Sculptural brass floor lamp"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Vendor</label>
                <input
                  type="text"
                  value={form.vendor}
                  onChange={handleChange('vendor')}
                  placeholder="Design House"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-[1fr,120px]">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={handleChange('description')}
                  placeholder="Graceful arched profile with opal glass dome and dim-to-warm LED core."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
                />
              </div>
              <div className="grid gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Price</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.price}
                    onChange={handleChange('price')}
                    placeholder="1200"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Currency</label>
                  <input
                    type="text"
                    value={form.currency}
                    onChange={handleChange('currency')}
                    placeholder="USD"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm uppercase shadow-sm focus:border-slate-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Colour Hex</label>
                <input
                  type="text"
                  value={form.colour_hex}
                  onChange={handleChange('colour_hex')}
                  placeholder="#C0A480"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
                <input
                  type="text"
                  value={form.category}
                  onChange={handleChange('category')}
                  placeholder="Lighting"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Material</label>
                <input
                  type="text"
                  value={form.material}
                  onChange={handleChange('material')}
                  placeholder="Brass"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Source URL</label>
                <input
                  type="url"
                  value={form.src_url}
                  onChange={handleChange('src_url')}
                  placeholder="https://retailer.com/product"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-500">
                {captureToken ? (
                  usingFallbackToken ? (
                    <span>
                      Using the demo token for local development. Launch from the extension for secure captures.
                    </span>
                  ) : (
                    <span>Secure capture token detected. You are ready to save items.</span>
                  )
                ) : (
                  <span>No capture token detected. Open this workspace from the extension after signing in.</span>
                )}
              </div>
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {status === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                {status === 'saving' ? 'Saving…' : 'Save to library'}
              </button>
            </div>

            {status === 'success' && createdId && (
              <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <CheckCircle className="h-4 w-4" />
                Saved! View it in the{' '}
                <Link href="/" className="font-medium underline">
                  library
                </Link>{' '}
                (ID {createdId}).
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
      </main>
    </div>
  )
}
