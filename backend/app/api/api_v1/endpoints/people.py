"""
People on the register - directors and individual shareholders - for signed-in users only.

A person has no identifier in the bulk data, only a name, so a "person" here is everyone on the
register with exactly that name. Pages are keyed by the slug of the name. Every search and page
view is recorded against the user (see auth.record_view), as the privacy statement says.
"""
import re
from collections import OrderedDict
from typing import Dict, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api import deps
from app.api.api_v1.endpoints.auth import require_people_access
from app.models.account import CompanyView, User
from app.services.site_stats import slugify

router = APIRouter()

MAX_ROWS = 400
MAX_PERSONS = 50


def _full_name(first, middle, last) -> str:
    return re.sub(r"\s+", " ", " ".join(part for part in (first, middle, last) if part)).strip()


def _record(db: Session, user: User, kind: str, subject: str, label: str) -> None:
    recent = db.execute(
        text("SELECT 1 FROM company_views WHERE user_id = :user_id AND kind = :kind AND subject = :subject AND viewed_at > now() - interval '1 hour' LIMIT 1"),
        {"user_id": user.id, "kind": kind, "subject": subject[:200]},
    ).first()
    if not recent:
        db.add(CompanyView(user_id=user.id, kind=kind, subject=subject[:200], label=label[:200]))
        db.commit()


def _company_fields() -> str:
    return "c.entity_name, c.entity_status, c.city, c.region, c.division, c.health_label"


@router.get("/search")
def search_people(
    q: str = Query(..., min_length=2, max_length=100),
    user: User = Depends(require_people_access),
    db: Session = Depends(deps.get_db),
):
    q = re.sub(r"\s+", " ", q.strip())
    tokens = [t for t in q.split(" ") if t]
    params = {"any": f"%{q}%", "first": f"%{tokens[0]}%", "last": f"%{tokens[-1]}%", "limit": MAX_ROWS}
    if len(tokens) == 1:
        director_where = "(d.last_name ILIKE :any OR d.first_name ILIKE :any)"
    else:
        director_where = "(d.first_name ILIKE :first AND d.last_name ILIKE :last)"
    directors = db.execute(text(f"""
        SELECT d.nzbn, d.first_name, d.middle_names, d.last_name, d.start_date, {_company_fields()}
        FROM companies_director d JOIN company_index c ON c.nzbn = d.nzbn
        WHERE {director_where}
        ORDER BY d.last_name, d.first_name, c.entity_status, c.registration_date DESC
        LIMIT :limit
    """), params).mappings().all()
    shareholders = db.execute(text(f"""
        SELECT s.nzbn, s.sh_name, s.number_of_shares, s.start_date, {_company_fields()}
        FROM companies_shareholder s JOIN company_index c ON c.nzbn = s.nzbn
        WHERE s.sh_type = 'Shareholder Individual' AND s.sh_name ILIKE :any
        ORDER BY s.sh_name, c.entity_status, c.registration_date DESC
        LIMIT :limit
    """), params).mappings().all()

    persons: "OrderedDict[str, dict]" = OrderedDict()
    for row in directors:
        name = _full_name(row["first_name"], row["middle_names"], row["last_name"])
        key = name.upper()
        person = persons.setdefault(key, {"name": name, "slug": slugify(name), "directorships": 0, "shareholdings": 0, "companies": []})
        person["directorships"] += 1
        if len(person["companies"]) < 3 and row["entity_name"] not in person["companies"]:
            person["companies"].append(row["entity_name"])
    for row in shareholders:
        name = re.sub(r"\s+", " ", row["sh_name"] or "").strip()
        key = name.upper()
        person = persons.setdefault(key, {"name": name, "slug": slugify(name), "directorships": 0, "shareholdings": 0, "companies": []})
        person["shareholdings"] += 1
        if len(person["companies"]) < 3 and row["entity_name"] not in person["companies"]:
            person["companies"].append(row["entity_name"])
    ranked = sorted(persons.values(), key=lambda p: (-(p["directorships"] + p["shareholdings"]), p["name"]))
    _record(db, user, "person_search", q, q)
    return {"q": q, "persons": ranked[:MAX_PERSONS], "truncated": len(directors) >= MAX_ROWS or len(shareholders) >= MAX_ROWS}


@router.get("/{slug}")
def person(slug: str, user: User = Depends(require_people_access), db: Session = Depends(deps.get_db)):
    slug = slug.lower()
    tokens = [t for t in slug.split("-") if t]
    if not tokens:
        raise HTTPException(status_code=404, detail="Person not found")
    params = {"first": f"{tokens[0]}%", "last": f"%{tokens[-1]}", "any_first": f"%{tokens[0]}%", "any_last": f"%{tokens[-1]}%", "limit": MAX_ROWS}
    if len(tokens) == 1:
        director_where = "(d.last_name ILIKE :any_last OR d.first_name ILIKE :any_first)"
    else:
        director_where = "(d.first_name ILIKE :first AND d.last_name ILIKE :last)"
    directors = db.execute(text(f"""
        SELECT d.nzbn, d.first_name, d.middle_names, d.last_name, d.start_date, d.asic_dir_yn, d.asic_company_name,
               {_company_fields()}, c.registration_date, c.removal_date
        FROM companies_director d JOIN company_index c ON c.nzbn = d.nzbn
        WHERE {director_where}
        ORDER BY c.entity_status, c.registration_date DESC
        LIMIT :limit
    """), params).mappings().all()
    shareholders = db.execute(text(f"""
        SELECT s.nzbn, s.sh_name, s.number_of_shares, s.start_date, {_company_fields()}, c.registration_date, c.removal_date
        FROM companies_shareholder s JOIN company_index c ON c.nzbn = s.nzbn
        WHERE s.sh_type = 'Shareholder Individual' AND s.sh_name ILIKE :any_first AND s.sh_name ILIKE :any_last
        ORDER BY c.entity_status, c.registration_date DESC
        LIMIT :limit
    """), params).mappings().all()

    name = None
    directorships: List[dict] = []
    for row in directors:
        full = _full_name(row["first_name"], row["middle_names"], row["last_name"])
        if slugify(full) != slug:
            continue
        name = name or full
        directorships.append({
            "nzbn": row["nzbn"], "company": row["entity_name"], "status": row["entity_status"], "city": row["city"], "region": row["region"],
            "division": row["division"], "health_label": row["health_label"], "appointed": row["start_date"],
            "registered": row["registration_date"], "removed": row["removal_date"],
            "asic_company": row["asic_company_name"] if row["asic_dir_yn"] == "Y" else None,
        })
    shareholdings: List[dict] = []
    for row in shareholders:
        full = re.sub(r"\s+", " ", row["sh_name"] or "").strip()
        if slugify(full) != slug:
            continue
        name = name or full
        shareholdings.append({
            "nzbn": row["nzbn"], "company": row["entity_name"], "status": row["entity_status"], "city": row["city"], "region": row["region"],
            "division": row["division"], "health_label": row["health_label"], "shares": row["number_of_shares"], "since": row["start_date"],
            "registered": row["registration_date"], "removed": row["removal_date"],
        })
    if not name:
        raise HTTPException(status_code=404, detail="Nobody with that name is on the register")

    live = {r["nzbn"] for r in directorships + shareholdings if r["status"] != "Removed"}
    _record(db, user, "person", slug, name)
    return {
        "name": name, "slug": slug,
        "summary": {"directorships": len(directorships), "shareholdings": len(shareholdings), "active_companies": len(live)},
        "directorships": directorships, "shareholdings": shareholdings,
        "note": "Everyone on the register with exactly this name; the register does not say whether they are the same person.",
    }
