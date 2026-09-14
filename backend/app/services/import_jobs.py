"""
Runs bulk data imports started from the /admin page in a background thread.

The API runs as a single Uvicorn worker, so an in-process lock is enough to make sure only one
import touches the database at a time. A job that was running when the process stopped is marked
failed on the next start (see mark_interrupted_jobs).
"""
import os
import shutil
import threading
from datetime import datetime, timezone
from typing import List, Optional

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.import_job import ImportJob
from app.services import bulk_import

_slot = threading.Lock()


def reserve() -> bool:
    """Claim the single import slot. Follow with run_in_background() or release()."""
    return _slot.acquire(blocking=False)


def release() -> None:
    _slot.release()


def is_busy() -> bool:
    return _slot.locked()


def run_in_background(job_id: int, csv_paths: List[str], batch_dir: str) -> None:
    """Import csv_paths for job_id on a background thread; releases the reserved slot when done."""
    threading.Thread(
        target=_run, args=(job_id, csv_paths, batch_dir), name=f"import-job-{job_id}", daemon=True
    ).start()


def mark_interrupted_jobs() -> None:
    """Imports run in-process, so after a restart none of them can still be running."""
    db = SessionLocal()
    try:
        db.query(ImportJob).filter(ImportJob.status.in_(["queued", "running"])).update(
            {
                "status": "failed",
                "error": "Interrupted: the API restarted while this import was running.",
                "finished_at": datetime.now(timezone.utc),
            },
            synchronize_session=False,
        )
        db.commit()
    except Exception as e:
        # e.g. the migration that creates import_jobs hasn't run yet
        print(f"Could not check for interrupted imports: {e}")
    finally:
        db.close()


def _update(job_id: int, **fields) -> None:
    db = SessionLocal()
    try:
        db.query(ImportJob).filter(ImportJob.id == job_id).update(fields, synchronize_session=False)
        db.commit()
    finally:
        db.close()


def _finish(job_id: int, status: str, error: Optional[str]) -> None:
    _update(job_id, status=status, error=error, finished_at=datetime.now(timezone.utc))


def _remove_other_batches(keep_dir: str) -> None:
    """Keep only the CSVs of the latest successful import on disk."""
    for entry in os.scandir(settings.DATA_DIR):
        if entry.is_dir() and os.path.abspath(entry.path) != os.path.abspath(keep_dir):
            shutil.rmtree(entry.path, ignore_errors=True)


def _run(job_id: int, csv_paths: List[str], batch_dir: str) -> None:
    lines: List[str] = []

    def log(message: str) -> None:
        lines.append(message)
        _update(job_id, log="\n".join(lines))

    try:
        _update(job_id, status="running", started_at=datetime.now(timezone.utc))
        failed = []
        rows_imported = 0
        with bulk_import.connect() as conn:
            for done, path in enumerate(csv_paths, start=1):
                try:
                    rows_imported += bulk_import.import_file(conn, path, log=log)
                except Exception as e:
                    conn.rollback()
                    failed.append(os.path.basename(path))
                    log(f"  [ERROR] {e}")
                _update(job_id, files_done=done, rows_imported=rows_imported)

        if failed:
            log(f"Imported {len(csv_paths) - len(failed)}/{len(csv_paths)} files.")
            _finish(job_id, "failed", f"{len(failed)} of {len(csv_paths)} files failed: {', '.join(failed)}")
        else:
            log(f"Imported {len(csv_paths)}/{len(csv_paths)} files, {rows_imported:,} rows.")
            _remove_other_batches(batch_dir)
            _finish(job_id, "succeeded", None)
    except Exception as e:
        try:
            log(f"[ERROR] {e}")
            _finish(job_id, "failed", str(e))
        except Exception as update_error:
            print(f"Import job {job_id} failed ({e}) and could not be updated: {update_error}")
    finally:
        _slot.release()
