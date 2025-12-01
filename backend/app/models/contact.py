from sqlalchemy import Column, String, Text, DateTime
from sqlalchemy.sql import func
from app.models.company import Base

class ContactMessage(Base):
    __tablename__ = "contact_messages"

    id = Column(String(36), primary_key=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False)
    company = Column(String(255), nullable=True)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
