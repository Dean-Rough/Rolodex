"""FastAPI application entrypoint for the Rolodex backend."""

from __future__ import annotations

import json
import logging
import time
import uuid
from typing import Any

logger = logging.getLogger("rolodex")

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.api import api_router
from backend.core.bootstrap import register_startup
from backend.core.config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(title="Rolodex Backend")

    origins = settings.allow_origins()
    if origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    @app.middleware("http")
    async def log_requests(request: Request, call_next):  # noqa: D401
        req_id = request.headers.get("X-Request-Id") or str(uuid.uuid4())
        start = time.time()
        response = await call_next(request)
        duration_ms = int((time.time() - start) * 1000)
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
            logger.info(json.dumps(log))
        except Exception:  # noqa: BLE001
            pass
        return response

    @app.middleware("http")
    async def security_headers(request: Request, call_next):  # noqa: D401
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        return response

    @app.exception_handler(RequestValidationError)
    def validation_exception_handler(request: Request, exc: RequestValidationError):  # noqa: D401
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "validation_error",
                    "message": "Invalid request",
                    "details": exc.errors(),
                }
            },
        )

    @app.exception_handler(HTTPException)
    def http_exception_handler(request: Request, exc: HTTPException):  # noqa: D401
        message: Any = exc.detail if isinstance(exc.detail, str) else "Request failed"
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": {"code": "http_error", "message": message}},
        )

    @app.exception_handler(Exception)
    def unhandled_exception_handler(request: Request, exc: Exception):  # noqa: D401
        return JSONResponse(
            status_code=500,
            content={"error": {"code": "server_error", "message": "Internal server error"}},
        )

    register_startup(app)

    app.include_router(api_router)

    return app


app = create_app()


__all__ = ["app", "create_app"]
