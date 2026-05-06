import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "flowsync.db"

def get_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection

def get_dashboard_stats():
    connection = get_connection()
    cursor = connection.cursor()

    total_trips = cursor.execute(
        "SELECT COUNT(*) AS count FROM trip_requests"
    ).fetchone()["count"]

    total_routes = cursor.execute(
        "SELECT COUNT(*) AS count FROM route_options"
    ).fetchone()["count"]

    recommended_routes = cursor.execute("""
        SELECT route_name, COUNT(*) AS count
        FROM route_options
        WHERE is_recommended = 1
        GROUP BY route_name
    """).fetchall()

    avg_congestion = cursor.execute(
        "SELECT AVG(congestion_score) AS avg_score FROM route_options"
    ).fetchone()["avg_score"]

    connection.close()

    return {
        "total_trips": total_trips,
        "total_routes": total_routes,
        "recommended_routes": [dict(row) for row in recommended_routes],
        "average_congestion_score": round(avg_congestion or 0, 2)
    }