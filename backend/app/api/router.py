from fastapi import APIRouter

from app.features.health.router import router as health_router
from app.features.samples.router import router as samples_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(samples_router)
