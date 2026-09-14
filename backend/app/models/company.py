from sqlalchemy import Column, String, Date
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

# Data tables are created by scripts/data_import with PostgreSQL's lower-case column
# names; the Python attributes keep the upper-case names used across the API.
class Company(Base):
    __tablename__ = "companies_core_data"

    NZBN = Column("nzbn", String(50), primary_key=True, index=True)
    COMPANY_IDENTIFIER = Column("company_identifier", String(50))
    ENTITY_NAME = Column("entity_name", String(255), index=True)
    REGISTRATION_DATE = Column("registration_date", Date)
    REMOVAL_DATE = Column("removal_date", Date, nullable=True)
    ENTITY_TYPE = Column("entity_type", String(50))
    ENTITY_STATUS = Column("entity_status", String(50))
