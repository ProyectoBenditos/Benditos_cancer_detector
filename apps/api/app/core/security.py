from typing import Any, Dict

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.db.supabase_client import supabase

bearer_scheme = HTTPBearer(auto_error=False)


def _safe_get_user_object(auth_response: Any):
    """
    Soporta distintas formas de respuesta del cliente de Supabase.
    """
    user = getattr(auth_response, "user", None)

    if user is None:
        data = getattr(auth_response, "data", None)
        if data is not None:
            user = getattr(data, "user", None)

    return user


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> Dict[str, Any]:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token Bearer requerido",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    try:
        auth_response = supabase.auth.get_user(token)
        user = _safe_get_user_object(auth_response)

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido o usuario no encontrado",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user_id = getattr(user, "id", None)
        email = getattr(user, "email", None)

        if user_id is None and isinstance(user, dict):
            user_id = user.get("id")
            email = user.get("email")

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No se pudo resolver el usuario autenticado",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return {
            "id": user_id,
            "email": email,
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"DEBUG EXCEPTION IN get_current_user: {repr(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"No se pudo validar el token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )