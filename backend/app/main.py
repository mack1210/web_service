import logging
import re
from collections.abc import Awaitable, Callable
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, Response

from app.api.router import api_router
from app.core.config import settings
from app.core.errors import AppError, FieldIssue
from app.core.logging import configure_logging

configure_logging()
logger = logging.getLogger(__name__)
REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")

app = FastAPI(
    title="Overnight Web Agent Kit API",
    version=settings.version,
    description="A small, typed FastAPI contract for the representative web-frame flow.",
)
app.include_router(api_router)


def _request_id(request: Request) -> str:
    return getattr(request.state, "request_id", "unknown")


@app.middleware("http")
async def attach_request_id(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    supplied_request_id = request.headers.get("X-Request-ID", "")
    request.state.request_id = (
        supplied_request_id
        if REQUEST_ID_PATTERN.fullmatch(supplied_request_id)
        else str(uuid4())
    )
    response = await call_next(request)
    response.headers["X-Request-ID"] = request.state.request_id
    return response


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "code": exc.code,
            "message": exc.message,
            "retryable": exc.retryable,
            "request_id": _request_id(request),
            "fields": [{"field": issue.field, "message": issue.message} for issue in exc.fields],
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    fields = [
        FieldIssue(field=".".join(str(part) for part in error["loc"]), message=error["msg"])
        for error in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content={
            "code": "validation_error",
            "message": "One or more input values are invalid.",
            "retryable": False,
            "request_id": _request_id(request),
            "fields": [{"field": issue.field, "message": issue.message} for issue in fields],
        },
    )


@app.exception_handler(Exception)
async def unexpected_error_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("unhandled_api_error request_id=%s", _request_id(request), exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={
            "code": "internal_error",
            "message": "An unexpected error occurred. Please retry.",
            "retryable": True,
            "request_id": _request_id(request),
            "fields": [],
        },
    )
