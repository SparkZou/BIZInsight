from sqlalchemy import Column, String, Date
from app.models.company import Base

class RetirementVillage(Base):
    __tablename__ = "retirement_villages_core_data"

    ENTITY_NUMBER = Column(String(50), primary_key=True, index=True)
    ENTITY_NAME = Column(String(255), index=True)
    REGISTRATION_DATE = Column(Date, nullable=True)
    ENTITY_STATUS = Column(String(50), nullable=True)
    PHYSICAL_ADDRESS_1 = Column(String(255), nullable=True)
    PHYSICAL_ADDRESS_2 = Column(String(255), nullable=True)
    PHYSICAL_ADDRESS_3 = Column(String(255), nullable=True)
    PHYSICAL_ADDRESS_4 = Column(String(255), nullable=True)
    PHYSICAL_POST_CODE = Column(String(20), nullable=True)
    OPERATOR_NAME = Column(String(255), nullable=True)
    OPERATOR_ADDRESS_1 = Column(String(255), nullable=True)
    OPERATOR_ADDRESS_2 = Column(String(255), nullable=True)
    OPERATOR_ADDRESS_3 = Column(String(255), nullable=True)
    OPERATOR_ADDRESS_4 = Column(String(255), nullable=True)
    OPERATOR_POST_CODE = Column(String(20), nullable=True)
    OPERATOR_DATE_APPOINTED = Column(Date, nullable=True)
    
    # Missing columns added
    ADDRESS_FOR_PREMISES_1 = Column(String(255), nullable=True)
    ADDRESS_FOR_PREMISES_2 = Column(String(255), nullable=True)
    ADDRESS_FOR_PREMISES_3 = Column(String(255), nullable=True)
    ADDRESS_FOR_PREMISES_4 = Column(String(255), nullable=True)
    
    ADDRESS_FOR_COMMUNICATION_1 = Column(String(255), nullable=True)
    ADDRESS_FOR_COMMUNICATION_2 = Column(String(255), nullable=True)
    ADDRESS_FOR_COMMUNICATION_3 = Column(String(255), nullable=True)
    ADDRESS_FOR_COMMUNICATION_4 = Column(String(255), nullable=True)
    
    REGISTERED_OFFICE_ADDRESS_1 = Column(String(255), nullable=True)
    REGISTERED_OFFICE_ADDRESS_2 = Column(String(255), nullable=True)
    REGISTERED_OFFICE_ADDRESS_3 = Column(String(255), nullable=True)
    REGISTERED_OFFICE_ADDRESS_4 = Column(String(255), nullable=True)
    
    OPERATOR_NUMBER = Column(String(50), nullable=True)
    
    STATUTORY_SUPERVISOR_NAME = Column(String(255), nullable=True)
    STATUTORY_SUPERVISOR_ADDRESS_1 = Column(String(255), nullable=True)
    STATUTORY_SUPERVISOR_ADDRESS_2 = Column(String(255), nullable=True)
    STATUTORY_SUPERVISOR_ADDRESS_3 = Column(String(255), nullable=True)
    STATUTORY_SUPERVISOR_ADDRESS_4 = Column(String(255), nullable=True)
    STATUTORY_SUPERVISOR_DATE_APPOINTED = Column(Date, nullable=True)
