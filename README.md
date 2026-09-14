# NZCompanies - New Zealand Business Intelligence Platform

<div align="center">

![NZCompanies](https://img.shields.io/badge/Companies-1.7M+-00f3ff?style=for-the-badge)
![Directors](https://img.shields.io/badge/Directors-1.1M+-bc13fe?style=for-the-badge)
![Uptime](https://img.shields.io/badge/Uptime-99.9%25-0aff00?style=for-the-badge)

**Real-time access to 1.7M+ New Zealand company data through a modern BI platform**

[Features](#-features) • [Tech Stack](#️-tech-stack) • [Quick Start](#-quick-start) • [Deployment](#-deployment) • [API Docs](#-api-documentation)

**Live:** https://companies.aicloud.co.nz

</div>

---

## 📋 Product Overview

NZCompanies is a comprehensive business intelligence platform providing real-time access to New Zealand company data for enterprises and individuals. Through a modern web interface and high-performance API, users can instantly access complete business registration information, director profiles, shareholder structures, and other critical commercial data.

### Core Value Propositions

- **🏦 Financial Services**: Risk assessment, KYC compliance, credit checks
- **👥 Recruitment & HR**: Employer verification, background checks
- **📊 Market Research**: Industry analysis, competitive intelligence, market segmentation
- **⚖️ Legal & Compliance**: Due diligence, regulatory checks
- **🔗 Supply Chain**: Vendor verification, risk management

---

## ✨ Features

### 🎨 Frontend Interface

- **Landing Page**: 
  - **Metro Style UI**: Modern tile-based design with neon aesthetics
  - **Vertical Scrolling Ticker**: Real-time company activity feed
  - **Persona-based Content**: Tailored views for Job Seekers and Lenders
  - **AI Predictive Scoring**: Visual indicators for company health and risk
  - 3D starfield background animation (Three.js)
  - Typewriter effect dynamic headlines
  - Responsive design with mobile support
  - Pricing tiers (Starter/Professional/Enterprise)

- **Dashboard**:
  - Real-time statistics cards
  - Annual registration trend charts
  - Company type distribution pie charts
  - Recent registrations table

- **Search Page**:
  - Search by company name, NZBN or director name
  - Real-time search results

- **Company Details**:
  - Complete company information (registration date, status, address, website)
  - Directors list with appointment dates
  - Shareholder structure
  - Map location (Leaflet integration)

### 🚀 Backend API

- **RESTful API**: Built with FastAPI
- **Database**: PostgreSQL with the Companies Office bulk data (~17.6M rows across 18 datasets)
- **Endpoints**:
  - `GET /api/v1/dashboard` - Dashboard data
  - `GET /api/v1/companies/search` - Search companies
  - `GET /api/v1/companies/{nzbn}` - Company details
  - `POST /api/v1/contact` - Contact form submission
  - `GET /api/stats/datasets` - Record counts per dataset

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 + Vite 7
- **Styling**: Tailwind CSS 3
- **Routing**: React Router DOM 7
- **Charts**: Recharts 3
- **3D Rendering**: Three.js + React Three Fiber
- **Maps**: Leaflet + React Leaflet
- **Icons**: Lucide React
- **Language**: TypeScript 5

### Backend
- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL 16 (`pg_trgm` trigram indexes for search)
- **ORM / Driver**: SQLAlchemy + psycopg 3
- **Migrations**: Alembic

### DevOps
- **Containers**: Docker Compose (nginx frontend, FastAPI backend, PostgreSQL)
- **Reverse proxy / HTTPS**: shared Caddy on the server (automatic Let's Encrypt)
- **CI/CD**: GitHub Actions deploys `master`

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: >= 18.x
- **Python**: >= 3.9
- **PostgreSQL**: >= 14
- **Git**: Latest version

### 1. Clone Repository

```bash
git clone https://github.com/SparkZou/BIZInsight.git
cd BIZInsight
```

### 2. Database Setup

```sql
CREATE USER bizinsight WITH PASSWORD 'change-me';
CREATE DATABASE nzcompanies OWNER bizinsight;
```

### 3. Backend Setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt

# Configure the database connection
cp .env.example .env    # then edit DATABASE_URL

# Create app-owned tables, then import the Companies Office bulk data CSVs
alembic upgrade head
python scripts/data_import/import_bulk_data.py /path/to/unzipped/csvs

# Start backend server
uvicorn app.main:app --reload --port 8001
```

See [backend/README.md](backend/README.md) for details on the data import.

### 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` to the backend on `http://127.0.0.1:8001`.

### 5. Access Application

- **Frontend**: http://localhost:5173
- **Backend API Docs**: http://localhost:8001/docs
- **Backend Redoc**: http://localhost:8001/redoc

---

## 📦 Deployment

Production runs at **https://companies.aicloud.co.nz** on a server where every app is a Docker Compose project in `/opt/webApp`, reached by a shared Caddy over the `shared-proxy-network`.

| Piece | File |
|---|---|
| Containers: `bizinsight-frontend` (nginx), `bizinsight-backend` (FastAPI), `bizinsight-db` (PostgreSQL 16) | [docker-compose.yml](docker-compose.yml) |
| Backend image (runs `alembic upgrade head`, then uvicorn) | [backend/Dockerfile](backend/Dockerfile) |
| nginx config for the SPA container | [deploy/nginx/frontend.conf](deploy/nginx/frontend.conf) |
| Caddy site block (HTTPS, `/api/*` → backend, rest → frontend) | [deploy/caddy/companies.aicloud.co.nz.caddy](deploy/caddy/companies.aicloud.co.nz.caddy) |
| Server-side deploy script | [deploy/deploy.sh](deploy/deploy.sh) |
| CI/CD: build frontend, upload it, run deploy.sh | [.github/workflows/deploy.yml](.github/workflows/deploy.yml) |

Every push to `master` deploys automatically. The workflow needs the repository secrets `DEPLOY_HOST`, `DEPLOY_USER` and `DEPLOY_SSH_KEY`. The database password lives only in `/opt/webApp/bizinsight/.env` on the server.

### Monthly data refresh

Log in at **https://companies.aicloud.co.nz/admin** and upload the Companies Office bulk data zip (or its CSV files). The import runs in the background with a progress log; each table is rebuilt next to the live one and swapped in when complete, so the site stays up. Uploads are checked first: unknown file names, missing columns and files that were cut short (for example re-saved from Excel) are refused.

The admin account comes from `ADMIN_USERNAME` / `ADMIN_PASSWORD` in the server's `.env`; five failed logins from one address lock it out for 15 minutes.

Command-line alternative from Windows (uploads the zip and runs [deploy/import-bulk-data.sh](deploy/import-bulk-data.sh) on the server):

```powershell
.\deploy\import-bulk-data.ps1 "$HOME\Downloads\Companies Office Bulk Data September 2026.zip"
```

---

## 📖 API Documentation

### Main Endpoints

#### 1. Get Dashboard Data
```http
GET /api/v1/dashboard
```

**Response Example**:
```json
{
  "totalCompanies": 1723065,
  "companiesByType": [
    {"name": "LTD", "value": 1713945},
    {"name": "ASIC", "value": 4401}
  ],
  "registrationsPerYear": [
    {"year": 2023, "count": 85000},
    {"year": 2024, "count": 92000}
  ],
  "recentRegistrations": [...]
}
```

#### 2. Search Companies
```http
GET /api/v1/companies/search?q=example&limit=20
```

**Query Parameters**:
- `q`: Search keyword (company name, NZBN or director name, at least 2 characters)
- `limit`: Number of results (default 20)

#### 3. Get Company Details
```http
GET /api/v1/companies/{nzbn}
```

**Response Example**:
```json
{
  "NZBN": "9429037441074",
  "ENTITY_NAME": "AMRITSAR INVESTMENTS LIMITED",
  "REGISTRATION_DATE": "1999-11-03",
  "ENTITY_STATUS": "Registered",
  "addresses": {"service": [...], "public": [...], "office": [...]},
  "directors": [...],
  "shareholders": [...]
}
```

Full API documentation: `http://localhost:8001/docs`

---

## 🗂️ Project Structure

```
BIZInsight/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API routes
│   │   ├── core/           # Settings
│   │   ├── db/             # Database session
│   │   ├── models/         # SQLAlchemy models
│   │   └── main.py         # FastAPI app entry
│   ├── scripts/            # Data import (bulk CSV -> PostgreSQL)
│   ├── alembic/            # Database migrations
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/               # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── types/
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
│
├── deploy/                 # Caddy site block, nginx config, deploy script
├── .github/workflows/      # GitHub Actions deploy
├── docker-compose.yml      # Production stack
└── README.md
```

---

## 🔒 Security Recommendations

1. **Database Security**:
   - Never hardcode database passwords in code; keep them in `.env`
   - Keep PostgreSQL off the public internet (the compose file binds it to 127.0.0.1)

2. **API Security**:
   - Restrict `BACKEND_CORS_ORIGINS` in production
   - Implement API rate limiting
   - Add JWT authentication (if needed)

3. **Frontend Security**:
   - Never store sensitive information in frontend
   - Use HTTPS
   - Implement CSP (Content Security Policy)

---

## 📝 License

This project is for educational and research purposes only. Contact the author for commercial use.

---

## 🤝 Contributing

Issues and Pull Requests are welcome!

---

## 📧 Contact

- **Email**: Sparksqlmvp@gmail.com
- **Website**: [NZCompanies Platform](https://companies.aicloud.co.nz)

---

<div align="center">

**© 2025 NZCompanies. All systems nominal.**

Made with ❤️ using React, FastAPI, and PostgreSQL

</div>
