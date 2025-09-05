"use client"
import { useEffect, useState } from 'react'

export default function ExtensionAuth() {
  const [status, setStatus] = useState('Initializing…')

  useEffect(() => {
    try {
      const url = new URL(window.location.href)
      const token = url.searchParams.get('token')
      if (token) {
        localStorage.setItem('rolodex_dev_token', token)
        // Signal success to the extension by updating the URL path
        const successUrl = new URL(window.location.href)
        successUrl.pathname = '/auth/extension/auth-success'
        successUrl.searchParams.set('token', token)
        window.history.replaceState({}, '', successUrl.toString())
        setStatus('Token stored. Extension should detect success shortly.')
      } else {
        setStatus('No token provided. Ensure the extension opened this page with ?token=…')
      }
    } catch (e) {
      setStatus('Failed to parse URL')
    }
  }, [])

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-2">Extension Auth</h1>
      <p className="text-gray-700">{status}</p>
    </div>
  )
}
