from datetime import date

from fastapi import APIRouter
from sqlalchemy import desc, extract, func

from app.db.session import SessionLocal
from app.models.company import Company
from app.services.cache import ttl_cache

router = APIRouter()


@ttl_cache(600)
def dashboard_data() -> dict:
    """
    Dashboard statistics: total companies, companies by type, registrations per year and the most
    recent registrations. Several scans of a 1.7M-row table, so the result is cached.
    """
    with SessionLocal() as db:
        total_companies = db.query(func.count(Company.NZBN)).scalar()

        type_rows = (
            db.query(Company.ENTITY_TYPE.label("name"), func.count(Company.NZBN).label("value"))
            .group_by(Company.ENTITY_TYPE)
            .order_by(desc("value"))
            .limit(5)
            .all()
        )

        current_year = date.today().year
        registration_year = extract("year", Company.REGISTRATION_DATE)
        year_rows = (
            db.query(registration_year.label("year"), func.count(Company.NZBN).label("count"))
            .filter(Company.REGISTRATION_DATE.isnot(None))
            .filter(registration_year >= current_year - 10)
            .group_by(registration_year)
            .order_by("year")
            .all()
        )

        recent_rows = (
            db.query(Company)
            .filter(Company.REGISTRATION_DATE.isnot(None))
            .order_by(desc(Company.REGISTRATION_DATE), Company.NZBN)
            .limit(10)
            .all()
        )
        recent_registrations = [
            {
                "NZBN": row.NZBN,
                "ENTITY_NAME": row.ENTITY_NAME,
                "REGISTRATION_DATE": row.REGISTRATION_DATE.isoformat() if row.REGISTRATION_DATE else None,
                "ENTITY_STATUS": row.ENTITY_STATUS,
            }
            for row in recent_rows
        ]

    return {
        "totalCompanies": total_companies,
        "companiesByType": [{"name": row.name, "value": row.value} for row in type_rows],
        # PostgreSQL's EXTRACT returns a numeric; the chart expects whole years.
        "registrationsPerYear": [{"year": int(row.year), "count": row.count} for row in year_rows],
        "recentRegistrations": recent_registrations,
    }


@router.get("/dashboard")
def get_dashboard_data():
    return dashboard_data()
