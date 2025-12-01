import pymysql
from urllib.parse import urlparse

DATABASE_URL = "mysql+pymysql://root:38LRh430@139.180.167.165:3306/nzcompanies"

def get_db_connection():
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
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )
    return conn

def verify():
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SHOW TABLES")
            tables = cursor.fetchall()
            
            print(f"Found {len(tables)} tables.")
            
            for table in tables:
                table_name = list(table.values())[0]
                cursor.execute(f"SELECT COUNT(*) as count FROM `{table_name}`")
                result = cursor.fetchone()
                print(f"Table {table_name}: {result['count']} rows")
                
    finally:
        conn.close()

if __name__ == "__main__":
    verify()
