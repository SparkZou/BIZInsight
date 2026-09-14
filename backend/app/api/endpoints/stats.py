from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from app.api import deps
from typing import Dict

router = APIRouter()

# Dataset metadata with descriptions
DATASETS = {
    "companies_core_data": {
        "name": "Companies Core Data",
        "description": "Core details of all registered and removed companies including company name, company type, status, registration date and removal date.",
        "category": "companies"
    },
    "companies_abn": {
        "name": "Companies ABN",
        "description": "Registered companies that have provided an Australian Business Number (ABN).",
        "category": "companies"
    },
    "companies_address_for_service": {
        "name": "Companies Address for Service",
        "description": "Registered companies address for service.",
        "category": "companies"
    },
    "companies_business_industry_classification": {
        "name": "Companies Business Industry Classification",
        "description": "Registered companies that have provided a public Business Industry Classification (BIC) code.",
        "category": "companies"
    },
    "companies_director": {
        "name": "Companies Director",
        "description": "Active directors of registered companies.",
        "category": "companies"
    },
    "companies_gst": {
        "name": "Companies GST",
        "description": "Registered companies that have provided a public GST number.",
        "category": "companies"
    },
    "companies_insolvency": {
        "name": "Companies Insolvency",
        "description": "All companies that have had an insolvency practitioner appointed for liquidation, receivership or voluntary administration.",
        "category": "companies"
    },
    "companies_public_address": {
        "name": "Companies Public Address",
        "description": "Registered companies that have provided a public delivery, invoice, office and/or postal address.",
        "category": "companies"
    },
    "companies_registered_office_address": {
        "name": "Companies Registered Office Address",
        "description": "Registered companies registered office address (the address where company records are kept).",
        "category": "companies"
    },
    "companies_shareholder": {
        "name": "Companies Shareholder",
        "description": "Active shareholders of registered companies.",
        "category": "companies"
    },
    "companies_trading_area": {
        "name": "Companies Trading Area",
        "description": "Registered companies that have provided a public trading area.",
        "category": "companies"
    },
    "companies_trading_name": {
        "name": "Companies Trading Name",
        "description": "Registered companies that have provided a public trading name.",
        "category": "companies"
    },
    "companies_website": {
        "name": "Companies Website",
        "description": "Registered companies that have provided a public website address.",
        "category": "companies"
    },
    "other_incorporated_entities_core_data": {
        "name": "Other Incorporated Entities",
        "description": "All registered and removed incorporated societies and limited partnerships.",
        "category": "entities"
    },
    "charitable_trust_boards_core_data": {
        "name": "Charitable Trust Boards",
        "description": "All registered and removed charitable trust boards.",
        "category": "entities"
    },
    "unincorporated_entities_core_data": {
        "name": "Unincorporated Entities",
        "description": "All registered and inactive sole traders, partnerships and trusts.",
        "category": "entities"
    },
    "retirement_villages_core_data": {
        "name": "Retirement Villages",
        "description": "All registered and struck off retirement villages.",
        "category": "entities"
    },
    "public_sector_entities_core_data": {
        "name": "Public Sector Entities",
        "description": "All registered and inactive public sector entities with a New Zealand Business Number including central government, local government, education entities and other public entities.",
        "category": "other"
    },
    "maori_business_identifier": {
        "name": "Māori Business Identifier",
        "description": "All registered entities (including non-company entities) that have identified on the New Zealand Business Number Register as a Māori business.",
        "category": "other"
    }
}

@router.get("/datasets")
async def get_dataset_statistics(db: Session = Depends(deps.get_db)) -> Dict:
    """
    Get statistics for all datasets including record counts.
    Returns metadata and current counts for every Companies Office data table.
    """
    results = []

    for table_name, metadata in DATASETS.items():
        try:
            # Get count for this table
            count_query = text(f"SELECT COUNT(*) FROM {table_name}")
            result = db.execute(count_query)
            count = result.scalar()

            results.append({
                "tableName": table_name,
                "name": metadata["name"],
                "description": metadata["description"],
                "category": metadata["category"],
                "count": count or 0
            })
        except Exception as e:
            # If table doesn't exist or error occurs, set count to 0. Details go to the
            # server log only; raw SQL errors must not reach public responses.
            print(f"Error counting {table_name}: {e}")
            results.append({
                "tableName": table_name,
                "name": metadata["name"],
                "description": metadata["description"],
                "category": metadata["category"],
                "count": 0,
                "error": "Table unavailable"
            })

    # Calculate totals by category
    totals = {
        "companies": sum(r["count"] for r in results if r["category"] == "companies"),
        "entities": sum(r["count"] for r in results if r["category"] == "entities"),
        "other": sum(r["count"] for r in results if r["category"] == "other"),
        "total": sum(r["count"] for r in results)
    }

    return {
        "datasets": results,
        "totals": totals
    }
