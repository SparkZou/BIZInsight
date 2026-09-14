"""
Admin API behind the /admin page: a single admin account (ADMIN_USERNAME / ADMIN_PASSWORD from
the environment) that can upload and import the monthly Companies Office bulk data.
"""
import hmac
import os
import secrets
import shutil
import time
import zipfile
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

from fastapi import APIRouter, Cookie, Depends, File, Form, HTTPException, Request, Response, UploadFile
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api import deps
from app.core.config import settings
from app.models.import_job import ImportJob
from app.services import bulk_import, import_jobs

router = APIRouter()

COOKIE_NAME = "bizinsight_admin"
COOKIE_PATH = "/api/v1/admin"
# Without a configured key, sessions are signed with a per-process key and end on restart.
SECRET_KEY = settings.ADMIN_SECRET_KEY or secrets.token_urlsafe(32)

# There is one shared password, so slow down guessing: after MAX_FAILED_LOGINS failures from one
# address, refuse logins from it for LOCKOUT_SECONDS.
MAX_FAILED_LOGINS = 5
LOCKOUT_SECONDS = 15 * 60
_failed_logins: Dict[str, List[float]] = {}

# A sheet in Excel holds 1,048,576 rows; minus the header, that's the most a CSV saved from Excel keeps.
EXCEL_MAX_DATA_ROWS = 1_048_575
# Refuse (unless explicitly allowed) a file with this much fewer rows than the live table.
MAX_ROW_DROP = 0.2


class LoginRequest(BaseModel):
    username: str
    password: str


def require_admin(session: Optional[str] = Cookie(default=None, alias=COOKIE_NAME)) -> str:
    if session:
        try:
            claims = jwt.decode(session, SECRET_KEY, algorithms=["HS256"])
            if claims.get("sub") == settings.ADMIN_USERNAME:
                return claims["sub"]
        except JWTError:
            pass
    raise HTTPException(status_code=401, detail="Not logged in")


def _client_ip(request: Request) -> str:
    # Caddy sets X-Forwarded-For to the real client address in front of the container.
    forwarded = request.headers.get("x-forwarded-for", "")
    return forwarded.split(",")[0].strip() or (request.client.host if request.client else "unknown")


@router.post("/login")
def login(body: LoginRequest, request: Request, response: Response):
    if not settings.ADMIN_PASSWORD:
        raise HTTPException(status_code=503, detail="Admin login is not configured on this server")

    ip = _client_ip(request)
    now = time.monotonic()
    recent = [t for t in _failed_logins.get(ip, []) if now - t < LOCKOUT_SECONDS]
    if len(recent) >= MAX_FAILED_LOGINS:
        raise HTTPException(status_code=429, detail="Too many failed logins. Try again in 15 minutes.")

    # Compare both values in full so the response time doesn't reveal which one was wrong.
    username_ok = hmac.compare_digest(body.username.encode(), settings.ADMIN_USERNAME.encode())
    password_ok = hmac.compare_digest(body.password.encode(), settings.ADMIN_PASSWORD.encode())
    if not (username_ok and password_ok):
        _failed_logins[ip] = recent + [now]
        raise HTTPException(status_code=401, detail="Invalid username or password")

    _failed_logins.pop(ip, None)
    expires = datetime.now(timezone.utc) + timedelta(hours=settings.ADMIN_SESSION_HOURS)
    token = jwt.encode({"sub": settings.ADMIN_USERNAME, "exp": expires}, SECRET_KEY, algorithm="HS256")
    response.set_cookie(
        COOKIE_NAME,
        token,
        max_age=settings.ADMIN_SESSION_HOURS * 3600,
        path=COOKIE_PATH,
        httponly=True,
        secure=settings.ADMIN_COOKIE_SECURE,
        samesite="strict",
    )
    return {"username": settings.ADMIN_USERNAME}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(COOKIE_NAME, path=COOKIE_PATH)
    return {"ok": True}


@router.get("/session")
def session(username: str = Depends(require_admin)):
    return {"username": username}


def _job_dict(job: ImportJob, include_log: bool = False) -> dict:
    data = {
        "id": job.id,
        "status": job.status,
        "created_by": job.created_by,
        "source_files": job.source_files,
        "files_total": job.files_total,
        "files_done": job.files_done,
        "rows_imported": job.rows_imported,
        "error": job.error,
        "created_at": job.created_at,
        "started_at": job.started_at,
        "finished_at": job.finished_at,
    }
    if include_log:
        data["log"] = job.log
    return data


