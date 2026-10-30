from typing import Optional
from fastapi import Header, HTTPException, status
from app.core.supabase_client import supabase
from app.core.config import settings


async def get_current_user_id(authorization: Optional[str] = Header(None)) -> str:
    """
    Validates Supabase Bearer JWT token from the Authorization header.
    Returns the authenticated user UUID if valid.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in to proceed.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    parts = authorization.strip().split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization header format. Expected 'Bearer <token>'.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = parts[1].strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer token cannot be empty.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Allow service role key bypass for server-to-server calls
    service_key = settings.SUPABASE_SERVICE_KEY or settings.SUPABASE_SERVICE_ROLE_KEY
    if service_key and token == service_key:
        return "service-role-admin"

    if not supabase:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database auth client is currently uninitialized.",
        )

    try:
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired session token. Please sign in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return str(user_response.user.id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def verify_artisan_owner(
    artisan_id: str,
    authorization: Optional[str] = Header(None)
) -> str:
    """
    Ensures the caller has a valid session token matching the target artisan_id.
    Prevents unauthorized modification of another artisan's profile or payout details.
    """
    caller_id = await get_current_user_id(authorization)

    # Admin bypass
    if caller_id == "service-role-admin":
        return caller_id

    if caller_id.lower() != str(artisan_id).lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You are not authorized to modify another artisan's account or products.",
        )
    return caller_id
