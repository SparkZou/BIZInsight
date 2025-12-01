from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from app.core.config import settings

security = HTTPBearer()

# Initialize Supabase client if credentials are present
supabase: Client = None
if settings.SUPABASE_URL and settings.SUPABASE_KEY:
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Verifies the JWT token using Supabase.
    """
    if not supabase:
        # If Supabase is not configured, allow access for development/demo purposes
        # In production, this should raise an error
        return {"sub": "dev-user", "role": "authenticated"}

    token = credentials.credentials
    try:
        user = supabase.auth.get_user(token)
        return user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
