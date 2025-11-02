"""Database schema and helpers for Rolodex 4.0."""

from __future__ import annotations

import datetime as dt
import os
from typing import Iterable, List

from sqlalchemy import (
    JSON,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    MetaData,
    String,
    Table,
    Text,
    func,
    insert,
    select,
)
from sqlalchemy.engine import Engine


metadata = MetaData()


items_table = Table(
    "items",
    metadata,
    Column("id", String, primary_key=True),
    Column("owner_id", String, nullable=False, index=True),
    Column("img_url", Text, nullable=False),
    Column("title", Text),
    Column("vendor", Text),
    Column("price", Float),
    Column("currency", String(8)),
    Column("description", Text),
    Column("colour_hex", String(7)),
    Column("category", Text),
    Column("material", Text),
    Column("src_url", Text),
    Column("embedding", JSON),
    Column("image_embedding", JSON),  # CLIP image embedding for visual similarity
    Column("color_palette", JSON),  # Array of 5 dominant colors
    Column("tags", JSON),  # Array of user tags
    Column("style_tags", JSON),  # AI-detected style tags
    Column("notes", Text),  # User notes
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
    Column("updated_at", DateTime(timezone=True), onupdate=func.now()),
)

projects_table = Table(
    "projects",
    metadata,
    Column("id", String, primary_key=True),
    Column("owner_id", String, nullable=False, index=True),
    Column("name", Text, nullable=False),
    Column("budget", Float),  # Project budget
    Column("description", Text),  # Project description
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
    Column("updated_at", DateTime(timezone=True), onupdate=func.now()),
)

saved_searches_table = Table(
    "saved_searches",
    metadata,
    Column("id", String, primary_key=True),
    Column("owner_id", String, nullable=False, index=True),
    Column("name", String(255), nullable=False),
    Column("filters", JSON, nullable=False),  # Stored filter configuration
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
)

project_items_table = Table(
    "project_items",
    metadata,
    Column("project_id", String, ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True),
    Column("item_id", String, ForeignKey("items.id", ondelete="CASCADE"), primary_key=True),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
)

users_table = Table(
    "users",
    metadata,
    Column("id", String, primary_key=True),
    Column("email", String(255), unique=True, nullable=False, index=True),
    Column("password_hash", String(255)),
    Column("full_name", String(255)),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
    Column("updated_at", DateTime(timezone=True), onupdate=func.now()),
)

Index("idx_items_created_at", items_table.c.created_at.desc())
Index("idx_items_owner", items_table.c.owner_id)
Index("idx_items_vendor", items_table.c.vendor)
Index("idx_projects_owner", projects_table.c.owner_id)
Index("idx_saved_searches_owner", saved_searches_table.c.owner_id)


DEMO_ITEMS: List[dict] = [
    {
        "title": "Modular Linen Sofa",
        "vendor": "Atelier 23",
        "price": 4280,
        "currency": "USD",
        "description": "Three-piece modular linen sofa with relaxed silhouette and kiln-dried oak base.",
        "colour_hex": "#E9E4DC",
        "category": "Seating",
        "material": "Linen",
        "img_url": "https://images.unsplash.com/photo-1616628182504-9f3b0663d3d4",  # noqa: E501
    },
    {
        "title": "Sculptural Travertine Coffee Table",
        "vendor": "Studio Roca",
        "price": 2150,
        "currency": "USD",
        "description": "Hand-polished travertine slab with offset plinth base and honed finish.",
        "colour_hex": "#D9CAB3",
        "category": "Tables",
        "material": "Stone",
        "img_url": "https://images.unsplash.com/photo-1582582494700-6a7f1a3fcf52",  # noqa: E501
    },
    {
        "title": "Arched Brass Floor Lamp",
        "vendor": "Lumina",
        "price": 890,
        "currency": "USD",
        "description": "Oversized brass floor lamp with opal glass dome and dim-to-warm LED core.",
        "colour_hex": "#C9A467",
        "category": "Lighting",
        "material": "Brass",
        "img_url": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85",  # noqa: E501
    },
    {
        "title": "Walnut + Bouclé Lounge Chair",
        "vendor": "Formed",
        "price": 1650,
        "currency": "USD",
        "description": "Curved walnut frame with upholstered bouclé cushions and inset leather straps.",
        "colour_hex": "#CDB8A7",
        "category": "Seating",
        "material": "Walnut",
        "img_url": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc",  # noqa: E501
    },
    {
        "title": "Hand-Tufted Graphite Rug",
        "vendor": "Pattern Society",
        "price": 2290,
        "currency": "USD",
        "description": "New Zealand wool rug with tonal graphite gradient and 20mm plush pile.",
        "colour_hex": "#3C3C3E",
        "category": "Rugs",
        "material": "Wool",
        "img_url": "https://images.unsplash.com/photo-1600585154340-0ef3c08ab1b7",  # noqa: E501
    },
]


def ensure_schema(engine: Engine) -> None:
    """Create database tables if they do not already exist."""

    metadata.create_all(engine, checkfirst=True)


def seed_demo_items(engine: Engine, owner_id: str) -> None:
    """Seed demo items for local development when the table is empty."""

    if os.getenv("ROLODEX_SEED_DEMO", "1") not in {"1", "true", "TRUE", "yes"}:
        return

    with engine.begin() as connection:
        existing = connection.execute(select(items_table.c.id).limit(1)).first()
        if existing:
            return

        now = dt.datetime.now(dt.timezone.utc)
        rows: Iterable[dict] = []
        for index, payload in enumerate(DEMO_ITEMS, start=1):
            created_at = now - dt.timedelta(days=index)
            rows.append(
                {
                    "id": f"demo-item-{index}",
                    "owner_id": owner_id,
                    "img_url": payload["img_url"],
                    "title": payload["title"],
                    "vendor": payload["vendor"],
                    "price": payload["price"],
                    "currency": payload["currency"],
                    "description": payload["description"],
                    "colour_hex": payload["colour_hex"],
                    "category": payload["category"],
                    "material": payload["material"],
                    "src_url": None,
                    "embedding": None,
                    "created_at": created_at,
                }
            )

        connection.execute(insert(items_table), list(rows))


def seed_demo_project(engine: Engine, owner_id: str) -> None:
    """Seed a demo project linked to a subset of demo items."""

    if os.getenv("ROLODEX_SEED_DEMO", "1") not in {"1", "true", "TRUE", "yes"}:
        return

    with engine.begin() as connection:
        existing = connection.execute(select(projects_table.c.id).limit(1)).first()
        if existing:
            return

        project_id = "demo-project-1"
        connection.execute(
            insert(projects_table),
            [
                {
                    "id": project_id,
                    "owner_id": owner_id,
                    "name": "Signature Living Room",
                    "created_at": dt.datetime.now(dt.timezone.utc),
                }
            ],
        )

        item_ids = connection.execute(select(items_table.c.id).limit(3)).scalars().all()
        if not item_ids:
            return

        rows = [
            {
                "project_id": project_id,
                "item_id": item_id,
                "created_at": dt.datetime.now(dt.timezone.utc) - dt.timedelta(minutes=index * 5),
            }
            for index, item_id in enumerate(item_ids, start=1)
        ]
        connection.execute(insert(project_items_table), rows)
