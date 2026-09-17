"""
The precomputed tables behind the public site.

  company_index  one row per company with everything the search, map and overview pages show:
                 industry division, region (from the registered office postcode), website,
                 director and shareholder counts, insolvency summary, and the Company Health
                 Indicator (a 0-100 score from register facts, see HEALTH_FACTORS).
  site_stats     aggregates (by region, industry, year, month, ...) stored as JSON, one row per key.

Both are rebuilt after every bulk data import (see import_jobs.py and the CLI importer), or by hand
with "python -m app.services.site_stats". company_index is built as company_index__new and swapped
in, like the register tables, so the site keeps serving while a rebuild runs.
"""
import json
import re
import sys
import time
from typing import Callable, List, Optional

import psycopg

from app.services import bulk_import
from app.services.bulk_import import quoted

# Region of the registered office, from the first four digits of its postcode. New Zealand
# postcodes are allocated by area, so ranges map to regional councils closely enough for
# statistics (a few border towns fall on the wrong side).
REGIONS_BY_POSTCODE = [
    (100, 599, "Northland"),
    (600, 2999, "Auckland"),
    (3000, 3199, "Bay of Plenty"),
    (3200, 3999, "Waikato"),
    (4000, 4099, "Gisborne"),
    (4100, 4299, "Hawke's Bay"),
    (4300, 4399, "Taranaki"),
    (4400, 4599, "Manawatū-Whanganui"),
    (4600, 4699, "Taranaki"),
    (4700, 4999, "Manawatū-Whanganui"),
    (5000, 6999, "Wellington"),
    (7000, 7199, "Nelson-Tasman"),
    (7200, 7299, "Marlborough"),
    (7300, 7799, "Canterbury"),
    (7800, 7899, "West Coast"),
    (7900, 8999, "Canterbury"),
    (9000, 9499, "Otago"),
    (9500, 9999, "Southland"),
]
REGIONS = sorted({region for _, _, region in REGIONS_BY_POSTCODE})

# ANZSIC 2006 divisions; the first letter of the industry classification code.
DIVISIONS = {
    "A": "Agriculture, Forestry and Fishing",
    "B": "Mining",
    "C": "Manufacturing",
    "D": "Electricity, Gas, Water and Waste Services",
    "E": "Construction",
    "F": "Wholesale Trade",
    "G": "Retail Trade",
    "H": "Accommodation and Food Services",
    "I": "Transport, Postal and Warehousing",
    "J": "Information Media and Telecommunications",
    "K": "Financial and Insurance Services",
    "L": "Rental, Hiring and Real Estate Services",
    "M": "Professional, Scientific and Technical Services",
    "N": "Administrative and Support Services",
    "O": "Public Administration and Safety",
    "P": "Education and Training",
    "Q": "Health Care and Social Assistance",
    "R": "Arts and Recreation Services",
    "S": "Other Services",
}
# Short labels used in URLs (must match DIVISION_SHORT in frontend/app/lib/api.ts).
DIVISION_SHORT = {
    "A": "Agriculture & fishing", "B": "Mining", "C": "Manufacturing", "D": "Utilities", "E": "Construction",
    "F": "Wholesale", "G": "Retail", "H": "Hospitality", "I": "Transport & logistics", "J": "Media & telecoms",
    "K": "Finance & insurance", "L": "Property & rental", "M": "Professional services", "N": "Admin & support",
    "O": "Public administration", "P": "Education", "Q": "Health care", "R": "Arts & recreation", "S": "Other services",
}

LIVE = "entity_status <> 'Removed'"
TOP_CITIES = 150

# Company Health Indicator: points per factor, all from register facts, and the score each label
# starts at. Documented on the site's /health-indicator page; keep the two in step. A registered
# company with no insolvency record always has at least 40 (status 25 + history 15), so
# "Established" needs ten years plus a second director or a filed website, a brand-new company
# lands in "Developing", and "Watch" is a young company with a past appointment or thin records.
HEALTH_FACTORS = {
    "age": 30, "status": 25, "insolvency": 15, "directors": 12, "ownership": 8, "presence": 10,
}
HEALTH_THRESHOLDS = {"Established": 80, "Developing": 60, "Watch": 40}
# Bump when the score, the labels, the indexes or the shape of site_stats change: the API rebuilds
# on start.
STATS_VERSION = 5

MACRONS = str.maketrans("āēīōū", "aeiou")


def slugify(name: str) -> str:
    """Must produce the same slug as slugify() in frontend/app/lib/site.ts."""
    lowered = (name or "").lower().translate(MACRONS).replace("'", "").replace("’", "").replace("&", " and ")
    slug = re.sub(r"[^a-z0-9]+", "-", lowered).strip("-")[:80].strip("-")
    return slug or "company"


