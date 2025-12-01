from sqlalchemy import Column, String, Date
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Company(Base):
    __tablename__ = "companies_core_data"

    NZBN = Column(String(50), primary_key=True, index=True)
    COMPANY_IDENTIFIER = Column(String(50))
    ENTITY_NAME = Column(String(255), index=True)
    REGISTRATION_DATE = Column(Date)
    REMOVAL_DATE = Column(Date, nullable=True)
    ENTITY_TYPE = Column(String(50))
    ENTITY_STATUS = Column(String(50))
