import sqlite3
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
DB_PATH = BACKEND_DIR / "flowsync.db"


REQUIRED_TABLES = [
    "users",
    "user_preferences",
    "locations",
    "saved_places",
    "geocoding_cache",
    "map_provider_cache",
    "trip_requests",
    "route_options",
    "route_coordinates",
    "route_steps",
    "trip_sessions",
    "navigation_progress",
    "alerts",
    "road_incidents",
    "road_closures",
    "user_reports",
    "user_report_confirmations",
    "trip_analytics",
    "daily_summary_stats",
]


COUNT_TABLES = [
    "users",
    "locations",
    "route_options",
    "route_coordinates",
    "route_steps",
    "trip_sessions",
    "navigation_progress",
    "alerts",
    "road_incidents",
    "road_closures",
]


def print_section(title):
    print("\n" + "=" * 70)
    print(title)
    print("=" * 70)


def table_exists(connection, table_name):
    row = connection.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        (table_name,),
    ).fetchone()
    return row is not None


def get_count(connection, table_name):
    if not table_exists(connection, table_name):
        return "MISSING"
    return connection.execute(f"SELECT COUNT(*) FROM {table_name}").fetchone()[0]


def get_columns(connection, table_name):
    if not table_exists(connection, table_name):
        return []
    return [row[1] for row in connection.execute(f"PRAGMA table_info({table_name})").fetchall()]


def get_indexes(connection, table_name):
    if not table_exists(connection, table_name):
        return []
    return [row[1] for row in connection.execute(f"PRAGMA index_list({table_name})").fetchall()]


def get_foreign_keys(connection, table_name):
    if not table_exists(connection, table_name):
        return []
    return connection.execute(f"PRAGMA foreign_key_list({table_name})").fetchall()


def latest_session(connection):
    if not table_exists(connection, "trip_sessions"):
        return None

    columns = get_columns(connection, "trip_sessions")
    select_cols = ["session_id"]

    for col in ["selected_route_id", "selected_route_public_id", "status"]:
        if col in columns:
            select_cols.append(col)

    sql = f"""
        SELECT {", ".join(select_cols)}
        FROM trip_sessions
        ORDER BY session_id DESC
        LIMIT 1
    """
    return connection.execute(sql).fetchone(), select_cols


def latest_route_counts(connection, route_id):
    coordinate_count = 0
    step_count = 0

    if route_id and table_exists(connection, "route_coordinates"):
        coordinate_count = connection.execute(
            "SELECT COUNT(*) FROM route_coordinates WHERE route_id=?",
            (route_id,),
        ).fetchone()[0]

    if route_id and table_exists(connection, "route_steps"):
        step_count = connection.execute(
            "SELECT COUNT(*) FROM route_steps WHERE route_id=?",
            (route_id,),
        ).fetchone()[0]

    return coordinate_count, step_count


