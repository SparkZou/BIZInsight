"""
Admin views of newly registered companies: one month's registrations with the related records
gathered per company, a summary of the month, and a CSV export. The full record for a single
company comes from the public GET /api/v1/companies/{nzbn}.
"""
import csv
import io
import re
from datetime import date
from typing import Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api import deps
from app.api.api_v1.endpoints.admin import require_admin

router = APIRouter()

# Contact details come from company_contact_details, filled by the admin contact details job.
CONTACT_JOIN = "LEFT JOIN company_contact_details ccd ON ccd.nzbn = c.nzbn AND ccd.error IS NULL"

# "contact" filter values -> condition. Phones and emails only exist in the NZBN data; a website can
# come from either the bulk data or NZBN.
HAS_WEBSITE = ("(ccd.websites <> '' OR EXISTS (SELECT 1 FROM companies_website w "
               "WHERE w.nzbn = c.nzbn AND w.website <> 'No website'))")
CONTACT_FILTERS = {
    "phone": "ccd.phones <> ''",
    "email": "ccd.emails <> ''",
    "website": HAS_WEBSITE,
    "any": f"(ccd.phones <> '' OR ccd.emails <> '' OR {HAS_WEBSITE})",
}

# One row per company with the related records the list shows. The lateral subqueries only run
# for the rows returned, so a page of 50 takes ~0.1s on the full dataset.
COMPANY_ROWS_SQL = """
SELECT c.nzbn, c.entity_name, c.registration_date, c.entity_type, c.entity_status,
       bic.code AS industry_code, bic.description AS industry,
       svc.city, svc.address AS address_for_service, ro.address AS registered_office,
       coalesce(dir.n, 0) AS director_count, dir.names AS directors,
       coalesce(sh.n, 0) AS shareholder_count,
       gst.gst_number, web.website, tn.trading_name,
       ccd.phones, ccd.emails, ccd.websites AS nzbn_websites, ccd.fetched_at AS contact_fetched_at
FROM companies_core_data c
""" + CONTACT_JOIN + """
LEFT JOIN LATERAL (
    SELECT industry_classification_code AS code, industry_classification_description AS description
    FROM companies_business_industry_classification b
    WHERE b.nzbn = c.nzbn
    ORDER BY start_date DESC NULLS LAST LIMIT 1
) bic ON true
LEFT JOIN LATERAL (
    SELECT nullif(address_for_service_3, '') AS city,
           concat_ws(', ', nullif(address_for_service_1, ''), nullif(address_for_service_2, ''),
                     nullif(address_for_service_3, ''), nullif(address_for_service_postcode, '')) AS address
    FROM companies_address_for_service a
    WHERE a.nzbn = c.nzbn
    ORDER BY start_date DESC NULLS LAST LIMIT 1
) svc ON true
LEFT JOIN LATERAL (
    -- Read through jsonb: the 2026 bulk data renamed registered_office_address_address_N to
    -- registered_office_address_N, and either release may be the one imported.
    SELECT concat_ws(', ',
               nullif(coalesce(j->>'registered_office_address_1', j->>'registered_office_address_address_1'), ''),
               nullif(coalesce(j->>'registered_office_address_2', j->>'registered_office_address_address_2'), ''),
               nullif(coalesce(j->>'registered_office_address_3', j->>'registered_office_address_address_3'), ''),
               nullif(j->>'registered_office_address_postcode', '')) AS address
    FROM (
        SELECT to_jsonb(r) AS j
        FROM companies_registered_office_address r
        WHERE r.nzbn = c.nzbn
        ORDER BY r.start_date DESC NULLS LAST LIMIT 1
    ) latest
) ro ON true
LEFT JOIN LATERAL (
    SELECT count(*) AS n,
           string_agg(concat_ws(' ', nullif(first_name, ''), nullif(middle_names, ''), nullif(last_name, '')), ', '
                      ORDER BY last_name) AS names
    FROM companies_director d
    WHERE d.nzbn = c.nzbn
) dir ON true
LEFT JOIN LATERAL (
    SELECT count(*) AS n FROM companies_shareholder s WHERE s.nzbn = c.nzbn
) sh ON true
LEFT JOIN LATERAL (
    SELECT gst_number FROM companies_gst g WHERE g.nzbn = c.nzbn LIMIT 1
) gst ON true
LEFT JOIN LATERAL (
    SELECT website FROM companies_website w WHERE w.nzbn = c.nzbn AND website <> 'No website' LIMIT 1
) web ON true
LEFT JOIN LATERAL (
    SELECT trading_name FROM companies_trading_name t WHERE t.nzbn = c.nzbn AND trading_name <> 'No trading name' LIMIT 1
) tn ON true
WHERE {where}
ORDER BY c.registration_date DESC, c.entity_name
"""

EXPORT_COLUMNS = [
    ("nzbn", "NZBN"),
    ("entity_name", "Company name"),
    ("registration_date", "Registered"),
    ("entity_type", "Type"),
    ("entity_status", "Status"),
    ("industry_code", "Industry code"),
    ("industry", "Industry"),
    ("city", "City"),
    ("address_for_service", "Address for service"),
    ("registered_office", "Registered office"),
    ("director_count", "Directors"),
    ("directors", "Director names"),
    ("shareholder_count", "Shareholders"),
    ("gst_number", "GST number"),
    ("website", "Website"),
    ("trading_name", "Trading name"),
    ("phones", "Phone numbers (NZBN)"),
    ("emails", "Email addresses (NZBN)"),
    ("nzbn_websites", "Websites (NZBN)"),
]


