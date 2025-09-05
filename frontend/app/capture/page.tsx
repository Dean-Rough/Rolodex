'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { API_BASE_URL } from '@/lib/api'

export default function CapturePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // URL parameters from extension
  const imageUrl = searchParams.get('image')
  const sourceUrl = searchParams.get('source')
  const title = searchParams.get('title')
  
  // Component state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)
  const [imageError, setImageError] = useState(false)

  // Redirect if no image URL provided
  useEffect(() => {
    if (!imageUrl) {
      router.push('/')
    }
  }, [imageUrl, router])

  const handleSave = async () => {
    if (!imageUrl) return
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/items/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: imageUrl,
          source_url: sourceUrl || '',
          title: title || ''
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `HTTP ${response.status}`)
      }
      
      await response.json()
      setSuccess(true)
      
      // Auto-redirect to home after 2 seconds
      setTimeout(() => {
        router.push('/')
      }, 2000)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save item')
    } finally {
      setLoading(false)
    }
  }

  const handleImageLoad = () => {
    setImageLoading(false)
    setImageError(false)
  }

  const handleImageError = () => {
    setImageLoading(false)
    setImageError(true)
  }

  if (!imageUrl) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid Capture</h1>
          <p className="text-gray-600 mb-6">No image URL provided. Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Capture Product</h1>
        
        {success ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <div className="text-green-600 text-lg font-semibold mb-2">
              ✅ Successfully saved to Rolodex!
            </div>
            <p className="text-green-700">
              Redirecting to home page...
            </p>
          </div>
        ) : (
          <>
            {/* Image Display */}
            <div className="bg-white border rounded-lg p-6 mb-6">
              <div className="relative aspect-square max-w-md mx-auto mb-4">
                {imageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                )}
                
                {imageError ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                    <div className="text-center text-gray-500">
                      <div className="text-4xl mb-2">🖼️</div>
                      <p>Failed to load image</p>
                    </div>
                  </div>
                ) : (
                  <Image
                    src={imageUrl}
                    alt={title || 'Product image'}
                    fill
                    className="object-contain rounded-lg"
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                    unoptimized // Allow external images
                  />
                )}
              </div>
            </div>

            {/* Source Information */}
            <div className="bg-gray-50 border rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold mb-3">Source Information</h2>
              
              {title && (
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <p className="text-gray-900 bg-white p-2 rounded border">
                    {title}
                  </p>
                </div>
              )}
              
              {sourceUrl && (
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Source URL
                  </label>
                  <p className="text-blue-600 bg-white p-2 rounded border break-all">
                    <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {sourceUrl}
                    </a>
                  </p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image URL
                </label>
                <p className="text-gray-600 bg-white p-2 rounded border break-all text-sm">
                  {imageUrl}
                </p>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <div className="text-red-400 mr-3">
                    ⚠️
                  </div>
                  <div>
                    <h3 className="text-red-800 font-semibold">Error</h3>
                    <p className="text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={handleSave}
                disabled={loading || imageError}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  'Save to Rolodex'
                )}
              </button>
              
              <button
                onClick={() => router.push('/')}
                disabled={loading}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}