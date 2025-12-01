from app.db.session import get_db
from sqlalchemy import text

def test_search():
    db = next(get_db())
    try:
        search_term = "%Digital%"
        query = text("""
            SELECT 
                NZBN, 
                ENTITY_NAME, 
                ENTITY_STATUS, 
                ENTITY_TYPE,
                REGISTRATION_DATE
            FROM companies_core_data 
            WHERE ENTITY_NAME LIKE :search_term OR NZBN LIKE :search_term
            LIMIT 5
        """)
        
        result = db.execute(query, {"search_term": search_term, "limit": 5})
        print("Query executed.")
        
        for row in result:
            print(f"Row type: {type(row)}")
            print(f"Row keys: {row._mapping.keys()}")
            try:
                print(f"NZBN: {row.NZBN}")
                print(f"Name: {row.ENTITY_NAME}")
            except Exception as e:
                print(f"Error accessing attributes: {e}")
                
    except Exception as e:
        print(f"Database error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_search()