def main():
    print("FlowSync Final Database Audit")
    print(f"Database path: {DB_PATH}")

    if not DB_PATH.exists():
        print("\nFAIL: backend/flowsync.db was not found.")
        print("Run first:")
        print("  python backend/database/reset_db.py")
        print("  python backend/database/seed_db.py")
        return

    connection = sqlite3.connect(DB_PATH)
    connection.execute("PRAGMA foreign_keys = ON")

    print_section("1. Required Table Verification")
    missing_tables = []

    for table in REQUIRED_TABLES:
        exists = table_exists(connection, table)
        status = "PASS" if exists else "FAIL"
        print(f"{status}: {table}")
        if not exists:
            missing_tables.append(table)

    print_section("2. Table Counts")
    for table in COUNT_TABLES:
        print(f"{table}: {get_count(connection, table)}")

    print_section("3. Schema Details: Columns, Indexes, Foreign Keys")
    for table in REQUIRED_TABLES:
        if not table_exists(connection, table):
            continue

        columns = get_columns(connection, table)
        indexes = get_indexes(connection, table)
        foreign_keys = get_foreign_keys(connection, table)

        print(f"\nTABLE: {table}")
        print(f"Columns: {', '.join(columns)}")
        print(f"Indexes: {', '.join(indexes) if indexes else 'None found'}")
        print(f"Foreign keys: {len(foreign_keys)}")

    print_section("4. Route Geometry Proof")

    if table_exists(connection, "route_coordinates"):
        rows = connection.execute(
            """
            SELECT route_id, route_public_id, COUNT(*) AS coordinate_count
            FROM route_coordinates
            GROUP BY route_id, route_public_id
            ORDER BY coordinate_count DESC
            LIMIT 10
            """
        ).fetchall()

        for row in rows:
            print(f"route_id={row[0]}, route_public_id={row[1]}, coordinate_count={row[2]}")

        if rows and rows[0][2] > 100:
            print("PASS: At least one route has more than 100 coordinate points.")
        else:
            print("WARN: No route with >100 coordinate points found in local DB. This may still be OK if live backend stores/returns provider geometry directly.")
    else:
        print("FAIL: route_coordinates table missing.")

    print_section("5. Route Steps Proof")

    if table_exists(connection, "route_steps"):
        rows = connection.execute(
            """
            SELECT route_id, COUNT(*) AS step_count
            FROM route_steps
            GROUP BY route_id
            ORDER BY step_count DESC
            LIMIT 10
            """
        ).fetchall()

        for row in rows:
            print(f"route_id={row[0]}, step_count={row[1]}")

        if rows and rows[0][1] > 0:
            print("PASS: Route steps exist.")
        else:
            print("FAIL: No route steps found.")
    else:
        print("FAIL: route_steps table missing.")

    print_section("6. Latest Trip Session Proof")

    session_result = latest_session(connection)

    if session_result is None:
        print("FAIL: trip_sessions table missing.")
    else:
        session_row, session_cols = session_result
        if session_row:
            session_data = dict(zip(session_cols, session_row))
            print(session_data)

            selected_route_id = session_data.get("selected_route_id")
            selected_route_public_id = session_data.get("selected_route_public_id")

            print(f"latest session_id: {session_data.get('session_id')}")
            print(f"latest selected_route_id: {selected_route_id}")
            print(f"latest selected_route_public_id: {selected_route_public_id}")

            coordinate_count, step_count = latest_route_counts(connection, selected_route_id)
            print(f"latest route coordinate count: {coordinate_count}")
            print(f"latest route step count: {step_count}")
        else:
            print("WARN: No trip sessions found.")

    print_section("7. Trip Lifecycle Counts")

    if table_exists(connection, "trip_sessions"):
        columns = get_columns(connection, "trip_sessions")
        if "status" in columns:
            completed = connection.execute(
                "SELECT COUNT(*) FROM trip_sessions WHERE status='completed'"
            ).fetchone()[0]
            cancelled = connection.execute(
                "SELECT COUNT(*) FROM trip_sessions WHERE status='cancelled'"
            ).fetchone()[0]

            print(f"completed trips count: {completed}")
            print(f"cancelled trips count: {cancelled}")
        else:
            print("WARN: trip_sessions.status column missing.")
    else:
        print("FAIL: trip_sessions table missing.")

    print_section("8. Navigation Progress Proof")

    if table_exists(connection, "navigation_progress"):
        rows = connection.execute(
            """
            SELECT session_id, current_step_index, latitude, longitude,
                   remaining_distance_km, remaining_time_min, progress_percentage
            FROM navigation_progress
            ORDER BY navigation_progress_id DESC
            LIMIT 5
            """
        ).fetchall()

        for row in rows:
            print(row)

        if rows:
            print("PASS: navigation_progress rows exist.")
        else:
            print("WARN: No navigation_progress rows found.")
    else:
        print("FAIL: navigation_progress table missing.")

    print_section("9. Alerts / Incidents / Reports Proof")

    for table in ["alerts", "road_incidents", "road_closures", "user_reports"]:
        if table_exists(connection, table):
            count = get_count(connection, table)
            print(f"{table}: {count}")
        else:
            print(f"{table}: MISSING")

    print_section("10. Provider Cache Proof")

    for table in ["geocoding_cache", "map_provider_cache"]:
        if table_exists(connection, table):
            columns = get_columns(connection, table)
            print(f"{table}: exists")
            print(f"Columns: {', '.join(columns)}")
        else:
            print(f"{table}: MISSING")

    print_section("FINAL RESULT")

    if missing_tables:
        print("FAIL: Missing required tables:")
        for table in missing_tables:
            print(f"- {table}")
    else:
        print("PASS: Required production database tables exist.")

    connection.close()


if __name__ == "__main__":
    main()