def division_slug(code: str) -> str:
    return f"{code.lower()}-{slugify(DIVISION_SHORT.get(code, code))}"


def _region_case(postcode_expr: str) -> str:
    branches = "\n".join(
        f"        WHEN {postcode_expr} BETWEEN {low} AND {high} THEN '{region.replace(chr(39), chr(39) * 2)}'"
        for low, high, region in REGIONS_BY_POSTCODE
    )
    return f"CASE\n{branches}\n        ELSE NULL END"


def _columns(conn: psycopg.Connection, table: str) -> List[str]:
    rows = conn.execute(
        "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = %s",
        (table,),
    ).fetchall()
    return [row[0] for row in rows]


def _table_exists(conn: psycopg.Connection, table: str) -> bool:
    return conn.execute("SELECT to_regclass(%s) IS NOT NULL", (f"public.{table}",)).fetchone()[0]


def _first_existing(columns: List[str], *candidates: str) -> Optional[str]:
    return next((name for name in candidates if name in columns), None)


def build_company_index(conn: psycopg.Connection, log: Callable[[str], None] = print) -> int:
    started = time.monotonic()
    log("company_index: building")

    core = _columns(conn, "companies_core_data")
    office = _columns(conn, "companies_registered_office_address") if _table_exists(conn, "companies_registered_office_address") else []
    # The September 2026 extract renamed REGISTERED_OFFICE_ADDRESS_ADDRESS_n to REGISTERED_OFFICE_ADDRESS_n.
    city_col = _first_existing(office, "registered_office_address_address_3", "registered_office_address_3")
    postcode_col = _first_existing(office, "registered_office_address_postcode")
    identifier_col = _first_existing(core, "company_identifier", "incorporation_number")
    removal_col = _first_existing(core, "removal_date")
    as_at = conn.execute("SELECT max(registration_date) FROM companies_core_data").fetchone()[0]

    def distinct_on(table: str, select: str, extra_where: str = "") -> Optional[str]:
        """A DISTINCT ON (nzbn) subquery over a table that may be missing from an older extract."""
        if not _table_exists(conn, table):
            return None
        return (f"(SELECT DISTINCT ON (nzbn) nzbn, {select} FROM {quoted(table)} {extra_where} "
                f"ORDER BY nzbn, start_date DESC NULLS LAST)")

    office_sql = (
        distinct_on("companies_registered_office_address",
                    f"nullif(trim({quoted(city_col)}), '') AS city, nullif(trim({quoted(postcode_col)}), '') AS postcode")
        if city_col and postcode_col else None
    ) or "(SELECT NULL::text AS nzbn, NULL::text AS city, NULL::text AS postcode WHERE false)"
    industry_sql = distinct_on(
        "companies_business_industry_classification",
        "industry_classification_code AS code, industry_classification_description AS description",
    ) or "(SELECT NULL::text AS nzbn, NULL::text AS code, NULL::text AS description WHERE false)"
    website_sql = distinct_on(
        "companies_website", "website AS value",
        "WHERE website IS NOT NULL AND website <> '' AND lower(website) <> 'no website'",
    ) or "(SELECT NULL::text AS nzbn, NULL::text AS value WHERE false)"
    trading_sql = distinct_on(
        "companies_trading_name", "trading_name AS value",
        "WHERE trading_name IS NOT NULL AND trading_name <> '' AND lower(trading_name) <> 'no trading name'",
    ) or "(SELECT NULL::text AS nzbn, NULL::text AS value WHERE false)"
    directors_sql = (
        "(SELECT nzbn, count(*) AS n FROM companies_director GROUP BY nzbn)"
        if _table_exists(conn, "companies_director") else "(SELECT NULL::text AS nzbn, 0::bigint AS n WHERE false)"
    )
    shareholders_sql = (
        "(SELECT nzbn, count(*) AS n, bool_or(coalesce(sh_type, '') <> 'Shareholder Individual') AS corporate "
        "FROM companies_shareholder GROUP BY nzbn)"
        if _table_exists(conn, "companies_shareholder") else "(SELECT NULL::text AS nzbn, 0::bigint AS n, false AS corporate WHERE false)"
    )
    insolvency_sql = (
        "(SELECT nzbn, count(*) AS n, max(appointment_date) AS last_appointment, "
        "(array_agg(insolvency_type ORDER BY appointment_date DESC NULLS LAST))[1] AS latest_type "
        "FROM companies_insolvency GROUP BY nzbn)"
        if _table_exists(conn, "companies_insolvency")
        else "(SELECT NULL::text AS nzbn, 0::bigint AS n, NULL::date AS last_appointment, NULL::text AS latest_type WHERE false)"
    )

    postcode_expr = "CASE WHEN ro.postcode ~ '^\\d{4}$' THEN ro.postcode::int END"
    sql = f"""
        CREATE TABLE company_index__new AS
        WITH base AS (
            SELECT c.nzbn,
                   c.entity_name,
                   {('c.' + quoted(identifier_col)) if identifier_col else 'NULL::text'} AS company_identifier,
                   c.entity_type,
                   c.entity_status,
                   c.registration_date,
                   {('c.' + quoted(removal_col)) if removal_col else 'NULL::date'} AS removal_date,
                   CASE WHEN ind.code ~ '^[A-S]\\d{{6}}$' THEN left(ind.code, 1) END AS division,
                   ind.code AS industry_code,
                   ind.description AS industry,
                   initcap(lower(ro.city)) AS city,
                   ro.postcode,
                   {_region_case(postcode_expr)} AS region,
                   w.value AS website,
                   (w.value IS NOT NULL) AS has_website,
                   tn.value AS trading_name,
                   coalesce(d.n, 0)::int AS director_count,
                   coalesce(s.n, 0)::int AS shareholder_count,
                   coalesce(s.corporate, false) AS corporate_shareholder,
                   coalesce(ins.n, 0)::int AS insolvency_count,
                   ins.latest_type AS insolvency_type,
                   ins.last_appointment AS insolvency_date
            FROM companies_core_data c
            LEFT JOIN {office_sql} ro ON ro.nzbn = c.nzbn
            LEFT JOIN {industry_sql} ind ON ind.nzbn = c.nzbn
            LEFT JOIN {website_sql} w ON w.nzbn = c.nzbn
            LEFT JOIN {trading_sql} tn ON tn.nzbn = c.nzbn
            LEFT JOIN {directors_sql} d ON d.nzbn = c.nzbn
            LEFT JOIN {shareholders_sql} s ON s.nzbn = c.nzbn
            LEFT JOIN {insolvency_sql} ins ON ins.nzbn = c.nzbn
            WHERE c.nzbn IS NOT NULL
        ),
        scored AS (
            SELECT base.*,
                   (CASE WHEN registration_date IS NULL THEN 0
                         WHEN registration_date > %(as_at)s::date - interval '2 years' THEN 10
                         WHEN registration_date > %(as_at)s::date - interval '5 years' THEN 18
                         WHEN registration_date > %(as_at)s::date - interval '10 years' THEN 24
                         WHEN registration_date > %(as_at)s::date - interval '20 years' THEN 28
                         ELSE 30 END)::int AS pts_age,
                   (CASE WHEN entity_status = 'Registered' THEN 25 ELSE 0 END)::int AS pts_status,
                   (CASE WHEN insolvency_count = 0 THEN 15 WHEN entity_status = 'Registered' THEN 5 ELSE 0 END)::int AS pts_insolvency,
                   (CASE WHEN director_count = 0 THEN 0 WHEN director_count = 1 THEN 8 WHEN director_count <= 3 THEN 12 ELSE 10 END)::int AS pts_directors,
                   ((CASE WHEN shareholder_count = 0 THEN 0 ELSE 5 END) + (CASE WHEN corporate_shareholder THEN 3 ELSE 0 END))::int AS pts_ownership,
                   ((CASE WHEN has_website THEN 5 ELSE 0 END) + (CASE WHEN trading_name IS NOT NULL THEN 2 ELSE 0 END)
                    + (CASE WHEN division IS NOT NULL THEN 3 ELSE 0 END))::int AS pts_presence
            FROM base
        )
        SELECT scored.*,
               (pts_age + pts_status + pts_insolvency + pts_directors + pts_ownership + pts_presence)::int AS health_score,
               CASE WHEN entity_status = 'Removed' THEN 'Removed'
                    WHEN entity_status <> 'Registered' THEN 'Distressed'
                    WHEN pts_age + pts_status + pts_insolvency + pts_directors + pts_ownership + pts_presence >= {HEALTH_THRESHOLDS['Established']} THEN 'Established'
                    WHEN pts_age + pts_status + pts_insolvency + pts_directors + pts_ownership + pts_presence >= {HEALTH_THRESHOLDS['Developing']} THEN 'Developing'
                    WHEN pts_age + pts_status + pts_insolvency + pts_directors + pts_ownership + pts_presence >= {HEALTH_THRESHOLDS['Watch']} THEN 'Watch'
                    ELSE 'Distressed' END AS health_label
        FROM scored
    """

    # The public lists always filter and then order by registration date, so each composite index
    # is "filter columns, then registration_date DESC, nzbn" - exactly the ORDER BY the browse
    # endpoint uses (BROWSE_SORTS in endpoints/companies.py), so the first rows of a list come
    # straight off the index without a sort, and counts can be answered from the index alone.
    indexes = [
        ("company_index_nzbn_idx", "(nzbn)"),
        ("company_index_entity_name_trgm", "USING gin (entity_name gin_trgm_ops)"),
        ("company_index_identifier_idx", "(company_identifier)"),
        ("company_index_registration_date_idx", "(registration_date DESC, nzbn)"),
        ("company_index_insolvency_date_idx", "(insolvency_date DESC, nzbn)"),
        ("company_index_status_date_idx", "(entity_status, registration_date DESC, nzbn)"),
        ("company_index_region_status_date_idx", "(region, entity_status, registration_date DESC, nzbn)"),
        ("company_index_division_status_date_idx", "(division, entity_status, registration_date DESC, nzbn)"),
        ("company_index_division_region_status_date_idx", "(division, region, entity_status, registration_date DESC, nzbn)"),
        ("company_index_city_region_status_date_idx", "(city, region, entity_status, registration_date DESC, nzbn)"),
        ("company_index_health_idx", "(health_label, health_score DESC, registration_date DESC, nzbn)"),
    ]
    with conn.cursor() as cur:
        cur.execute("DROP TABLE IF EXISTS company_index__new")
        cur.execute(sql, {"as_at": as_at})
        for name, target in indexes:
            cur.execute(f"CREATE INDEX {quoted(name + '__new')} ON company_index__new {target}")
        cur.execute("ANALYZE company_index__new")
        cur.execute("DROP TABLE IF EXISTS company_index")
        cur.execute("ALTER TABLE company_index__new RENAME TO company_index")
        for name, _ in indexes:
            cur.execute(f"ALTER INDEX {quoted(name + '__new')} RENAME TO {quoted(name)}")
        rows = cur.execute("SELECT count(*) FROM company_index").fetchone()[0]
    conn.commit()
    # A fresh table has no visibility map, so index-only scans would still visit every row until
    # the first vacuum; run it now. VACUUM cannot run inside a transaction.
    conn.autocommit = True
    try:
        conn.execute("VACUUM ANALYZE company_index")
    finally:
        conn.autocommit = False
    log(f"  [OK] company_index: {rows:,} companies in {time.monotonic() - started:.1f}s")
    return rows


