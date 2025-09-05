"""
main.py – FastAPI entrypoint for Rolodex backend

- Connects to Supabase Postgres using SQLAlchemy
- Provides a health check endpoint at '/'
- Loads DB connection string from environment variables
"""

import os
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from dotenv import load_dotenv
from pydantic import BaseModel, HttpUrl, Field
import jwt
import uuid
import asyncio
from storage import storage_service
try:
    from services.ai_extraction import get_extraction_service, AIExtractionError
except ImportError:
    # If AI extraction service is not available, provide fallback
    def get_extraction_service():
        return None
    class AIExtractionError(Exception):
        pass

# Load environment variables from .env
load_dotenv()

"""Environment and database configuration"""
# Get database connection string with fallbacks
DATABASE_URL = os.getenv("SUPABASE_DB_URL") or os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is required (set SUPABASE_DB_URL or DATABASE_URL)")

# Create SQLAlchemy engine with safer defaults and tuned pool
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=1800,
)

app = FastAPI(title="Rolodex Backend")

# CORS configuration for web app and extension
try:
    from fastapi.middleware.cors import CORSMiddleware

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "https://app.rolodex.app",
            "https://staging.rolodex.app",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
except Exception:
    # CORS is optional; if import fails, continue
    pass


# Simple request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    import time, uuid, json

    req_id = request.headers.get("X-Request-Id") or str(uuid.uuid4())
    start = time.time()
    response = await call_next(request)
    duration_ms = int((time.time() - start) * 1000)
    # Add request id to response
    response.headers["X-Request-Id"] = req_id
    try:
        log = {
            "level": "info",
            "msg": "request",
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "duration_ms": duration_ms,
            "request_id": req_id,
        }
        print(json.dumps(log))
    except Exception:
        pass
    return response


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    return response

@app.get("/")
def health_check():
    """Health check endpoint. Returns DB status."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ok", "db": "connected"}
    except SQLAlchemyError as e:
        return {"status": "error", "db": "unavailable"}


@app.get("/health")
def health():
    """Simple health endpoint used by extension env detection."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ok", "db": "connected"}
    except SQLAlchemyError:
        return {"status": "error", "db": "unavailable"}


class ErrorResponse(BaseModel):
    error: dict


@app.exception_handler(RequestValidationError)
def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"error": {"code": "validation_error", "message": "Invalid request", "details": exc.errors()}},
    )


@app.exception_handler(HTTPException)
def http_exception_handler(request: Request, exc: HTTPException):
    message = exc.detail if isinstance(exc.detail, str) else "Request failed"
    return JSONResponse(status_code=exc.status_code, content={"error": {"code": "http_error", "message": message}})


@app.exception_handler(Exception)
def unhandled_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"error": {"code": "server_error", "message": "Internal server error"}})


class AuthContext(BaseModel):
    user_id: str


def get_auth(request: Request) -> AuthContext:
    """Minimal auth guard: require Bearer token and derive a pseudo user id.
    Replace with real JWT validation (Supabase/Clerk) in production.
    """
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = auth.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Empty token")
    # Try to verify JWT with provided secret (development)
    secret = os.getenv("SUPABASE_JWT_SECRET") or os.getenv("JWT_SECRET")
    if secret:
        try:
            payload = jwt.decode(token, secret, algorithms=["HS256", "HS512"], options={"verify_aud": False})
            uid = str(payload.get("sub") or payload.get("user_id") or payload.get("id") or "")
            if not uid:
                raise ValueError("missing subject")
            # Accept UUID-like user id or fallback to deterministic hash-like tail
            if len(uid) == 36 and uid.count("-") == 4:
                return AuthContext(user_id=uid)
            tail = (uid[:12] or "anonymous000000").ljust(12, "0")
            return AuthContext(user_id=f"00000000-0000-0000-0000-{tail}")
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid token")
    # Fallback dev mode: derive a stable pseudo user id from token prefix
    pseudo = (token[:12] or "anonymous000000").ljust(12, "0")
    return AuthContext(user_id=f"00000000-0000-0000-0000-{pseudo}")


# Simple in-memory rate limit (per IP per route)
from collections import defaultdict, deque
import time as _time

_RATE_BUCKETS: dict[str, deque] = defaultdict(deque)
_RATE_LIMIT = 60  # events
_RATE_WINDOW = 60  # seconds


