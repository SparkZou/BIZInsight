from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from app.db.session import get_db
from app.models.contact import ContactMessage
import uuid

router = APIRouter()

class ContactRequest(BaseModel):
    """
    Contact form submission schema.
    """
    name: str
    email: EmailStr
    company: str = ""
    message: str

@router.post("/contact")
def submit_contact(
    request: ContactRequest,
    db: Session = Depends(get_db)
):
    """
    Submit a contact form message.
    Saves the message to the database.
    """
    
    # Create new contact message
    contact = ContactMessage(
        id=str(uuid.uuid4()),
        name=request.name,
        email=request.email,
        company=request.company if request.company else None,
        message=request.message
    )
    
    db.add(contact)
    db.commit()
    db.refresh(contact)
    
    return {
        "success": True,
        "message": "Thank you for contacting us! We'll get back to you soon."
    }
