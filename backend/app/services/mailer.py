"""
Sends the site's few transactional emails (verify your address, reset your password) through the
operator's own SMTP mailbox. Until SMTP_* is configured nothing is sent: the message is printed to
the log instead, so accounts still work in development and on a fresh deployment.
"""
import smtplib
import ssl
from email.message import EmailMessage
from typing import Optional

from app.core.config import settings


def configured() -> bool:
    return bool(settings.SMTP_HOST and settings.SMTP_FROM)


def send(to: str, subject: str, text: str, html: Optional[str] = None) -> bool:
    """Deliver one message. Returns False (and logs) when SMTP is not configured or fails."""
    if not configured():
        print(f"[mailer] SMTP not configured; would send to {to}: {subject}\n{text}")
        return False
    message = EmailMessage()
    message["From"] = settings.SMTP_FROM
    message["To"] = to
    message["Subject"] = subject
    message.set_content(text)
    if html:
        message.add_alternative(html, subtype="html")
    try:
        if settings.SMTP_SSL:
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, context=ssl.create_default_context(), timeout=20) as smtp:
                if settings.SMTP_USER:
                    smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD or "")
                smtp.send_message(message)
        else:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as smtp:
                smtp.starttls(context=ssl.create_default_context())
                if settings.SMTP_USER:
                    smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD or "")
                smtp.send_message(message)
        return True
    except Exception as e:
        print(f"[mailer] could not send to {to}: {e}")
        return False


def _layout(title: str, body_html: str) -> str:
    return f"""<!doctype html><html><body style="margin:0;background:#F4F7FB;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0F1B2D">
<div style="max-width:520px;margin:32px auto;background:#fff;border:1px solid #E3E9F1;border-radius:12px;padding:28px">
<p style="font-size:13px;color:#64748B;margin:0 0 16px">{settings.SITE_NAME}</p>
<h1 style="font-size:20px;margin:0 0 12px">{title}</h1>
{body_html}
<p style="font-size:12px;color:#94A3B8;margin-top:24px">{settings.OPERATOR_NAME} · <a href="{settings.SITE_URL}/privacy" style="color:#94A3B8">Privacy</a></p>
</div></body></html>"""


def send_verification(to: str, link: str) -> bool:
    text = (f"Confirm your email address for {settings.SITE_NAME} by opening this link:\n\n{link}\n\n"
            "The link works for 24 hours. If you did not create an account, ignore this message.")
    html = _layout("Confirm your email address", f"""
<p>Open the link below to confirm this address for your {settings.SITE_NAME} account. It works for 24 hours.</p>
<p><a href="{link}" style="display:inline-block;background:#0F1B2D;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">Confirm email address</a></p>
<p style="font-size:13px;color:#64748B">Or copy this address into your browser:<br>{link}</p>
<p style="font-size:13px;color:#64748B">If you did not create an account, ignore this message.</p>""")
    return send(to, f"Confirm your email address - {settings.SITE_NAME}", text, html)


def send_password_reset(to: str, link: str) -> bool:
    text = (f"Reset the password for your {settings.SITE_NAME} account by opening this link:\n\n{link}\n\n"
            "The link works for one hour. If you did not ask for a reset, ignore this message; your password is unchanged.")
    html = _layout("Reset your password", f"""
<p>Open the link below to choose a new password. It works for one hour.</p>
<p><a href="{link}" style="display:inline-block;background:#0F1B2D;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">Choose a new password</a></p>
<p style="font-size:13px;color:#64748B">Or copy this address into your browser:<br>{link}</p>
<p style="font-size:13px;color:#64748B">If you did not ask for a reset, ignore this message; your password is unchanged.</p>""")
    return send(to, f"Reset your password - {settings.SITE_NAME}", text, html)
