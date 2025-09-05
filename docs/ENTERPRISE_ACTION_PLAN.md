# Enterprise Action Plan: Rolodex Implementation
*Granular Step-by-Step Implementation Guide*

**Based on**: Rolodex_v2_TECHNICAL_AUDIT.md findings  
**Target**: Transform infrastructure into functional product  
**Approach**: Detailed instructions for immediate execution  

---

## Quick Start Prerequisites

**Before beginning any work, ensure:**
1. Node.js 18+ and Python 3.9+ installed
2. PostgreSQL database accessible (connection string ready)
3. OpenAI API key obtained
4. Supabase project created with Storage enabled
5. Chrome browser with Developer mode enabled

**Environment Setup:**
```bash
# Clone and setup
git clone <repo-url>
cd Rolodex
cp .env.example .env
# Fill in all environment variables in .env before proceeding
```

---

# PHASE 1: CRITICAL FOUNDATION (Weeks 1-4)

## Week 1-2: Chrome Extension Simplification

### **TASK 1.1: Simplify Extension Architecture**
**Objective**: Reduce extension from 232 lines to <50 lines per audit requirements

**Step 1.1.1: Create New Simplified Extension**
```bash
# Create new extension directory
mkdir extension-v3-simplified
cd extension-v3-simplified
```

**Step 1.1.2: Create Minimal Manifest**
Create `extension-v3-simplified/manifest.json`:
```json
{
  "manifest_version": 3,
  "name": "Rolodex Capture",
  "version": "3.0.0",
  "description": "Capture products for Rolodex web app",
  "permissions": ["contextMenus", "tabs"],
  "host_permissions": ["<all_urls>"],
  "background": {
    "service_worker": "background.js"
  },
  "icons": {
    "16": "icon16.png",
    "48": "icon48.png",
    "128": "icon128.png"
  }
}
```

**Step 1.1.3: Create Minimal Background Script**
Create `extension-v3-simplified/background.js`:
```javascript
// Simplified extension - exactly as specified in audit
const WEB_APP_BASE = 'http://localhost:3000'; // Development URL

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "capture-product",
    title: "Capture with Rolodex",
    contexts: ["image"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "capture-product") {
    const webAppUrl = `${WEB_APP_BASE}/capture?` +
      `image=${encodeURIComponent(info.srcUrl)}&` +
      `source=${encodeURIComponent(tab.url)}&` +
      `title=${encodeURIComponent(tab.title)}`;
    
    chrome.tabs.create({ url: webAppUrl });
  }
});
```

**Validation**: Extension should be exactly 23 lines (excluding comments)

### **TASK 1.2: Create Web App Capture Route**

**Step 1.2.1: Create Capture Page Structure**
Create `frontend/app/capture/page.tsx`:
```typescript
'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function CapturePage() {
  const searchParams = useSearchParams();
  const [imageUrl, setImageUrl] = useState<string>('');
  const [sourceUrl, setSourceUrl] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setImageUrl(searchParams.get('image') || '');
    setSourceUrl(searchParams.get('source') || '');
    setTitle(searchParams.get('title') || '');
  }, [searchParams]);

  const handleSave = async () => {
    if (!imageUrl) {
      setError('No image URL provided');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // Call API to process and save item
      const response = await fetch('/api/items/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl,
          sourceUrl,
          title
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save item: ${response.statusText}`);
      }

      setSuccess(true);
      // Redirect to home page after 2 seconds
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-green-600 mb-4">Item Saved Successfully!</h1>
          <p className="text-gray-600">Redirecting to your collection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Capture Product</h1>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-xl font-semibold mb-4">Captured Image</h2>
              {imageUrl && (
                <div className="border rounded-lg overflow-hidden">
                  <Image
                    src={imageUrl}
                    alt="Captured product"
                    width={400}
                    height={400}
                    className="w-full h-auto"
                  />
                </div>
              )}
            </div>
            
            <div>
              <h2 className="text-xl font-semibold mb-4">Source Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Page Title
                  </label>
                  <p className="text-gray-900 bg-gray-50 p-2 rounded border">
                    {title || 'No title'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Source URL
                  </label>
                  <p className="text-gray-900 bg-gray-50 p-2 rounded border break-all">
                    {sourceUrl || 'No source URL'}
                  </p>
                </div>

                <button
                  onClick={handleSave}
                  disabled={isProcessing || !imageUrl}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-3 px-4 rounded-md transition-colors"
                >
                  {isProcessing ? 'Processing...' : 'Save to Rolodex'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### **TASK 1.3: Test Extension → Web App Flow**

**Step 1.3.1: Load Extension in Chrome**
1. Open Chrome → Extensions → Developer mode ON
2. Click "Load unpacked" → Select `extension-v3-simplified` folder
3. Verify extension appears with correct icon

**Step 1.3.2: Test Capture Flow**
1. Navigate to any e-commerce site (e.g., Amazon, Wayfair)
2. Right-click on product image → "Capture with Rolodex"
3. Verify new tab opens to `localhost:3000/capture`
4. Verify image displays and source URL is populated
5. Click "Save to Rolodex" → Should see error (expected, API not implemented yet)

**Success Criteria Week 1-2:**
- [ ] Extension is <50 lines of code
- [ ] Right-click capture opens web app correctly
- [ ] Image and source data transfer properly
- [ ] No authentication or API logic in extension

---

## Week 3-4: AI Extraction Implementation

### **TASK 2.1: Replace Mocked AI Extraction**
**Critical Fix**: Audit identified `backend/main.py:268-280` returns hardcoded data

**Step 2.1.1: Install OpenAI Dependency**
```bash
cd backend
pip install openai python-multipart pillow requests
pip freeze > requirements.txt
```

**Step 2.1.2: Update Backend Environment**
Add to `backend/.env`:
```
OPENAI_API_KEY=your_openai_api_key_here
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

**Step 2.1.3: Create AI Extraction Service**
Create `backend/services/ai_extraction.py`:
```python
import openai
import requests
from typing import Dict, Optional
import json
import logging
from PIL import Image
import io

logger = logging.getLogger(__name__)

class AIExtractionService:
    def __init__(self, api_key: str):
        self.client = openai.OpenAI(api_key=api_key)
    
    async def extract_product_data(self, image_url: str, source_url: str, page_title: str) -> Dict:
        """
        Extract product data from image and context using OpenAI GPT-4V
        """
        try:
            # Validate image URL is accessible
            response = requests.head(image_url, timeout=10)
            if response.status_code != 200:
                raise ValueError(f"Image not accessible: {response.status_code}")
            
            # Prepare the prompt for structured extraction
            prompt = f"""
            Analyze this product image and extract the following information in JSON format.
            
            Context:
            - Source URL: {source_url}
            - Page Title: {page_title}
            
            Return ONLY valid JSON with these exact fields:
            {{
                "title": "Product name/title",
                "vendor": "Brand or vendor name",
                "price": "Price as number (null if not visible)",
                "currency": "Currency code like USD (null if not visible)",
                "description": "Detailed product description",
                "colour_hex": "Primary color as hex code (e.g. #FF5733)",
                "category": "Product category (furniture, lighting, decor, etc.)",
                "material": "Primary material (wood, metal, fabric, etc.)",
                "style": "Design style (modern, traditional, industrial, etc.)",
                "dimensions": "Approximate dimensions if visible",
                "confidence_score": "Confidence in extraction (0.0-1.0)"
            }}
            
            Important:
            - Use null for fields that cannot be determined
            - Be specific and accurate
            - For colour_hex, analyze the dominant product color
            - Category should be one of: furniture, lighting, decor, textiles, accessories
            """

            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {"type": "image_url", "image_url": {"url": image_url}}
                        ]
                    }
                ],
                max_tokens=500,
                temperature=0.1
            )
            
            # Parse the JSON response
            content = response.choices[0].message.content.strip()
            
            # Clean up response (remove markdown code blocks if present)
            if content.startswith('```json'):
                content = content[7:-3].strip()
            elif content.startswith('```'):
                content = content[3:-3].strip()
            
            extracted_data = json.loads(content)
            
            # Validate required fields
            required_fields = ['title', 'vendor', 'description', 'category']
            for field in required_fields:
                if field not in extracted_data or not extracted_data[field]:
                    logger.warning(f"Missing required field: {field}")
            
            # Add metadata
            extracted_data.update({
                'original_image_url': image_url,
                'source_url': source_url,
                'extraction_model': 'gpt-4o',
                'extraction_timestamp': None  # Will be set by database
            })
            
            return extracted_data
            
        except requests.RequestException as e:
            logger.error(f"Failed to access image URL: {e}")
            raise ValueError(f"Could not access image: {str(e)}")
        
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response as JSON: {e}")
            raise ValueError("AI extraction returned invalid JSON")
        
        except Exception as e:
            logger.error(f"AI extraction failed: {e}")
            raise ValueError(f"Extraction failed: {str(e)}")
    
    def _extract_color_from_image(self, image_url: str) -> Optional[str]:
        """
        Fallback method to extract dominant color if AI doesn't provide it
        """
        try:
            response = requests.get(image_url, timeout=10)
            img = Image.open(io.BytesIO(response.content))
            
            # Convert to RGB and get dominant color
            img = img.convert('RGB')
            colors = img.getcolors(maxcolors=256*256*256)
            
            if colors:
                dominant_color = max(colors, key=lambda item: item[0])
                r, g, b = dominant_color[1]
                return f"#{r:02x}{g:02x}{b:02x}"
            
        except Exception as e:
            logger.warning(f"Could not extract color from image: {e}")
        
        return None
