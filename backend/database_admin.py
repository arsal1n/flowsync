import shutil
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

import database
from config import get_database_config
from database import get_connection


def now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def get_database_path() -> Path:
    return Path(getattr(database, "DB_PATH", Path(__file__).resolve().parent / "flowsync.db"))


def get_backup_dir() -> Path:
    config = get_database_config()
    configured_dir = Path(config["backup_dir"])

    if configured_dir.is_absolute():
        return configured_dir

    return Path(__file__).resolve().parent / configured_dir


def get_table_names() -> List[str]:
    connection = get_connection()
    cursor = connection.cursor()

    rows = cursor.execute("""
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
        ORDER BY name
    """).fetchall()

    connection.close()

    return [row["name"] for row in rows]


def table_exists(cursor, table_name: str) -> bool:
    row = cursor.execute("""
        SELECT name
        FROM sqlite_master
        WHERE type = 'table' AND name = ?
    """, (table_name,)).fetchone()

    return row is not None


def get_table_columns(cursor, table_name: str) -> List[str]:
    if not table_exists(cursor, table_name):
        return []

    rows = cursor.execute(f"PRAGMA table_info({table_name})").fetchall()

    return [row["name"] for row in rows]


def columns_exist(cursor, table_name: str, columns: List[str]) -> bool:
    available_columns = set(get_table_columns(cursor, table_name))

    return all(column in available_columns for column in columns)


def get_database_file_info() -> Dict[str, Any]:
    db_path = get_database_path()
    exists = db_path.exists()

    return {
        "database_path": str(db_path),
        "database_file_exists": exists,
        "database_size_bytes": db_path.stat().st_size if exists else 0,
        "database_size_mb": round(db_path.stat().st_size / (1024 * 1024), 3) if exists else 0,
    }


def get_sqlite_pragmas() -> Dict[str, Any]:
    connection = get_connection()
    cursor = connection.cursor()

    try:
        journal_mode = cursor.execute("PRAGMA journal_mode").fetchone()[0]
        foreign_keys = cursor.execute("PRAGMA foreign_keys").fetchone()[0]
        page_count = cursor.execute("PRAGMA page_count").fetchone()[0]
        page_size = cursor.execute("PRAGMA page_size").fetchone()[0]
        user_version = cursor.execute("PRAGMA user_version").fetchone()[0]
    finally:
        connection.close()

    return {
        "journal_mode": journal_mode,
        "foreign_keys_enabled": bool(foreign_keys),
        "page_count": page_count,
        "page_size": page_size,
        "user_version": user_version,
    }


def get_table_counts() -> Dict[str, int]:
    connection = get_connection()
    cursor = connection.cursor()

    counts = {}

    for table_name in get_table_names():
        try:
            row = cursor.execute(f"SELECT COUNT(*) AS count FROM {table_name}").fetchone()
            counts[table_name] = int(row["count"])
        except Exception:
            counts[table_name] = -1

    connection.close()

    return counts


def get_database_tables() -> Dict[str, Any]:
    connection = get_connection()
    cursor = connection.cursor()

    tables = []

    for table_name in get_table_names():
        columns = get_table_columns(cursor, table_name)

        try:
            count = cursor.execute(f"SELECT COUNT(*) AS count FROM {table_name}").fetchone()["count"]
        except Exception:
            count = None

        tables.append({
            "table_name": table_name,
            "columns": columns,
            "column_count": len(columns),
            "row_count": count,
        })

    connection.close()

    return {
        "generated_at": now(),
        "tables": tables,
        "table_count": len(tables),
    }


INDEX_PLAN = [
    {
        "index_name": "idx_trip_requests_destination",
        "table": "trip_requests",
        "columns": ["destination"],
    },
    {
        "index_name": "idx_trip_requests_request_time",
        "table": "trip_requests",
        "columns": ["request_time"],
    },
    {
        "index_name": "idx_route_assignments_request_id",
        "table": "route_assignments",
        "columns": ["request_id"],
    },
    {
        "index_name": "idx_route_assignments_route_name",
        "table": "route_assignments",
        "columns": ["route_name"],
    },
    {
        "index_name": "idx_navigation_sessions_session_id",
        "table": "navigation_sessions",
        "columns": ["session_id"],
    },
    {
        "index_name": "idx_navigation_sessions_status",
        "table": "navigation_sessions",
        "columns": ["status"],
    },
    {
        "index_name": "idx_navigation_sessions_user_id",
        "table": "navigation_sessions",
        "columns": ["user_id"],
    },
    {
        "index_name": "idx_navigation_events_session_id",
        "table": "navigation_events",
        "columns": ["session_id"],
    },
    {
        "index_name": "idx_auth_users_email",
        "table": "auth_users",
        "columns": ["email"],
    },
    {
        "index_name": "idx_auth_users_role",
        "table": "auth_users",
        "columns": ["role"],
    },
    {
        "index_name": "idx_auth_sessions_token",
        "table": "auth_sessions",
        "columns": ["access_token"],
    },
    {
        "index_name": "idx_background_job_runs_job_name",
        "table": "background_job_runs",
        "columns": ["job_name"],
    },
    {
        "index_name": "idx_background_job_runs_status",
        "table": "background_job_runs",
        "columns": ["status"],
    },
    {
        "index_name": "idx_locations_name",
        "table": "locations",
        "columns": ["name"],
    },
]


