"""
Visitor accounts: register, sign in and out, confirm an email address, reset a password, and the
log of what a signed-in user looked at (which they can read and clear themselves).

The session is an HttpOnly cookie on the site's root path, so the server-rendered pages can pass
it on to the API when they load.
"""
import re
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api import deps
from app.core.config import settings
from app.models.account import CompanyView, EmailToken, User, UserSession
from app.services import accounts, mailer

router = APIRouter()

COOKIE_NAME = "nzci_session"
COOKIE_PATH = "/"
VIEW_KINDS = {"profile", "person", "person_search"}

# Five failed sign-ins per address per 15 minutes; ten new accounts per address per hour.
_login_failures = accounts.RateLimiter(limit=5, window_seconds=15 * 60)
_registrations = accounts.RateLimiter(limit=10, window_seconds=60 * 60)
_email_sends = accounts.RateLimiter(limit=3, window_seconds=15 * 60)


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenRequest(BaseModel):
    token: str


class EmailRequest(BaseModel):
    email: EmailStr


class ResetRequest(BaseModel):
    token: str
    password: str


class ViewRequest(BaseModel):
    kind: str
    subject: str
    label: Optional[str] = None


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    return (forwarded.split(",")[0].strip() if forwarded else request.client.host if request.client else "unknown")[:45]


def _check_password(password: str) -> None:
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Use a password of at least 8 characters.")
    if len(password) > 200:
        raise HTTPException(status_code=400, detail="That password is too long.")


def _user_dict(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "verified": user.email_verified_at is not None,
        "created_at": user.created_at,
        # Person-level pages need a confirmed address once the site can send mail.
        "can_view_people": user.email_verified_at is not None or not mailer.configured(),
        "email_configured": mailer.configured(),
    }


def _start_session(db: Session, user: User, request: Request, response: Response) -> None:
    token = accounts.new_token()
    expires = accounts.now() + timedelta(days=settings.USER_SESSION_DAYS)
    db.add(UserSession(
        user_id=user.id, token_hash=accounts.token_hash(token), expires_at=expires, last_seen_at=accounts.now(),
        ip=_client_ip(request), user_agent=(request.headers.get("user-agent") or "")[:255],
    ))
    user.last_login_at = accounts.now()
    db.commit()
    response.set_cookie(
        COOKIE_NAME, token, max_age=settings.USER_SESSION_DAYS * 86400, path=COOKIE_PATH,
        httponly=True, secure=settings.ADMIN_COOKIE_SECURE, samesite="lax",
    )


def current_user(
    session: Optional[str] = Cookie(default=None, alias=COOKIE_NAME),
    db: Session = Depends(deps.get_db),
) -> Optional[User]:
    """The signed-in user, or None. Touches the session's last_seen_at at most once a minute."""
    if not session:
        return None
    row = db.query(UserSession).filter(UserSession.token_hash == accounts.token_hash(session)).first()
    if not row or row.expires_at < accounts.now():
        return None
    user = db.get(User, row.user_id)
    if not user or user.disabled_at:
        return None
    if not row.last_seen_at or row.last_seen_at < accounts.now() - timedelta(minutes=1):
        row.last_seen_at = accounts.now()
        db.commit()
    return user


def require_user(user: Optional[User] = Depends(current_user)) -> User:
    if not user:
        raise HTTPException(status_code=401, detail="Sign in to use this.")
    return user


def require_people_access(user: User = Depends(require_user)) -> User:
    if mailer.configured() and not user.email_verified_at:
        raise HTTPException(status_code=403, detail="Confirm your email address first - check your inbox for the link.")
    return user


def _send_verification(db: Session, user: User) -> bool:
    token = accounts.new_token()
    db.add(EmailToken(user_id=user.id, kind="verify", token_hash=accounts.token_hash(token), expires_at=accounts.in_hours(accounts.VERIFY_TOKEN_HOURS)))
    db.commit()
    return mailer.send_verification(user.email, f"{settings.SITE_URL}/account/verify?token={token}")


