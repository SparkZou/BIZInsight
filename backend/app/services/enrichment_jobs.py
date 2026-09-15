"""
Background job that fills company_contact_details for one month's new companies: one company at a
time with a pause between requests. Companies that already have details are skipped, so a stopped
or interrupted job carries on where it left off when it is started again.

The API runs as a single Uvicorn worker, so an in-process lock and stop flag are enough.
"""
import json
import random
import threading
from datetime import datetime, timezone
from typing import List

from sqlalchemy import text

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.enrichment import EnrichmentJob
from app.services import companies_office_web

_slot = threading.Lock()
_stop = threading.Event()

# Several unreadable pages in a row mean the site is serving something else (a block page, or a
# changed layout), so stop instead of hammering it.
MAX_CONSECUTIVE_FAILURES = 5
MAX_LOG_LINES = 300
# Air New Zealand: its NZBN page is complete and long-lived, a safe first "known good" page.
CANARY_COMPANY_NUMBER = "104799"

UPSERT_SQL = text("""
    INSERT INTO company_contact_details
        (nzbn, company_number, source, details, phones, emails, websites, trading_names, error, fetched_at)
    VALUES
        (:nzbn, :company_number, :source, CAST(:details AS jsonb), :phones, :emails, :websites, :trading_names, :error, now())
    ON CONFLICT (nzbn) DO UPDATE SET
        company_number = EXCLUDED.company_number, source = EXCLUDED.source, details = EXCLUDED.details,
        phones = EXCLUDED.phones, emails = EXCLUDED.emails, websites = EXCLUDED.websites,
        trading_names = EXCLUDED.trading_names, error = EXCLUDED.error, fetched_at = EXCLUDED.fetched_at
""")


def reserve() -> bool:
    """Claim the single enrichment slot. Follow with run_in_background() or release()."""
    return _slot.acquire(blocking=False)


def release() -> None:
    _slot.release()


def is_busy() -> bool:
    return _slot.locked()


def request_stop() -> None:
    _stop.set()


def run_in_background(job_id: int, start, end) -> None:
    """Fetch details for companies registered in [start, end); releases the reserved slot when done."""
    _stop.clear()
    threading.Thread(target=_run, args=(job_id, start, end), name=f"enrichment-job-{job_id}", daemon=True).start()


def mark_interrupted_jobs() -> None:
    db = SessionLocal()
    try:
        db.query(EnrichmentJob).filter(EnrichmentJob.status.in_(["queued", "running"])).update(
            {
                "status": "failed",
                "error": "Interrupted: the API restarted. Start it again to continue - companies already fetched are skipped.",
                "finished_at": datetime.now(timezone.utc),
            },
            synchronize_session=False,
        )
        db.commit()
    except Exception as e:
        print(f"Could not check for interrupted enrichment jobs: {e}")
    finally:
        db.close()


def _run(job_id: int, start, end) -> None:
    db = SessionLocal()
    lines: List[str] = []

    def update(**fields) -> None:
        db.query(EnrichmentJob).filter(EnrichmentJob.id == job_id).update(fields, synchronize_session=False)
        db.commit()

    def log(message: str) -> None:
        lines.append(message)
        del lines[:-MAX_LOG_LINES]
        update(log="\n".join(lines))

    def finish(status: str, error=None) -> None:
        update(status=status, error=error, finished_at=datetime.now(timezone.utc))

    def save(nzbn: str, number: str, details=None, error=None) -> None:
        joined = lambda key: "; ".join(details[key]) if details else ""
        db.execute(UPSERT_SQL, {
            "nzbn": nzbn,
            "company_number": number,
            "source": companies_office_web.SOURCE,
            "details": json.dumps(details) if details else None,
            "phones": joined("phones"),
            "emails": joined("emails"),
            "websites": joined("websites"),
            "trading_names": joined("trading_names"),
            "error": error,
        })
        db.commit()

    try:
        todo = db.execute(text("""
            SELECT c.nzbn, c.company_identifier
            FROM companies_core_data c
            WHERE c.registration_date >= :start AND c.registration_date < :end
              AND NOT EXISTS (SELECT 1 FROM company_contact_details d WHERE d.nzbn = c.nzbn AND d.error IS NULL)
            ORDER BY c.registration_date DESC, c.nzbn
        """), {"start": start, "end": end}).all()
        update(status="running", started_at=datetime.now(timezone.utc), total=len(todo))
        log(f"{len(todo):,} companies to fetch, about {settings.CO_WEB_DELAY_SECONDS:g}s apart.")

        fetcher = companies_office_web.Fetcher()
        done = found = failed = consecutive_failures = 0
        # A company whose page is known to read fine, used to tell "these pages can't be read" apart
        # from "the site is blocking us". Replaced by this job's latest success.
        known_good_number = CANARY_COMPANY_NUMBER

        def pause() -> bool:
            """Wait between requests; True if an admin asked to stop meanwhile."""
            return _stop.wait(settings.CO_WEB_DELAY_SECONDS * random.uniform(1.0, 1.5))

        for index, (nzbn, number) in enumerate(todo):
            if index and pause():
                log(f"Stopped by an admin after {done:,} companies.")
                finish("stopped")
                return
            try:
                details = fetcher.fetch(number)
                save(nzbn, number, details=details)
                consecutive_failures = 0
                known_good_number = number
                if details["phones"] or details["emails"] or details["websites"]:
                    found += 1
            except companies_office_web.BlockedError as e:
                log(f"{number}: {e}")
                finish("failed", f"{e} after {done:,} companies - the site is refusing requests, so the job stopped. Try again later.")
                return
            except companies_office_web.PageError as e:
                save(nzbn, number, error=str(e))
                failed += 1
                consecutive_failures += 1
                log(f"{number}: {e}")
                if consecutive_failures >= MAX_CONSECUTIVE_FAILURES:
                    # Some companies' pages genuinely can't be read (e.g. when re-trying earlier
                    # failures), so check a page that works before deciding the site is blocking us.
                    if pause():
                        log(f"Stopped by an admin after {done:,} companies.")
                        finish("stopped")
                        return
                    try:
                        fetcher.fetch(known_good_number)
                    except companies_office_web.PageError as check_error:
                        update(done=done + 1, failed=failed)
                        finish("failed", f"{consecutive_failures} pages in a row couldn't be read, and neither could company "
                                         f"{known_good_number} ({check_error}) - the site may be blocking requests or its layout changed.")
                        return
                    log(f"{consecutive_failures} unreadable pages in a row, but company {known_good_number} still reads fine - carrying on.")
                    consecutive_failures = 0
            done += 1
            update(done=done, found=found, failed=failed)

        log(f"Finished: {done:,} companies, {found:,} with a phone, email or website, {failed:,} unreadable.")
        finish("succeeded")
    except Exception as e:
        try:
            log(f"[ERROR] {e}")
            finish("failed", str(e))
        except Exception as update_error:
            print(f"Enrichment job {job_id} failed ({e}) and could not be updated: {update_error}")
    finally:
        db.close()
        _slot.release()
