"""
The precomputed tables behind the public site.

  company_index  one row per company with everything the search, map and overview pages show:
                 industry division, region (from the registered office postcode), website,
                 director and shareholder counts, insolvency summary.
  site_stats     aggregates (by region, industry, year, month, ...) stored as JSON, one row per key.

Both are rebuilt after every bulk data import (see import_jobs.py and the CLI importer), or by hand
with "python -m app.services.site_stats". company_index is built as company_index__new and swapped
in, like the register tables, so the site keeps serving while a rebuild runs.
"""
import json
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

LIVE = "entity_status <> 'Removed'"


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

    def optional_source(table: str, select: str, order: str = "start_date DESC NULLS LAST") -> str:
        """A DISTINCT ON (nzbn) subquery over a table that may be missing from an older extract."""
        if not _table_exists(conn, table):
            return "(SELECT NULL::text AS nzbn, NULL::text AS value WHERE false)"
        return f"(SELECT DISTINCT ON (nzbn) nzbn, {select} AS value FROM {quoted(table)} ORDER BY nzbn, {order})"

    office_sql = (
        f"(SELECT DISTINCT ON (nzbn) nzbn, nullif(trim({quoted(city_col)}), '') AS city, "
        f"nullif(trim({quoted(postcode_col)}), '') AS postcode "
        f"FROM companies_registered_office_address ORDER BY nzbn, start_date DESC NULLS LAST)"
        if city_col and postcode_col
        else "(SELECT NULL::text AS nzbn, NULL::text AS city, NULL::text AS postcode WHERE false)"
    )
    industry_sql = (
        "(SELECT DISTINCT ON (nzbn) nzbn, industry_classification_code AS code, industry_classification_description AS description "
        "FROM companies_business_industry_classification ORDER BY nzbn, start_date DESC NULLS LAST)"
        if _table_exists(conn, "companies_business_industry_classification")
        else "(SELECT NULL::text AS nzbn, NULL::text AS code, NULL::text AS description WHERE false)"
    )
    website_sql = optional_source(
        "companies_website",
        "website",
    ).replace("SELECT DISTINCT ON (nzbn) nzbn, website AS value FROM \"companies_website\"",
              "SELECT DISTINCT ON (nzbn) nzbn, website AS value FROM \"companies_website\" "
              "WHERE website IS NOT NULL AND website <> '' AND lower(website) <> 'no website'")
    trading_sql = optional_source("companies_trading_name", "trading_name").replace(
        "SELECT DISTINCT ON (nzbn) nzbn, trading_name AS value FROM \"companies_trading_name\"",
        "SELECT DISTINCT ON (nzbn) nzbn, trading_name AS value FROM \"companies_trading_name\" "
        "WHERE trading_name IS NOT NULL AND trading_name <> '' AND lower(trading_name) <> 'no trading name'")
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
        SELECT c.nzbn,
               c.entity_name,
               {quoted(identifier_col) if identifier_col else 'NULL::text'} AS company_identifier,
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
    """
    if identifier_col:
        sql = sql.replace(f"{quoted(identifier_col)} AS company_identifier", f"c.{quoted(identifier_col)} AS company_identifier")

    indexes = [
        ("company_index_nzbn_idx", "(nzbn)"),
        ("company_index_entity_name_trgm", "USING gin (entity_name gin_trgm_ops)"),
        ("company_index_status_idx", "(entity_status)"),
        ("company_index_region_idx", "(region)"),
        ("company_index_division_idx", "(division)"),
        ("company_index_city_idx", "(city)"),
        ("company_index_registration_date_idx", "(registration_date DESC)"),
        ("company_index_identifier_idx", "(company_identifier)"),
    ]
    with conn.cursor() as cur:
        cur.execute("DROP TABLE IF EXISTS company_index__new")
        cur.execute(sql)
        for name, target in indexes:
            cur.execute(f"CREATE INDEX {quoted(name + '__new')} ON company_index__new {target}")
        cur.execute("ANALYZE company_index__new")
        cur.execute("DROP TABLE IF EXISTS company_index")
        cur.execute("ALTER TABLE company_index__new RENAME TO company_index")
        for name, _ in indexes:
            cur.execute(f"ALTER INDEX {quoted(name + '__new')} RENAME TO {quoted(name)}")
        rows = cur.execute("SELECT count(*) FROM company_index").fetchone()[0]
    conn.commit()
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
               count(*) FILTER (WHERE {LIVE} AND has_website) AS with_website
        FROM company_index
        GROUP BY region ORDER BY live DESC
    """, windows)
    region_cities = _rows(conn, f"""
        SELECT region, city, n FROM (
            SELECT region, city, count(*) AS n, row_number() OVER (PARTITION BY region ORDER BY count(*) DESC) AS rank
            FROM company_index WHERE {LIVE} AND region IS NOT NULL AND city IS NOT NULL
            GROUP BY region, city
        ) ranked WHERE rank <= 5 ORDER BY region, n DESC
    """)
    region_divisions = _rows(conn, f"""
        SELECT region, division, n FROM (
            SELECT region, division, count(*) AS n, row_number() OVER (PARTITION BY region ORDER BY count(*) DESC) AS rank
            FROM company_index WHERE {LIVE} AND region IS NOT NULL AND division IS NOT NULL
            GROUP BY region, division
        ) ranked WHERE rank <= 5 ORDER BY region, n DESC
    """)
    for region in stats["regions"]:
        region["top_cities"] = [{"city": r["city"], "live": r["n"]} for r in region_cities if r["region"] == region["region"]]
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
               count(*) FILTER (WHERE {LIVE} AND has_website) AS with_website
        FROM company_index WHERE division IS NOT NULL
        GROUP BY division ORDER BY live DESC
    """, windows)
    for row in divisions:
        row["name"] = DIVISIONS.get(row["code"], row["code"])
        row["liquidations_per_1000"] = round(row["liquidations_last12"] * 1000 / row["live"], 1) if row["live"] else None
        row["established_share"] = round(row["live_10y_plus"] / row["live"], 3) if row["live"] else None
    stats["divisions"] = divisions

    # A few rows carry a code where the description should be; the most common description wins.
    stats["top_industries"] = _rows(conn, f"""
        SELECT industry_code AS code, mode() WITHIN GROUP (ORDER BY industry) AS description, count(*) AS live
        FROM company_index WHERE {LIVE} AND industry_code ~ '^[A-S]\\d{{6}}$' AND industry !~ '^[A-Z]\\d{{6}}$'
        GROUP BY industry_code ORDER BY live DESC LIMIT 20
    """)

    stats["years"] = _rows(conn, """
        SELECT year, sum(registrations)::int AS registrations, sum(removals)::int AS removals FROM (
            SELECT extract(year FROM registration_date)::int AS year, count(*) AS registrations, 0 AS removals
            FROM company_index WHERE registration_date IS NOT NULL GROUP BY 1
            UNION ALL
            SELECT extract(year FROM removal_date)::int, 0, count(*)
            FROM company_index WHERE removal_date IS NOT NULL GROUP BY 1
        ) both_series WHERE year >= 1900 GROUP BY year ORDER BY year
    """)
    stats["months"] = _rows(conn, """
        SELECT month, sum(registrations)::int AS registrations, sum(removals)::int AS removals FROM (
            SELECT to_char(registration_date, 'YYYY-MM') AS month, count(*) AS registrations, 0 AS removals
            FROM company_index WHERE registration_date >= (%(boundary)s::date - interval '36 months') GROUP BY 1
            UNION ALL
            SELECT to_char(removal_date, 'YYYY-MM'), 0, count(*)
            FROM company_index WHERE removal_date >= (%(boundary)s::date - interval '36 months') GROUP BY 1
        ) both_series GROUP BY month ORDER BY month
    """, windows)

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
    stats["cities"] = _rows(conn, f"""
        SELECT city, region, count(*) AS live FROM company_index
        WHERE {LIVE} AND city IS NOT NULL GROUP BY city, region ORDER BY live DESC LIMIT 25
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
    stats["newest"] = _rows(conn, f"""
        SELECT nzbn, entity_name, entity_status, registration_date, city, region, division, industry
        FROM company_index WHERE {LIVE} AND registration_date IS NOT NULL
        ORDER BY registration_date DESC, nzbn LIMIT 12
    """)

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
    Called when the API starts: if the precomputed tables are missing (first deployment of this
    code, or a database restored from an older backup) build them on a background thread, so the
    public site comes up on its own a couple of minutes later instead of needing a manual step.
    """
    import threading

    def run() -> None:
        try:
            with bulk_import.connect() as conn:
                if _table_exists(conn, "company_index") and _table_exists(conn, "site_stats"):
                    return
                print("site_stats: precomputed tables missing, building them now")
                rebuild(conn)
        except Exception as e:
            print(f"site_stats: could not build the precomputed tables: {e}")

    threading.Thread(target=run, name="site-stats-bootstrap", daemon=True).start()


if __name__ == "__main__":
    with bulk_import.connect() as connection:
        rebuild(connection)
    sys.exit(0)
