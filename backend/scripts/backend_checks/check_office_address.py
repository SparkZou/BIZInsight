import sys
sys.path.append('.')

from app.db.session import SessionLocal
from sqlalchemy import text
import json

db = SessionLocal()

nzbn = "9429040089218"

try:
    print(f"Checking Registered Office for NZBN: {nzbn}")
    query = text("SELECT * FROM companies_registered_office_address WHERE NZBN = :nzbn")
    result = db.execute(query, {"nzbn": nzbn}).fetchall()
    
    if result:
        print(f"Found {len(result)} records:")
        for row in result:
            data = dict(row._mapping)
            print(json.dumps(data, indent=2, default=str))
            print("Field names:", list(data.keys()))
    else:
        print("No records found in companies_registered_office_address")

finally:
    db.close()
