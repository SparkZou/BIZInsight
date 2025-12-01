import os
import csv
import pymysql
from urllib.parse import urlparse

# Database URL provided by user
DATABASE_URL = "mysql+pymysql://root:38LRh430@139.180.167.165:3306/nzcompanies"
DATA_DIR = r"c:\Development\AICloud\NZCompanies\Requirments\Companies Office Bulk Data\Data"

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
        cursorclass=pymysql.cursors.DictCursor,
        local_infile=True
    )
    return conn

def import_data():
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Enable local infile
            cursor.execute("SET GLOBAL local_infile = 1;")
            
            csv_files = [f for f in os.listdir(DATA_DIR) if f.endswith('.csv')]
            
            for csv_file in csv_files:
                table_name = os.path.splitext(csv_file)[0]
                file_path = os.path.join(DATA_DIR, csv_file).replace('\\', '/')
                
                print(f"Importing {csv_file} into {table_name}...")
                
                # Read headers to find date columns
                with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
                    reader = csv.reader(f)
                    headers = next(reader)
                
                # Prepare columns and SET clause
                columns = []
                set_clauses = []
                
                for header in headers:
                    col_name = header.strip().replace(' ', '_').replace('.', '').upper()
                    if not col_name: continue # Skip empty headers if any
                    
                    # Check if it's a date column
                    if 'DATE' in col_name or 'TIME' in col_name:
                        # Use a variable for the column
                        var_name = f"@{col_name}"
                        columns.append(var_name)
                        # Handle empty strings and convert format
                        # STR_TO_DATE returns NULL if input is invalid or empty string usually needs handling
                        # NULLIF(@var, '') makes empty string NULL
                        set_clauses.append(f"`{col_name}` = STR_TO_DATE(NULLIF({var_name}, ''), '%d/%m/%Y')")
                    else:
                        columns.append(f"`{col_name}`")
                
                col_list = ", ".join(columns)
                set_stmt = f"SET {', '.join(set_clauses)}" if set_clauses else ""
                
                sql = f"""
                    LOAD DATA LOCAL INFILE '{file_path}'
                    INTO TABLE `{table_name}`
                    FIELDS TERMINATED BY ','
                    ENCLOSED BY '"'
                    LINES TERMINATED BY '\\n'
                    IGNORE 1 LINES
                    ({col_list})
                    {set_stmt};
                """
                
                try:
                    cursor.execute(sql)
                    print(f"Successfully imported {csv_file}")
                    conn.commit()
                except Exception as e:
                    print(f"Error importing {csv_file}: {e}")
                    # Continue to next file
                    
    finally:
        conn.close()

if __name__ == "__main__":
    import_data()