def _month_range(month: str) -> Tuple[date, date]:
    match = re.fullmatch(r"(\d{4})-(\d{2})", month)
    if not match or not 1 <= int(match.group(2)) <= 12:
        raise HTTPException(status_code=400, detail="month must look like 2026-08")
    year, month_number = int(match.group(1)), int(match.group(2))
    start = date(year, month_number, 1)
    end = date(year + 1, 1, 1) if month_number == 12 else date(year, month_number + 1, 1)
    return start, end


def _latest_month(db: Session) -> str:
    latest = db.execute(
        text("SELECT max(registration_date) FROM companies_core_data WHERE registration_date <= current_date")
    ).scalar()
    if not latest:
        raise HTTPException(status_code=404, detail="No company data has been imported yet")
    return latest.strftime("%Y-%m")


def _filters(month: str, q: str, status: str, contact: str = "") -> Tuple[str, dict]:
    start, end = _month_range(month)
    where = ["c.registration_date >= :start", "c.registration_date < :end"]
    params = {"start": start, "end": end}
    if q.strip():
        where.append("(c.entity_name ILIKE :like OR c.nzbn = :q)")
        params.update(like=f"%{q.strip()}%", q=q.strip())
    if status:
        where.append("c.entity_status = :status")
        params["status"] = status
    if contact:
        if contact not in CONTACT_FILTERS:
            raise HTTPException(status_code=400, detail=f"contact must be one of: {', '.join(CONTACT_FILTERS)}")
        where.append(CONTACT_FILTERS[contact])
    return " AND ".join(where), params


@router.get("/months")
def list_months(username: str = Depends(require_admin), db: Session = Depends(deps.get_db)):
    """Months with registrations over the two years up to the latest data, newest first."""
    latest = _latest_month(db)
    start, _ = _month_range(latest)
    rows = db.execute(
        text("""
            SELECT to_char(registration_date, 'YYYY-MM') AS month, count(*) AS companies
            FROM companies_core_data
            WHERE registration_date >= :since AND registration_date <= current_date
            GROUP BY 1 ORDER BY 1 DESC
        """),
        {"since": date(start.year - 2, start.month, 1)},
    ).all()
    return {"latest": latest, "months": [{"month": month, "companies": count} for month, count in rows]}


@router.get("/summary")
def month_summary(
    month: Optional[str] = None,
    username: str = Depends(require_admin),
    db: Session = Depends(deps.get_db),
):
    month = month or _latest_month(db)
    start, end = _month_range(month)
    params = {"start": start, "end": end}
    in_month = "c.registration_date >= :start AND c.registration_date < :end"

    def counts(sql: str) -> list:
        return [{"name": name, "companies": count} for name, count in db.execute(text(sql), params).all()]

    return {
        "month": month,
        "total": db.execute(text(f"SELECT count(*) FROM companies_core_data c WHERE {in_month}"), params).scalar(),
        "by_status": counts(
            f"SELECT coalesce(c.entity_status, 'Unknown'), count(*) FROM companies_core_data c "
            f"WHERE {in_month} GROUP BY 1 ORDER BY 2 DESC"
        ),
        "by_type": counts(
            f"SELECT coalesce(c.entity_type, 'Unknown'), count(*) FROM companies_core_data c "
            f"WHERE {in_month} GROUP BY 1 ORDER BY 2 DESC"
        ),
        "top_industries": counts(
            f"SELECT b.industry_classification_description, count(DISTINCT c.nzbn) "
            f"FROM companies_core_data c JOIN companies_business_industry_classification b USING (nzbn) "
            f"WHERE {in_month} GROUP BY 1 ORDER BY 2 DESC LIMIT 10"
        ),
        "top_cities": counts(
            f"SELECT coalesce(nullif(a.address_for_service_3, ''), '(blank)'), count(DISTINCT c.nzbn) "
            f"FROM companies_core_data c JOIN companies_address_for_service a USING (nzbn) "
            f"WHERE {in_month} GROUP BY 1 ORDER BY 2 DESC LIMIT 10"
        ),
    }


@router.get("")
def list_new_companies(
    month: Optional[str] = None,
    q: str = "",
    status: str = "",
    contact: str = "",
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    username: str = Depends(require_admin),
    db: Session = Depends(deps.get_db),
):
    month = month or _latest_month(db)
    where, params = _filters(month, q, status, contact)
    total = db.execute(
        text(f"SELECT count(*) FROM companies_core_data c {CONTACT_JOIN} WHERE {where}"), params
    ).scalar()
    rows = db.execute(
        text(COMPANY_ROWS_SQL.format(where=where) + " LIMIT :limit OFFSET :offset"),
        {**params, "limit": page_size, "offset": (page - 1) * page_size},
    ).mappings().all()
    return {
        "month": month,
        "total": total,
        "page": page,
        "page_size": page_size,
        "companies": [dict(row) for row in rows],
    }


@router.get("/export")
def export_new_companies(
    month: Optional[str] = None,
    q: str = "",
    status: str = "",
    contact: str = "",
    username: str = Depends(require_admin),
    db: Session = Depends(deps.get_db),
):
    month = month or _latest_month(db)
    where, params = _filters(month, q, status, contact)
    rows = db.execute(text(COMPANY_ROWS_SQL.format(where=where)), params).mappings().all()

    out = io.StringIO()
    out.write("﻿")  # BOM, so Excel reads the UTF-8 file correctly (macrons in Māori names etc.)
    writer = csv.writer(out)
    writer.writerow([label for _, label in EXPORT_COLUMNS])
    for row in rows:
        writer.writerow(["" if row[key] is None else row[key] for key, _ in EXPORT_COLUMNS])

    suffix = f"-{contact}" if contact else ""
    return Response(
        content=out.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="new-companies-{month}{suffix}.csv"'},
    )
