"""
What the site is built on: which Companies Office snapshot is loaded and the headline counts.
Every public page shows the snapshot date, so this is read on almost every request and cached.
"""
from fastapi import APIRouter
from sqlalchemy import text

from app.db.session import SessionLocal
from app.services.cache import ttl_cache

router = APIRouter()


@ttl_cache(600)
def dataset_summary() -> dict:
    with SessionLocal() as db:
        row = db.execute(text("""
            WITH snapshot AS (SELECT max(registration_date) AS as_at FROM companies_core_data)
            SELECT snapshot.as_at,
                   count(*) AS total_companies,
                   count(*) FILTER (WHERE c.entity_status = 'Registered') AS registered_companies,
                   count(*) FILTER (WHERE c.entity_status = 'Removed') AS removed_companies,
                   -- The snapshot month is only partly there; last month is the latest complete one.
                   count(*) FILTER (WHERE c.registration_date >= (date_trunc('month', snapshot.as_at) - interval '1 month')::date
                                      AND c.registration_date < date_trunc('month', snapshot.as_at)::date) AS registered_last_month,
                   to_char(date_trunc('month', snapshot.as_at) - interval '1 month', 'YYYY-MM') AS last_full_month
            FROM companies_core_data c, snapshot
            GROUP BY snapshot.as_at
        """)).mappings().one()
        try:
            imported_at = db.execute(
                text("SELECT max(finished_at) FROM import_jobs WHERE status = 'succeeded'")
            ).scalar()
        except Exception:
            imported_at = None
    return {
        "as_at": row["as_at"].isoformat() if row["as_at"] else None,
        "imported_at": imported_at.isoformat() if imported_at else None,
        "total_companies": row["total_companies"],
        "registered_companies": row["registered_companies"],
        "removed_companies": row["removed_companies"],
        "registered_last_month": row["registered_last_month"],
        "last_full_month": row["last_full_month"],
        "source": "New Zealand Companies Office and NZBN register bulk data",
    }


@router.get("/dataset")
def get_dataset():
    return dataset_summary()
