import sys
from pathlib import Path
from typing import Any, Dict, Optional

import pytest
from fastapi.testclient import TestClient


BACKEND_DIR = Path(__file__).resolve().parents[1]

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from main import app  # noqa: E402


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client


def assert_ok(response, expected_status: int = 200) -> Dict[str, Any]:
    assert response.status_code == expected_status, response.text

    try:
        return response.json()
    except Exception:
        return {}


def login(client: TestClient, email: str, password: str = "flowsync123") -> str:
    response = client.post(
        "/api/auth/login",
        json={
            "email": email,
            "password": password,
        },
    )

    payload = assert_ok(response)

    token = (
        payload.get("session", {}).get("access_token")
        or payload.get("access_token")
        or payload.get("token")
    )

    assert token, f"No access token found in login response: {payload}"

    return token


@pytest.fixture(scope="session")
def admin_token(client) -> str:
    return login(client, "admin@flowsync.local")


@pytest.fixture(scope="session")
def driver_token(client) -> str:
    return login(client, "driver@flowsync.local")


def auth_headers(token: str) -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
    }


def extract_request_id(route_payload: Dict[str, Any]) -> Optional[int]:
    database_record = route_payload.get("database_record") or {}
    request_id = database_record.get("request_id")

    if request_id is not None:
        return request_id

    return route_payload.get("request_id")
