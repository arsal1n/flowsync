import hashlib
import hmac
import secrets
import sqlite3
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from database import get_connection


AUTH_TOKEN_DAYS = 7

ROLE_CATALOG = [
    "driver",
    "admin",
    "police",
    "ambulance",
    "fire_truck",
    "rta_operator",
    "vip",
]

DEMO_USERS = [
    {
        "full_name": "FlowSync Admin",
        "email": "admin@flowsync.local",
        "password": "flowsync123",
        "role": "admin",
        "phone": "+971000000001",
    },
    {
        "full_name": "Demo Driver",
        "email": "driver@flowsync.local",
        "password": "flowsync123",
        "role": "driver",
        "phone": "+971000000002",
    },
    {
        "full_name": "Ambulance Unit",
        "email": "ambulance@flowsync.local",
        "password": "flowsync123",
        "role": "ambulance",
        "phone": "+971000000003",
    },
    {
        "full_name": "Police Control",
        "email": "police@flowsync.local",
        "password": "flowsync123",
        "role": "police",
        "phone": "+971000000004",
    },
    {
        "full_name": "RTA Operator",
        "email": "rta@flowsync.local",
        "password": "flowsync123",
        "role": "rta_operator",
        "phone": "+971000000005",
    },
    {
        "full_name": "VIP User",
        "email": "vip@flowsync.local",
        "password": "flowsync123",
        "role": "vip",
        "phone": "+971000000006",
    },
]


def current_time() -> str:
    return datetime.now().isoformat(timespec="seconds")


def normalize_email(email: str) -> str:
    return email.strip().lower()


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        120_000,
    ).hex()

    return f"pbkdf2_sha256${salt}${password_hash}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, salt, expected_hash = stored_hash.split("$")
    except ValueError:
        return False

    if algorithm != "pbkdf2_sha256":
        return False

    actual_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        120_000,
    ).hex()

    return hmac.compare_digest(actual_hash, expected_hash)


def public_user(row) -> Dict[str, Any]:
    return {
        "user_id": row["user_id"],
        "full_name": row["full_name"],
        "email": row["email"],
        "role": row["role"],
        "phone": row["phone"],
        "is_active": bool(row["is_active"]),
        "created_time": row["created_time"],
        "updated_time": row["updated_time"],
        "last_login": row["last_login"],
    }


def init_auth_tables() -> None:
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'driver',
            phone TEXT DEFAULT '',
            is_active INTEGER DEFAULT 1,
            created_time TEXT NOT NULL,
            updated_time TEXT NOT NULL,
            last_login TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS auth_sessions (
            token TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            role TEXT NOT NULL,
            created_time TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            revoked INTEGER DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        )
    """)

    seed_demo_users(cursor)

    connection.commit()
    connection.close()


def seed_demo_users(cursor) -> None:
    existing_count = cursor.execute(
        "SELECT COUNT(*) AS count FROM users"
    ).fetchone()["count"]

    if existing_count > 0:
        return

    now = current_time()

    for user in DEMO_USERS:
        cursor.execute("""
            INSERT OR IGNORE INTO users (
                full_name,
                email,
                password_hash,
                role,
                phone,
                is_active,
                created_time,
                updated_time,
                last_login
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            user["full_name"],
            normalize_email(user["email"]),
            hash_password(user["password"]),
            user["role"],
            user["phone"],
            1,
            now,
            now,
            None,
        ))


