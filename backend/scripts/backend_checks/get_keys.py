import sys
sys.path.append('.')

from app.db.session import SessionLocal
from sqlalchemy import text

db = SessionLocal()
nzbn = "9429040089218"
try:
    query = text("SELECT * FROM companies_registered_office_address WHERE NZBN = :nzbn LIMIT 1")
    result = db.execute(query, {"nzbn": nzbn}).fetchone()
    if result:
        print("\n".join(result._mapping.keys()))
finally:
    db.close()