@router.post("/register", status_code=201)
def register(body: RegisterRequest, request: Request, response: Response, db: Session = Depends(deps.get_db)):
    ip = _client_ip(request)
    if not _registrations.allow(ip):
        raise HTTPException(status_code=429, detail="Too many accounts created from this address; try again later.")
    _check_password(body.password)
    email = body.email.lower().strip()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="An account with that email address already exists. Sign in instead.")
    name = re.sub(r"\s+", " ", (body.name or "").strip())[:100] or None
    user = User(email=email, name=name, password_hash=accounts.hash_password(body.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    _registrations.record(ip)
    sent = _send_verification(db, user) if mailer.configured() else False
    _start_session(db, user, request, response)
    return {"user": _user_dict(user), "verification_sent": sent}


@router.post("/login")
def login(body: LoginRequest, request: Request, response: Response, db: Session = Depends(deps.get_db)):
    ip = _client_ip(request)
    email = body.email.lower().strip()
    key = f"{ip}|{email}"
    if not _login_failures.allow(key):
        raise HTTPException(status_code=429, detail="Too many failed sign-ins. Wait 15 minutes and try again.")
    user = db.query(User).filter(User.email == email).first()
    if not user or user.disabled_at or not accounts.verify_password(body.password, user.password_hash):
        _login_failures.record(key)
        raise HTTPException(status_code=401, detail="That email and password do not match.")
    _login_failures.reset(key)
    _start_session(db, user, request, response)
    return {"user": _user_dict(user)}


@router.post("/logout")
def logout(
    response: Response,
    session: Optional[str] = Cookie(default=None, alias=COOKIE_NAME),
    db: Session = Depends(deps.get_db),
):
    if session:
        db.query(UserSession).filter(UserSession.token_hash == accounts.token_hash(session)).delete()
        db.commit()
    response.delete_cookie(COOKIE_NAME, path=COOKIE_PATH)
    return {"signed_out": True}


@router.get("/me")
def me(user: Optional[User] = Depends(current_user)):
    return {"user": _user_dict(user) if user else None, "email_configured": mailer.configured()}


@router.post("/verify")
def verify_email(body: TokenRequest, db: Session = Depends(deps.get_db)):
    token = db.query(EmailToken).filter(EmailToken.token_hash == accounts.token_hash(body.token), EmailToken.kind == "verify").first()
    if not token or token.used_at or token.expires_at < accounts.now():
        raise HTTPException(status_code=400, detail="This link has expired or was already used. Request a new one from your account page.")
    user = db.get(User, token.user_id)
    if not user:
        raise HTTPException(status_code=400, detail="This link no longer matches an account.")
    user.email_verified_at = user.email_verified_at or accounts.now()
    token.used_at = accounts.now()
    db.commit()
    return {"verified": True, "user": _user_dict(user)}


@router.post("/resend-verification")
def resend_verification(user: User = Depends(require_user), db: Session = Depends(deps.get_db)):
    if user.email_verified_at:
        return {"sent": False, "already_verified": True}
    if not mailer.configured():
        return {"sent": False, "email_configured": False}
    if not _email_sends.allow(user.email):
        raise HTTPException(status_code=429, detail="A link was sent recently; check your inbox (and spam folder) before asking again.")
    _email_sends.record(user.email)
    return {"sent": _send_verification(db, user)}


@router.post("/forgot")
def forgot_password(body: EmailRequest, db: Session = Depends(deps.get_db)):
    """Always answers the same way, so the form cannot be used to find out who has an account."""
    email = body.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()
    if user and not user.disabled_at and mailer.configured() and _email_sends.allow(email):
        _email_sends.record(email)
        token = accounts.new_token()
        db.add(EmailToken(user_id=user.id, kind="reset", token_hash=accounts.token_hash(token), expires_at=accounts.in_hours(accounts.RESET_TOKEN_HOURS)))
        db.commit()
        mailer.send_password_reset(user.email, f"{settings.SITE_URL}/account/reset?token={token}")
    return {"accepted": True, "email_configured": mailer.configured()}


@router.post("/reset")
def reset_password(body: ResetRequest, request: Request, response: Response, db: Session = Depends(deps.get_db)):
    _check_password(body.password)
    token = db.query(EmailToken).filter(EmailToken.token_hash == accounts.token_hash(body.token), EmailToken.kind == "reset").first()
    if not token or token.used_at or token.expires_at < accounts.now():
        raise HTTPException(status_code=400, detail="This link has expired or was already used. Ask for a new one.")
    user = db.get(User, token.user_id)
    if not user:
        raise HTTPException(status_code=400, detail="This link no longer matches an account.")
    user.password_hash = accounts.hash_password(body.password)
    user.email_verified_at = user.email_verified_at or accounts.now()  # the link proves the address
    token.used_at = accounts.now()
    # A reset signs every other browser out.
    db.query(UserSession).filter(UserSession.user_id == user.id).delete()
    db.commit()
    _start_session(db, user, request, response)
    return {"reset": True, "user": _user_dict(user)}


@router.post("/views", status_code=201)
def record_view(body: ViewRequest, user: User = Depends(require_user), db: Session = Depends(deps.get_db)):
    """Notes that the user looked at a company, a person, or searched a name. Repeats within an hour are not stored again."""
    if body.kind not in VIEW_KINDS:
        raise HTTPException(status_code=400, detail=f"kind must be one of: {', '.join(sorted(VIEW_KINDS))}")
    subject = body.subject.strip()[:200]
    if not subject:
        raise HTTPException(status_code=400, detail="subject is required")
    recent = db.execute(
        text("SELECT 1 FROM company_views WHERE user_id = :user_id AND kind = :kind AND subject = :subject AND viewed_at > now() - interval '1 hour' LIMIT 1"),
        {"user_id": user.id, "kind": body.kind, "subject": subject},
    ).first()
    if recent:
        return {"recorded": False}
    db.add(CompanyView(user_id=user.id, kind=body.kind, subject=subject, label=(body.label or "").strip()[:200] or None))
    db.commit()
    return {"recorded": True}


@router.get("/me/views")
def my_views(limit: int = 100, user: User = Depends(require_user), db: Session = Depends(deps.get_db)):
    rows = (
        db.query(CompanyView).filter(CompanyView.user_id == user.id)
        .order_by(CompanyView.viewed_at.desc()).limit(min(max(limit, 1), 500)).all()
    )
    total = db.query(CompanyView).filter(CompanyView.user_id == user.id).count()
    return {
        "total": total,
        "retention_days": accounts.VIEW_RETENTION_DAYS,
        "views": [{"kind": r.kind, "subject": r.subject, "label": r.label, "viewed_at": r.viewed_at} for r in rows],
    }


@router.delete("/me/views")
def clear_my_views(user: User = Depends(require_user), db: Session = Depends(deps.get_db)):
    deleted = db.query(CompanyView).filter(CompanyView.user_id == user.id).delete()
    db.commit()
    return {"deleted": deleted}


@router.delete("/me")
def delete_account(user: User = Depends(require_user), response: Response = None, db: Session = Depends(deps.get_db)):
    """Removes the account and everything stored about it (sessions, links, view history)."""
    db.delete(user)
    db.commit()
    if response is not None:
        response.delete_cookie(COOKIE_NAME, path=COOKIE_PATH)
    return {"deleted": True}


def touch(user: Optional[User]) -> Optional[datetime]:
    """Helper for other modules: the time to stamp on records they create for this user."""
    return datetime.now(timezone.utc) if user else None
