import sys
sys.path.append('.')

from app.db.session import SessionLocal
from sqlalchemy import text

db = SessionLocal()

try:
    # Check directors
    nzbn = "9429053229694"
    query = text("SELECT * FROM companies_director WHERE NZBN = :nzbn")
    result = db.execute(query, {"nzbn": nzbn}).fetchall()
    
    print(f"Found {len(result)} directors for NZBN {nzbn}")
    for row in result:
        print(dict(row._mapping))
        
finally:
    db.close()
