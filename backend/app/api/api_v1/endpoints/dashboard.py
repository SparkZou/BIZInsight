from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.db.session import get_db
from app.models.company import Company
from app.api import deps
from datetime import date

router = APIRouter()

@router.get("/dashboard")
def get_dashboard_data(
    db: Session = Depends(get_db),
    # current_user = Depends(deps.get_current_user) # Uncomment to enforce auth
):
    """
    Get dashboard statistics:
    - Total companies
    - Companies by type
    - Registrations per year
    - Recent registrations
    """
    
    # 1. Total Companies
    total_companies = db.query(func.count(Company.NZBN)).scalar()

    # 2. Companies by Entity Type (Top 5)
    type_rows = (
        db.query(Company.ENTITY_TYPE.label("name"), func.count(Company.NZBN).label("value"))
        .group_by(Company.ENTITY_TYPE)
        .order_by(desc("value"))
        .limit(5)
        .all()
    )
    companies_by_type = [{"name": row.name, "value": row.value} for row in type_rows]

    # 3. Registrations per Year (Last 10 years)
    current_year = date.today().year
    year_rows = (
        db.query(func.year(Company.REGISTRATION_DATE).label("year"), func.count(Company.NZBN).label("count"))
        .filter(Company.REGISTRATION_DATE.isnot(None))
        .filter(func.year(Company.REGISTRATION_DATE) >= current_year - 10)
        .group_by(func.year(Company.REGISTRATION_DATE))
        .order_by("year")
        .all()
    )
    registrations_per_year = [{"year": row.year, "count": row.count} for row in year_rows]

    # 4. Recent Registrations
    recent_rows = (
        db.query(Company)
        .order_by(desc(Company.REGISTRATION_DATE))
        .limit(10)
        .all()
    )
    recent_registrations = [
        {
            "NZBN": row.NZBN,
            "ENTITY_NAME": row.ENTITY_NAME,
            "REGISTRATION_DATE": row.REGISTRATION_DATE,
            "ENTITY_STATUS": row.ENTITY_STATUS
        }
        for row in recent_rows
    ]

    return {
        "totalCompanies": total_companies,
        "companiesByType": companies_by_type,
        "registrationsPerYear": registrations_per_year,
        "recentRegistrations": recent_registrations
    }
