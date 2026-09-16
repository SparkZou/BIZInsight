"""
XML sitemaps for search engines: an index plus one file per 50,000 companies, and one file with
the industry, region, city and monthly pages. Only companies that are still on the register are
listed (removed companies keep their pages but are not promoted). The site serves these at
/sitemap.xml and /sitemaps/<name> by proxying to this router.
"""
from xml.sax.saxutils import escape

from fastapi import APIRouter, HTTPException, Response
from sqlalchemy import text

from app.api.api_v1.endpoints.dataset import dataset_summary
from app.api.api_v1.endpoints.insights import all_stats
from app.core.config import settings
from app.db.session import SessionLocal
from app.services.cache import ttl_cache
from app.services.site_stats import slugify

router = APIRouter()

CHUNK = 50_000
LIVE_FILTER = "entity_status <> 'Removed'"

# Kept for callers that imported it from here.
company_slug = slugify


def company_url(nzbn: str, name: str) -> str:
    return f"{settings.SITE_URL}/companies/{nzbn}/{slugify(name)}"


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
    return _urlset(entries)


def _urlset(entries: str) -> str:
    return f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{entries}</urlset>\n'


def _xml(body: str) -> Response:
    return Response(body, media_type="application/xml", headers={"Cache-Control": "public, max-age=3600"})


def _entry(path: str, lastmod: str, changefreq: str = "monthly", priority: str = "0.6") -> str:
    return (f"<url><loc>{escape(settings.SITE_URL + path)}</loc><lastmod>{lastmod}</lastmod>"
            f"<changefreq>{changefreq}</changefreq><priority>{priority}</priority></url>")


@ttl_cache(3600)
def _pages_sitemap() -> str:
    """The overview, industry, region, city and monthly pages, all built from site_stats."""
    lastmod = dataset_summary()["as_at"]
    stats = all_stats()
    entries = [
        _entry("/", lastmod, "daily", "1.0"),
        _entry("/map", lastmod, "weekly", "0.7"),
        _entry("/job-seekers", lastmod, "weekly", "0.7"),
        _entry("/industries", lastmod, "weekly", "0.8"),
        _entry("/locations", lastmod, "weekly", "0.8"),
        _entry("/new-companies", lastmod, "monthly", "0.7"),
        _entry("/insolvencies", lastmod, "monthly", "0.6"),
        _entry("/health-indicator", lastmod, "monthly", "0.5"),
        _entry("/data-sources", lastmod, "monthly", "0.5"),
    ]
    for division in stats.get("divisions", []):
        entries.append(_entry(f"/industries/{division['slug']}", lastmod, "monthly", "0.7"))
        for region in division.get("regions", []):
            if region["live"] >= 50:
                entries.append(_entry(f"/industries/{division['slug']}/{region['slug']}", lastmod, "monthly", "0.6"))
    for region in stats.get("regions", []):
        if region.get("slug"):
            entries.append(_entry(f"/locations/{region['slug']}", lastmod, "monthly", "0.7"))
    for city in stats.get("cities", []):
        entries.append(_entry(f"/locations/{city['region_slug']}/{city['slug']}", lastmod, "monthly", "0.6"))
    for month in stats.get("months", []):
        if month.get("complete"):
            entries.append(_entry(f"/new-companies/{month['month']}", lastmod, "monthly", "0.6"))
    for month in stats.get("insolvency_months", []):
        if month.get("complete"):
            entries.append(_entry(f"/insolvencies/{month['month']}", lastmod, "monthly", "0.5"))
    return _urlset("".join(entries))


@router.get("/index.xml")
def sitemap_index():
    lastmod = dataset_summary()["as_at"]
    files = ["pages.xml"] + [f"companies-{n}.xml" for n in range(1, -(-_live_company_count() // CHUNK) + 1)]
    entries = "".join(
        f"<sitemap><loc>{settings.SITE_URL}/sitemaps/{name}</loc><lastmod>{lastmod}</lastmod></sitemap>" for name in files
    )
    return _xml(f'<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{entries}</sitemapindex>\n')


@router.get("/pages.xml")
def sitemap_pages():
    return _xml(_pages_sitemap())


@router.get("/static.xml")
def sitemap_static():
    # Older name for the pages file.
    return _xml(_pages_sitemap())


@router.get("/companies-{number}.xml")
def sitemap_companies(number: int):
    if number < 1 or (number - 1) * CHUNK >= _live_company_count():
        raise HTTPException(status_code=404, detail="No such sitemap")
    return _xml(_companies_chunk(number))
