import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "flowsync.db"

def seed_database():
    connection = sqlite3.connect(DB_PATH)
    cursor = connection.cursor()

    cursor.execute("""
        INSERT OR IGNORE INTO users (user_id, name, email, vehicle_type)
        VALUES
        (1, 'Demo User', 'demo@flowsync.com', 'car'),
        (2, 'Arsalan', 'arsalan@flowsync.com', 'car'),
        (3, 'Githu', 'githu@flowsync.com', 'car');
    """)

    cursor.execute("""
        INSERT INTO trip_requests
        (request_id, user_id, start_location, destination, start_lat, start_lng, dest_lat, dest_lng, status)
        VALUES
        (1, 1, 'Dubai Marina', 'Dubai Mall', 25.0800, 55.1400, 25.1972, 55.2744, 'completed');
    """)

    cursor.execute("""
        INSERT INTO route_options
        (route_id, request_id, route_name, estimated_time, distance_km, congestion_score, assigned_users, route_score, is_recommended)
        VALUES
        (1, 1, 'Route A - Sheikh Zayed Road', 22, 24.5, 8, 14, 59, 0),
        (2, 1, 'Route B - Al Khail Road', 26, 27.2, 4, 6, 43, 1),
        (3, 1, 'Route C - Jumeirah Road', 31, 29.8, 2, 3, 39.5, 0);
    """)

    cursor.execute("""
        INSERT INTO route_assignments
        (assignment_id, user_id, route_id, assignment_reason)
        VALUES
        (1, 1, 2, 'Balanced route with lower congestion and acceptable ETA');
    """)

    cursor.execute("""
        INSERT INTO road_segments
        (segment_id, road_name, area, max_capacity)
        VALUES
        (1, 'Sheikh Zayed Road', 'Downtown Dubai', 1000),
        (2, 'Al Khail Road', 'Business Bay', 900),
        (3, 'Jumeirah Road', 'Jumeirah', 700);
    """)

    cursor.execute("""
        INSERT INTO traffic_data
        (segment_id, vehicle_count, avg_speed, congestion_level)
        VALUES
        (1, 870, 38, 8),
        (2, 520, 62, 4),
        (3, 310, 70, 2);
    """)

    cursor.execute("""
        INSERT INTO trip_analytics
        (assignment_id, estimated_time_saved, fuel_saved, congestion_reduction)
        VALUES
        (1, 6, 0.8, 18);
    """)

    connection.commit()
    connection.close()

    print("Sample FlowSync data inserted successfully.")

if __name__ == "__main__":
    seed_database()