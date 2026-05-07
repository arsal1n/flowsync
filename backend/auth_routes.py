import re
from typing import Any, Dict, Optional

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel

from api_utils import (
    api_error,
    clean_text,
    validate_user_role,
)
from auth_engine import (
    create_user,
    get_auth_status,
    get_user_by_token,
    init_auth_tables,
    list_users,
    login_user,
    revoke_token,
)


ADMIN_ROLES = {"admin", "rta_operator"}


class RegisterRequest(BaseModel):
    full_name: str
    email: str
    password: str
    phone: str = ""


class LoginRequest(BaseModel):
    email: str
    password: str


class AdminCreateUserRequest(BaseModel):
    full_name: str
    email: str
    password: str
    role: str
    phone: str = ""


def validate_email(email: str) -> str:
    cleaned = clean_text(email, "email", max_length=160).lower()

    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", cleaned):
        api_error("Invalid email format.", field="email")

    return cleaned


def validate_password(password: str) -> str:
    cleaned = clean_text(password, "password", max_length=200)

    if len(cleaned) < 8:
        api_error(
            "Password must be at least 8 characters.",
            field="password",
        )

    return cleaned


def extract_bearer_token(authorization: Optional[str]) -> str:
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail={
                "error": {
                    "message": "Missing Authorization header. Use: Bearer <token>."
                }
            },
        )

    parts = authorization.split(" ", 1)

    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=401,
            detail={
                "error": {
                    "message": "Invalid Authorization header. Use: Bearer <token>."
                }
            },
        )

    token = parts[1].strip()

    if not token:
        raise HTTPException(
            status_code=401,
            detail={
                "error": {
                    "message": "Authentication token cannot be empty."
                }
            },
        )

    return token


def get_current_user(
    authorization: Optional[str] = Header(None),
) -> Dict[str, Any]:
    token = extract_bearer_token(authorization)
    result = get_user_by_token(token)

    if not result["found"]:
        raise HTTPException(
            status_code=401,
            detail={
                "error": {
                    "message": result["message"]
                }
            },
        )

    return result["user"]


def require_admin_user(
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    if current_user["role"] not in ADMIN_ROLES:
        raise HTTPException(
            status_code=403,
            detail={
                "error": {
                    "message": "Admin or RTA operator role required."
                }
            },
        )

    return current_user


def register_auth_routes(app: FastAPI):
    init_auth_tables()

    @app.get("/api/auth/status", tags=["Authentication"])
    def auth_status():
        return get_auth_status()

    @app.post("/api/auth/register", tags=["Authentication"])
    def register_user(request: RegisterRequest):
        full_name = clean_text(request.full_name, "full_name", max_length=120)
        email = validate_email(request.email)
        password = validate_password(request.password)
        phone = clean_text(
            request.phone,
            "phone",
            max_length=40,
            allow_empty=True,
        )

        result = create_user(
            full_name=full_name,
            email=email,
            password=password,
            role="driver",
            phone=phone,
        )

        if not result["created"]:
            raise HTTPException(
                status_code=409,
                detail={
                    "error": {
                        "message": result["message"],
                        "field": "email",
                    }
                },
            )

        return result

    @app.post("/api/auth/login", tags=["Authentication"])
    def login(request: LoginRequest):
        email = validate_email(request.email)
        password = validate_password(request.password)

        result = login_user(
            email=email,
            password=password,
        )

        if not result["authenticated"]:
            raise HTTPException(
                status_code=401,
                detail={
                    "error": {
                        "message": result["message"]
                    }
                },
            )

        return result

    @app.get("/api/auth/me", tags=["Authentication"])
    def me(current_user: Dict[str, Any] = Depends(get_current_user)):
        return {
            "authenticated": True,
            "user": current_user,
        }

    @app.post("/api/auth/logout", tags=["Authentication"])
    def logout(authorization: Optional[str] = Header(None)):
        token = extract_bearer_token(authorization)
        return revoke_token(token)

    @app.get("/api/auth/users", tags=["Authentication"])
    def users(
        role: Optional[str] = None,
        current_user: Dict[str, Any] = Depends(require_admin_user),
    ):
        clean_role = None

        if role:
            clean_role = validate_user_role(role)

        return {
            "requested_by": current_user,
            **list_users(clean_role),
        }

    @app.post("/api/auth/users", tags=["Authentication"])
    def admin_create_user(
        request: AdminCreateUserRequest,
        current_user: Dict[str, Any] = Depends(require_admin_user),
    ):
        full_name = clean_text(request.full_name, "full_name", max_length=120)
        email = validate_email(request.email)
        password = validate_password(request.password)
        role = validate_user_role(request.role)
        phone = clean_text(
            request.phone,
            "phone",
            max_length=40,
            allow_empty=True,
        )

        result = create_user(
            full_name=full_name,
            email=email,
            password=password,
            role=role,
            phone=phone,
        )

        if not result["created"]:
            raise HTTPException(
                status_code=409,
                detail={
                    "error": {
                        "message": result["message"],
                        "field": "email",
                    }
                },
            )

        return {
            "created_by": current_user,
            **result,
        }

    @app.get("/api/auth/roles", tags=["Authentication"])
    def auth_roles():
        return {
            "roles": [
                "driver",
                "admin",
                "police",
                "ambulance",
                "fire_truck",
                "rta_operator",
                "vip",
            ],
            "admin_roles": sorted(list(ADMIN_ROLES)),
        }