"""
Admin search across every register in the bulk data - companies, incorporated societies and
limited partnerships, charitable trust boards, sole traders / partnerships / trusts and public
sector entities - by name, NZBN or company number, and companies by director or shareholder name.
The full record for a result comes from the public GET /api/v1/companies/{nzbn}.
"""
import re
from typing import List, Set

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api import deps
from app.api.api_v1.endpoints.admin import require_admin

router = APIRouter()

# (label shown in results, table, column holding the register's own number if it has one)
ENTITY_SOURCES = [
    ("Company", "companies_core_data", "company_identifier"),
    ("Incorporated society / limited partnership", "other_incorporated_entities_core_data", "incorporation_number"),
    ("Charitable trust board", "charitable_trust_boards_core_data", "incorporation_number"),
    ("Sole trader / partnership / trust", "unincorporated_entities_core_data", None),
    ("Public sector entity", "public_sector_entities_core_data", None),
]
PEOPLE_TABLES = ["companies_director", "companies_shareholder"]

MAX_NAME_WORDS = 5


def _existing_tables(db: Session) -> Set[str]:
    # Registers come and go between bulk data releases (charitable trust boards only have their own
    # file since 2026), so only search the tables the current import actually has.
    tables = [table for _, table, _ in ENTITY_SOURCES] + PEOPLE_TABLES
    rows = db.execute(
        text("SELECT relname FROM pg_class WHERE relkind = 'r' AND relname = ANY(:tables)"),
        {"tables": tables},
    ).all()
    return {name for (name,) in rows}


def _hits_sql(word_count: int, include_people: bool, existing: Set[str]) -> str:
    """One row per match (an entity can match several times); names use the trigram indexes."""
    parts = []
    for label, table, number in ENTITY_SOURCES:
        if table not in existing:
            continue
        number_column = f"e.{number}" if number else "NULL"
        number_match = f" OR e.{number} = :q" if number else ""
        number_label = f" WHEN e.{number} = :q THEN 'Company number'" if number else ""
        parts.append(f"""
            SELECT e.nzbn, '{label}' AS register, {number_column} AS number, e.entity_name, e.entity_type,
                   e.entity_status, e.registration_date,
                   CASE WHEN e.nzbn = :q THEN 'NZBN'{number_label} ELSE 'Name' END AS matched_on
            FROM {table} e
            WHERE e.entity_name ILIKE :like OR e.nzbn = :q{number_match}""")

    if include_people and "companies_core_data" in existing:
        # Every word of the query has to appear somewhere in the person's name, so
        # "john smith" finds John Michael SMITH.
        if "companies_director" in existing:
            director_words = " AND ".join(
                f"(d.first_name ILIKE :w{i} OR d.middle_names ILIKE :w{i} OR d.last_name ILIKE :w{i})"
                for i in range(word_count)
            )
            parts.append(f"""
                SELECT c.nzbn, 'Company', c.company_identifier, c.entity_name, c.entity_type, c.entity_status,
                       c.registration_date,
                       'Director: ' || concat_ws(' ', nullif(d.first_name, ''), nullif(d.middle_names, ''), nullif(d.last_name, ''))
                FROM companies_director d JOIN companies_core_data c USING (nzbn)
                WHERE {director_words}""")
        if "companies_shareholder" in existing:
            shareholder_words = " AND ".join(f"s.sh_name ILIKE :w{i}" for i in range(word_count))
            parts.append(f"""
                SELECT c.nzbn, 'Company', c.company_identifier, c.entity_name, c.entity_type, c.entity_status,
                       c.registration_date, 'Shareholder: ' || s.sh_name
                FROM companies_shareholder s JOIN companies_core_data c USING (nzbn)
                WHERE {shareholder_words}""")
    return " UNION ALL ".join(parts)


@router.get("")
def search_all_registers(
    q: str = Query(..., min_length=2, max_length=100),
    people: bool = True,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    username: str = Depends(require_admin),
    db: Session = Depends(deps.get_db),
):
    q = q.strip()
    words: List[str] = re.findall(r"\S+", q)[:MAX_NAME_WORDS] or [q]
    hits = _hits_sql(len(words), people, _existing_tables(db))
    if not hits:
        return {"query": q, "total": 0, "page": page, "page_size": page_size, "results": []}
    params = {"q": q, "like": f"%{q}%", **{f"w{i}": f"%{word}%" for i, word in enumerate(words)}}

    total = db.execute(text(f"SELECT count(DISTINCT nzbn) FROM ({hits}) hits"), params).scalar()
    rows = db.execute(
        text(f"""
            SELECT nzbn, min(register) AS register, max(number) AS number, max(entity_name) AS entity_name,
                   max(entity_type) AS entity_type, max(entity_status) AS entity_status,
                   max(registration_date) AS registration_date,
                   string_agg(DISTINCT matched_on, '; ') AS matched_on
            FROM ({hits}) hits
            GROUP BY nzbn
            -- Exact name, NZBN or number matches first, then registered entities, then by name.
            ORDER BY bool_or(lower(entity_name) = lower(:q) OR nzbn = :q OR number = :q) DESC,
                     bool_or(entity_status ILIKE 'registered') DESC,
                     max(entity_name)
            LIMIT :limit OFFSET :offset
        """),
        {**params, "limit": page_size, "offset": (page - 1) * page_size},
    ).mappings().all()

    return {"query": q, "total": total, "page": page, "page_size": page_size, "results": [dict(row) for row in rows]}
