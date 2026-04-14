from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pymongo.errors import PyMongoError

from app.core.config import get_settings
from app.core.database import mongo_manager
from app.routers.calculations import router as calculations_router
from app.routers.auth import router as auth_router
from app.routers.charts import router as charts_router
from app.routers.dashboard import router as dashboard_router
from app.routers.hostels import router as hostels_router
from app.routers.reports import router as reports_router
from app.routers.reuse import router as reuse_router

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    await mongo_manager.connect()
    yield
    await mongo_manager.disconnect()


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(PyMongoError)
async def pymongo_exception_handler(_, exc: PyMongoError):
    return JSONResponse(
        status_code=503,
        content={
            "detail": "Database operation failed. Verify MongoDB connectivity and MONGODB_URI.",
            "error": str(exc),
        },
    )


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name}


api = settings.api_prefix
app.include_router(hostels_router, prefix=api)
app.include_router(auth_router, prefix=api)
app.include_router(calculations_router, prefix=api)
app.include_router(dashboard_router, prefix=api)
app.include_router(charts_router, prefix=api)
app.include_router(reuse_router, prefix=api)
app.include_router(reports_router, prefix=api)