def rate_limit(request: Request):
    client = request.client.host if request.client else "unknown"
    key = f"{client}:{request.url.path}"
    now = _time.time()
    bucket = _RATE_BUCKETS[key]
    # purge old
    while bucket and now - bucket[0] > _RATE_WINDOW:
        bucket.popleft()
    if len(bucket) >= _RATE_LIMIT:
        raise HTTPException(status_code=429, detail="Too Many Requests")
    bucket.append(now)

class ItemCreate(BaseModel):
    img_url: HttpUrl
    title: str | None = None
    vendor: str | None = None
    price: float | None = None
    currency: str | None = None
    description: str | None = None
    colour_hex: str | None = None
    category: str | None = None
    material: str | None = None
    src_url: str | None = None

class ItemOut(BaseModel):
    id: str
    img_url: HttpUrl
    title: str | None = None
    vendor: str | None = None
    price: float | None = None
    currency: str | None = None
    description: str | None = None
    colour_hex: str | None = None
    category: str | None = None
    material: str | None = None
    created_at: str | None = None


@app.post("/api/items", status_code=201)
async def create_item(item: ItemCreate, auth: AuthContext = Depends(get_auth), _: None = Depends(rate_limit)):
    """Create a new item with image storage and embedding generation."""
    try:
        item_id = str(uuid.uuid4())
        
        # Store original image URL for now
        stored_img_url = str(item.img_url)
        
        # Try to store image in Supabase Storage
        try:
            stored_img_url = await storage_service.store_image(str(item.img_url), auth.user_id)
        except Exception as e:
            # Log error but continue with original URL
            print(f"Warning: Failed to store image in Supabase Storage: {e}")
        
        # Insert item into database
        with engine.begin() as conn:
            conn.execute(text("""
                INSERT INTO items (
                    id, owner_id, img_url, title, vendor, price, currency,
                    description, colour_hex, category, material, src_url, created_at
                )
                VALUES (
                    :id, :owner_id, :img_url, :title, :vendor, :price, :currency,
                    :description, :colour_hex, :category, :material, :src_url, now()
                )
            """), {
                "id": item_id,
                "owner_id": auth.user_id,
                "img_url": stored_img_url,
                "title": item.title,
                "vendor": item.vendor,
                "price": item.price,
                "currency": item.currency,
                "description": item.description,
                "colour_hex": item.colour_hex,
                "category": item.category,
                "material": item.material,
                "src_url": item.src_url
            })
        
        # Generate and store embedding asynchronously
        asyncio.create_task(generate_item_embedding(item_id, item))
        
        return {
            "id": item_id,
            "img_url": stored_img_url,
            "title": item.title,
            "vendor": item.vendor,
            "price": item.price,
            "currency": item.currency,
            "description": item.description,
            "colour_hex": item.colour_hex,
            "category": item.category,
            "material": item.material
        }
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))


async def generate_item_embedding(item_id: str, item_data: ItemCreate):
    """Background task to generate and store embedding for an item"""
    try:
        # Create description for embedding
        item_dict = item_data.dict()
        description = storage_service.create_description_for_embedding(item_dict)
        
        if description:
            # Generate embedding
            embedding = storage_service.generate_embedding(description)
            
            if embedding:
                # Store embedding in database
                storage_service.store_item_embedding(item_id, embedding)
    except Exception as e:
        print(f"Error generating embedding for item {item_id}: {e}")


class ItemsQuery(BaseModel):
    query: str | None = None
    hex: str | None = Field(default=None, min_length=3, max_length=7)
    price_max: float | None = None
    limit: int = Field(default=20, ge=1, le=100)
    cursor: str | None = None


