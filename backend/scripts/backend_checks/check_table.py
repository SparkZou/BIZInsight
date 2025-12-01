import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def check_tables():
    auth_part, rest = DATABASE_URL.split('@')
    user_pass = auth_part.split('://')[1]
    username, password = user_pass.split(':')
    host_port, db_name = rest.split('/')
    host, port = host_port.split(':')
    port = int(port)
    
    conn = pymysql.connect(
        host=host,
        user=username,
        password=password,
        port=port,
        database=db_name,
        charset='utf8mb4'
    )
    
    try:
        with conn.cursor() as cursor:
            # List all tables
            cursor.execute("SHOW TABLES")
            tables = cursor.fetchall()
            print("Tables in database:")
            for table in tables:
                print(f"  - {table[0]}")
            
            # Describe companies_core_data
            print("\nStructure of 'companies_core_data':")
            cursor.execute("DESCRIBE companies_core_data")
            columns = cursor.fetchall()
            for col in columns:
                print(f"  - {col[0]}: {col[1]}")

    finally:
        conn.close()

if __name__ == "__main__":
    check_tables()
