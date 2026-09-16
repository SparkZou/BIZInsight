"""
Admin API for contact details (NZBN primary business data): how much of a month is covered, and
starting / stopping the job that fetches them (app/services/enrichment_jobs.py).
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api import deps
from app.api.api_v1.endpoints.admin import require_admin
from app.api.api_v1.endpoints.admin_companies import HAS_SENDABLE_EMAIL, _latest_month, _month_range
from app.core.config import settings
from app.models.enrichment import CompanyContactDetails, EnrichmentJob
from app.services import companies_office_web, enrichment_jobs

router = APIRouter()


class StartRequest(BaseModel):
    month: str


def _job_dict(job: EnrichmentJob) -> dict:
    return {
        "id": job.id,
        "status": job.status,
        "month": job.month,
        "source": job.source,
        "created_by": job.created_by,
        "total": job.total,
        "done": job.done,
        "found": job.found,
        "failed": job.failed,
        "error": job.error,
        "log": job.log,
        "created_at": job.created_at,
        "started_at": job.started_at,
        "finished_at": job.finished_at,
    }


@router.get("/status")
def enrichment_status(
    month: Optional[str] = None,
    username: str = Depends(require_admin),
    db: Session = Depends(deps.get_db),
):
    month = month or _latest_month(db)
    start, end = _month_range(month)
    coverage = db.execute(text(f"""
        SELECT count(*) AS companies,
               count(d.nzbn) FILTER (WHERE d.error IS NULL) AS fetched,
               count(d.nzbn) FILTER (WHERE d.error IS NOT NULL) AS unreadable,
               count(*) FILTER (WHERE d.phones <> '') AS with_phone,
               -- Only addresses that may still be emailed count here.
               count(*) FILTER (WHERE {HAS_SENDABLE_EMAIL.format(alias='d')}) AS with_email,
               count(*) FILTER (WHERE d.emails <> '' AND NOT {HAS_SENDABLE_EMAIL.format(alias='d')}) AS email_unsubscribed,
               count(*) FILTER (WHERE d.websites <> '') AS with_website
        FROM companies_core_data c
        LEFT JOIN company_contact_details d ON d.nzbn = c.nzbn
        WHERE c.registration_date >= :start AND c.registration_date < :end
    """), {"start": start, "end": end}).mappings().one()
    jobs = db.query(EnrichmentJob).filter(EnrichmentJob.month == month).order_by(EnrichmentJob.id.desc()).limit(5).all()
    return {
        "month": month,
        "coverage": dict(coverage),
        "busy": enrichment_jobs.is_busy(),
        "delay_seconds": settings.CO_WEB_DELAY_SECONDS,
        "jobs": [_job_dict(job) for job in jobs],
    }


@router.post("/jobs", status_code=202)
def start_enrichment(
    body: StartRequest,
    username: str = Depends(require_admin),
    db: Session = Depends(deps.get_db),
):
    start, end = _month_range(body.month)
    if not enrichment_jobs.reserve():
        raise HTTPException(status_code=409, detail="A contact details job is already running.")
    try:
        job = EnrichmentJob(
            status="queued", month=body.month, source=companies_office_web.SOURCE, created_by=username,
            total=0, done=0, found=0, failed=0, log="",
        )
        db.add(job)
        db.commit()
        db.refresh(job)
    except BaseException:
        enrichment_jobs.release()
        raise
    enrichment_jobs.run_in_background(job.id, start, end)
    return _job_dict(job)


@router.post("/jobs/{job_id}/stop")
def stop_enrichment(job_id: int, username: str = Depends(require_admin), db: Session = Depends(deps.get_db)):
    job = db.get(EnrichmentJob, job_id)
    if not job or job.status not in ("queued", "running") or not enrichment_jobs.is_busy():
        raise HTTPException(status_code=409, detail="That job isn't running.")
    enrichment_jobs.request_stop()
    return {"stopping": True}


@router.get("/companies/{nzbn}")
def company_contact_details(nzbn: str, username: str = Depends(require_admin), db: Session = Depends(deps.get_db)):
    row = db.get(CompanyContactDetails, nzbn)
    if not row:
        raise HTTPException(status_code=404, detail="Contact details haven't been fetched for this company")
    emails = [address for address in (row.details or {}).get("emails", []) if address]
    unsubscribed = []
    if emails:
        unsubscribed = [
            address for (address,) in db.execute(
                text("SELECT email FROM email_suppressions WHERE email = ANY(:emails)"),
                {"emails": [address.lower() for address in emails]},
            ).all()
        ]
    return {
        "nzbn": row.nzbn,
        "company_number": row.company_number,
        "source": row.source,
        "details": row.details,
        "unsubscribed_emails": unsubscribed,
        "error": row.error,
        "fetched_at": row.fetched_at,
    }