def create_user(
    full_name: str,
    email: str,
    password: str,
    role: str = "driver",
    phone: str = "",
) -> Dict[str, Any]:
    init_auth_tables()

    email = normalize_email(email)
    now = current_time()

    connection = get_connection()
    cursor = connection.cursor()

    existing = cursor.execute("""
        SELECT user_id
        FROM users
        WHERE email = ?
    """, (email,)).fetchone()

    if existing:
        connection.close()
        return {
            "created": False,
            "message": "A user with this email already exists.",
            "user": None,
        }

    cursor.execute("""
        INSERT INTO users (
            full_name,
            email,
            password_hash,
            role,
            phone,
            is_active,
            created_time,
            updated_time,
            last_login
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        full_name,
        email,
        hash_password(password),
        role,
        phone,
        1,
        now,
        now,
        None,
    ))

    user_id = cursor.lastrowid

    row = cursor.execute("""
        SELECT *
        FROM users
        WHERE user_id = ?
    """, (user_id,)).fetchone()

    connection.commit()
    connection.close()

    return {
        "created": True,
        "message": "User created successfully.",
        "user": public_user(row),
    }


def create_auth_session(user_row) -> Dict[str, Any]:
    token = secrets.token_urlsafe(32)
    created_time = current_time()
    expires_at = (datetime.now() + timedelta(days=AUTH_TOKEN_DAYS)).isoformat(timespec="seconds")

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        INSERT INTO auth_sessions (
            token,
            user_id,
            role,
            created_time,
            expires_at,
            revoked
        )
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        token,
        user_row["user_id"],
        user_row["role"],
        created_time,
        expires_at,
        0,
    ))

    cursor.execute("""
        UPDATE users
        SET last_login = ?, updated_time = ?
        WHERE user_id = ?
    """, (
        created_time,
        created_time,
        user_row["user_id"],
    ))

    connection.commit()
    connection.close()

    return {
        "access_token": token,
        "token_type": "Bearer",
        "expires_at": expires_at,
    }


def login_user(email: str, password: str) -> Dict[str, Any]:
    init_auth_tables()

    email = normalize_email(email)

    connection = get_connection()
    cursor = connection.cursor()

    row = cursor.execute("""
        SELECT *
        FROM users
        WHERE email = ?
    """, (email,)).fetchone()

    connection.close()

    if not row:
        return {
            "authenticated": False,
            "message": "Invalid email or password.",
        }

    if not row["is_active"]:
        return {
            "authenticated": False,
            "message": "This user account is disabled.",
        }

    if not verify_password(password, row["password_hash"]):
        return {
            "authenticated": False,
            "message": "Invalid email or password.",
        }

    session = create_auth_session(row)

    return {
        "authenticated": True,
        "message": "Login successful.",
        "user": public_user(row),
        "session": session,
    }


def revoke_token(token: str) -> Dict[str, Any]:
    init_auth_tables()

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        UPDATE auth_sessions
        SET revoked = 1
        WHERE token = ?
    """, (token,))

    changed = cursor.rowcount

    connection.commit()
    connection.close()

    return {
        "logged_out": changed > 0,
        "message": "Logout successful." if changed > 0 else "Token was not found.",
    }


def get_user_by_token(token: str) -> Dict[str, Any]:
    init_auth_tables()

    connection = get_connection()
    cursor = connection.cursor()

    row = cursor.execute("""
        SELECT
            u.*,
            s.token,
            s.created_time AS session_created_time,
            s.expires_at,
            s.revoked
        FROM auth_sessions s
        JOIN users u
        ON s.user_id = u.user_id
        WHERE s.token = ?
    """, (token,)).fetchone()

    if not row:
        connection.close()
        return {
            "found": False,
            "message": "Invalid or missing authentication token.",
        }

    if row["revoked"]:
        connection.close()
        return {
            "found": False,
            "message": "This authentication token has been revoked.",
        }

    expires_at = datetime.fromisoformat(row["expires_at"])

    if expires_at < datetime.now():
        cursor.execute("""
            UPDATE auth_sessions
            SET revoked = 1
            WHERE token = ?
        """, (token,))
        connection.commit()
        connection.close()

        return {
            "found": False,
            "message": "This authentication token has expired.",
        }

    if not row["is_active"]:
        connection.close()
        return {
            "found": False,
            "message": "This user account is disabled.",
        }

    user = public_user(row)

    connection.close()

    return {
        "found": True,
        "user": user,
        "session": {
            "token_type": "Bearer",
            "expires_at": row["expires_at"],
            "created_time": row["session_created_time"],
        },
    }


def list_users(role: Optional[str] = None) -> Dict[str, Any]:
    init_auth_tables()

    connection = get_connection()
    cursor = connection.cursor()

    if role:
        rows = cursor.execute("""
            SELECT *
            FROM users
            WHERE role = ?
            ORDER BY user_id ASC
        """, (role,)).fetchall()
    else:
        rows = cursor.execute("""
            SELECT *
            FROM users
            ORDER BY user_id ASC
        """).fetchall()

    users = [public_user(row) for row in rows]

    connection.close()

    return {
        "users": users,
        "count": len(users),
    }


def get_auth_status() -> Dict[str, Any]:
    init_auth_tables()

    connection = get_connection()
    cursor = connection.cursor()

    user_count = cursor.execute("""
        SELECT COUNT(*) AS count
        FROM users
    """).fetchone()["count"]

    active_sessions = cursor.execute("""
        SELECT COUNT(*) AS count
        FROM auth_sessions
        WHERE revoked = 0
    """).fetchone()["count"]

    role_rows = cursor.execute("""
        SELECT role, COUNT(*) AS count
        FROM users
        GROUP BY role
    """).fetchall()

    connection.close()

    return {
        "auth_enabled": True,
        "token_type": "Bearer",
        "token_lifetime_days": AUTH_TOKEN_DAYS,
        "user_count": user_count,
        "active_sessions": active_sessions,
        "roles": ROLE_CATALOG,
        "role_distribution": {
            row["role"]: row["count"]
            for row in role_rows
        },
        "demo_accounts": [
            {
                "email": user["email"],
                "password": "flowsync123",
                "role": user["role"],
            }
            for user in DEMO_USERS
        ],
    }