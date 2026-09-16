"""
XML sitemaps for search engines: an index plus one file per 50,000 companies. Only companies that
are still on the register are listed (removed companies keep their pages but are not promoted).
The site serves these at /sitemap.xml and /sitemaps/<name> by proxying to this router.
"""
import re
from xml.sax.saxutils import escape

from fastapi import APIRouter, HTTPException, Response
from sqlalchemy import text

from app.api.api_v1.endpoints.dataset import dataset_summary
from app.core.config import settings
from app.db.session import SessionLocal
from app.services.cache import ttl_cache

router = APIRouter()

CHUNK = 50_000
LIVE_FILTER = "entity_status <> 'Removed'"


# Māori macrons are common in company names; keep the letter rather than breaking the word.
MACRONS = str.maketrans("āēīōū", "aeiou")


def company_slug(name: str) -> str:
    """Must produce the same slug as companySlug() in frontend/app/lib/site.ts."""
    lowered = (name or "").lower().translate(MACRONS).replace("&", " and ")
    slug = re.sub(r"[^a-z0-9]+", "-", lowered).strip("-")[:80].strip("-")
    return slug or "company"


def company_url(nzbn: str, name: str) -> str:
    return f"{settings.SITE_URL}/companies/{nzbn}/{company_slug(name)}"


@ttl_cache(6 * 3600)
def _live_company_count() -> int:
    with SessionLocal() as db:
        return db.execute(text(f"SELECT count(*) FROM companies_core_data WHERE {LIVE_FILTER}")).scalar()


@ttl_cache(24 * 3600)
def _companies_chunk(number: int) -> str:
    with SessionLocal() as db:
        rows = db.execute(
            text(f"""
                SELECT nzbn, entity_name FROM companies_core_data
                WHERE {LIVE_FILTER} AND nzbn IS NOT NULL
                ORDER BY nzbn LIMIT :limit OFFSET :offset
            """),
            {"limit": CHUNK, "offset": (number - 1) * CHUNK},
        ).all()
    lastmod = dataset_summary()["as_at"]
    entries = "".join(
        f"<url><loc>{escape(company_url(nzbn, name))}</loc><lastmod>{lastmod}</lastmod></url>"
        for nzbn, name in rows
    )
    return f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{entries}</urlset>\n'


def _xml(body: str) -> Response:
    return Response(body, media_type="application/xml", headers={"Cache-Control": "public, max-age=3600"})


@router.get("/index.xml")
def sitemap_index():
    lastmod = dataset_summary()["as_at"]
    files = ["static.xml"] + [f"companies-{n}.xml" for n in range(1, -(-_live_company_count() // CHUNK) + 1)]
    entries = "".join(
        f"<sitemap><loc>{settings.SITE_URL}/sitemaps/{name}</loc><lastmod>{lastmod}</lastmod></sitemap>" for name in files
    )
    return _xml(f'<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{entries}</sitemapindex>\n')


@router.get("/static.xml")
def sitemap_static():
    lastmod = dataset_summary()["as_at"]
    pages = [("/", "daily", "1.0"), ("/dashboard", "weekly", "0.6")]
    entries = "".join(
        f"<url><loc>{settings.SITE_URL}{path}</loc><lastmod>{lastmod}</lastmod><changefreq>{freq}</changefreq><priority>{prio}</priority></url>"
        for path, freq, prio in pages
    )
    return _xml(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{entries}</urlset>\n')


@router.get("/companies-{number}.xml")
def sitemap_companies(number: int):
    if number < 1 or (number - 1) * CHUNK >= _live_company_count():
        raise HTTPException(status_code=404, detail="No such sitemap")
    return _xml(_companies_chunk(number))
