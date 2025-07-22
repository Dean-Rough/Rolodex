"""
main.py – FastAPI entrypoint for Rolodex backend

- Connects to Supabase Postgres using SQLAlchemy
- Provides a health check endpoint at '/'
- Loads DB connection string from environment variables
"""

import os
from fastapi import FastAPI, Request, HTTPException
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from dotenv import load_dotenv
from pydantic import BaseModel, HttpUrl
import uuid

# Load environment variables from .env
load_dotenv()

# Get Supabase Postgres connection string
DATABASE_URL = os.getenv("SUPABASE_DB_URL")

# Create SQLAlchemy engine
engine = create_engine(DATABASE_URL)

app = FastAPI(title="Rolodex Backend")

@app.get("/")
def health_check():
    """Health check endpoint. Returns DB status."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ok", "db": "connected"}
    except SQLAlchemyError as e:
        return {"status": "error", "db": str(e)}

class ItemCreate(BaseModel):
    img_url: HttpUrl

@app.post("/api/items")
def create_item(item: ItemCreate, request: Request):
    """Create a new item with the given image URL."""
    try:
        # For now, owner_id is None (auth integration later)
        item_id = str(uuid.uuid4())
        with engine.begin() as conn:
            conn.execute(text("""
                INSERT INTO items (id, img_url, created_at)
                VALUES (:id, :img_url, now())
            """), {"id": item_id, "img_url": item.img_url})
        return {"status": "ok", "id": item_id}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e)) 