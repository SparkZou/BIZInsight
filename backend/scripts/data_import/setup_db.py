import os
import csv
import pymysql
from dotenv import load_dotenv

# Database URL from environment variable
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

# Directory containing CSV files
DATA_DIR = r"c:\Development\AICloud\NZCompanies\Requirments\Companies Office Bulk Data\Data"

def get_db_connection(db_name=None):
    parsed = urlparse(DATABASE_URL)
    # Remove 'mysql+pymysql://' scheme to parse correctly if needed, but urlparse handles it mostly
    # Actually standard urlparse might not handle the scheme perfectly for port
    # Let's parse manually or use a library if available, but manual is safer for simple extraction
    
    # Format: mysql+pymysql://user:pass@host:port/dbname
    auth_part, rest = DATABASE_URL.split('@')
    user_pass = auth_part.split('://')[1]
    username, password = user_pass.split(':')
    
    host_port, default_db = rest.split('/')
    host, port = host_port.split(':')
    port = int(port)
    
    conn = pymysql.connect(
        host=host,
        user=username,
        password=password,
        port=port,
        database=db_name, # None to connect to server only
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor,
        local_infile=True # Enable local infile for faster imports if needed later
    )
    return conn, default_db

def create_database():
    print("Connecting to MySQL server...")
    conn, db_name = get_db_connection()
    try:
        with conn.cursor() as cursor:
            print(f"Creating database '{db_name}' if it doesn't exist...")
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name}")
            print(f"Database '{db_name}' created or already exists.")
    finally:
        conn.close()
    return db_name

def infer_sql_type(header, sample_values):
    # Heuristic to determine column type
    is_date = True
    is_int = True
    max_len = 0
    
    date_keywords = ['DATE', 'TIME']
    
    # Check if header implies date
    if any(k in header.upper() for k in date_keywords):
        # Verify with sample values
        pass # Assume date for now if header says so, or check format
        
    for val in sample_values:
        if not val: continue
        max_len = max(max_len, len(val))
        
        # Simple date check (DD/MM/YYYY or YYYY-MM-DD)
        # NZ data often DD/MM/YYYY
        if is_date:
            import re
            # Match DD/MM/YYYY or YYYY-MM-DD
            if not (re.match(r'\d{2}/\d{2}/\d{4}', val) or re.match(r'\d{4}-\d{2}-\d{2}', val)):
                is_date = False
        
        if is_int:
            if not val.isdigit():
                is_int = False

    if is_date and any(k in header.upper() for k in date_keywords):
        return "DATE" # Or DATETIME
    
    if is_int and max_len < 12: # Bigint otherwise
        return "BIGINT"
        
    # Default to VARCHAR
    length = 255
    if max_len > 255:
        length = 1000 # Arbitrary larger size
    if max_len > 1000:
        return "TEXT"
        
    return f"VARCHAR({length})"

def create_tables(db_name):
    conn, _ = get_db_connection(db_name)
    try:
        with conn.cursor() as cursor:
            # Enable local infile
            cursor.execute("SET GLOBAL local_infile = 1;")
            
            csv_files = [f for f in os.listdir(DATA_DIR) if f.endswith('.csv')]
            
            for csv_file in csv_files:
                table_name = os.path.splitext(csv_file)[0]
                file_path = os.path.join(DATA_DIR, csv_file)
                
                print(f"Processing {csv_file} -> Table: {table_name}")
                
                with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
                    reader = csv.reader(f)
                    headers = next(reader)
                    
                    # Read a few rows to infer types
                    sample_rows = []
                    try:
                        for _ in range(100):
                            sample_rows.append(next(reader))
                    except StopIteration:
                        pass
                
                # Build CREATE TABLE statement
                columns = []
                for i, header in enumerate(headers):
                    # Clean header name
                    col_name = header.strip().replace(' ', '_').replace('.', '').upper()
                    if not col_name:
                        col_name = f"COL_{i}"
                    
                    # Get sample values for this column
                    col_values = [row[i] for row in sample_rows if len(row) > i]
                    col_type = infer_sql_type(col_name, col_values)
                    
                    # Primary key heuristic: NZBN is usually a key, but might not be unique in all tables
                    # We'll just create columns for now.
                    columns.append(f"`{col_name}` {col_type}")
                
                create_stmt = f"CREATE TABLE IF NOT EXISTS `{table_name}` ({', '.join(columns)});"
                # print(create_stmt)
                cursor.execute(create_stmt)
                print(f"Table {table_name} ensured.")
                
    finally:
        conn.close()

if __name__ == "__main__":
    db_name = create_database()
    create_tables(db_name)