def _save_uploads(files: List[UploadFile], batch_dir: str) -> tuple:
    """Store uploaded CSVs (and the CSVs inside uploaded zips) in batch_dir. Returns (csv paths, problems)."""
    os.makedirs(batch_dir)
    problems = []
    for upload in files:
        name = os.path.basename(upload.filename or "")
        lower = name.lower()
        if not lower.endswith((".csv", ".zip")):
            hint = " Excel files can't hold the 1.8 million-row companies file - upload the original CSV or zip." if lower.endswith((".xlsx", ".xls")) else ""
            problems.append(f"{name or 'unnamed file'}: only .csv files or the bulk data .zip can be imported.{hint}")
            continue

        target = os.path.join(batch_dir, name)
        with open(target, "wb") as out:
            shutil.copyfileobj(upload.file, out, 1 << 20)
        if not lower.endswith(".zip"):
            continue

        try:
            with zipfile.ZipFile(target) as archive:
                for member in archive.infolist():
                    # basename() also stops zip entries from writing outside batch_dir.
                    member_name = os.path.basename(member.filename)
                    if member.is_dir() or not member_name.lower().endswith(".csv"):
                        continue
                    with archive.open(member) as src, open(os.path.join(batch_dir, member_name), "wb") as dst:
                        shutil.copyfileobj(src, dst, 1 << 20)
        except zipfile.BadZipFile:
            problems.append(f"{name}: not a valid zip file")
        finally:
            os.remove(target)

    csv_paths = sorted(os.path.join(batch_dir, n) for n in os.listdir(batch_dir) if n.lower().endswith(".csv"))
    tables: Dict[str, str] = {}
    for path in csv_paths:
        problems += bulk_import.validate_csv(path)
        table = bulk_import.table_name_for(path)
        if table in tables:
            problems.append(f"{tables[table]} and {os.path.basename(path)} would both replace {table}")
        tables[table] = os.path.basename(path)
    return csv_paths, problems


def _count_rows(csv_path: str) -> int:
    with open(csv_path, "rb") as f:
        lines = sum(chunk.count(b"\n") for chunk in iter(lambda: f.read(1 << 20), b""))
    return max(lines - 1, 0)


def _row_count_problems(db: Session, csv_paths: List[str], allow_row_drop: bool) -> List[str]:
    """Catch files that were cut short, e.g. by opening and saving them in Excel."""
    tables = [bulk_import.table_name_for(path) for path in csv_paths]
    live = dict(db.execute(
        text("SELECT relname, reltuples::bigint FROM pg_class WHERE relkind = 'r' AND relname = ANY(:tables)"),
        {"tables": tables},
    ).all())

    problems = []
    for path, table in zip(csv_paths, tables):
        name, rows, live_rows = os.path.basename(path), _count_rows(path), live.get(table, 0)
        if rows == EXCEL_MAX_DATA_ROWS:
            problems.append(
                f"{name}: exactly {rows:,} rows, Excel's limit - it was probably saved from Excel and is "
                "missing data. Upload the original file from the Companies Office zip."
            )
        elif not allow_row_drop and live_rows > 0 and rows < live_rows * (1 - MAX_ROW_DROP):
            problems.append(
                f"{name}: {rows:,} rows, but the live table has about {live_rows:,}. If that drop is expected "
                "(for example a dataset was split in two), tick \"Allow big row-count drops\" and upload again."
            )
    return problems


@router.post("/imports", status_code=202)
def create_import(
    files: List[UploadFile] = File(...),
    allow_row_drop: bool = Form(False),
    username: str = Depends(require_admin),
    db: Session = Depends(deps.get_db),
):
    if not import_jobs.reserve():
        raise HTTPException(status_code=409, detail="An import is already running. Wait for it to finish.")

    batch_dir = os.path.join(settings.DATA_DIR, datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S"))
    try:
        csv_paths, problems = _save_uploads(files, batch_dir)
        if not csv_paths and not problems:
            problems = ["The upload contained no CSV files."]
        if not problems:
            problems = _row_count_problems(db, csv_paths, allow_row_drop)
        if problems:
            raise HTTPException(status_code=400, detail={"message": "Nothing was imported.", "problems": problems})

        job = ImportJob(
            status="queued",
            created_by=username,
            source_files=", ".join(os.path.basename(f.filename or "") for f in files),
            files_total=len(csv_paths),
            files_done=0,
            rows_imported=0,
            log="",
        )
        db.add(job)
        db.commit()
        db.refresh(job)
    except BaseException:
        shutil.rmtree(batch_dir, ignore_errors=True)
        import_jobs.release()
        raise

    import_jobs.run_in_background(job.id, csv_paths, batch_dir)
    return _job_dict(job)


@router.get("/imports")
def list_imports(username: str = Depends(require_admin), db: Session = Depends(deps.get_db)):
    jobs = db.query(ImportJob).order_by(ImportJob.id.desc()).limit(20).all()
    return {"busy": import_jobs.is_busy(), "jobs": [_job_dict(job) for job in jobs]}


@router.get("/imports/{job_id}")
def get_import(job_id: int, username: str = Depends(require_admin), db: Session = Depends(deps.get_db)):
    job = db.get(ImportJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Import not found")
    return _job_dict(job, include_log=True)
