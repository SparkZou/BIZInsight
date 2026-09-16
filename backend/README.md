# Backend - NZCompanies API

FastAPI backend for the NZCompanies Business Intelligence Platform.

## 🚀 Tech Stack

- **FastAPI** (Python web framework)
- **SQLAlchemy** (ORM)
- **PostgreSQL** 14+ (Database, with the `pg_trgm` extension for search)
- **psycopg 3** (Database driver)
- **Alembic** (Database migrations)
- **Uvicorn** (ASGI server)
- **Pydantic** (Data validation)

## 📁 Project Structure

```
backend/
├── app/
│   ├── api/
│   │   ├── api_v1/
│   │   │   └── endpoints/
│   │   │       ├── companies.py
│   │   │       ├── dashboard.py
│   │   │       └── contact.py
│   │   └── endpoints/
│   │       └── stats.py         # Dataset record counts
│   ├── core/
│   │   └── config.py            # Settings (read from .env)
│   ├── db/
│   │   └── session.py           # Database session
│   ├── models/                  # SQLAlchemy models
│   └── main.py                  # FastAPI app entry
├── alembic/                     # Migrations for app-owned tables (contact_messages)
├── scripts/
│   └── data_import/
│       └── import_bulk_data.py  # Companies Office bulk CSV -> PostgreSQL
└── requirements.txt             # Python dependencies
```

## 🛠️ Development

### Prerequisites
- Python >= 3.9
- PostgreSQL >= 14
- pip

### Installation

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Database Setup

1. Create a database and user:
```sql
CREATE USER bizinsight WITH PASSWORD 'change-me';
CREATE DATABASE nzcompanies OWNER bizinsight;
```

2. Copy `.env.example` to `.env` and set the connection string:
```
DATABASE_URL=postgresql+psycopg://bizinsight:change-me@127.0.0.1:5432/nzcompanies
```

3. Create the app-owned tables:
```bash
alembic upgrade head
```

4. Import the Companies Office bulk data (see below).

### Run Development Server

```bash
uvicorn app.main:app --reload --port 8001
```

The frontend dev server proxies `/api` to `http://127.0.0.1:8001`.

## 📥 Companies Office Bulk Data

