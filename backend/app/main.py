from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.api_v1.endpoints import dashboard, contact, companies

app = FastAPI(title=settings.PROJECT_NAME)

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard.router, prefix=f"{settings.API_V1_STR}", tags=["dashboard"])
app.include_router(contact.router, prefix=f"{settings.API_V1_STR}", tags=["contact"])
app.include_router(companies.router, prefix=f"{settings.API_V1_STR}/companies", tags=["companies"])

@app.get("/")
def read_root():
    return {"message": "Welcome to NZCompanies API"}
