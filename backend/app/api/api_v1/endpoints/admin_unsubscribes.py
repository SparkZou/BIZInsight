"""
The unsubscribe list: email addresses that must never be contacted again. It applies to the address
itself, so an address that appears on several companies is suppressed everywhere at once. The new
companies list, its "has email" filter and the CSV export all leave these addresses out.
"""
import re
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api import deps
from app.api.api_v1.endpoints.admin import require_admin

router = APIRouter()

EMAIL_PATTERN = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
REASONS = {"unsubscribe", "bounce", "complaint", "manual"}


class AddRequest(BaseModel):
    # Free text: paste one address, a list, or a whole email - every address in it is added.
    text: str
    reason: str = "unsubscribe"
    note: Optional[str] = None


def _addresses(blob: str) -> List[str]:
    seen = []
    for match in EMAIL_PATTERN.findall(blob or ""):
        address = match.lower()
        if address not in seen:
            seen.append(address)
    return seen


@router.get("")
def list_suppressions(
    q: str = "",
    limit: int = Query(200, ge=1, le=1000),
    username: str = Depends(require_admin),
    db: Session = Depends(deps.get_db),
):
    rows = db.execute(
        text("""
            SELECT s.email, s.reason, s.note, s.created_by, s.created_at,
                   (SELECT count(*) FROM company_contact_details d
                    WHERE lower(d.emails) LIKE '%' || s.email || '%') AS companies
            FROM email_suppressions s
            WHERE :q = '' OR s.email LIKE '%' || lower(:q) || '%'
            ORDER BY s.created_at DESC
            LIMIT :limit
        """),
        {"q": q.strip(), "limit": limit},
    ).mappings().all()
    total = db.execute(text("SELECT count(*) FROM email_suppressions")).scalar()
    return {"total": total, "suppressions": [dict(row) for row in rows]}


@router.post("", status_code=201)
def add_suppressions(
    body: AddRequest,
    username: str = Depends(require_admin),
    db: Session = Depends(deps.get_db),
):
    if body.reason not in REASONS:
        raise HTTPException(status_code=400, detail=f"reason must be one of: {', '.join(sorted(REASONS))}")
    addresses = _addresses(body.text)
    if not addresses:
        raise HTTPException(status_code=400, detail="No email address found in what you pasted")

    existing = {
        row[0] for row in db.execute(
            text("SELECT email FROM email_suppressions WHERE email = ANY(:emails)"), {"emails": addresses}
        ).all()
    }
    for address in addresses:
        if address in existing:
            continue
        db.execute(
            text("""
                INSERT INTO email_suppressions (email, reason, note, created_by)
                VALUES (:email, :reason, :note, :created_by)
                ON CONFLICT (email) DO NOTHING
            """),
            {"email": address, "reason": body.reason, "note": body.note, "created_by": username},
        )
    db.commit()
    added = [address for address in addresses if address not in existing]
    return {"added": added, "already_listed": sorted(existing)}


@router.delete("/{email}")
def remove_suppression(email: str, username: str = Depends(require_admin), db: Session = Depends(deps.get_db)):
    result = db.execute(text("DELETE FROM email_suppressions WHERE email = :email"), {"email": email.strip().lower()})
    db.commit()
    if not result.rowcount:
        raise HTTPException(status_code=404, detail="That address is not on the unsubscribe list")
    return {"removed": email.strip().lower()}