@app.get("/api/items")
async def list_items(
    query: str | None = None, 
    hex: str | None = None, 
    price_max: float | None = None,
    limit: int = 20, 
    cursor: str | None = None, 
    semantic: bool = False,
    auth: AuthContext = Depends(get_auth)
):
    """List items for the authenticated user with optional filters, cursor-based pagination, and semantic search."""
    limit = max(1, min(limit, 100))
    
    # Try semantic search first if requested and query is provided
    if semantic and query:
        try:
            semantic_results = await storage_service.semantic_search(query, auth.user_id, limit)
            if semantic_results:
                # Apply additional filters to semantic results
                filtered_results = []
                for item in semantic_results:
                    # Apply hex filter
                    if hex and item.get("colour_hex") and hex.lower() not in item["colour_hex"].lower():
                        continue
                    # Apply price filter
                    if price_max is not None and item.get("price") and item["price"] > price_max:
                        continue
                    filtered_results.append({
                        "id": item["id"],
                        "img_url": item["img_url"],
                        "title": item.get("title"),
                        "vendor": item.get("vendor"),
                        "price": item.get("price"),
                        "currency": item.get("currency"),
                        "description": item.get("description"),
                        "colour_hex": item.get("colour_hex"),
                        "category": item.get("category"),
                        "material": item.get("material"),
                        "created_at": item["created_at"],
                        "similarity": item.get("similarity")
                    })
                
                return {
                    "items": filtered_results[:limit],
                    "nextCursor": None,  # Semantic search doesn't use cursor pagination
                    "search_type": "semantic"
                }
        except Exception as e:
            print(f"Semantic search failed, falling back to text search: {e}")
    
    # Fallback to traditional text-based search
    params = {"owner_id": auth.user_id, "limit": limit}
    where = ["owner_id = :owner_id"]
    
    if query:
        where.append("(title ILIKE :q OR vendor ILIKE :q OR description ILIKE :q OR category ILIKE :q)")
        params["q"] = f"%{query}%"
    if hex:
        where.append("colour_hex ILIKE :hex")
        params["hex"] = f"%{hex}%"
    if price_max is not None:
        where.append("price <= :price_max")
        params["price_max"] = price_max
    if cursor:
        where.append("created_at < :cursor")
        params["cursor"] = cursor

    sql = f"""
        SELECT id, img_url, title, vendor, price, currency, description,
               colour_hex, category, material, created_at
        FROM items
        WHERE {' AND '.join(where)}
        ORDER BY created_at DESC
        LIMIT :limit
    """
    
    with engine.connect() as conn:
        rows = conn.execute(text(sql), params).mappings().all()
    
    next_cursor = rows[-1]["created_at"].isoformat() if rows else None
    
    return {
        "items": [{
            "id": r["id"],
            "img_url": r["img_url"],
            "title": r.get("title"),
            "vendor": r.get("vendor"),
            "price": r.get("price"),
            "currency": r.get("currency"),
            "description": r.get("description"),
            "colour_hex": r.get("colour_hex"),
            "category": r.get("category"),
            "material": r.get("material"),
            "created_at": r["created_at"].isoformat()
        } for r in rows],
        "nextCursor": next_cursor,
        "search_type": "text"
    }


class ExtractRequest(BaseModel):
    imageUrl: HttpUrl | None = Field(None, description="URL of the product image to analyze")
    sourceUrl: HttpUrl | None = Field(None, description="URL of the source page for context")
    title: str | None = Field(None, description="Page title for additional context")
    image_url: HttpUrl | None = None  # Keep for backward compatibility
    raw_text: str | None = None       # Keep for backward compatibility