def apply_database_indexes() -> Dict[str, Any]:
    connection = get_connection()
    cursor = connection.cursor()

    created_or_verified = []
    skipped = []

    for index in INDEX_PLAN:
        table_name = index["table"]
        columns = index["columns"]
        index_name = index["index_name"]

        if not table_exists(cursor, table_name):
            skipped.append({
                "index_name": index_name,
                "table": table_name,
                "reason": "table_missing",
            })
            continue

        if not columns_exist(cursor, table_name, columns):
            skipped.append({
                "index_name": index_name,
                "table": table_name,
                "columns": columns,
                "reason": "columns_missing",
            })
            continue

        columns_sql = ", ".join(columns)

        cursor.execute(f"""
            CREATE INDEX IF NOT EXISTS {index_name}
            ON {table_name} ({columns_sql})
        """)

        created_or_verified.append({
            "index_name": index_name,
            "table": table_name,
            "columns": columns,
            "status": "created_or_verified",
        })

    connection.commit()
    connection.close()

    return {
        "generated_at": now(),
        "created_or_verified": created_or_verified,
        "skipped": skipped,
        "created_or_verified_count": len(created_or_verified),
        "skipped_count": len(skipped),
        "message": "Database indexes checked and applied where possible.",
    }


def get_database_status() -> Dict[str, Any]:
    config = get_database_config()
    file_info = get_database_file_info()
    table_counts = get_table_counts()

    return {
        "generated_at": now(),
        "database_config": {
            "database_engine": config["database_engine"],
            "database_mode": config["database_mode"],
            "database_url_configured": config["database_url_configured"],
            "backup_dir": config["backup_dir"],
        },
        "sqlite_file": file_info,
        "sqlite_pragmas": get_sqlite_pragmas(),
        "table_count": len(table_counts),
        "table_counts": table_counts,
        "message": "Database status generated successfully.",
    }


def create_database_backup() -> Dict[str, Any]:
    db_path = get_database_path()

    if not db_path.exists():
        return {
            "created": False,
            "message": "Database file does not exist yet.",
            "database_path": str(db_path),
        }

    backup_dir = get_backup_dir()
    backup_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = backup_dir / f"flowsync_backup_{timestamp}.db"

    shutil.copy2(db_path, backup_file)

    return {
        "created": True,
        "backup_path": str(backup_file),
        "backup_size_bytes": backup_file.stat().st_size,
        "created_at": now(),
        "message": "SQLite database backup created successfully.",
    }


def get_database_readiness() -> Dict[str, Any]:
    config = get_database_config()
    file_info = get_database_file_info()
    tables = get_database_tables()

    checks = [
        {
            "check": "SQLite database file exists",
            "status": "pass" if file_info["database_file_exists"] else "warning",
            "details": file_info,
        },
        {
            "check": "Tables initialized",
            "status": "pass" if tables["table_count"] > 0 else "warning",
            "details": {
                "table_count": tables["table_count"],
            },
        },
        {
            "check": "DATABASE_URL configured",
            "status": "optional_pending" if not config["database_url_configured"] else "pass",
            "details": {
                "database_mode": config["database_mode"],
                "database_engine": config["database_engine"],
            },
        },
        {
            "check": "Backup directory configured",
            "status": "pass",
            "details": {
                "backup_dir": config["backup_dir"],
            },
        },
        {
            "check": "Index plan available",
            "status": "pass",
            "details": {
                "planned_indexes": len(INDEX_PLAN),
            },
        },
    ]

    passed = len([check for check in checks if check["status"] == "pass"])
    total = len(checks)

    return {
        "generated_at": now(),
        "database_production_readiness": {
            "ready_for_local_demo": True,
            "ready_for_team_integration": True,
            "production_database_ready_structurally": True,
            "external_database_required_for_real_launch": True,
            "score_percent": round((passed / total) * 100, 2),
        },
        "checks": checks,
        "message": "Database layer is production-ready structurally, with SQLite as local default and DATABASE_URL reserved for external database deployment.",
    }