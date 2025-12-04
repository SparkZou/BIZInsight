import os
import sys
import pandas as pd
from sqlalchemy import create_engine, text, inspect, insert, MetaData, Table
from dotenv import load_dotenv

# Add backend directory to path to import app modules
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from app.core.config import settings

# Load environment variables
load_dotenv()

# Configuration
DATA_DIR = os.path.join(os.getcwd(), '..', '..', 'Coredata') # Assuming running from backend/scripts/data_import
# Or more robustly finding the root
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
DATA_DIR = os.path.join(PROJECT_ROOT, 'Coredata')

def get_db_engine():
    """Create SQLAlchemy engine."""
    return create_engine(settings.DATABASE_URL)

def validate_csv_structure(csv_path, table_name, engine):
    """
    Validate that CSV headers match the database table columns.
    Returns (bool, message).
    """
    try:
        # Read CSV headers
        df = pd.read_csv(csv_path, nrows=0)
        csv_columns = [col.strip().upper() for col in df.columns]

        # Get database table columns
        inspector = inspect(engine)
        if not inspector.has_table(table_name):
            return False, f"Table '{table_name}' does not exist in the database."
        
        db_columns = [col['name'].upper() for col in inspector.get_columns(table_name)]
        
        # Check for mismatches
        missing_in_db = set(csv_columns) - set(db_columns)
        missing_in_csv = set(db_columns) - set(csv_columns)
        
        # We might want to be strict or lenient. 
        # Strict: Exact match. 
        # Lenient: CSV columns must exist in DB (ignore extra DB columns like id, created_at if auto-generated).
        
        # Let's check if all CSV columns exist in DB to ensure we can map them.
        if missing_in_db:
            return False, f"CSV contains columns not found in table '{table_name}': {missing_in_db}"
            
        return True, "Structure matches."

    except Exception as e:
        return False, f"Validation error: {str(e)}"

def import_core_data(target_file=None):
    """
    Main function to import data from Coredata folder.
    1. Truncate table.
    2. Validate structure.
    3. Import data.
    """
    print(f"Starting import from: {DATA_DIR}")
    
    if not os.path.exists(DATA_DIR):
        print(f"Error: Directory '{DATA_DIR}' not found.")
        return

    engine = get_db_engine()
    
    # Map CSV filenames to Table names if they differ, otherwise assume filename = tablename
    # Based on previous context, the main table is 'companies_core_data'
    # We will look for specific files or iterate all .csv
    
    csv_files = [f for f in os.listdir(DATA_DIR) if f.endswith('.csv')]
    
    if target_file:
        if target_file in csv_files:
            csv_files = [target_file]
        else:
            print(f"Error: File '{target_file}' not found in {DATA_DIR}")
            print(f"Available files: {csv_files}")
            return
    
    if not csv_files:
        print("No CSV files found in Coredata directory.")
        return

    with engine.connect() as conn:
        for csv_file in csv_files:
            # Determine table name. 
            # Strategy: Try to match filename to table. 
            # If filename is 'companies.csv', table might be 'companies_core_data' based on models/company.py
            # Or user might provide specific mapping.
            # For now, let's assume the CSV filename (without extension) maps to the table name, 
            # OR we specifically look for 'companies_core_data.csv' or similar.
            
            # Let's try to infer or use a fixed mapping for safety.
            # If the user says "Coredata", it likely contains the core company data.
            # Let's assume the CSV file is named 'companies_core_data.csv' or we map it.
            
            # Heuristic: If file is 'companies.csv' -> 'companies_core_data'
            table_name = os.path.splitext(csv_file)[0]
            if table_name.lower() == 'companies':
                table_name = 'companies_core_data'
            
            print(f"\nProcessing file: {csv_file} -> Table: {table_name}")
            
            file_path = os.path.join(DATA_DIR, csv_file)
            
            # 1. Validate Structure
            is_valid, message = validate_csv_structure(file_path, table_name, engine)
            if not is_valid:
                print(f"[ERROR] Validation Failed for {csv_file}:")
                print(f"   {message}")
                print("   Skipping this file.")
                continue
            
            print("[OK] Structure validation passed.")

            try:
                # 2. Truncate Table (Clear data)
                print(f"   Truncating table '{table_name}'...")
                conn.execute(text(f"TRUNCATE TABLE {table_name}"))
                conn.commit()
                print("   Table cleared.")

                # 3. Import Data
                print(f"   Reading and importing data...")
                
                # Reflect table for manual insert
                metadata = MetaData()
                target_table = Table(table_name, metadata, autoload_with=engine)
                
                # Read CSV in chunks to handle large files
                chunk_size = 10000
                total_rows = 0
                
                # Get column lengths for truncation
                inspector = inspect(engine)
                columns_info = inspector.get_columns(table_name)
                string_limits = {
                    col['name'].upper(): col['type'].length 
                    for col in columns_info 
                    if hasattr(col['type'], 'length') and col['type'].length is not None
                }

                for chunk in pd.read_csv(file_path, chunksize=chunk_size):
                    # Ensure column names match DB (case sensitivity handling if needed, usually pandas matches header)
                    # We validated existence earlier.
                    
                    # Handle date parsing if necessary. 
                    # If pandas didn't parse dates automatically, we might need to convert.
                    # Check for 'date' in column names and convert to datetime objects
                    for col in chunk.columns:
                        col_upper = col.upper()
                        if 'DATE' in col_upper:
                            chunk[col] = pd.to_datetime(chunk[col], errors='coerce', dayfirst=True)
                        
                        # Truncate string columns if they exceed DB limit
                        if col_upper in string_limits:
                            limit = string_limits[col_upper]
                            # Check if any value exceeds limit (optimization: only apply if needed, or just apply blindly for safety)
                            # Applying blindly is safer and fast enough for vector operations
                            if chunk[col].dtype == 'object': # Only for string/object columns
                                # Warn if we are actually truncating data
                                # (Optional: could be noisy, maybe just do it silently or log once)
                                # Let's just truncate to ensure stability
                                chunk[col] = chunk[col].astype(str).str.slice(0, limit)
                    
                    # Use manual insert instead of to_sql to avoid SQLAlchemy 2.0 incompatibility
                    # Replace NaN with None for SQL NULL - must use fillna() not where()
                    import numpy as np
                    chunk_data = chunk.replace({np.nan: None}).to_dict(orient='records')
                    
                    # Drop duplicates based on primary key to avoid duplicate entry errors
                    # Get primary key column name from table
                    pk_columns = [col.name for col in target_table.primary_key.columns]
                    if pk_columns:
                        chunk = chunk.drop_duplicates(subset=pk_columns, keep='first')
                        chunk_data = chunk.replace({np.nan: None}).to_dict(orient='records')
                    
                    conn.execute(insert(target_table), chunk_data)
                    conn.commit() # Commit each chunk
                    
                    total_rows += len(chunk)
                    print(f"   Imported {total_rows} rows...", end='\r')
                
                print(f"\n[OK] Successfully imported {total_rows} rows into '{table_name}'.")

            except Exception as e:
                import traceback
                print(f"\n[ERROR] Error during import of {csv_file}: {e}")
                traceback.print_exc()

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='Import Coredata CSVs into MySQL')
    parser.add_argument('filename', nargs='?', help='Specific CSV filename to import (optional)')
    args = parser.parse_args()
    
    import_core_data(target_file=args.filename)