def _rows(conn: psycopg.Connection, sql: str, params=None) -> List[dict]:
    with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
        cur.execute(sql, params)
        return cur.fetchall()


def _json_ready(value):
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value


def build_site_stats(conn: psycopg.Connection, log: Callable[[str], None] = print) -> None:
    started = time.monotonic()
    log("site_stats: computing")
    conn.execute("""
        CREATE TABLE IF NOT EXISTS site_stats (
            key text PRIMARY KEY,
            value jsonb NOT NULL,
            computed_at timestamptz NOT NULL DEFAULT now()
        )
    """)

    as_at = conn.execute("SELECT max(registration_date) FROM company_index").fetchone()[0]
    # Windows end at the start of the snapshot month, so "last 12 months" is twelve complete months.
    boundary = conn.execute("SELECT date_trunc('month', %s::date)::date", (as_at,)).fetchone()[0]
    windows = {"boundary": boundary}
    last12 = "registration_date >= (%(boundary)s::date - interval '12 months') AND registration_date < %(boundary)s::date"
    prior12 = "registration_date >= (%(boundary)s::date - interval '24 months') AND registration_date < (%(boundary)s::date - interval '12 months')"
    removed_last12 = "removal_date >= (%(boundary)s::date - interval '12 months') AND removal_date < %(boundary)s::date"
    removed_prior12 = "removal_date >= (%(boundary)s::date - interval '24 months') AND removal_date < (%(boundary)s::date - interval '12 months')"
    liq_last12 = "insolvency_type = 'Liquidation' AND insolvency_date >= (%(boundary)s::date - interval '12 months') AND insolvency_date < %(boundary)s::date"
    months36 = "registration_date >= (%(boundary)s::date - interval '36 months')"
    stats = {}

    overview = _rows(conn, f"""
        SELECT count(*) AS total,
               count(*) FILTER (WHERE {LIVE}) AS live,
               count(*) FILTER (WHERE entity_status = 'Registered') AS registered,
               count(*) FILTER (WHERE entity_status = 'Removed') AS removed,
               count(*) FILTER (WHERE {LIVE} AND entity_status <> 'Registered') AS distressed,
               count(*) FILTER (WHERE {last12}) AS registered_last12,
               count(*) FILTER (WHERE {prior12}) AS registered_prior12,
               count(*) FILTER (WHERE {removed_last12}) AS removed_last12,
               count(*) FILTER (WHERE {removed_prior12}) AS removed_prior12,
               count(*) FILTER (WHERE {LIVE} AND has_website) AS live_with_website,
               count(*) FILTER (WHERE {LIVE} AND division IS NOT NULL) AS live_with_industry,
               count(*) FILTER (WHERE {liq_last12}) AS liquidations_last12,
               count(DISTINCT city) FILTER (WHERE {LIVE}) AS cities,
               count(DISTINCT region) FILTER (WHERE {LIVE}) AS regions
        FROM company_index
    """, windows)[0]
    overview["as_at"] = as_at
    overview["window_end"] = boundary
    overview["divisions"] = len(DIVISIONS)
    stats["overview"] = overview

    stats["regions"] = _rows(conn, f"""
        SELECT coalesce(region, 'Unknown') AS region,
               count(*) FILTER (WHERE {LIVE}) AS live,
               count(*) FILTER (WHERE {last12}) AS last12,
               count(*) FILTER (WHERE {prior12}) AS prior12,
               count(*) FILTER (WHERE {LIVE} AND has_website) AS with_website,
               count(*) FILTER (WHERE {liq_last12}) AS liquidations_last12,
               count(*) FILTER (WHERE {LIVE} AND health_label = 'Established') AS established
        FROM company_index
        GROUP BY region ORDER BY live DESC
    """, windows)
    region_cities = _rows(conn, f"""
        SELECT region, city, n FROM (
            SELECT region, city, count(*) AS n, row_number() OVER (PARTITION BY region ORDER BY count(*) DESC) AS rank
            FROM company_index WHERE {LIVE} AND region IS NOT NULL AND city IS NOT NULL
            GROUP BY region, city
        ) ranked WHERE rank <= 8 ORDER BY region, n DESC
    """)
    region_divisions = _rows(conn, f"""
        SELECT region, division, n FROM (
            SELECT region, division, count(*) AS n, row_number() OVER (PARTITION BY region ORDER BY count(*) DESC) AS rank
            FROM company_index WHERE {LIVE} AND region IS NOT NULL AND division IS NOT NULL
            GROUP BY region, division
        ) ranked WHERE rank <= 8 ORDER BY region, n DESC
    """)
    for region in stats["regions"]:
        region["slug"] = slugify(region["region"]) if region["region"] != "Unknown" else None
        region["top_cities"] = [{"city": r["city"], "slug": slugify(r["city"]), "live": r["n"]} for r in region_cities if r["region"] == region["region"]]
        region["top_divisions"] = [
            {"code": r["division"], "name": DIVISIONS.get(r["division"], r["division"]), "live": r["n"]}
            for r in region_divisions if r["region"] == region["region"]
        ]

    divisions = _rows(conn, f"""
        SELECT division AS code,
               count(*) FILTER (WHERE {LIVE}) AS live,
               count(*) FILTER (WHERE {last12}) AS last12,
               count(*) FILTER (WHERE {prior12}) AS prior12,
               count(*) FILTER (WHERE {liq_last12}) AS liquidations_last12,
               count(*) FILTER (WHERE {LIVE} AND registration_date <= (%(boundary)s::date - interval '10 years')) AS live_10y_plus,
               count(*) FILTER (WHERE {LIVE} AND has_website) AS with_website,
               count(*) FILTER (WHERE {LIVE} AND health_label = 'Established') AS established,
               round(avg(health_score) FILTER (WHERE {LIVE}), 1) AS avg_health
        FROM company_index WHERE division IS NOT NULL
        GROUP BY division ORDER BY live DESC
    """, windows)
    division_classes = _rows(conn, f"""
        SELECT division, code, description, n FROM (
            SELECT division, industry_code AS code, mode() WITHIN GROUP (ORDER BY industry) AS description, count(*) AS n,
                   row_number() OVER (PARTITION BY division ORDER BY count(*) DESC) AS rank
            FROM company_index
            WHERE {LIVE} AND division IS NOT NULL AND industry_code ~ '^[A-S]\\d{{6}}$' AND industry !~ '^[A-Z]\\d{{6}}$'
            GROUP BY division, industry_code
        ) ranked WHERE rank <= 12 ORDER BY division, n DESC
    """)
    division_regions = _rows(conn, f"""
        SELECT division, region,
               count(*) FILTER (WHERE {LIVE}) AS live,
               count(*) FILTER (WHERE {last12}) AS last12,
               count(*) FILTER (WHERE {prior12}) AS prior12
        FROM company_index WHERE division IS NOT NULL AND region IS NOT NULL
        GROUP BY division, region ORDER BY division, live DESC
    """, windows)
    for row in divisions:
        row["name"] = DIVISIONS.get(row["code"], row["code"])
        row["short"] = DIVISION_SHORT.get(row["code"], row["code"])
        row["slug"] = division_slug(row["code"])
        row["liquidations_per_1000"] = round(row["liquidations_last12"] * 1000 / row["live"], 1) if row["live"] else None
        row["established_share"] = round(row["live_10y_plus"] / row["live"], 3) if row["live"] else None
        row["avg_health"] = float(row["avg_health"]) if row["avg_health"] is not None else None
        row["top_classes"] = [{"code": r["code"], "description": r["description"], "live": r["n"]} for r in division_classes if r["division"] == row["code"]]
        row["regions"] = [
            {"region": r["region"], "slug": slugify(r["region"]), "live": r["live"], "last12": r["last12"], "prior12": r["prior12"]}
            for r in division_regions if r["division"] == row["code"]
        ]
    stats["divisions"] = divisions

    # A few rows carry a code where the description should be; the most common description wins.
    stats["top_industries"] = _rows(conn, f"""
        SELECT industry_code AS code, mode() WITHIN GROUP (ORDER BY industry) AS description, count(*) AS live
        FROM company_index WHERE {LIVE} AND industry_code ~ '^[A-S]\\d{{6}}$' AND industry !~ '^[A-Z]\\d{{6}}$'
        GROUP BY industry_code ORDER BY live DESC LIMIT 20
    """)

    cities = _rows(conn, f"""
        SELECT city, region,
               count(*) FILTER (WHERE {LIVE}) AS live,
               count(*) FILTER (WHERE {last12}) AS last12,
               count(*) FILTER (WHERE {prior12}) AS prior12,
               count(*) FILTER (WHERE {LIVE} AND has_website) AS with_website
        FROM company_index WHERE city IS NOT NULL AND region IS NOT NULL
        GROUP BY city, region ORDER BY live DESC LIMIT {TOP_CITIES}
    """, windows)
    city_divisions = _rows(conn, f"""
        SELECT city, region, division, n FROM (
            SELECT city, region, division, count(*) AS n, row_number() OVER (PARTITION BY city, region ORDER BY count(*) DESC) AS rank
            FROM company_index
            WHERE {LIVE} AND division IS NOT NULL AND (city, region) IN (
                SELECT city, region FROM company_index WHERE {LIVE} AND city IS NOT NULL AND region IS NOT NULL
                GROUP BY city, region ORDER BY count(*) DESC LIMIT {TOP_CITIES}
            )
            GROUP BY city, region, division
        ) ranked WHERE rank <= 6 ORDER BY city, n DESC
    """)
    for city in cities:
        city["slug"] = slugify(city["city"])
        city["region_slug"] = slugify(city["region"])
        city["top_divisions"] = [
            {"code": r["division"], "name": DIVISIONS.get(r["division"], r["division"]), "live": r["n"]}
            for r in city_divisions if r["city"] == city["city"] and r["region"] == city["region"]
        ]
    stats["cities"] = cities

    stats["years"] = _rows(conn, """
        SELECT year, sum(registrations)::int AS registrations, sum(removals)::int AS removals FROM (
            SELECT extract(year FROM registration_date)::int AS year, count(*) AS registrations, 0 AS removals
            FROM company_index WHERE registration_date IS NOT NULL GROUP BY 1
            UNION ALL
            SELECT extract(year FROM removal_date)::int, 0, count(*)
            FROM company_index WHERE removal_date IS NOT NULL GROUP BY 1
        ) both_series WHERE year >= 1900 GROUP BY year ORDER BY year
    """)
    months = _rows(conn, f"""
        SELECT month, sum(registrations)::int AS registrations, sum(removals)::int AS removals FROM (
            SELECT to_char(registration_date, 'YYYY-MM') AS month, count(*) AS registrations, 0 AS removals
            FROM company_index WHERE {months36} GROUP BY 1
            UNION ALL
            SELECT to_char(removal_date, 'YYYY-MM'), 0, count(*)
            FROM company_index WHERE removal_date >= (%(boundary)s::date - interval '36 months') GROUP BY 1
        ) both_series GROUP BY month ORDER BY month
    """, windows)
    month_regions = _rows(conn, f"""
        SELECT to_char(registration_date, 'YYYY-MM') AS month, coalesce(region, 'Unknown') AS region, count(*) AS n
        FROM company_index WHERE {months36} GROUP BY 1, 2 ORDER BY 1, n DESC
    """, windows)
    month_divisions = _rows(conn, f"""
        SELECT to_char(registration_date, 'YYYY-MM') AS month, division, count(*) AS n
        FROM company_index WHERE {months36} AND division IS NOT NULL GROUP BY 1, 2 ORDER BY 1, n DESC
    """, windows)
    for month in months:
        month["by_region"] = [{"region": r["region"], "live": r["n"]} for r in month_regions if r["month"] == month["month"]]
        month["by_division"] = [{"code": r["division"], "name": DIVISION_SHORT.get(r["division"], r["division"]), "live": r["n"]} for r in month_divisions if r["month"] == month["month"]]
        month["complete"] = month["month"] < boundary.strftime("%Y-%m")
    stats["months"] = months

    stats["directors"] = _rows(conn, f"""
        SELECT CASE WHEN director_count >= 4 THEN '4+' ELSE director_count::text END AS bucket, count(*) AS live
        FROM company_index WHERE {LIVE} GROUP BY 1 ORDER BY min(director_count)
    """)
    stats["ownership"] = _rows(conn, f"""
        SELECT CASE WHEN shareholder_count = 0 THEN 'none' WHEN corporate_shareholder THEN 'corporate' ELSE 'individual' END AS kind,
               count(*) AS live
        FROM company_index WHERE {LIVE} GROUP BY 1 ORDER BY live DESC
    """)
    stats["shareholders"] = _rows(conn, f"""
        SELECT CASE WHEN shareholder_count >= 5 THEN '5+' ELSE shareholder_count::text END AS bucket, count(*) AS live
        FROM company_index WHERE {LIVE} GROUP BY 1 ORDER BY min(shareholder_count)
    """)
    stats["age"] = _rows(conn, f"""
        SELECT bucket, count(*) AS live FROM (
            SELECT CASE
                WHEN registration_date > %(boundary)s::date - interval '1 year' THEN 'Under 1 year'
                WHEN registration_date > %(boundary)s::date - interval '3 years' THEN '1-3 years'
                WHEN registration_date > %(boundary)s::date - interval '5 years' THEN '3-5 years'
                WHEN registration_date > %(boundary)s::date - interval '10 years' THEN '5-10 years'
                WHEN registration_date > %(boundary)s::date - interval '20 years' THEN '10-20 years'
                ELSE '20+ years' END AS bucket,
                CASE
                WHEN registration_date > %(boundary)s::date - interval '1 year' THEN 1
                WHEN registration_date > %(boundary)s::date - interval '3 years' THEN 2
                WHEN registration_date > %(boundary)s::date - interval '5 years' THEN 3
                WHEN registration_date > %(boundary)s::date - interval '10 years' THEN 4
                WHEN registration_date > %(boundary)s::date - interval '20 years' THEN 5
                ELSE 6 END AS ordinal
            FROM company_index WHERE {LIVE} AND registration_date IS NOT NULL
        ) buckets GROUP BY bucket, ordinal ORDER BY ordinal
    """, windows)
    stats["health"] = _rows(conn, f"""
        SELECT health_label AS label, count(*) AS live FROM company_index WHERE {LIVE} GROUP BY 1 ORDER BY live DESC
    """)
    stats["entity_types"] = _rows(conn, f"""
        SELECT entity_type AS type, count(*) AS live FROM company_index WHERE {LIVE} GROUP BY 1 ORDER BY live DESC
    """)
    stats["status_mix"] = _rows(conn, """
        SELECT CASE WHEN entity_status IN ('Registered', 'Removed') THEN entity_status ELSE 'In liquidation, receivership or administration' END AS status,
               count(*) AS companies
        FROM company_index GROUP BY 1 ORDER BY companies DESC
    """)
    if _table_exists(conn, "companies_insolvency"):
        stats["insolvency_years"] = _rows(conn, """
            SELECT extract(year FROM appointment_date)::int AS year,
                   count(*) FILTER (WHERE insolvency_type = 'Liquidation') AS liquidation,
                   count(*) FILTER (WHERE insolvency_type = 'Receivership') AS receivership,
                   count(*) FILTER (WHERE insolvency_type = 'Voluntary Administration') AS voluntary_administration
            FROM companies_insolvency
            WHERE appointment_date >= (%(boundary)s::date - interval '15 years') AND appointment_date < %(boundary)s::date
            GROUP BY 1 ORDER BY 1
        """, windows)
        insolvency_months = _rows(conn, """
            SELECT to_char(appointment_date, 'YYYY-MM') AS month,
                   count(*) AS total,
                   count(*) FILTER (WHERE insolvency_type = 'Liquidation') AS liquidation,
                   count(*) FILTER (WHERE insolvency_type = 'Receivership') AS receivership,
                   count(*) FILTER (WHERE insolvency_type = 'Voluntary Administration') AS voluntary_administration,
                   count(DISTINCT nzbn) AS companies
            FROM companies_insolvency
            WHERE appointment_date >= (%(boundary)s::date - interval '36 months')
            GROUP BY 1 ORDER BY 1
        """, windows)
        insolvency_month_divisions = _rows(conn, """
            SELECT to_char(i.appointment_date, 'YYYY-MM') AS month, c.division, count(DISTINCT i.nzbn) AS n
            FROM companies_insolvency i JOIN company_index c ON c.nzbn = i.nzbn
            WHERE i.appointment_date >= (%(boundary)s::date - interval '36 months') AND c.division IS NOT NULL
            GROUP BY 1, 2 ORDER BY 1, n DESC
        """, windows)
        insolvency_month_regions = _rows(conn, """
            SELECT to_char(i.appointment_date, 'YYYY-MM') AS month, coalesce(c.region, 'Unknown') AS region, count(DISTINCT i.nzbn) AS n
            FROM companies_insolvency i JOIN company_index c ON c.nzbn = i.nzbn
            WHERE i.appointment_date >= (%(boundary)s::date - interval '36 months')
            GROUP BY 1, 2 ORDER BY 1, n DESC
        """, windows)
        for month in insolvency_months:
            month["by_division"] = [{"code": r["division"], "name": DIVISION_SHORT.get(r["division"], r["division"]), "companies": r["n"]} for r in insolvency_month_divisions if r["month"] == month["month"]]
            month["by_region"] = [{"region": r["region"], "companies": r["n"]} for r in insolvency_month_regions if r["month"] == month["month"]]
            month["complete"] = month["month"] < boundary.strftime("%Y-%m")
        stats["insolvency_months"] = insolvency_months
    stats["newest"] = _rows(conn, f"""
        SELECT nzbn, entity_name, entity_status, registration_date, city, region, division, industry
        FROM company_index WHERE {LIVE} AND registration_date IS NOT NULL
        ORDER BY registration_date DESC, nzbn LIMIT 12
    """)
    stats["version"] = {"version": STATS_VERSION, "health_thresholds": HEALTH_THRESHOLDS}

    with conn.cursor() as cur:
        for key, value in stats.items():
            cur.execute(
                "INSERT INTO site_stats (key, value, computed_at) VALUES (%s, %s::jsonb, now()) "
                "ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, computed_at = now()",
                (key, json.dumps(value, default=_json_ready)),
            )
    conn.commit()
    log(f"  [OK] site_stats: {len(stats)} keys in {time.monotonic() - started:.1f}s")


