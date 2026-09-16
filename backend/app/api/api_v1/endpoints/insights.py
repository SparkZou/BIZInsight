"""
Aggregates for the public overview, map and job-seeker pages, read from the site_stats table that
app/services/site_stats.py fills after each bulk data import.
"""
from fastapi import APIRouter, HTTPException
from sqlalchemy import text

from app.db.session import SessionLocal
from app.services.cache import ttl_cache
from app.services.site_stats import DIVISIONS, HEALTH_FACTORS, REGIONS

router = APIRouter()


@ttl_cache(300)
def all_stats() -> dict:
    with SessionLocal() as db:
        try:
            rows = db.execute(text("SELECT key, value, computed_at FROM site_stats")).all()
        except Exception:
            rows = []
    if not rows:
        return {}
    stats = {key: value for key, value, _ in rows}
    stats["computed_at"] = max(computed for _, _, computed in rows).isoformat()
    stats["division_names"] = DIVISIONS
    stats["region_names"] = REGIONS
    stats["health_factors"] = HEALTH_FACTORS
    return stats


@router.get("")
def get_insights():
    stats = all_stats()
    if not stats:
        raise HTTPException(status_code=503, detail="Statistics are being prepared; try again in a few minutes.")
    return stats
