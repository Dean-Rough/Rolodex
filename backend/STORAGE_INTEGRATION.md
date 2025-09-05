# Supabase Storage and Vector Embedding Integration

This implementation adds Supabase Storage for images and vector embeddings for semantic search to the Rolodex backend.

## Features

### 🖼️ Image Storage
- Downloads images from external URLs
- Processes and optimizes images (resize, compress, convert to JPEG)
- Stores images in Supabase Storage bucket `product-images`
- Generates public URLs for stored images
- Handles various image formats and sizes

### 🧠 Vector Embeddings
- Generates 1536-dimensional embeddings using OpenAI `text-embedding-3-small`
- Creates comprehensive descriptions from product metadata
- Stores embeddings in PostgreSQL using pgvector
- Enables semantic search with similarity scoring

### 🔍 Semantic Search
- Vector similarity search using cosine distance
- Configurable similarity threshold (default: 0.7)
- Returns results sorted by relevance with similarity scores
- Falls back to traditional text search if embeddings unavailable

## Setup Requirements

### 1. Environment Variables
Add to your `.env` file:
```bash
# Supabase Storage
SUPABASE_PROJECT_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI for embeddings
OPENAI_API_KEY=sk-your-openai-api-key

# Database (if not already set)
DATABASE_URL=your-postgres-connection-string
```

### 2. Supabase Setup
```sql
-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Run the updated schema.sql to create tables and indexes

-- 3. Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true);

-- 4. Set up storage policies (adjust as needed)
CREATE POLICY "Anyone can view images" ON storage.objects
FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can upload images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.uid() IS NOT NULL);
```

### 3. Python Dependencies
```bash
cd backend
pip install supabase openai pillow
```

## API Changes

### POST /api/items
Now accepts full product metadata:
```json
{
  "img_url": "https://example.com/image.jpg",
  "title": "Modern Sofa",
  "vendor": "Design Studio",
  "price": 1299,
  "currency": "USD",
  "description": "Beautiful modern sofa with premium materials",
  "colour_hex": "#2D5A3D",
  "category": "Sofa",
  "material": "Velvet"
}
```

### GET /api/items
New parameters:
- `semantic=true`: Enable semantic search
- Returns `search_type` field indicating "semantic" or "text"
- Semantic results include `similarity` scores

Example:
```
GET /api/items?query=modern+velvet+sofa&semantic=true&limit=10
```

### POST /api/items/extract
Enhanced with storage and embedding generation:
- Automatically stores images in Supabase Storage
- Generates embeddings for extracted product data
- Returns `embedding_preview` field showing embedding status

## Testing

Run the integration test:
```bash
cd backend
python test_storage_integration.py
```

This tests:
- Image download and storage
- Embedding generation
- Database operations
- Semantic search functionality

## Performance Considerations

### Embedding Generation
- Generated asynchronously after item creation
- OpenAI API calls may take 1-3 seconds
- Items are searchable immediately via text search
- Semantic search becomes available once embeddings are generated

### Vector Search Performance
- Uses IVFFlat index for fast approximate similarity search
- Index configured with 100 lists (adjust based on data size)
- Search queries typically complete in < 500ms
- Consider increasing `lists` parameter for larger datasets (>100k items)

### Storage Optimization
- Images resized to max 1200x1200 pixels
- JPEG compression at 85% quality
- Automatic format conversion for optimal storage
- CDN caching through Supabase Storage

## Usage Examples

### Create Item with Embedding
```python
import httpx

# Create item (triggers async embedding generation)
response = httpx.post("http://localhost:8000/api/items", json={
    "img_url": "https://example.com/sofa.jpg",
    "title": "Luxury Velvet Sofa",
    "vendor": "Modern Living",
    "category": "Furniture",
    "material": "Velvet",
    "description": "Premium blue velvet sofa with brass legs"
})
```

### Semantic Search
```python
# Search with semantic understanding
response = httpx.get("http://localhost:8000/api/items", params={
    "query": "comfortable blue seating",
    "semantic": True,
    "limit": 10
})

results = response.json()
for item in results["items"]:
    print(f"{item['title']} - Similarity: {item.get('similarity', 'N/A')}")
```

### Extract and Store Product
```python
# Extract product data and store image
response = httpx.post("http://localhost:8000/api/items/extract", json={
    "imageUrl": "https://furniture-site.com/product-image.jpg",
    "sourceUrl": "https://furniture-site.com/product-page",
    "title": "Product Page - Modern Furniture"
})
```

## Troubleshooting

### Common Issues

1. **Missing pgvector extension**
   ```
   Error: extension "vector" is not available
   ```
   Solution: Enable pgvector in your Supabase project SQL editor

2. **Storage bucket not found**
   ```
   Error: Bucket 'product-images' not found
   ```
   Solution: Create the bucket in Supabase Dashboard or via SQL

3. **OpenAI API rate limits**
   ```
   Error: Rate limit exceeded
   ```
   Solution: Implement retry logic or upgrade OpenAI plan

4. **Large embedding storage**
   ```
   Error: Row size exceeds maximum
   ```
   Solution: Check vector dimension (should be 1536 for text-embedding-3-small)

### Debug Mode
Set environment variable for additional logging:
```bash
export ROLODEX_DEBUG=1
```

## Future Enhancements

- [ ] Batch embedding generation for existing items
- [ ] Hybrid search combining text and semantic results
- [ ] Image-based similarity search using CLIP embeddings
- [ ] Embedding model fine-tuning for furniture domain
- [ ] Real-time embedding updates on item modifications