def rebuild(conn: psycopg.Connection, log: Callable[[str], None] = print) -> None:
    """Rebuild company_index and site_stats from the register tables."""
    if not _table_exists(conn, "companies_core_data"):
        log("site_stats: companies_core_data is not loaded yet; nothing to build")
        return
    build_company_index(conn, log)
    build_site_stats(conn, log)


def ensure_built_in_background() -> None:
    """
    Called when the API starts: if the precomputed tables are missing or older than this code
    expects (no health_score column yet), build them on a background thread, so the public site
    comes up on its own a couple of minutes later instead of needing a manual step.
    """
    import threading

    def attempt() -> bool:
        with bulk_import.connect() as conn:
            current = False
            if _table_exists(conn, "company_index") and _table_exists(conn, "site_stats"):
                row = conn.execute("SELECT value FROM site_stats WHERE key = 'version'").fetchone()
                current = bool(row) and row[0].get("version") == STATS_VERSION
            if current:
                return True
            print("site_stats: precomputed tables missing or outdated, building them now")
            rebuild(conn)
            return True

    def run() -> None:
        # A deploy can restart the database while this runs (its container is recreated when its
        # settings change), which drops the connection mid-build; wait and try again.
        for wait in (0, 30, 90, 300):
            time.sleep(wait)
            try:
                if attempt():
                    return
            except Exception as e:
                print(f"site_stats: could not build the precomputed tables ({e}); retrying")
        print("site_stats: giving up; run 'python -m app.services.site_stats' by hand")

    threading.Thread(target=run, name="site-stats-bootstrap", daemon=True).start()


if __name__ == "__main__":
    with bulk_import.connect() as connection:
        rebuild(connection)
    sys.exit(0)
