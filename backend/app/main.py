from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.api_v1.endpoints import admin, admin_companies, dashboard, contact, companies
from app.api.endpoints import stats
from app.services import import_jobs


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Admin imports run in-process, so one that was running when the API stopped has failed.
    import_jobs.mark_interrupted_jobs()
    yield


app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.BACKEND_CORS_ORIGINS.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API v1 routes
app.include_router(dashboard.router, prefix=f"{settings.API_V1_STR}", tags=["dashboard"])
app.include_router(contact.router, prefix=f"{settings.API_V1_STR}", tags=["contact"])
app.include_router(companies.router, prefix=f"{settings.API_V1_STR}/companies", tags=["companies"])
app.include_router(admin.router, prefix=f"{settings.API_V1_STR}/admin", tags=["admin"])
app.include_router(admin_companies.router, prefix=f"{settings.API_V1_STR}/admin/new-companies", tags=["admin"])

# Stats routes
app.include_router(stats.router, prefix="/api/stats", tags=["statistics"])

@app.get("/")
def read_root():
    return {"message": "Welcome to NZCompanies API"}
