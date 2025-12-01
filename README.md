# NZCompanies - New Zealand Business Intelligence Platform

<div align="center">

![NZCompanies](https://img.shields.io/badge/Companies-1.7M+-00f3ff?style=for-the-badge)
![Directors](https://img.shields.io/badge/Directors-1.1M+-bc13fe?style=for-the-badge)
![Uptime](https://img.shields.io/badge/Uptime-99.9%25-0aff00?style=for-the-badge)

**Real-time access to 1.7M+ New Zealand company data through a modern BI platform**

[Features](#-features) • [Tech Stack](#️-tech-stack) • [Quick Start](#-quick-start) • [Deployment](#-deployment-guide) • [API Docs](#-api-documentation)

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
  - Multi-dimensional search (company name, NZBN, address, director name)
  - Real-time search results
  - Pagination support

- **Company Details**:
  - Complete company information (registration date, status, address, website)
  - Directors list with appointment dates
  - Shareholder structure with ownership percentages
  - Map location (Leaflet integration)

### 🚀 Backend API

- **RESTful API**: Built with FastAPI for high concurrency
- **Database**: MySQL storing 1.7M+ company records
- **CORS Support**: Cross-origin access enabled
- **Endpoints**:
  - `GET /api/v1/dashboard` - Dashboard data
  - `GET /api/v1/companies/search` - Search companies
  - `GET /api/v1/companies/{nzbn}` - Company details
  - `POST /api/v1/contact` - Contact form submission

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
- **Database**: MySQL 8
- **ORM**: SQLAlchemy
- **Migrations**: Alembic
- **CORS**: FastAPI CORS Middleware

### DevOps
- **Version Control**: Git
- **Package Management**: npm (frontend) + pip (backend)
- **Build Tools**: Vite (frontend)
- **Dev Server**: Uvicorn (backend)

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: >= 18.x
- **Python**: >= 3.9
- **MySQL**: >= 8.0
- **Git**: Latest version

### 1. Clone Repository

```bash
git clone <repository-url>
cd NZCompanies
```

### 2. Database Setup

```sql
-- Create database
CREATE DATABASE nzcompanies CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Import data (assuming you have CSV files)
-- Use import scripts in backend/scripts
```

### 3. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables (optional)
# Edit backend/app/core/config.py to modify database connection

# Run database migrations (if needed)
alembic upgrade head

# Start backend server
uvicorn app.main:app --reload
```

Backend will run at `http://localhost:8000`

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will run at `http://localhost:5173`

### 5. Access Application

- **Frontend**: http://localhost:5173
- **Backend API Docs**: http://localhost:8000/docs
- **Backend Redoc**: http://localhost:8000/redoc

---

## 📦 Deployment Guide

### Production Deployment

#### Backend Deployment

```bash
cd backend

# Install production dependencies
pip install -r requirements.txt

# Run with Gunicorn (recommended)
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000

# Or use Uvicorn
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

**Environment Configuration**:
- Modify `DATABASE_URL` in `backend/app/core/config.py`
- Use `.env` file for sensitive information

#### Frontend Deployment

```bash
cd frontend

# Build production version
npm run build

# dist directory will contain static files
# Deploy to Nginx, Apache, Vercel, Netlify, etc.
```

**Nginx Configuration Example**:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /path/to/NZCompanies/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Docker Deployment (Optional)

```dockerfile
# Backend Dockerfile example
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```dockerfile
# Frontend Dockerfile example
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
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
  "totalCompanies": 1700000,
  "companiesByType": [
    {"name": "Limited Company", "value": 850000},
    {"name": "Sole Trader", "value": 450000}
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
GET /api/v1/companies/search?query=example&limit=20&offset=0
```

**Query Parameters**:
- `query`: Search keyword (company name, NZBN, address, director)
- `limit`: Number of results (default 20)
- `offset`: Pagination offset

#### 3. Get Company Details
```http
GET /api/v1/companies/{nzbn}
```

**Response Example**:
```json
{
  "NZBN": "9429030096851",
  "ENTITY_NAME": "Example Ltd",
  "REGISTRATION_DATE": "2020-01-15",
  "ENTITY_STATUS": "Registered",
  "PHYSICAL_ADDRESS": "123 Queen St, Auckland",
  "WEBSITE": "https://example.com",
  "directors": [...],
  "shareholders": [...]
}
```

Full API documentation: `http://localhost:8000/docs`

---

## 🗂️ Project Structure

```
NZCompanies/
├── backend/                 # Backend code
│   ├── app/
│   │   ├── api/            # API routes
│   │   ├── core/           # Core configuration
│   │   ├── db/             # Database connection
│   │   ├── models/         # SQLAlchemy models
│   │   └── main.py         # FastAPI app entry
│   ├── scripts/            # Data import scripts
│   ├── alembic/            # Database migrations
│   └── requirements.txt    # Python dependencies
│
├── frontend/               # Frontend code
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── types/          # TypeScript types
│   │   ├── App.tsx         # App entry
│   │   └── main.tsx        # React entry
│   ├── public/             # Static assets
│   └── package.json        # npm dependencies
│
└── README.md               # Project documentation
```

---

## 🔒 Security Recommendations

1. **Database Security**:
   - Never hardcode database passwords in code
   - Use environment variables or secret management services
   - Restrict database access by IP

2. **API Security**:
   - Disable `allow_origins=["*"]` in production CORS settings
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

- **Email**: sales@nzcompanies.com
- **Website**: [NZCompanies Platform](http://localhost:5173)

---

<div align="center">

**© 2025 NZCompanies. All systems nominal.**

Made with ❤️ using React, FastAPI, and MySQL

</div>