The data comes from the [Companies Office bulk data](https://www.companiesoffice.govt.nz/data-services/ways-to-get-our-data/request-access-to-bulk-data/) download (monthly zip of CSV files). Unzip it and run, from `backend/`:

```bash
python scripts/data_import/import_bulk_data.py /path/to/unzipped/csvs
# or only some files
python scripts/data_import/import_bulk_data.py /path/to/unzipped/csvs companies_director.csv
```

Each CSV becomes a table named after the file, with lower-case column names, `*_DATE` columns as `DATE` and everything else as `TEXT`. Tables are built alongside the live ones and swapped in when complete, so a monthly refresh can run while the site is serving. The February 2025 snapshot (18 files, ~17.6M rows) imports in about 3 minutes and uses ~1.5 GB including indexes.

## 📖 API Documentation

Once running, access interactive API docs at:
- **Swagger UI**: http://localhost:8001/docs
- **ReDoc**: http://localhost:8001/redoc

## 🔌 API Endpoints

### Dashboard
- `GET /api/v1/dashboard` - Get dashboard statistics

### Companies
- `GET /api/v1/companies/search?q={query}&limit={limit}` - Search companies by name, NZBN or director name
- `GET /api/v1/companies/{nzbn}` - Get company details by NZBN

### Contact
- `POST /api/v1/contact` - Submit contact form

### Statistics
- `GET /api/stats/datasets` - Record counts for every imported dataset

### Admin (behind the `/admin` page; session cookie required except for login)
- `POST /api/v1/admin/login` - Log in with `{"username", "password"}`
- `POST /api/v1/admin/logout` - End the session
- `GET /api/v1/admin/session` - Current admin, or 401
- `POST /api/v1/admin/imports` - Upload bulk data (`files`: the zip and/or CSVs; `allow_row_drop`) and start an import
- `GET /api/v1/admin/imports` - Recent imports
- `GET /api/v1/admin/imports/{id}` - One import with its log
- `GET /api/v1/admin/new-companies/months` - Months with registrations, and the latest month in the data
- `GET /api/v1/admin/new-companies/summary?month=2026-08` - A month's registrations by status, type, industry and city
- `GET /api/v1/admin/new-companies?month=2026-08&q=&status=&contact=&page=1&page_size=50` - A month's new companies with their directors, industry, addresses, shareholder count, GST, website and NZBN contact details (`contact`: `phone`, `email`, `website` or `any`)
- `GET /api/v1/admin/new-companies/export?month=2026-08&contact=email` - The same list, filtered the same way, as CSV
- `GET /api/v1/admin/enrichment/status?month=2026-08` - How many of the month's companies have contact details, and recent jobs
- `POST /api/v1/admin/enrichment/jobs` - Start fetching contact details for `{"month": "2026-08"}`
- `POST /api/v1/admin/enrichment/jobs/{id}/stop` - Stop the running job
- `GET /api/v1/admin/enrichment/companies/{nzbn}` - One company's NZBN contact details
- `GET /api/v1/admin/unsubscribes?q=` - Addresses that must never be emailed again, with how many companies list each
- `POST /api/v1/admin/unsubscribes` - Add every address found in `{"text": "...", "reason": "unsubscribe", "note": ""}`
- `DELETE /api/v1/admin/unsubscribes/{email}` - Take an address off the list
- `GET /api/v1/admin/search?q=&people=true&page=1&page_size=50` - Search every register by name, NZBN or company number, and companies by director or shareholder name

## ⚙️ Configuration

All settings are read from `backend/.env` (see `.env.example`):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | `postgresql+psycopg://user:password@host:5432/nzcompanies` |
| `BACKEND_CORS_ORIGINS` | Comma-separated allowed origins, e.g. `https://companies.aicloud.co.nz` (default `*`) |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | The `/admin` account; login is disabled while the password is empty |
| `ADMIN_SECRET_KEY` | Signs admin session cookies (e.g. `openssl rand -hex 32`); without it sessions end on restart |
| `ADMIN_COOKIE_SECURE` | `false` for local development over plain http (default `true`) |
| `DATA_DIR` | Where uploaded bulk data is stored (default `/data`) |
| `SUPABASE_URL`, `SUPABASE_KEY` | Optional, only for the (disabled) auth dependency |

## 📦 Production Deployment

Production runs at https://companies.aicloud.co.nz with Docker Compose ([`../docker-compose.yml`](../docker-compose.yml)) in `/opt/webApp/bizinsight`: a Node container serving the server-rendered site (React Router; the build is uploaded by CI into `frontend/build`), this API, and a PostgreSQL 16 container. The server's shared Caddy handles HTTPS and routes `/api/*` to the API and everything else to the site. Pushes to `master` deploy through `.github/workflows/deploy.yml`; the server-side files live in [`../deploy`](../deploy).

The site's loaders call this API over the internal network (`API_INTERNAL_URL`), so pages arrive as complete HTML; `/sitemap.xml` and `/sitemaps/*.xml` are produced here (`GET /api/v1/sitemap/...`) and served by the site, and `GET /api/v1/dataset` reports which monthly snapshot is loaded.

Import or refresh the bulk data on the server (from Windows, `deploy/import-bulk-data.ps1` uploads the zip and runs this for you):

```bash
bash /opt/webApp/bizinsight/deploy/import-bulk-data.sh /path/to/bulk-data.zip
```

## 🔐 Security Recommendations

1. Keep credentials in `.env` only; never commit them
2. Enable HTTPS in production
3. Implement rate limiting
4. Add authentication/authorization if needed
5. Restrict CORS origins
6. Use strong database passwords and keep PostgreSQL bound to localhost
