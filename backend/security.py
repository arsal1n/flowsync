from typing import Dict, Optional, Set

from fastapi import Request
from fastapi.responses import JSONResponse

from auth_engine import get_user_by_token, init_auth_tables


PUBLIC_PATHS = {
    "/",
    "/openapi.json",
    "/docs",
    "/docs/oauth2-redirect",
    "/redoc",
    "/api/features",
    "/api/auth/status",
    "/api/auth/register",
    "/api/auth/login",
    "/api/auth/roles",
    "/api/health",
    "/api/deployment/status",
    "/api/deployment/checklist",
    "/api/backend/feature-coverage",
    "/api/database/status",
    "/api/database/tables",
    "/api/database/readiness",
    "/api/stream/status",
}


ADMIN_ROLES = {"admin", "rta_operator"}
EMERGENCY_ROLES = {"admin", "rta_operator", "ambulance", "police", "fire_truck"}
VIP_ROLES = {"admin", "rta_operator", "vip"}


def error_response(status_code: int, message: str, extra: Optional[Dict] = None):
    payload = {
        "detail": {
            "error": {
                "message": message
            }
        }
    }

    if extra:
        payload["detail"]["error"].update(extra)

    return JSONResponse(
        status_code=status_code,
        content=payload,
    )


def extract_bearer_token(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None

    parts = authorization.split(" ", 1)

    if len(parts) != 2:
        return None

    if parts[0].lower() != "bearer":
        return None

    token = parts[1].strip()

    return token or None


def get_required_roles(path: str, method: str) -> Optional[Set[str]]:
    method = method.upper()

    if path in PUBLIC_PATHS:
        return None

    if path.startswith("/api/auth/users"):
        return ADMIN_ROLES

    if path.startswith("/api/admin"):
        return ADMIN_ROLES

    if path.startswith("/api/jobs"):
        return ADMIN_ROLES

    if path.startswith("/api/database/admin"):
        return ADMIN_ROLES

    if path.startswith("/api/stream/admin"):
        return ADMIN_ROLES

    if path.startswith("/api/stream/emergency"):
        return EMERGENCY_ROLES

    if path in {"/api/demo/reset", "/api/demo/seed"}:
        return {"admin"}

    if path.startswith("/api/emergency"):
        return EMERGENCY_ROLES

    if path.startswith("/api/priority"):
        return VIP_ROLES

    if path.startswith("/api/live/admin"):
        return ADMIN_ROLES

    if path.startswith("/api/live/emergency"):
        return EMERGENCY_ROLES

    return None


async def role_access_middleware(request: Request, call_next):
    init_auth_tables()

    path = request.url.path
    method = request.method.upper()

    if method == "OPTIONS":
        return await call_next(request)

    required_roles = get_required_roles(path, method)

    if required_roles is None:
        return await call_next(request)

    authorization = request.headers.get("Authorization")
    token = extract_bearer_token(authorization)

    if not token:
        return error_response(
            status_code=401,
            message="Authentication required. Use Authorization: Bearer <token>.",
            extra={
                "required_roles": sorted(list(required_roles))
            },
        )

    user_result = get_user_by_token(token)

    if not user_result["found"]:
        return error_response(
            status_code=401,
            message=user_result["message"],
            extra={
                "required_roles": sorted(list(required_roles))
            },
        )

    user = user_result["user"]

    if user["role"] not in required_roles:
        return error_response(
            status_code=403,
            message="You do not have permission to access this endpoint.",
            extra={
                "your_role": user["role"],
                "required_roles": sorted(list(required_roles)),
            },
        )

    request.state.current_user = user

    return await call_next(request)