@app.post("/api/items/extract")
async def extract_metadata(payload: ExtractRequest, auth: AuthContext = Depends(get_auth), _: None = Depends(rate_limit)):
    """AI-powered product data extraction from images with storage and embedding generation."""
    # Determine image URL (support both new and legacy formats)
    image_url = payload.imageUrl or payload.image_url
    
    if not image_url and not payload.raw_text:
        raise HTTPException(
            status_code=422, 
            detail="Provide imageUrl (or legacy image_url) for image analysis, or raw_text for text analysis"
        )
    
    # For now, we only support image analysis. Text analysis could be added later.
    if not image_url:
        raise HTTPException(
            status_code=422,
            detail="Image URL is required. Text-only extraction not yet implemented."
        )
    
    try:
        # Store image in Supabase Storage first
        stored_img_url = str(image_url)
        try:
            stored_img_url = await storage_service.store_image(str(image_url), auth.user_id)
        except Exception as e:
            print(f"Warning: Failed to store image during extraction: {e}")
        
        # Try AI extraction if service is available
        extraction_service = get_extraction_service()
        if extraction_service:
            try:
                # Extract product data using AI
                product_data = extraction_service.extract_from_image_url(
                    image_url=str(image_url),
                    context_url=str(payload.sourceUrl) if payload.sourceUrl else None,
                    page_title=payload.title
                )
                
                extracted_data = {
                    "title": product_data.title,
                    "vendor": product_data.vendor,
                    "price": product_data.price,
                    "currency": product_data.currency or "USD",
                    "description": product_data.description,
                    "colour_hex": product_data.colour_hex,
                    "category": product_data.category,
                    "material": product_data.material,
                    "dimensions": product_data.dimensions,
                    "features": product_data.features or [],
                    "img_url": stored_img_url,
                    "src_url": str(payload.sourceUrl) if payload.sourceUrl else None
                }
            except AIExtractionError as e:
                raise HTTPException(status_code=422, detail=f"AI extraction failed: {str(e)}")
        else:
            # Fallback to enhanced mock data
            extracted_data = {
                "title": "Modern Furniture Piece",
                "vendor": "Design Studio",
                "price": 1500,
                "currency": "USD",
                "description": "A beautifully crafted modern furniture piece with premium materials and elegant design.",
                "colour_hex": "#8B4513",
                "category": "Furniture",
                "material": "Wood",
                "dimensions": None,
                "features": ["Modern Design", "Premium Materials"],
                "img_url": stored_img_url,
                "src_url": str(payload.sourceUrl) if payload.sourceUrl else None
            }
        
        # Generate embedding for the extracted data
        try:
            description_text = storage_service.create_description_for_embedding(extracted_data)
            if description_text:
                embedding = storage_service.generate_embedding(description_text)
                if embedding:
                    extracted_data["embedding_preview"] = f"Generated {len(embedding)}-dimensional embedding"
        except Exception as e:
            print(f"Warning: Failed to generate embedding during extraction: {e}")
        
        return extracted_data
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Log unexpected errors for debugging
        import json
        error_log = {
            "level": "error",
            "msg": "extraction_error",
            "image_url": str(image_url),
            "error": str(e),
        }
        print(json.dumps(error_log))
        
        raise HTTPException(
            status_code=500,
            detail="Internal error during product extraction. Please try again later."
        )


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)


@app.post("/api/projects", status_code=201)
def create_project(body: ProjectCreate, auth: AuthContext = Depends(get_auth), _: None = Depends(rate_limit)):
    pid = str(uuid.uuid4())
    with engine.begin() as conn:
        conn.execute(text("""
            INSERT INTO projects (id, owner_id, name, created_at)
            VALUES (:id, :owner_id, :name, now())
        """), {"id": pid, "owner_id": auth.user_id, "name": body.name})
    return {"id": pid, "name": body.name}


@app.get("/api/projects/{project_id}")
def get_project(project_id: str, auth: AuthContext = Depends(get_auth)):
    with engine.connect() as conn:
        row = conn.execute(text("""
            SELECT id, name, created_at FROM projects WHERE id = :id AND owner_id = :owner_id
        """), {"id": project_id, "owner_id": auth.user_id}).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"id": row["id"], "name": row["name"], "created_at": row["created_at"].isoformat()}


class ProjectItemLink(BaseModel):
    item_id: str


@app.post("/api/projects/{project_id}/add_item", status_code=204)
def add_item_to_project(project_id: str, body: ProjectItemLink, auth: AuthContext = Depends(get_auth), _: None = Depends(rate_limit)):
    with engine.begin() as conn:
        project = conn.execute(text("SELECT 1 FROM projects WHERE id=:id AND owner_id=:owner_id"), {"id": project_id, "owner_id": auth.user_id}).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        conn.execute(text("""
            INSERT INTO project_items (project_id, item_id)
            VALUES (:project_id, :item_id)
            ON CONFLICT DO NOTHING
        """), {"project_id": project_id, "item_id": body.item_id})
    return JSONResponse(status_code=204, content=None)


@app.delete("/api/projects/{project_id}/remove_item", status_code=204)
def remove_item_from_project(project_id: str, body: ProjectItemLink, auth: AuthContext = Depends(get_auth), _: None = Depends(rate_limit)):
    with engine.begin() as conn:
        project = conn.execute(text("SELECT 1 FROM projects WHERE id=:id AND owner_id=:owner_id"), {"id": project_id, "owner_id": auth.user_id}).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        conn.execute(text("DELETE FROM project_items WHERE project_id=:project_id AND item_id=:item_id"), {"project_id": project_id, "item_id": body.item_id})
    return JSONResponse(status_code=204, content=None)
