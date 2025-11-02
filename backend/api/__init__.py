"""API routers for the Rolodex backend."""

from fastapi import APIRouter

from . import auth, extension, health, items, projects


api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(items.router)
api_router.include_router(projects.router)
api_router.include_router(extension.router)

__all__ = ["api_router"]
