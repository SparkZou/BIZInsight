import sys
sys.path.append('.')

from app.db.session import SessionLocal
from sqlalchemy import text
import json

db = SessionLocal()

nzbn = "9429030096851"

try:
    print(f"Checking Websites for NZBN: {nzbn}")
    query = text("SELECT * FROM companies_website WHERE NZBN = :nzbn")
    result = db.execute(query, {"nzbn": nzbn}).fetchall()
    
    if result:
        print(f"Found {len(result)} records:")
        for row in result:
            data = dict(row._mapping)
            print(json.dumps(data, indent=2, default=str))
    else:
        print("No records found in companies_website")

finally:
    db.close()
