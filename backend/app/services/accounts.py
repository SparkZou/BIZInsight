"""
Visitor accounts: password hashing, the random tokens behind sessions and email links, a small
in-memory rate limiter, and the retention rule for what we store about users.

Passwords are hashed with scrypt from the standard library (no extra dependency), stored as
"scrypt$n$r$p$salt$hash". Session and email tokens are random and only their SHA-256 is stored, so
a copy of the database cannot be used to sign in.
"""
import hashlib
import hmac
import os
import secrets
import threading
import time
from datetime import datetime, timedelta, timezone
from typing import Dict, List

from sqlalchemy import text

from app.db.session import SessionLocal

SCRYPT_N, SCRYPT_R, SCRYPT_P = 2 ** 14, 8, 1

VIEW_RETENTION_DAYS = 365
VERIFY_TOKEN_HOURS = 24
RESET_TOKEN_HOURS = 1


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=SCRYPT_N, r=SCRYPT_R, p=SCRYPT_P, dklen=32)
    return f"scrypt${SCRYPT_N}${SCRYPT_R}${SCRYPT_P}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, n, r, p, salt, digest = stored.split("$")
        if scheme != "scrypt":
            return False
        candidate = hashlib.scrypt(password.encode("utf-8"), salt=bytes.fromhex(salt), n=int(n), r=int(r), p=int(p), dklen=32)
        return hmac.compare_digest(candidate.hex(), digest)
    except (ValueError, TypeError):
        return False


def new_token() -> str:
    return secrets.token_urlsafe(32)


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def now() -> datetime:
    return datetime.now(timezone.utc)


def in_hours(hours: float) -> datetime:
    return now() + timedelta(hours=hours)


class RateLimiter:
    """Allows `limit` events per `window` seconds for each key (an IP, an email)."""

    def __init__(self, limit: int, window_seconds: int):
        self.limit = limit
        self.window = window_seconds
        self._events: Dict[str, List[float]] = {}
        self._lock = threading.Lock()

    def allow(self, key: str) -> bool:
        cutoff = time.monotonic() - self.window
        with self._lock:
            recent = [t for t in self._events.get(key, []) if t > cutoff]
            self._events[key] = recent
            return len(recent) < self.limit

    def record(self, key: str) -> None:
        with self._lock:
            self._events.setdefault(key, []).append(time.monotonic())

    def reset(self, key: str) -> None:
        with self._lock:
            self._events.pop(key, None)


def purge_old_records() -> None:
    """Called on API start: drop expired sessions and links, and views older than the retention period."""
    with SessionLocal() as db:
        try:
            db.execute(text("DELETE FROM user_sessions WHERE expires_at < now()"))
            db.execute(text("DELETE FROM email_tokens WHERE expires_at < now() OR used_at IS NOT NULL"))
            db.execute(text("DELETE FROM company_views WHERE viewed_at < now() - make_interval(days => :days)"), {"days": VIEW_RETENTION_DAYS})
            db.commit()
        except Exception as e:
            # e.g. the accounts migration has not run yet
            print(f"accounts: could not purge old records: {e}")
