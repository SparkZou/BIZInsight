import sys
sys.path.append('.')

from app.db.session import SessionLocal
from sqlalchemy import text

db = SessionLocal()

tables_to_check = {
    "companies_abn": "ABN info",
    "companies_business_industry_classification": "Industry",
    "companies_gst": "GST",
    "companies_trading_name": "Trading names",
    "companies_website": "Websites",
    "companies_public_address": "Public address",
    "companies_registered_office_address": "Office address",
    "companies_trading_area": "Trading areas",
    "companies_insolvency": "Insolvency",
    "maori_business_identifier": "Maori business",
}

nzbn = "9429053229694"

try:
    for table, desc in tables_to_check.items():
        try:
            query = text(f"SELECT COUNT(*) as cnt FROM {table} WHERE NZBN = :nzbn")
            result = db.execute(query, {"nzbn": nzbn}).fetchone()
            count = result[0] if result else 0
            status = "✓" if count > 0 else "✗"
            print(f"{status} {desc:20s} ({table}): {count} records")
        except Exception as e:
            print(f"✗ {desc:20s} ({table}): ERROR - {str(e)[:50]}")
            
finally:
    db.close()
