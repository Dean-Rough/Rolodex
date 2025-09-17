"""API routers for the Rolodex backend."""

from fastapi import APIRouter

from . import health, items, projects


api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(items.router)
api_router.include_router(projects.router)

__all__ = ["api_router"]
