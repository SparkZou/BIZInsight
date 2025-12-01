import sys
sys.path.append('.')

from app.db.session import SessionLocal
from sqlalchemy import text
import json

db = SessionLocal()

try:
    # Check directors with all fields
    nzbn = "9429053229694"
    query = text("SELECT * FROM companies_director WHERE NZBN = :nzbn LIMIT 1")
    result = db.execute(query, {"nzbn": nzbn}).fetchone()
    
    if result:
        data = dict(result._mapping)
        print("Director fields:")
        print(json.dumps(data, indent=2, default=str))
        print("\nField names:")
        for key in data.keys():
            print(f"  - {key}")
    else:
        print("No director found")
        
finally:
    db.close()
