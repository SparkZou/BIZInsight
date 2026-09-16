-- ============================================================
-- BIZInsight — example analysis queries (PostgreSQL)
--
-- The database holds the latest Companies Office bulk data snapshot only, so analyse
-- changes over time through the date columns:
--   companies_core_data.registration_date / removal_date
--   start_date on directors, shareholders, addresses, GST, industry codes, ...
-- Directors and shareholders files list current holders only: appointments can be
-- counted by start_date, but resignations are not in the data.
--
-- Connect read-only as bizinsight_analyst through SSH (the database only listens on the
-- server itself). In DBeaver / pgAdmin / DataGrip:
--   SSH tunnel : ubuntu@223.165.71.59 with your SSH key
--   Database   : host 127.0.0.1, port 5436, database nzcompanies, user bizinsight_analyst
--   Password   : ssh ubuntu@223.165.71.59 "grep ANALYST_DB_PASSWORD /opt/webApp/bizinsight/.env"
-- ============================================================


-- Companies registered in a month, by entity type (the row with an empty type is the total)
SELECT entity_type, count(*) AS registered
FROM companies_core_data
WHERE registration_date >= DATE '2026-08-01' AND registration_date < DATE '2026-09-01'
GROUP BY ROLLUP (entity_type)
ORDER BY count(*) DESC;


-- New registrations per month for the last 12 months, with how many are no longer registered
SELECT to_char(registration_date, 'YYYY-MM') AS month,
       count(*) AS registered,
       count(*) FILTER (WHERE entity_status <> 'Registered') AS no_longer_registered
FROM companies_core_data
WHERE registration_date >= date_trunc('month', current_date) - INTERVAL '12 months'
GROUP BY 1
ORDER BY 1;


-- Companies removed in a month
SELECT count(*) AS removed
FROM companies_core_data
WHERE removal_date >= DATE '2026-08-01' AND removal_date < DATE '2026-09-01';


-- A month's new companies by industry (only companies that provided an industry code)
SELECT b.industry_classification_code AS code,
       b.industry_classification_description AS industry,
       count(DISTINCT c.nzbn) AS companies
FROM companies_core_data c
JOIN companies_business_industry_classification b USING (nzbn)
WHERE c.registration_date >= DATE '2026-08-01' AND c.registration_date < DATE '2026-09-01'
GROUP BY 1, 2
ORDER BY companies DESC
LIMIT 20;


-- A month's new companies by city of their address for service
SELECT coalesce(nullif(a.address_for_service_3, ''), '(blank)') AS city,
       count(DISTINCT c.nzbn) AS companies
FROM companies_core_data c
JOIN companies_address_for_service a USING (nzbn)
WHERE c.registration_date >= DATE '2026-08-01' AND c.registration_date < DATE '2026-09-01'
GROUP BY 1
ORDER BY companies DESC
LIMIT 20;


-- A month's new companies with their details, e.g. to export as a lead list
SELECT c.nzbn, c.entity_name, c.registration_date, c.entity_status,
       b.industry_classification_description AS industry,
       concat_ws(', ', a.address_for_service_1, a.address_for_service_2,
                 a.address_for_service_3, a.address_for_service_postcode) AS address_for_service,
       w.website
FROM companies_core_data c
LEFT JOIN companies_business_industry_classification b USING (nzbn)
LEFT JOIN companies_address_for_service a USING (nzbn)
LEFT JOIN companies_website w USING (nzbn)
WHERE c.registration_date >= DATE '2026-08-01' AND c.registration_date < DATE '2026-09-01'
ORDER BY c.registration_date, c.entity_name;


-- Directors appointed in a month (current directors only)
SELECT d.start_date, d.first_name, d.middle_names, d.last_name, c.nzbn, c.entity_name
FROM companies_director d
JOIN companies_core_data c USING (nzbn)
WHERE d.start_date >= DATE '2026-08-01' AND d.start_date < DATE '2026-09-01'
ORDER BY d.start_date, d.last_name;


-- Insolvency appointments (liquidation, receivership, ...) in a month
SELECT i.appointment_date, i.insolvency_type, i.appointment_type, i.nzbn, i.entity_name
FROM companies_insolvency i
WHERE i.appointment_date >= DATE '2026-08-01' AND i.appointment_date < DATE '2026-09-01'
ORDER BY i.appointment_date;


-- Companies with contact details from the NZBN register (filled by the admin Contact details job)
SELECT c.registration_date, c.entity_name, c.nzbn, d.emails, d.phones, d.websites, d.trading_names
FROM companies_core_data c
JOIN company_contact_details d USING (nzbn)
WHERE d.error IS NULL
  AND d.emails <> ''                                    -- or: d.phones <> '' / d.websites <> ''
  AND c.registration_date >= DATE '2026-08-01' AND c.registration_date < DATE '2026-09-01'
ORDER BY c.registration_date DESC;


-- How much of each month has been fetched, and how many companies published contact details
SELECT to_char(c.registration_date, 'YYYY-MM') AS month,
       count(*) AS companies,
       count(d.nzbn) FILTER (WHERE d.error IS NULL) AS fetched,
       count(*) FILTER (WHERE d.emails <> '') AS with_email,
       count(*) FILTER (WHERE d.phones <> '') AS with_phone,
       count(*) FILTER (WHERE d.websites <> '') AS with_website
FROM companies_core_data c
LEFT JOIN company_contact_details d ON d.nzbn = c.nzbn
WHERE c.registration_date >= date_trunc('month', current_date) - INTERVAL '12 months'
GROUP BY 1
ORDER BY 1 DESC;


-- Which date columns each table offers
SELECT table_name, string_agg(column_name, ', ' ORDER BY ordinal_position) AS date_columns
FROM information_schema.columns
WHERE table_schema = 'public' AND data_type = 'date'
GROUP BY 1
ORDER BY 1;