```

**Step 2.1.4: Update Main API Endpoint**
Replace the mocked extraction in `backend/main.py`. Find lines 268-280 and replace with:

```python
from services.ai_extraction import AIExtractionService
from supabase import create_client, Client
import os
from datetime import datetime

# Initialize services
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

ai_service = AIExtractionService(api_key=os.getenv("OPENAI_API_KEY"))

@app.post("/api/items/extract")
async def extract_and_create_item(request: dict):
    """
    Extract product data from image using AI and save to database
    Replaces the mocked implementation identified in audit
    """
    try:
        image_url = request.get('imageUrl')
        source_url = request.get('sourceUrl', '')
        page_title = request.get('title', '')
        
        if not image_url:
            raise HTTPException(status_code=400, detail="imageUrl is required")
        
        # Step 1: AI Extraction
        extracted_data = await ai_service.extract_product_data(
            image_url=image_url,
            source_url=source_url, 
            page_title=page_title
        )
        
        # Step 2: Store image in Supabase Storage
        stored_image_url = await store_image_in_supabase(image_url)
        
        # Step 3: Generate vector embedding (implement this)
        embedding = await generate_embedding(extracted_data['description'])
        
        # Step 4: Save to database
        item_data = {
            'img_url': stored_image_url,
            'title': extracted_data.get('title'),
            'vendor': extracted_data.get('vendor'),
            'price': extracted_data.get('price'),
            'currency': extracted_data.get('currency', 'USD'),
            'description': extracted_data.get('description'),
            'colour_hex': extracted_data.get('colour_hex'),
            'category': extracted_data.get('category'),
            'material': extracted_data.get('material'),
            'src_url': source_url,
            'embedding': embedding,
            'created_at': datetime.utcnow().isoformat()
        }
        
        # Insert into database
        result = supabase.table('items').insert(item_data).execute()
        
        if result.data:
            return {
                "success": True,
                "item_id": result.data[0]['id'],
                "extracted_data": extracted_data,
                "message": "Item successfully extracted and saved"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to save item")
            
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Extraction endpoint failed: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

async def store_image_in_supabase(image_url: str) -> str:
    """
    Download image and upload to Supabase Storage
    """
    try:
        # Download image
        response = requests.get(image_url, timeout=30)
        response.raise_for_status()
        
        # Generate unique filename
        import uuid
        file_extension = image_url.split('.')[-1].split('?')[0]
        filename = f"{uuid.uuid4()}.{file_extension}"
        
        # Upload to Supabase Storage
        storage_response = supabase.storage.from_('product-images').upload(
            filename, 
            response.content,
            file_options={"content-type": f"image/{file_extension}"}
        )
        
        if storage_response.error:
            raise Exception(f"Storage upload failed: {storage_response.error}")
        
        # Get public URL
        public_url = supabase.storage.from_('product-images').get_public_url(filename)
        return public_url
        
    except Exception as e:
        logger.error(f"Image storage failed: {e}")
        # Fallback to original URL if storage fails
        return image_url

async def generate_embedding(text: str) -> list:
    """
    Generate vector embedding for semantic search
    """
    try:
        client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        response = client.embeddings.create(
            model="text-embedding-3-small",
            input=text
        )
        return response.data[0].embedding
    except Exception as e:
        logger.warning(f"Embedding generation failed: {e}")
        return []  # Return empty list if embedding fails
```

### **TASK 2.2: Test AI Extraction**

**Step 2.2.1: Start Development Servers**
```bash
# Terminal 1: Backend
cd backend
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Frontend  
cd frontend
npm run dev
```

**Step 2.2.2: End-to-End Test**
1. Use Chrome extension to capture a product image
2. On `/capture` page, click "Save to Rolodex"
3. Check backend logs for AI extraction process
4. Verify item appears in database
5. Check that no hardcoded data is returned

**Step 2.2.3: Create Database Verification Script**
Create `backend/scripts/verify_extraction.py`:
```python
#!/usr/bin/env python3
"""
Verify that AI extraction is working and database is being populated
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase import create_client
import json

def check_recent_items():
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
    supabase = create_client(supabase_url, supabase_key)
    
    # Get 5 most recent items
    result = supabase.table('items').select('*').order('created_at', desc=True).limit(5).execute()
    
    if result.data:
        print(f"Found {len(result.data)} recent items:")
        for item in result.data:
            print(f"\nID: {item['id']}")
            print(f"Title: {item['title']}")
            print(f"Vendor: {item['vendor']}")
            print(f"Category: {item['category']}")
            print(f"Has embedding: {len(item.get('embedding', [])) > 0}")
            print(f"Created: {item['created_at']}")
    else:
        print("No items found in database")

if __name__ == "__main__":
    check_recent_items()
```

**Success Criteria Week 3-4:**
- [ ] AI extraction returns real data (not mocked)
- [ ] Items saved to database with all fields populated
- [ ] Images stored in Supabase Storage
- [ ] Vector embeddings generated
- [ ] End-to-end extension → web app → database flow works
- [ ] Extraction accuracy >85% for standard e-commerce products

---

# PHASE 2: CORE FEATURES (Weeks 5-8)

## Week 5-6: Search and Item Display

### **TASK 3.1: Build Item Grid Homepage**

**Step 3.1.1: Create Item Grid Component**
Create `frontend/components/ItemGrid.tsx`:
```typescript
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Search, Filter, Grid, List } from 'lucide-react';

interface Item {
  id: number;
  img_url: string;
  title: string;
  vendor: string;
  price: number;
  currency: string;
  description: string;
  colour_hex: string;
  category: string;
  material: string;
  created_at: string;
}

interface ItemGridProps {
  searchQuery?: string;
}

export default function ItemGrid({ searchQuery = '' }: ItemGridProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'newest' | 'title' | 'vendor'>('newest');

  useEffect(() => {
    fetchItems();
  }, [searchQuery, sortBy]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (searchQuery) params.append('query', searchQuery);
      params.append('sort', sortBy);
      
      const response = await fetch(`/api/items?${params}`);
      if (!response.ok) throw new Error('Failed to fetch items');
      
      const data = await response.json();
      setItems(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    if (!price) return 'Price not available';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(price);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-300 aspect-square rounded-lg mb-3"></div>
            <div className="bg-gray-300 h-4 rounded mb-2"></div>
            <div className="bg-gray-300 h-3 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button 
          onClick={fetchItems}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg mb-4">
          {searchQuery ? 'No items found for your search.' : 'No items in your collection yet.'}
        </p>
        <p className="text-gray-400">
          Use the Chrome extension to start capturing products!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {items.length} item{items.length !== 1 ? 's' : ''}
          </span>
          
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'title' | 'vendor')}
            className="border border-gray-300 rounded px-3 py-1 text-sm"
          >
            <option value="newest">Newest First</option>
            <option value="title">Title A-Z</option>
            <option value="vendor">Vendor A-Z</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
          >
            <Grid size={20} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
          >
            <List size={20} />
          </button>
        </div>
      </div>

      {/* Items Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-square relative">
                <Image
                  src={item.img_url}
                  alt={item.title}
                  fill
                  className="object-cover"
                />
                {item.colour_hex && (
                  <div
                    className="absolute top-2 right-2 w-6 h-6 rounded-full border-2 border-white shadow-md"
                    style={{ backgroundColor: item.colour_hex }}
                  />
                )}
              </div>
              
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-600 mb-2">{item.vendor}</p>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="bg-gray-100 px-2 py-1 rounded text-gray-700">
                    {item.category}
                  </span>
                  {item.price && (
                    <span className="font-medium text-gray-900">
                      {formatPrice(item.price, item.currency)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow-md p-4 flex gap-4">
              <div className="w-24 h-24 relative flex-shrink-0">
                <Image
                  src={item.img_url}
                  alt={item.title}
                  fill
                  className="object-cover rounded"
                />
              </div>
              
              <div className="flex-grow">
                <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                <p className="text-sm text-gray-600 mb-2">{item.vendor}</p>
                <p className="text-sm text-gray-500 line-clamp-2">{item.description}</p>
              </div>
              
              <div className="flex-shrink-0 text-right">
                <span className="bg-gray-100 px-2 py-1 rounded text-sm text-gray-700 block mb-2">
                  {item.category}
                </span>
                {item.price && (
                  <span className="font-medium text-gray-900">
                    {formatPrice(item.price, item.currency)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 3.1.2: Update Homepage**
Replace `frontend/app/page.tsx` content:
```typescript
'use client';

import { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import ItemGrid from '@/components/ItemGrid';

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Rolodex</h1>
            
            <div className="flex items-center gap-4">
              {/* Search */}
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search products..."
                  className="w-80 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </form>
              
              {/* Extension reminder */}
              <div className="text-sm text-gray-600">
                Use the Chrome extension to add items
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <ItemGrid searchQuery={searchQuery} />
      </main>
    </div>
  );
}
```

### **TASK 3.2: Implement Semantic Search**

**Step 3.2.1: Update Backend Items Endpoint**
Update `backend/main.py` items endpoint to support search:
```python
from pgvector.sqlalchemy import Vector
from sqlalchemy import text

@app.get("/api/items")
async def get_items(
    query: Optional[str] = None,
    sort: str = "newest",
    limit: int = 50,
    offset: int = 0
):
    """
    Get items with optional semantic search
    """
    try:
        if query and query.strip():
            # Generate embedding for search query
            embedding = await generate_embedding(query)
            
            if embedding:
                # Semantic search using cosine similarity
                search_sql = text("""
                    SELECT *, 
                           (embedding <=> :query_embedding) as similarity_score
                    FROM items 
                    WHERE embedding IS NOT NULL
                    ORDER BY embedding <=> :query_embedding
                    LIMIT :limit OFFSET :offset
                """)
                
                result = supabase.rpc('search_items', {
                    'query_embedding': embedding,
                    'match_threshold': 0.8,
                    'match_count': limit
                }).execute()
                
            else:
                # Fallback to text search
                result = supabase.table('items').select('*').ilike(
                    'title', f'%{query}%'
                ).or_(
                    f'description.ilike.%{query}%'
                ).order('created_at', desc=True).limit(limit).offset(offset).execute()
        else:
            # No search query, return all items
            order_by = {
                'newest': ('created_at', True),
                'title': ('title', False),
                'vendor': ('vendor', False)
            }.get(sort, ('created_at', True))
            
            query_builder = supabase.table('items').select('*')
            
            if order_by[1]:  # desc
                query_builder = query_builder.order(order_by[0], desc=True)
            else:
                query_builder = query_builder.order(order_by[0])
            
            result = query_builder.limit(limit).offset(offset).execute()
        
        return {
            "items": result.data or [],
            "total": len(result.data or []),
            "has_more": len(result.data or []) == limit
        }
        
    except Exception as e:
        logger.error(f"Items fetch failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch items")
```

**Step 3.2.2: Create Database Search Function**
Create SQL function in Supabase dashboard:
```sql
-- Create the search function for semantic similarity
CREATE OR REPLACE FUNCTION search_items(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.8,
  match_count int DEFAULT 50
)
RETURNS TABLE(
  id bigint,
  img_url text,
  title text,
  vendor text,
  price numeric,
  currency text,
  description text,
  colour_hex text,
  category text,
  material text,
  src_url text,
  embedding vector(1536),
  created_at timestamptz,
  similarity_score float
)
LANGUAGE sql
AS $$
  SELECT 
    items.*,
    1 - (items.embedding <=> query_embedding) AS similarity_score
  FROM items
  WHERE 1 - (items.embedding <=> query_embedding) > match_threshold
  ORDER BY items.embedding <=> query_embedding
  LIMIT match_count;
$$;
```

### **TASK 3.3: Test Search Functionality**

**Step 3.3.1: Create Search Test Script**
Create `backend/scripts/test_search.py`:
```python
#!/usr/bin/env python3
"""Test semantic search functionality"""

import requests
import json

def test_search():
    base_url = "http://localhost:8000"
    
    # Test queries
    test_queries = [
        "red chair",
        "wooden table", 
        "modern lamp",
        "blue sofa",
        "outdoor furniture"
    ]
    
    print("Testing search functionality...\n")
    
    for query in test_queries:
        print(f"Searching for: '{query}'")
        
        response = requests.get(f"{base_url}/api/items", params={"query": query})
        
        if response.status_code == 200:
            data = response.json()
            print(f"  Found {len(data['items'])} items")
            
            # Show top 3 results
            for i, item in enumerate(data['items'][:3]):
                similarity = item.get('similarity_score', 0)
                print(f"    {i+1}. {item['title']} by {item['vendor']} (similarity: {similarity:.3f})")
        else:
            print(f"  Error: {response.status_code}")
        
        print()

if __name__ == "__main__":
    test_search()
```

**Success Criteria Week 5-6:**
- [ ] Homepage displays item grid with images
- [ ] Search returns relevant results using vector similarity
- [ ] Grid/list view toggle works
- [ ] Sorting by date/title/vendor works
- [ ] Loading states and error handling implemented
- [ ] Search response time <2 seconds

---

## Week 7-8: Project Management & Moodboards

### **TASK 4.1: Build Project Management**

**Step 4.1.1: Create Projects API Endpoints**
Add to `backend/main.py`:
```python
@app.get("/api/projects")
async def get_projects(user_id: Optional[str] = None):
    """Get all projects for a user"""
    try:
        query = supabase.table('projects').select('*')
        if user_id:
            query = query.eq('owner_id', user_id)
        
        result = query.order('created_at', desc=True).execute()
        
        return {
            "projects": result.data or [],
            "total": len(result.data or [])
        }
    except Exception as e:
        logger.error(f"Projects fetch failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch projects")

@app.post("/api/projects")
async def create_project(project_data: dict):
    """Create a new project"""
    try:
        required_fields = ['name']
        for field in required_fields:
            if field not in project_data:
                raise HTTPException(status_code=400, detail=f"Missing field: {field}")
        
        # For now, use a dummy user_id - will be replaced with real auth
        project_data['owner_id'] = project_data.get('owner_id', 'demo-user')
        
        result = supabase.table('projects').insert(project_data).execute()
        
        if result.data:
            return {
                "success": True,
                "project": result.data[0]
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to create project")
            
    except Exception as e:
        logger.error(f"Project creation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/projects/{project_id}/items/{item_id}")
async def add_item_to_project(project_id: int, item_id: int):
    """Add an item to a project"""
    try:
        # Check if relationship already exists
        existing = supabase.table('project_items').select('*').eq(
            'project_id', project_id
        ).eq('item_id', item_id).execute()
        
        if existing.data:
            return {"success": True, "message": "Item already in project"}
        
        # Add relationship
        result = supabase.table('project_items').insert({
            'project_id': project_id,
            'item_id': item_id
        }).execute()
        
        if result.data:
            return {"success": True, "message": "Item added to project"}
        else:
            raise HTTPException(status_code=500, detail="Failed to add item to project")
            
    except Exception as e:
        logger.error(f"Add item to project failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/projects/{project_id}/items")
async def get_project_items(project_id: int):
    """Get all items in a project"""
    try:
        # Join project_items with items table
        result = supabase.table('project_items').select(
            '*, items(*)'
        ).eq('project_id', project_id).execute()
        
        items = [relation['items'] for relation in result.data if relation['items']]
        
        return {
            "items": items,
            "total": len(items)
        }
        
    except Exception as e:
        logger.error(f"Project items fetch failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch project items")
```

**Step 4.1.2: Create Project Management UI**
Create `frontend/app/projects/page.tsx`:
```typescript
'use client';

import { useState, useEffect } from 'react';
import { Plus, FolderOpen, Calendar, Grid } from 'lucide-react';
import Link from 'next/link';

interface Project {
  id: number;
  name: string;
  description: string;
  created_at: string;
  item_count?: number;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error('Failed to fetch projects');
      
      const data = await response.json();
      
      // Get item counts for each project
      const projectsWithCounts = await Promise.all(
        data.projects.map(async (project: Project) => {
          try {
            const itemsResponse = await fetch(`/api/projects/${project.id}/items`);
            const itemsData = await itemsResponse.json();
            return { ...project, item_count: itemsData.total || 0 };
          } catch {
            return { ...project, item_count: 0 };
          }
        })
      );
      
      setProjects(projectsWithCounts);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newProject.name.trim()) return;
    
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject)
      });
      
      if (!response.ok) throw new Error('Failed to create project');
      
      setNewProject({ name: '', description: '' });
      setShowCreateForm(false);
      fetchProjects();
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-300 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-300 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
              <p className="text-gray-600 mt-1">Organize your items into collections</p>
            </div>
            
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus size={20} />
              New Project
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Create Project Form */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <form onSubmit={createProject} className="space-y-4">
              <h2 className="text-xl font-semibold">Create New Project</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Living Room Redesign"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Optional description..."
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Create Project
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen size={64} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Projects Yet</h3>
            <p className="text-gray-600 mb-6">Create your first project to start organizing items</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
            >
              Create First Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <FolderOpen size={32} className="text-blue-600" />
                  <span className="text-sm text-gray-500 flex items-center gap-1">
                    <Grid size={16} />
                    {project.item_count || 0}
                  </span>
                </div>
                
                <h3 className="font-semibold text-gray-900 mb-2">{project.name}</h3>
                
                {project.description && (
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {project.description}
                  </p>
                )}
                
                <div className="flex items-center text-xs text-gray-500">
                  <Calendar size={14} className="mr-1" />
                  {new Date(project.created_at).toLocaleDateString()}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
```

### **TASK 4.2: Build Moodboard Interface**
Create `frontend/app/projects/[id]/page.tsx`:
```typescript
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Download, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

interface Item {
  id: number;
  img_url: string;
  title: string;
  vendor: string;
  price: number;
  currency: string;
}

interface Project {
  id: number;
  name: string;
  description: string;
}

export default function ProjectPage() {
  const params = useParams();
  const projectId = params.id as string;
  
  const [project, setProject] = useState<Project | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchProjectItems();
    }
  }, [projectId]);

  const fetchProject = async () => {
    try {
      // For now, we'll need to get project from projects list
      const response = await fetch('/api/projects');
      const data = await response.json();
      const currentProject = data.projects.find((p: Project) => p.id === parseInt(projectId));
      setProject(currentProject);
    } catch (error) {
      console.error('Failed to fetch project:', error);
    }
  };

  const fetchProjectItems = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/items`);
      if (!response.ok) throw new Error('Failed to fetch items');
      
      const data = await response.json();
      setItems(data.items || []);
    } catch (error) {
      console.error('Failed to fetch project items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);

    setItems(newItems);
  };

  const exportToPDF = async () => {
    setExporting(true);
    
    try {
      // Import jsPDF dynamically to avoid SSR issues
      const { jsPDF } = await import('jspdf');
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      pdf.setFontSize(20);
      pdf.text(project?.name || 'Moodboard', 20, 20);
      
      // Add items to PDF (simplified version)
      let x = 20;
      let y = 40;
      const itemWidth = 60;
      const itemHeight = 60;
      const spacing = 10;

      for (let i = 0; i < Math.min(items.length, 8); i++) {
        const item = items[i];
        
        // Add item title
        pdf.setFontSize(8);
        pdf.text(item.title.substring(0, 30), x, y - 5);
        
        // For now, just add a placeholder rectangle
        // In a real implementation, you'd fetch and embed the actual images
        pdf.rect(x, y, itemWidth, itemHeight);
        
        x += itemWidth + spacing;
        if (x > 200) {
          x = 20;
          y += itemHeight + spacing + 10;
        }
      }

      pdf.save(`${project?.name || 'moodboard'}.pdf`);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-300 rounded w-1/3"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="aspect-square bg-gray-300 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/projects" className="text-gray-500 hover:text-gray-700">
                <ArrowLeft size={24} />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {project?.name || 'Project'}
                </h1>
                <p className="text-gray-600">{items.length} items</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={exportToPDF}
                disabled={exporting || items.length === 0}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-green-300 flex items-center gap-2"
              >
                <Download size={20} />
                {exporting ? 'Exporting...' : 'Export PDF'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Items in This Project</h3>
            <p className="text-gray-600 mb-6">Go back to your collection and add items to this project</p>
            <Link
              href="/"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 inline-block"
            >
              Browse Items
            </Link>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="moodboard">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
                >
                  {items.map((item, index) => (
                    <Draggable key={item.id} draggableId={item.id.toString()} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`bg-white rounded-lg shadow-md overflow-hidden ${
                            snapshot.isDragging ? 'shadow-xl' : ''
                          }`}
                        >
                          <div className="aspect-square relative">
                            <Image
                              src={item.img_url}
                              alt={item.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="p-3">
                            <h3 className="font-medium text-sm text-gray-900 mb-1 line-clamp-2">
                              {item.title}
                            </h3>
                            <p className="text-xs text-gray-600">{item.vendor}</p>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </main>
    </div>
  );
}
```

**Step 4.2.3: Add Required Dependencies**
```bash
cd frontend
npm install @hello-pangea/dnd jspdf
```

**Step 4.2.4: Update Item Grid to Support Project Assignment**
Update `frontend/components/ItemGrid.tsx` to add "Add to Project" functionality:

```typescript
// Add this to the existing ItemGrid component, in the item card rendering section:

<div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
  <button
    onClick={() => setSelectedItem(item)}
    className="bg-white rounded-full p-2 shadow-md hover:bg-gray-50"
    title="Add to project"
  >
    <Plus size={16} className="text-gray-600" />
  </button>
</div>

// Also add modal for project selection (add to component state and JSX)
```

**Success Criteria Week 7-8:**
- [ ] Project creation and management works
- [ ] Items can be added to projects
- [ ] Moodboard displays items in a grid
- [ ] Drag-and-drop reordering works
- [ ] PDF export generates and downloads
- [ ] Navigation between projects and items works
- [ ] Performance acceptable with 20+ items in moodboard

---

# PHASE 3: AUTHENTICATION & POLISH (Weeks 9-12)

## Week 9-10: Authentication Implementation

### **TASK 5.1: Implement Supabase Auth**

**Step 5.1.1: Install Auth Dependencies**
```bash
cd frontend
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
```

**Step 5.1.2: Create Supabase Client**
Create `frontend/lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**Step 5.1.3: Create Auth Pages**
Create `frontend/app/auth/login/page.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        router.push('/');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to Rolodex
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link href="/auth/register" className="font-medium text-blue-600 hover:text-blue-500">
              create a new account
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### **TASK 5.2: Protect Routes with Authentication**

**Step 5.2.1: Create Auth Guard Component**
Create `frontend/components/AuthGuard.tsx`:
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Session error:', error);
      }
      setUser(session?.user ?? null);
      setLoading(false);

      if (!session?.user) {
        router.push('/auth/login');
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        
        if (event === 'SIGNED_OUT' || !session?.user) {
          router.push('/auth/login');
        }
      }
    );

    return () => subscription?.unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return <>{children}</>;
}
```

**Step 5.2.2: Update Backend for JWT Validation**
Update `backend/main.py` to validate JWT tokens:
```python
from supabase import create_client, Client
import jwt
from functools import wraps

# JWT validation decorator
def require_auth(f):
    @wraps(f)
    async def decorated_function(*args, **kwargs):
        token = None
        
        # Get token from Authorization header
        auth_header = request.headers.get('Authorization')
        if auth_header:
            try:
                token = auth_header.split(' ')[1]  # Remove 'Bearer ' prefix
            except IndexError:
                raise HTTPException(status_code=401, detail="Invalid token format")
        
        if not token:
            raise HTTPException(status_code=401, detail="Token is missing")
        
        try:
            # Verify JWT with Supabase
            jwt_secret = os.getenv('SUPABASE_JWT_SECRET')
            payload = jwt.decode(token, jwt_secret, algorithms=['HS256'])
            
            # Add user info to request context
            request.state.user = payload
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token has expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        return await f(*args, **kwargs)
    
    return decorated_function

# Update endpoints to use authentication
@app.get("/api/items")
@require_auth
async def get_items(request: Request, query: Optional[str] = None):
    user_id = request.state.user['sub']
    # Add user_id filtering to all queries
    # ... existing code with user filtering
```

### **TASK 5.3: Write Comprehensive Tests**

**Step 5.3.1: Create End-to-End Test Suite**
Create `frontend/tests/e2e/auth-flow.spec.ts`:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should complete signup and login flow', async ({ page }) => {
    // Navigate to registration
    await page.goto('/auth/register');
    
    // Fill registration form
    const testEmail = `test-${Date.now()}@example.com`;
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    // Should redirect to login or directly to app
    await expect(page).toHaveURL(/\/(auth\/login|$)/);
    
    // If redirected to login, sign in
    if (page.url().includes('/auth/login')) {
      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[name="password"]', 'TestPassword123!');
      await page.click('button[type="submit"]');
    }
    
    // Should be on the main app
    await expect(page).toHaveURL('/');
    await expect(page.locator('h1')).toContainText('Rolodex');
  });

  test('should protect authenticated routes', async ({ page }) => {
    // Try to access protected route without auth
    await page.goto('/projects');
    
    // Should redirect to login
    await expect(page).toHaveURL('/auth/login');
  });
});
```

**Step 5.3.2: Create Complete User Journey Test**
Create `frontend/tests/e2e/complete-flow.spec.ts`:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Complete User Journey', () => {
  test('should complete capture-to-moodboard workflow', async ({ page, context }) => {
    // Step 1: Login
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');

    // Step 2: Simulate extension capture (open capture page directly)
    const testImageUrl = 'https://example.com/test-image.jpg';
    const captureUrl = `/capture?image=${encodeURIComponent(testImageUrl)}&source=https://example.com&title=Test Product`;
    
    await page.goto(captureUrl);
    await expect(page.locator('h1')).toContainText('Capture Product');
    
    // Step 3: Save item
    await page.click('button:text("Save to Rolodex")');
    await expect(page.locator('.text-green-600')).toContainText('Item Saved Successfully');
    
    // Should redirect to home
    await page.waitForURL('/');
    
    // Step 4: Verify item appears in grid
    await expect(page.locator('[data-testid="item-grid"]').first()).toBeVisible();
    
    // Step 5: Create project
    await page.goto('/projects');
    await page.click('button:text("New Project")');
    await page.fill('input[placeholder*="Living Room"]', 'Test Project');
    await page.click('button:text("Create Project")');
    
    // Step 6: Add item to project
    await page.goto('/');
    await page.hover('[data-testid="item-card"]').first();
    await page.click('[data-testid="add-to-project"]').first();
    await page.click('text="Test Project"');
    
    // Step 7: View moodboard
    await page.goto('/projects');
    await page.click('text="Test Project"');
    
    // Should see item in moodboard
    await expect(page.locator('[data-testid="moodboard-item"]')).toHaveCount(1);
    
    // Step 8: Export PDF
    await page.click('button:text("Export PDF")');
    
    // Wait for download
    const downloadPromise = page.waitForEvent('download');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.pdf');
  });
});
```

**Success Criteria Week 9-10:**
- [ ] User registration and login works
- [ ] JWT authentication protects all API endpoints
- [ ] Auth state persists across browser refresh
- [ ] User data isolation implemented
- [ ] E2E tests cover complete user journey
- [ ] All tests pass consistently
- [ ] Authentication response time <1 second

---

## Week 11-12: UI Polish & Performance

### **TASK 6.1: Implement Design System**

**Step 6.1.1: Install shadcn/ui**
```bash
cd frontend
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input card dialog toast
```

**Step 6.1.2: Create Global Design Tokens**
Create `frontend/styles/design-tokens.css`:
```css
:root {
  /* Colors - Based on FF&E industry standards */
  --color-primary-50: #eff6ff;
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  --color-primary-900: #1e3a8a;
  
  --color-gray-50: #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-500: #6b7280;
  --color-gray-900: #111827;
  
  --color-success-50: #f0fdf4;
  --color-success-500: #22c55e;
  --color-error-50: #fef2f2;
  --color-error-500: #ef4444;
  
  /* Typography */
  --font-heading: 'Geist', system-ui, sans-serif;
  --font-body: 'Geist', system-ui, sans-serif;
  
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;
  
  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  
  /* Animations */
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 400ms;
  
  --ease-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
}
```

**Step 6.1.3: Add Microinteractions**
Create `frontend/components/AnimatedButton.tsx`:
```typescript
'use client';

import { motion } from 'framer-motion';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface AnimatedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const AnimatedButton = forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, children, disabled, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
    
    const variants = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-md hover:shadow-lg',
      secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
      ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:ring-gray-500'
    };
    
    const sizes = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg'
    };
    
    const classes = `${baseClasses} ${variants[variant]} ${sizes[size]}`;
    
    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
        whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
        transition={{ duration: 0.1 }}
        className={classes}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-transparent border-t-current"
          />
        )}
        {children}
      </motion.button>
    );
  }
);

AnimatedButton.displayName = 'AnimatedButton';

export default AnimatedButton;
```

### **TASK 6.2: Implement Performance Optimizations**

**Step 6.2.1: Add Image Optimization**
Create `frontend/components/OptimizedImage.tsx`:
```typescript
'use client';

import Image from 'next/image';
import { useState } from 'react';
import { motion } from 'framer-motion';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  fill?: boolean;
  priority?: boolean;
}

export default function OptimizedImage({ 
  src, 
  alt, 
  className = '',
  fill = false,
  priority = false,
  ...props 
}: OptimizedImageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleLoad = () => {
    setLoading(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  if (error) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
        <div className="text-gray-500 text-center p-4">
          <svg className="w-8 h-8 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
          <p className="text-xs">Image failed to load</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {loading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-6 h-6 border-2 border-gray-400 border-t-gray-600 rounded-full"
          />
        </div>
      )}
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: loading ? 0 : 1 }}
        transition={{ duration: 0.3 }}
      >
        <Image
          src={src}
          alt={alt}
          fill={fill}
          onLoad={handleLoad}
          onError={handleError}
          priority={priority}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover"
          {...props}
        />
      </motion.div>
    </div>
  );
}
```

**Step 6.2.2: Add Caching Strategy**
Create `frontend/lib/cache.ts`:
```typescript
// Simple memory cache for API responses
class Cache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  set(key: string, data: any, ttlSeconds: number = 300) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000
    });
  }

  get(key: string) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear() {
    this.cache.clear();
  }
}

export const cache = new Cache();

// Cached fetch function
export async function cachedFetch(url: string, options?: RequestInit, ttlSeconds: number = 300) {
  const cacheKey = `${url}:${JSON.stringify(options)}`;
  
  // Try cache first
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // Fetch and cache
  const response = await fetch(url, options);
  const data = await response.json();
  
  cache.set(cacheKey, data, ttlSeconds);
  
  return data;
}
```

**Step 6.2.3: Create Performance Monitoring**
Create `frontend/lib/analytics.ts`:
```typescript
// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  
  static getInstance() {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startTimer(name: string) {
    performance.mark(`${name}-start`);
  }

  endTimer(name: string) {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    
    const measure = performance.getEntriesByName(name, 'measure')[0];
    if (measure) {
      console.log(`${name}: ${measure.duration.toFixed(2)}ms`);
      
      // Send to analytics if in production
      if (process.env.NODE_ENV === 'production') {
        this.sendMetric(name, measure.duration);
      }
    }
  }

  private sendMetric(name: string, duration: number) {
    // Implement analytics sending logic
    // Could use Google Analytics, PostHog, etc.
    if (typeof window !== 'undefined') {
      fetch('/api/analytics/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metric: name, duration, timestamp: Date.now() })
      }).catch(() => {}); // Fail silently
    }
  }

  measurePageLoad() {
    if (typeof window !== 'undefined') {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          if (navigation) {
            const pageLoadTime = navigation.loadEventEnd - navigation.fetchStart;
            this.sendMetric('page_load_time', pageLoadTime);
          }
        }, 0);
      });
    }
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();
```

### **TASK 6.3: Final Integration Testing**

**Step 6.3.1: Create Load Testing Script**
Create `scripts/load-test.js`:
```javascript
#!/usr/bin/env node

const http = require('http');
const https = require('https');

class LoadTester {
  constructor(baseUrl, concurrency = 10, totalRequests = 100) {
    this.baseUrl = baseUrl;
    this.concurrency = concurrency;
    this.totalRequests = totalRequests;
    this.results = [];
    this.completed = 0;
  }

  async makeRequest(path) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const client = this.baseUrl.startsWith('https') ? https : http;
      
      const req = client.get(`${this.baseUrl}${path}`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const endTime = Date.now();
          resolve({
            status: res.statusCode,
            duration: endTime - startTime,
            size: data.length
          });
        });
      });

      req.on('error', (err) => {
        resolve({
          status: 0,
          duration: Date.now() - startTime,
          error: err.message
        });
      });

      req.setTimeout(10000, () => {
        req.destroy();
        resolve({
          status: 0,
          duration: Date.now() - startTime,
          error: 'Timeout'
        });
      });
    });
  }

  async runTest() {
    console.log(`Starting load test: ${this.totalRequests} requests with ${this.concurrency} concurrent`);
    console.log(`Target: ${this.baseUrl}`);
    console.log('');

    const endpoints = [
      '/api/items',
      '/api/projects',
      '/'
    ];

    const startTime = Date.now();
    const promises = [];

    for (let i = 0; i < this.totalRequests; i++) {
      const endpoint = endpoints[i % endpoints.length];
      
      if (promises.length >= this.concurrency) {
        const result = await Promise.race(promises);
        this.results.push(result);
        promises.splice(promises.indexOf(result), 1);
      }

      promises.push(this.makeRequest(endpoint));
    }

    // Wait for remaining requests
    while (promises.length > 0) {
      const result = await Promise.race(promises);
      this.results.push(result);
      promises.splice(promises.indexOf(result), 1);
    }

    const endTime = Date.now();
    this.printResults(endTime - startTime);
  }

  printResults(totalTime) {
    const successful = this.results.filter(r => r.status === 200);
    const failed = this.results.filter(r => r.status !== 200);
    
    const durations = successful.map(r => r.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const maxDuration = Math.max(...durations);
    const minDuration = Math.min(...durations);
    
    console.log('Load Test Results:');
    console.log('==================');
    console.log(`Total requests: ${this.results.length}`);
    console.log(`Successful: ${successful.length} (${(successful.length/this.results.length*100).toFixed(1)}%)`);
    console.log(`Failed: ${failed.length}`);
    console.log(`Total time: ${totalTime}ms`);
    console.log(`Requests/second: ${(this.results.length / (totalTime / 1000)).toFixed(2)}`);
    console.log('');
    console.log('Response Times:');
    console.log(`Average: ${avgDuration.toFixed(0)}ms`);
    console.log(`Min: ${minDuration}ms`);
    console.log(`Max: ${maxDuration}ms`);
    
    if (failed.length > 0) {
      console.log('');
      console.log('Failed Requests:');
      failed.forEach(f => console.log(`  Status: ${f.status}, Error: ${f.error || 'Unknown'}`));
    }
  }
}

// Run the test
const baseUrl = process.argv[2] || 'http://localhost:3000';
const concurrency = parseInt(process.argv[3]) || 10;
const totalRequests = parseInt(process.argv[4]) || 100;

const tester = new LoadTester(baseUrl, concurrency, totalRequests);
tester.runTest().catch(console.error);
```

**Step 6.3.2: Run Final Validation Tests**
Create `scripts/validate-deployment.sh`:
```bash
#!/bin/bash

echo "🔍 Running Deployment Validation Tests"
echo "====================================="

# Test 1: Extension simplification
echo "1. Checking extension complexity..."
EXTENSION_LINES=$(wc -l < extension-v3-simplified/background.js | tr -d ' ')
if [ "$EXTENSION_LINES" -lt 50 ]; then
  echo "   ✅ Extension is $EXTENSION_LINES lines (target: <50)"
else
  echo "   ❌ Extension is $EXTENSION_LINES lines (target: <50)"
  exit 1
fi

# Test 2: AI extraction is not mocked
echo "2. Checking AI extraction implementation..."
if grep -q "Sample Product" backend/main.py; then
  echo "   ❌ AI extraction still contains mocked data"
  exit 1
else
  echo "   ✅ AI extraction appears to be implemented"
fi

# Test 3: Frontend build succeeds
echo "3. Testing frontend build..."
cd frontend
if npm run build > /dev/null 2>&1; then
  echo "   ✅ Frontend build successful"
else
  echo "   ❌ Frontend build failed"
  exit 1
fi

# Test 4: Backend starts successfully
echo "4. Testing backend startup..."
cd ../backend
timeout 10s uvicorn main:app --host 0.0.0.0 --port 8001 > /dev/null 2>&1 &
BACKEND_PID=$!
sleep 5

if kill -0 $BACKEND_PID 2>/dev/null; then
  echo "   ✅ Backend starts successfully"
  kill $BACKEND_PID
else
  echo "   ❌ Backend failed to start"
  exit 1
fi

# Test 5: Database connection works
echo "5. Testing database connection..."
cd ..
if python backend/scripts/verify_extraction.py > /dev/null 2>&1; then
  echo "   ✅ Database connection successful"
else
  echo "   ❌ Database connection failed"
  exit 1
fi

# Test 6: Run critical E2E tests
echo "6. Running critical E2E tests..."
cd frontend
if npx playwright test --project=chromium tests/e2e/auth-flow.spec.ts > /dev/null 2>&1; then
  echo "   ✅ E2E tests pass"
else
  echo "   ❌ E2E tests failed"
  exit 1
fi

echo ""
echo "🎉 All validation tests passed!"
echo "   Extension: $EXTENSION_LINES lines"
echo "   AI: Real implementation"
echo "   Frontend: Builds successfully"
echo "   Backend: Starts successfully"
echo "   Database: Connected"
echo "   E2E Tests: Passing"

echo ""
echo "🚀 Deployment is ready for production!"
```

**Success Criteria Week 11-12:**
- [ ] Design system implemented with consistent styling
- [ ] All animations and microinteractions work smoothly
- [ ] Image loading optimized with proper lazy loading
- [ ] Page load times consistently <2 seconds
- [ ] Load testing shows application handles 100 concurrent users
- [ ] All validation tests pass
- [ ] Performance monitoring implemented
- [ ] User experience is polished and intuitive

---

# FINAL VALIDATION CHECKLIST

## Technical Success Metrics

### **Extension Simplification**
- [ ] Chrome extension is <50 lines of JavaScript (target from audit)
- [ ] Extension contains zero authentication logic
- [ ] Extension contains zero API calls
- [ ] Extension opens web app correctly with parameters
- [ ] Right-click capture flow works end-to-end

### **AI Extraction Implementation**
- [ ] `backend/main.py:268-280` no longer returns hardcoded data
- [ ] OpenAI API integration extracts real product data
- [ ] AI extraction accuracy >85% on standard e-commerce products
- [ ] Error handling for failed extractions implemented
- [ ] Fallback mechanisms work when AI fails

### **Core Functionality**
- [ ] Complete capture-to-display workflow functional
- [ ] Item grid displays saved items with images
- [ ] Semantic search returns relevant results using vector similarity
- [ ] Project creation and management works
- [ ] Items can be added to projects
- [ ] Moodboard displays and allows drag-and-drop
- [ ] PDF export generates and downloads properly

### **Performance Targets**
- [ ] Page load times consistently <2 seconds
- [ ] Search response time <2 seconds
- [ ] AI extraction completes in <10 seconds
- [ ] Application handles 50+ concurrent users
- [ ] Image loading optimized with proper caching

### **Database Utilization**
- [ ] All schema fields are populated from AI extraction
- [ ] Vector embeddings generated and stored
- [ ] Semantic search uses vector similarity
- [ ] User data isolation implemented
- [ ] Project-item relationships function correctly

### **Authentication & Security**
- [ ] User registration and login works
- [ ] JWT token validation protects all API endpoints
- [ ] User sessions persist across browser refresh
- [ ] Data isolation between users implemented
- [ ] No security vulnerabilities in extension or API

### **Testing Coverage**
- [ ] End-to-end tests cover complete user journey
- [ ] Unit tests for critical business logic
- [ ] Load testing validates performance claims
- [ ] All tests pass consistently in CI/CD pipeline
- [ ] Manual testing checklist completed

---

# DEPLOYMENT READINESS

## Production Deployment Steps

### **Infrastructure Setup**
1. Deploy backend to production server (Railway, Fly.io, or similar)
2. Deploy frontend to Vercel or Netlify
3. Configure production database with proper connection pooling
4. Set up Supabase Storage bucket for production images
5. Configure environment variables in production

### **Extension Publishing**
1. Package simplified extension for Chrome Web Store
2. Submit for review with proper privacy policy
3. Test extension in production environment
4. Monitor extension usage and error rates

### **Monitoring & Analytics**
1. Set up application monitoring (Sentry, LogRocket)
2. Configure performance monitoring
3. Implement user analytics (PostHog, Mixpanel)
4. Set up error alerting and logging

### **Post-Launch Tasks**
1. Monitor AI extraction accuracy and costs
2. Gather user feedback and identify improvements
3. Optimize performance based on real usage patterns
4. Plan next feature iteration based on user needs

---

This comprehensive action plan transforms the high-level audit findings into specific, executable instructions. Each task includes exact code examples, file paths, success criteria, and validation steps. A developer can follow this plan step-by-step to implement all critical findings from the technical audit and deliver a fully functional Rolodex application.