import sys
sys.path.append('.')

from app.db.session import SessionLocal
from sqlalchemy import text
import json

db = SessionLocal()

tables = [
    "companies_abn",
    "companies_address_for_service",
    "companies_business_industry_classification",
    "companies_gst",
    "companies_insolvency",
    "companies_public_address",
    "companies_registered_office_address",
    "companies_trading_area",
    "companies_trading_name",
    "companies_website",
    "maori_business_identifier",
    "other_incorporated_entities_core_data",
    "public_sector_entities_core_data",
    "unincorporated_entities_core_data"
]

nzbn = "9429053229694"

try:
    for table in tables:
        print(f"\n{'='*60}")
        print(f"Table: {table}")
        print(f"{'='*60}")
        
        try:
            query = text(f"SELECT * FROM {table} WHERE NZBN = :nzbn LIMIT 1")
            result = db.execute(query, {"nzbn": nzbn}).fetchone()
            
            if result:
                data = dict(result._mapping)
                print(f"✓ Found data ({len(data)} fields)")
                print("Fields:")
                for key in data.keys():
                    print(f"  - {key}: {type(data[key]).__name__}")
            else:
                print("✗ No data found for this NZBN")
                
                # Try to get column names anyway
                query = text(f"SELECT * FROM {table} LIMIT 0")
                result = db.execute(query)
                if result.keys():
                    print("Available fields:")
                    for key in result.keys():
                        print(f"  - {key}")
        except Exception as e:
            print(f"✗ Error: {e}")
            
finally:
    db.close()
