"""Who runs the site and which optional features are switched on - read by every page's shell."""
from fastapi import APIRouter

from app.core.config import settings
from app.services import mailer

router = APIRouter()


@router.get("/site")
def site_info():
    return {
        "name": settings.SITE_NAME,
        "url": settings.SITE_URL,
        "operator": {"name": settings.OPERATOR_NAME, "email": settings.OPERATOR_EMAIL, "address": settings.OPERATOR_ADDRESS},
        "features": {"accounts": True, "email": mailer.configured()},
    }
