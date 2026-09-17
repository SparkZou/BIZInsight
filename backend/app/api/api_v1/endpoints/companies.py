import re

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional, Dict, Any
from app.db.session import get_db

router = APIRouter()


def upper_keys(row) -> Dict[str, Any]:
    """
    PostgreSQL folds unquoted column names to lower case. The frontend expects the
    original upper-case column names (NZBN, ENTITY_NAME, ...), so restore them here.
    """
    return {key.upper(): value for key, value in row._mapping.items()}


@router.get("/search")
def search_companies(
    q: str = Query(..., min_length=2, description="Search query for company name or NZBN"),
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """
    Search companies by name or NZBN.
    """
    print(f"Search request received: q={q}, limit={limit}")
    try:
        # Sanitize query
        search_term = f"%{q}%"

        # Query companies_core_data
        # 1. Search Core Data (ILIKE keeps MySQL's case-insensitive matching)
        core_query = text("""
            SELECT
                NZBN,
                ENTITY_NAME,
                ENTITY_STATUS,
                ENTITY_TYPE,
                REGISTRATION_DATE
            FROM companies_core_data
            WHERE ENTITY_NAME ILIKE :search_term OR NZBN LIKE :search_term
            LIMIT :limit
        """)

        core_result = db.execute(core_query, {"search_term": search_term, "limit": limit})

        # 2. Search Directors
        director_query = text("""
            SELECT DISTINCT c.NZBN, c.ENTITY_NAME, c.ENTITY_STATUS, c.ENTITY_TYPE, c.REGISTRATION_DATE
            FROM companies_director d
            JOIN companies_core_data c ON d.NZBN = c.NZBN
            WHERE d.FIRST_NAME ILIKE :search_term
               OR d.MIDDLE_NAMES ILIKE :search_term
               OR d.LAST_NAME ILIKE :search_term
            LIMIT :limit
        """)

        director_result = db.execute(director_query, {"search_term": search_term, "limit": limit})

        # 3. Merge Results (deduplicate by NZBN)
        seen_nzbns = set()
        companies = []

        def process_row(row):
            row = upper_keys(row)
            nzbn = str(row["NZBN"])
            if nzbn in seen_nzbns:
                return
            seen_nzbns.add(nzbn)

            try:
                # Handle date serialization safely
                reg_date = row["REGISTRATION_DATE"]
                if hasattr(reg_date, 'isoformat'):
                    reg_date_str = reg_date.isoformat()
                else:
                    reg_date_str = str(reg_date) if reg_date else None

                companies.append({
                    "nzbn": nzbn,
                    "name": str(row["ENTITY_NAME"]) if row["ENTITY_NAME"] else "Unknown",
                    "status": str(row["ENTITY_STATUS"]) if row["ENTITY_STATUS"] else "Unknown",
                    "type": str(row["ENTITY_TYPE"]) if row["ENTITY_TYPE"] else "Unknown",
                    "registration_date": reg_date_str
                })
            except Exception as row_error:
                print(f"Error processing row: {row_error}")

        for row in core_result:
            process_row(row)

        for row in director_result:
            process_row(row)

        # Limit total results
        companies = companies[:limit]

        print(f"Returning {len(companies)} results")
        return {
            "count": len(companies),
            "results": companies
        }
    except Exception as e:
        # Details go to the server log only; raw SQL errors must not reach public responses.
        print(f"Error in search endpoint: {e}")
        # Return empty list instead of 500 to avoid breaking frontend
        return {
            "count": 0,
            "results": [],
            "error": "Search failed"
        }

# Each ORDER BY matches a composite index on company_index exactly (see build_company_index in
# services/site_stats.py), so filtered lists read their first page straight off the index.
# registration_date is never null in the register data, so no NULLS LAST is needed.
BROWSE_SORTS = {
    "newest": "registration_date DESC, nzbn",
    "oldest": "registration_date ASC, nzbn DESC",
    "name": "entity_name, nzbn",
    "health": "health_score DESC, registration_date DESC, nzbn",
    "insolvency": "insolvency_date DESC, nzbn",
}
HEALTH_LABELS = {"Established", "Developing", "Watch", "Distressed", "Removed"}
MONTH = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")


@router.get("/browse")
def browse_companies(
    q: str = "",
    region: str = "",
    division: str = "",
    entity_type: str = "",
    status: str = "",
    city: str = "",
    website: Optional[bool] = None,
    health: str = "",
    month: str = "",
    insolvency_month: str = "",
    sort: str = "newest",
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    count: bool = True,
    db: Session = Depends(get_db),
):
    """
    Filtered, paginated list over company_index (built after each bulk data import). q matches
    the company name anywhere, or an exact NZBN / company number; month (YYYY-MM) is the
    registration month and insolvency_month the month of the latest insolvency appointment.
    count=false skips the total (a scan of every matching row) for lists that only show the
    first few.
    """
    where = ["true"]
    params: Dict[str, Any] = {"limit": page_size, "offset": (page - 1) * page_size}
    if health:
        if health not in HEALTH_LABELS:
            raise HTTPException(status_code=400, detail=f"health must be one of: {', '.join(sorted(HEALTH_LABELS))}")
        where.append("health_label = :health")
        params["health"] = health
    for column, value in (("registration_date", month), ("insolvency_date", insolvency_month)):
        if value:
            if not MONTH.match(value):
                raise HTTPException(status_code=400, detail="month must look like 2026-08")
            # CAST(...) rather than ::date - SQLAlchemy's bind-parameter parser trips over ":name::date".
            where.append(f"{column} >= CAST(:{column}_from AS date) AND {column} < CAST(:{column}_from AS date) + interval '1 month'")
            params[f"{column}_from"] = f"{value}-01"
    q = q.strip()
    if q:
        if q.isdigit():
            where.append("(nzbn = :q OR company_identifier = :q)")
        else:
            where.append("entity_name ILIKE :like")
            params["like"] = f"%{q}%"
            params["prefix"] = f"{q}%"
        params["q"] = q
    filters = {"region": region, "division": division.upper(), "entity_type": entity_type, "entity_status": status, "city": city}
    for column, value in filters.items():
        if value:
            where.append(f"{column} = :{column}")
            params[column] = value
    if website is not None:
        where.append("has_website = :website")
        params["website"] = website

    order = BROWSE_SORTS.get(sort, BROWSE_SORTS["newest"])
    if q and not q.isdigit():
        # Names that start with the search term come first.
        order = f"(entity_name ILIKE :prefix) DESC, {order}"

    # With no filters the window count would scan all 1.7M rows; the planner's estimate is exact
    # enough for a page count and instant.
    unfiltered = where == ["true"]
    if not count:
        total_expr = "0"
    elif unfiltered:
        total_expr = "(SELECT reltuples::bigint FROM pg_class WHERE relname = 'company_index')"
    else:
        total_expr = "count(*) OVER ()"
    sql = text(f"""
        SELECT {total_expr} AS total,
               nzbn, entity_name AS name, company_identifier, entity_type AS type, entity_status AS status,
               registration_date, removal_date, division, industry_code, industry, city, region,
               website, trading_name, director_count, shareholder_count, corporate_shareholder,
               insolvency_count, insolvency_type, insolvency_date,
               health_score, health_label, pts_age, pts_status, pts_insolvency, pts_directors, pts_ownership, pts_presence
        FROM company_index
        WHERE {' AND '.join(where)}
        ORDER BY {order}
        LIMIT :limit OFFSET :offset
    """)
    try:
        rows = db.execute(sql, params).mappings().all()
    except Exception as e:
        if "company_index" in str(e):
            raise HTTPException(status_code=503, detail="The company index is being built; try again in a few minutes.")
        raise
    total = rows[0]["total"] if rows else 0
    results = []
    for row in rows:
        item = dict(row)
        item.pop("total")
        for key in ("registration_date", "removal_date", "insolvency_date"):
            if item[key] is not None:
                item[key] = item[key].isoformat()
        results.append(item)
    return {"total": total, "page": page, "page_size": page_size, "results": results}


@router.get("/{nzbn}")
def get_company_details(
    nzbn: str,
    db: Session = Depends(get_db)
):
    """
    Get comprehensive information for a specific company by NZBN.
    Includes data from 15+ tables organized by category.
    """
    # 1. Get Core Data - try companies_core_data first
    core_query = text("SELECT * FROM companies_core_data WHERE NZBN = :nzbn")
    core_result = db.execute(core_query, {"nzbn": nzbn}).fetchone()

    # If not found in companies_core_data, try other_incorporated_entities_core_data
    if not core_result:
        other_inc_query = text("SELECT * FROM other_incorporated_entities_core_data WHERE NZBN = :nzbn")
        core_result = db.execute(other_inc_query, {"nzbn": nzbn}).fetchone()

    # If still not found, try public_sector_entities_core_data
    if not core_result:
        public_sector_query = text("SELECT * FROM public_sector_entities_core_data WHERE NZBN = :nzbn")
        core_result = db.execute(public_sector_query, {"nzbn": nzbn}).fetchone()

    # If still not found, try unincorporated_entities_core_data
    if not core_result:
        uninc_query = text("SELECT * FROM unincorporated_entities_core_data WHERE NZBN = :nzbn")
        core_result = db.execute(uninc_query, {"nzbn": nzbn}).fetchone()

    # If still not found, try charitable_trust_boards_core_data. Charitable trust boards were
    # split out of other_incorporated_entities_core_data in later bulk data releases, so older
    # imports don't have this table.
    if not core_result:
        try:
            charitable_query = text("SELECT * FROM charitable_trust_boards_core_data WHERE NZBN = :nzbn")
            core_result = db.execute(charitable_query, {"nzbn": nzbn}).fetchone()
        except Exception:
            core_result = None

    if not core_result:
        raise HTTPException(status_code=404, detail="Company not found")

    company_data = upper_keys(core_result)

    # 2. Basic Info Extensions
    # ABN (Australian Business Number)
    try:
        abn_query = text("SELECT * FROM companies_abn WHERE NZBN = :nzbn")
        abn_result = db.execute(abn_query, {"nzbn": nzbn}).fetchone()
        company_data["abn"] = upper_keys(abn_result) if abn_result else None
    except Exception:
        company_data["abn"] = None

    # Industry Classification
    try:
        industry_query = text("SELECT * FROM companies_business_industry_classification WHERE NZBN = :nzbn")
        industry_result = db.execute(industry_query, {"nzbn": nzbn}).fetchall()
        industry_data = []
        for row in industry_result:
            row_dict = upper_keys(row)
            # Map DB columns to Frontend expected keys
            row_dict['ANZSIC_CODE'] = row_dict.get('INDUSTRY_CLASSIFICATION_CODE')
            row_dict['ANZSIC_DESCRIPTION'] = row_dict.get('INDUSTRY_CLASSIFICATION_DESCRIPTION')
            industry_data.append(row_dict)
        company_data["industry_classification"] = industry_data
    except Exception as e:
        print(f"Error fetching industry classification: {e}")
        company_data["industry_classification"] = []

    # GST Registration
    try:
        gst_query = text("SELECT * FROM companies_gst WHERE NZBN = :nzbn")
        gst_result = db.execute(gst_query, {"nzbn": nzbn}).fetchone()
        if gst_result:
            gst_data = upper_keys(gst_result)
            # Map DB columns to Frontend expected keys
            gst_data['GST_NUMBER'] = gst_data.get('GST_NUMBER')

            # Handle date serialization
            start_date = gst_data.get('START_DATE')
            if hasattr(start_date, 'isoformat'):
                gst_data['GST_REGISTRATION_DATE'] = start_date.isoformat()
            else:
                gst_data['GST_REGISTRATION_DATE'] = str(start_date) if start_date else None

            company_data["gst"] = gst_data
        else:
            company_data["gst"] = None
    except Exception as e:
        print(f"Error fetching GST data: {e}")
        company_data["gst"] = None

    # Trading Names
    try:
        trading_name_query = text("SELECT * FROM companies_trading_name WHERE NZBN = :nzbn")
        trading_name_result = db.execute(trading_name_query, {"nzbn": nzbn}).fetchall()
        company_data["trading_names"] = [upper_keys(row) for row in trading_name_result]
    except Exception:
        company_data["trading_names"] = []

    # Websites
    try:
        website_query = text("SELECT * FROM companies_website WHERE NZBN = :nzbn")
        website_result = db.execute(website_query, {"nzbn": nzbn}).fetchall()
        company_data["websites"] = [upper_keys(row) for row in website_result]
    except Exception:
        company_data["websites"] = []

    # 3. Address Data (Multiple Types)
    addresses = {}

    # Service Addresses
    try:
        service_addr_query = text("SELECT * FROM companies_address_for_service WHERE NZBN = :nzbn")
        service_addr_result = db.execute(service_addr_query, {"nzbn": nzbn}).fetchall()
        addresses["service"] = [upper_keys(row) for row in service_addr_result]
    except Exception:
        addresses["service"] = []

    # Public Addresses
    try:
        public_addr_query = text("SELECT * FROM companies_public_address WHERE NZBN = :nzbn")
        public_addr_result = db.execute(public_addr_query, {"nzbn": nzbn}).fetchall()
        addresses["public"] = [upper_keys(row) for row in public_addr_result]
    except Exception:
        addresses["public"] = []

    # Registered Office Addresses
    try:
        office_addr_query = text("SELECT * FROM companies_registered_office_address WHERE NZBN = :nzbn")
        office_addr_result = db.execute(office_addr_query, {"nzbn": nzbn}).fetchall()
        addresses["office"] = []
        for row in office_addr_result:
            address = upper_keys(row)
            # The 2026 bulk data renamed REGISTERED_OFFICE_ADDRESS_ADDRESS_N to REGISTERED_OFFICE_ADDRESS_N.
            # The frontend reads the older names, so provide them for either release.
            for n in range(1, 5):
                address.setdefault(f"REGISTERED_OFFICE_ADDRESS_ADDRESS_{n}", address.get(f"REGISTERED_OFFICE_ADDRESS_{n}"))
            addresses["office"].append(address)
    except Exception:
        addresses["office"] = []

    company_data["addresses"] = addresses

    # 4. People & Ownership
    # Directors
    try:
        director_query = text("SELECT * FROM companies_director WHERE NZBN = :nzbn")
        director_result = db.execute(director_query, {"nzbn": nzbn}).fetchall()
        company_data["directors"] = [upper_keys(row) for row in director_result]
    except Exception:
        company_data["directors"] = []

    # Shareholders
    try:
        shareholder_query = text("SELECT * FROM companies_shareholder WHERE NZBN = :nzbn")
        shareholder_result = db.execute(shareholder_query, {"nzbn": nzbn}).fetchall()
        company_data["shareholders"] = [upper_keys(row) for row in shareholder_result]
    except Exception:
        company_data["shareholders"] = []

    # 5. Business Scope
    # Trading Areas
    try:
        trading_area_query = text("SELECT * FROM companies_trading_area WHERE NZBN = :nzbn")
        trading_area_result = db.execute(trading_area_query, {"nzbn": nzbn}).fetchall()
        company_data["trading_areas"] = [upper_keys(row) for row in trading_area_result]
    except Exception:
        company_data["trading_areas"] = []

    # 6. Compliance & Risk
    # Insolvency Records
    try:
        insolvency_query = text("SELECT * FROM companies_insolvency WHERE NZBN = :nzbn")
        insolvency_result = db.execute(insolvency_query, {"nzbn": nzbn}).fetchall()
        company_data["insolvency"] = [upper_keys(row) for row in insolvency_result]
    except Exception:
        company_data["insolvency"] = []

    # 7. Special Entity Types
    special_entity = {}

    # Maori Business Identifier
    try:
        maori_query = text("SELECT * FROM maori_business_identifier WHERE NZBN = :nzbn")
        maori_result = db.execute(maori_query, {"nzbn": nzbn}).fetchone()
        special_entity["maori_business"] = upper_keys(maori_result) if maori_result else None
    except Exception:
        special_entity["maori_business"] = None

    # Other Incorporated Entities
    try:
        other_inc_query = text("SELECT * FROM other_incorporated_entities_core_data WHERE NZBN = :nzbn")
        other_inc_result = db.execute(other_inc_query, {"nzbn": nzbn}).fetchone()
        special_entity["other_incorporated"] = upper_keys(other_inc_result) if other_inc_result else None
    except Exception:
        special_entity["other_incorporated"] = None

    # Charitable Trust Boards
    try:
        charitable_query = text("SELECT * FROM charitable_trust_boards_core_data WHERE NZBN = :nzbn")
        charitable_result = db.execute(charitable_query, {"nzbn": nzbn}).fetchone()
        special_entity["charitable_trust_board"] = upper_keys(charitable_result) if charitable_result else None
    except Exception:
        special_entity["charitable_trust_board"] = None

    # Public Sector Entities
    try:
        public_sector_query = text("SELECT * FROM public_sector_entities_core_data WHERE NZBN = :nzbn")
        public_sector_result = db.execute(public_sector_query, {"nzbn": nzbn}).fetchone()
        special_entity["public_sector"] = upper_keys(public_sector_result) if public_sector_result else None
    except Exception:
        special_entity["public_sector"] = None

    # Unincorporated Entities
    try:
        uninc_query = text("SELECT * FROM unincorporated_entities_core_data WHERE NZBN = :nzbn")
        uninc_result = db.execute(uninc_query, {"nzbn": nzbn}).fetchone()
        special_entity["unincorporated"] = upper_keys(uninc_result) if uninc_result else None
    except Exception:
        special_entity["unincorporated"] = None

    company_data["special_entity"] = special_entity

    return company_data

