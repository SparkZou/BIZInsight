# Backend - NZCompanies API

FastAPI backend for the NZCompanies Business Intelligence Platform.

## 🚀 Tech Stack

- **FastAPI** (Python web framework)
- **SQLAlchemy** (ORM)
- **MySQL** 8.0+ (Database)
- **Alembic** (Database migrations)
- **Uvicorn** (ASGI server)
- **Pydantic** (Data validation)

## 📁 Project Structure

```
backend/
├── app/
│   ├── api/
│   │   └── api_v1/
│   │       └── endpoints/
│   │           ├── companies.py
│   │           ├── dashboard.py
│   │           └── contact.py
│   ├── core/
│   │   └── config.py        # Configuration
│   ├── db/
│   │   └── session.py       # Database session
│   ├── models/
│   │   └── company.py       # SQLAlchemy models
│   └── main.py              # FastAPI app entry
├── alembic/                 # Database migrations
├── scripts/                 # Data import scripts
└── requirements.txt         # Python dependencies
```

## 🛠️ Development

### Prerequisites
- Python >= 3.9
- MySQL >= 8.0
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

1. Create MySQL database:
```sql
CREATE DATABASE nzcompanies CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. Update database connection in `app/core/config.py`:
```python
DATABASE_URL = "mysql+pymysql://user:password@host:port/nzcompanies"
```

3. Run migrations (if applicable):
```bash
alembic upgrade head
```

### Run Development Server

```bash
uvicorn app.main:app --reload
uvicorn app.main:app --host 0.0.0.0 --port 8001 --workers 4
```

API will run at `http://localhost:8000`

## 📖 API Documentation

Once running, access interactive API docs at:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🔌 API Endpoints

### Dashboard
- `GET /api/v1/dashboard` - Get dashboard statistics

### Companies
- `GET /api/v1/companies/search?query={query}&limit={limit}&offset={offset}` - Search companies
- `GET /api/v1/companies/{nzbn}` - Get company details by NZBN

### Contact
- `POST /api/v1/contact` - Submit contact form

## 🗄️ Database Models

### Company
- NZBN (Primary Key)
- Entity Name
- Registration Date
- Entity Status
- Physical Address
- Website
- Directors (relationship)
- Shareholders (relationship)

## ⚙️ Configuration

Edit `app/core/config.py`:

```python
class Settings(BaseSettings):
    PROJECT_NAME: str = "NZCompanies API"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = "mysql+pymysql://..."
```

## 🔒 CORS Configuration

CORS is currently set to allow all origins for development. For production, update in `app/main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],  # Restrict origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## 📦 Production Deployment

### Using Gunicorn + Uvicorn Workers

```bash
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
```

### Using Uvicorn

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## 🧪 Testing

Test files are included:
- `test_company_api.py`
- `test_enhanced_api.py`
- `test_search.py`

Run tests:
```bash
pytest
```

## 📝 Data Import Scripts

Scripts for importing CSV data are in the `scripts/` directory. Customize as needed for your data sources.

## 🔐 Security Recommendations

1. Use environment variables for sensitive data
2. Enable HTTPS in production
3. Implement rate limiting
4. Add authentication/authorization if needed
5. Restrict CORS origins
6. Use strong database passwords
