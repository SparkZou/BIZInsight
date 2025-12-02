from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional, Dict, Any
from app.db.session import get_db

router = APIRouter()

@router.get("/search")
def search_companies(
    q: str = Query(..., min_length=2, description="Search query for company name or NZBN"),
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """
    Search companies by name or NZBN.
    """
    print(f"Search request received: q={q}, limit={limit}")
    try:
        # Sanitize query
        search_term = f"%{q}%"
        
        # Query companies_core_data
        # 1. Search Core Data
        core_query = text("""
            SELECT 
                NZBN, 
                ENTITY_NAME, 
                ENTITY_STATUS, 
                ENTITY_TYPE, 
                REGISTRATION_DATE
            FROM companies_core_data 
            WHERE ENTITY_NAME LIKE :search_term OR NZBN LIKE :search_term
            LIMIT :limit
        """)
        
        core_result = db.execute(core_query, {"search_term": search_term, "limit": limit})
        
        # 2. Search Directors
        director_query = text("""
            SELECT DISTINCT c.NZBN, c.ENTITY_NAME, c.ENTITY_STATUS, c.ENTITY_TYPE, c.REGISTRATION_DATE
            FROM companies_director d
            JOIN companies_core_data c ON d.NZBN = c.NZBN
            WHERE d.FIRST_NAME LIKE :search_term 
               OR d.MIDDLE_NAMES LIKE :search_term 
               OR d.LAST_NAME LIKE :search_term
            LIMIT :limit
        """)
        
        director_result = db.execute(director_query, {"search_term": search_term, "limit": limit})
        
        # 3. Merge Results (deduplicate by NZBN)
        seen_nzbns = set()
        companies = []
        
        def process_row(row):
            nzbn = str(row.NZBN)
            if nzbn in seen_nzbns:
                return
            seen_nzbns.add(nzbn)
            
            try:
                # Handle date serialization safely
                reg_date = row.REGISTRATION_DATE
                if hasattr(reg_date, 'isoformat'):
                    reg_date_str = reg_date.isoformat()
                else:
                    reg_date_str = str(reg_date) if reg_date else None

                companies.append({
                    "nzbn": nzbn,
                    "name": str(row.ENTITY_NAME) if row.ENTITY_NAME else "Unknown",
                    "status": str(row.ENTITY_STATUS) if row.ENTITY_STATUS else "Unknown",
                    "type": str(row.ENTITY_TYPE) if row.ENTITY_TYPE else "Unknown",
                    "registration_date": reg_date_str
                })
            except Exception as row_error:
                print(f"Error processing row: {row_error}")

        for row in core_result:
            process_row(row)
            
        for row in director_result:
            process_row(row)
            
        # Limit total results
        companies = companies[:limit]
            
        print(f"Returning {len(companies)} results")
        return {
            "count": len(companies),
            "results": companies
        }
    except Exception as e:
        print(f"Error in search endpoint: {e}")
        # Return empty list instead of 500 to avoid breaking frontend
        return {
            "count": 0,
            "results": [],
            "error": str(e)
        }

@router.get("/{nzbn}")
def get_company_details(
    nzbn: str,
    db: Session = Depends(get_db)
):
    """
    Get comprehensive information for a specific company by NZBN.
    Includes data from 15+ tables organized by category.
    """
    # 1. Get Core Data - try companies_core_data first
    core_query = text("SELECT * FROM companies_core_data WHERE NZBN = :nzbn")
    core_result = db.execute(core_query, {"nzbn": nzbn}).fetchone()
    
    # If not found in companies_core_data, try other_incorporated_entities_core_data
    if not core_result:
        other_inc_query = text("SELECT * FROM other_incorporated_entities_core_data WHERE NZBN = :nzbn")
        core_result = db.execute(other_inc_query, {"nzbn": nzbn}).fetchone()
        
    # If still not found, try public_sector_entities_core_data
    if not core_result:
        public_sector_query = text("SELECT * FROM public_sector_entities_core_data WHERE NZBN = :nzbn")
        core_result = db.execute(public_sector_query, {"nzbn": nzbn}).fetchone()
        
    # If still not found, try unincorporated_entities_core_data
    if not core_result:
        uninc_query = text("SELECT * FROM unincorporated_entities_core_data WHERE NZBN = :nzbn")
        core_result = db.execute(uninc_query, {"nzbn": nzbn}).fetchone()
    
    if not core_result:
        raise HTTPException(status_code=404, detail="Company not found")
        
    company_data = dict(core_result._mapping)
    
    # 2. Basic Info Extensions
    # ABN (Australian Business Number)
    try:
        abn_query = text("SELECT * FROM companies_abn WHERE NZBN = :nzbn")
        abn_result = db.execute(abn_query, {"nzbn": nzbn}).fetchone()
        company_data["abn"] = dict(abn_result._mapping) if abn_result else None
    except Exception:
        company_data["abn"] = None
    
    # Industry Classification
    try:
        industry_query = text("SELECT * FROM companies_business_industry_classification WHERE NZBN = :nzbn")
        industry_result = db.execute(industry_query, {"nzbn": nzbn}).fetchall()
        industry_data = []
        for row in industry_result:
            row_dict = dict(row._mapping)
            # Map DB columns to Frontend expected keys
            row_dict['ANZSIC_CODE'] = row_dict.get('INDUSTRY_CLASSIFICATION_CODE')
            row_dict['ANZSIC_DESCRIPTION'] = row_dict.get('INDUSTRY_CLASSIFICATION_DESCRIPTION')
            industry_data.append(row_dict)
        company_data["industry_classification"] = industry_data
    except Exception as e:
        print(f"Error fetching industry classification: {e}")
        company_data["industry_classification"] = []
    
    # GST Registration
    try:
        gst_query = text("SELECT * FROM companies_gst WHERE NZBN = :nzbn")
        gst_result = db.execute(gst_query, {"nzbn": nzbn}).fetchone()
        if gst_result:
            gst_data = dict(gst_result._mapping)
            # Map DB columns to Frontend expected keys
            gst_data['GST_NUMBER'] = gst_data.get('GST_NUMBER')
            
            # Handle date serialization
            start_date = gst_data.get('START_DATE')
            if hasattr(start_date, 'isoformat'):
                gst_data['GST_REGISTRATION_DATE'] = start_date.isoformat()
            else:
                gst_data['GST_REGISTRATION_DATE'] = str(start_date) if start_date else None
                
            company_data["gst"] = gst_data
        else:
            company_data["gst"] = None
    except Exception as e:
        print(f"Error fetching GST data: {e}")
        company_data["gst"] = None
    
    # Trading Names
    try:
        trading_name_query = text("SELECT * FROM companies_trading_name WHERE NZBN = :nzbn")
        trading_name_result = db.execute(trading_name_query, {"nzbn": nzbn}).fetchall()
        company_data["trading_names"] = [dict(row._mapping) for row in trading_name_result]
    except Exception:
        company_data["trading_names"] = []
    
    # Websites
    try:
        website_query = text("SELECT * FROM companies_website WHERE NZBN = :nzbn")
        website_result = db.execute(website_query, {"nzbn": nzbn}).fetchall()
        company_data["websites"] = [dict(row._mapping) for row in website_result]
    except Exception:
        company_data["websites"] = []
    
    # 3. Address Data (Multiple Types)
    addresses = {}
    
    # Service Addresses
    try:
        service_addr_query = text("SELECT * FROM companies_address_for_service WHERE NZBN = :nzbn")
        service_addr_result = db.execute(service_addr_query, {"nzbn": nzbn}).fetchall()
        addresses["service"] = [dict(row._mapping) for row in service_addr_result]
    except Exception:
        addresses["service"] = []
    
    # Public Addresses
    try:
        public_addr_query = text("SELECT * FROM companies_public_address WHERE NZBN = :nzbn")
        public_addr_result = db.execute(public_addr_query, {"nzbn": nzbn}).fetchall()
        addresses["public"] = [dict(row._mapping) for row in public_addr_result]
    except Exception:
        addresses["public"] = []
    
    # Registered Office Addresses
    try:
        office_addr_query = text("SELECT * FROM companies_registered_office_address WHERE NZBN = :nzbn")
        office_addr_result = db.execute(office_addr_query, {"nzbn": nzbn}).fetchall()
        addresses["office"] = [dict(row._mapping) for row in office_addr_result]
    except Exception:
        addresses["office"] = []
    
    company_data["addresses"] = addresses
    
    # 4. People & Ownership
    # Directors
    try:
        director_query = text("SELECT * FROM companies_director WHERE NZBN = :nzbn")
        director_result = db.execute(director_query, {"nzbn": nzbn}).fetchall()
        company_data["directors"] = [dict(row._mapping) for row in director_result]
    except Exception:
        company_data["directors"] = []
    
    # Shareholders
    try:
        shareholder_query = text("SELECT * FROM companies_shareholder WHERE NZBN = :nzbn")
        shareholder_result = db.execute(shareholder_query, {"nzbn": nzbn}).fetchall()
        company_data["shareholders"] = [dict(row._mapping) for row in shareholder_result]
    except Exception:
        company_data["shareholders"] = []
    
    # 5. Business Scope
    # Trading Areas
    try:
        trading_area_query = text("SELECT * FROM companies_trading_area WHERE NZBN = :nzbn")
        trading_area_result = db.execute(trading_area_query, {"nzbn": nzbn}).fetchall()
        company_data["trading_areas"] = [dict(row._mapping) for row in trading_area_result]
    except Exception:
        company_data["trading_areas"] = []
    
    # 6. Compliance & Risk
    # Insolvency Records
    try:
        insolvency_query = text("SELECT * FROM companies_insolvency WHERE NZBN = :nzbn")
        insolvency_result = db.execute(insolvency_query, {"nzbn": nzbn}).fetchall()
        company_data["insolvency"] = [dict(row._mapping) for row in insolvency_result]
    except Exception:
        company_data["insolvency"] = []
    
    # 7. Special Entity Types
    special_entity = {}
    
    # Maori Business Identifier
    try:
        maori_query = text("SELECT * FROM maori_business_identifier WHERE NZBN = :nzbn")
        maori_result = db.execute(maori_query, {"nzbn": nzbn}).fetchone()
        special_entity["maori_business"] = dict(maori_result._mapping) if maori_result else None
    except Exception:
        special_entity["maori_business"] = None
    
    # Other Incorporated Entities
    try:
        other_inc_query = text("SELECT * FROM other_incorporated_entities_core_data WHERE NZBN = :nzbn")
        other_inc_result = db.execute(other_inc_query, {"nzbn": nzbn}).fetchone()
        special_entity["other_incorporated"] = dict(other_inc_result._mapping) if other_inc_result else None
    except Exception:
        special_entity["other_incorporated"] = None
    
    # Public Sector Entities
    try:
        public_sector_query = text("SELECT * FROM public_sector_entities_core_data WHERE NZBN = :nzbn")
        public_sector_result = db.execute(public_sector_query, {"nzbn": nzbn}).fetchone()
        special_entity["public_sector"] = dict(public_sector_result._mapping) if public_sector_result else None
    except Exception:
        special_entity["public_sector"] = None
    
    # Unincorporated Entities
    try:
        uninc_query = text("SELECT * FROM unincorporated_entities_core_data WHERE NZBN = :nzbn")
        uninc_result = db.execute(uninc_query, {"nzbn": nzbn}).fetchone()
        special_entity["unincorporated"] = dict(uninc_result._mapping) if uninc_result else None
    except Exception:
        special_entity["unincorporated"] = None
    
    company_data["special_entity"] = special_entity

    return company_data

