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

## ⚙️ Configuration

All settings are read from `backend/.env` (see `.env.example`):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | `postgresql+psycopg://user:password@host:5432/nzcompanies` |
| `BACKEND_CORS_ORIGINS` | Comma-separated allowed origins, e.g. `https://companies.aicloud.co.nz` (default `*`) |
| `SUPABASE_URL`, `SUPABASE_KEY` | Optional, only for the (disabled) auth dependency |

## 📦 Production Deployment

Production runs at https://companies.aicloud.co.nz. nginx serves the built frontend and proxies `/api` to Uvicorn on `127.0.0.1:8001`, managed by systemd. Pushes to `master` deploy through `.github/workflows/deploy.yml`; the server-side files live in [`../deploy`](../deploy).

## 🔐 Security Recommendations

1. Keep credentials in `.env` only; never commit them
2. Enable HTTPS in production
3. Implement rate limiting
4. Add authentication/authorization if needed
5. Restrict CORS origins
6. Use strong database passwords and keep PostgreSQL bound to localhost
