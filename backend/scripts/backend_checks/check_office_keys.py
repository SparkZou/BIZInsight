import sys
sys.path.append('.')

from app.db.session import SessionLocal
from sqlalchemy import text
import json

db = SessionLocal()

nzbn = "9429040089218"

try:
    query = text("SELECT * FROM companies_registered_office_address WHERE NZBN = :nzbn LIMIT 1")
    result = db.execute(query, {"nzbn": nzbn}).fetchone()
    
    if result:
        data = dict(result._mapping)
        print("KEYS:", list(data.keys()))
    else:
        print("No records found")

finally:
    db.close()
