import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "flowsync.db"

def seed_database():
    connection = sqlite3.connect(DB_PATH)
    cursor = connection.cursor()

    cursor.executescript("""
        INSERT OR IGNORE INTO users (user_id, name, email, vehicle_type)
        VALUES
        (1, 'Demo User', 'demo@flowsync.com', 'car'),
        (2, 'Arsalan', 'arsalan@flowsync.com', 'car'),
        (3, 'Githu', 'githu@flowsync.com', 'car'),
        (4, 'Trisha', 'trisha@flowsync.com', 'car'),
        (5, 'Shane', 'shane@flowsync.com', 'car');

        INSERT OR IGNORE INTO locations
        (location_id, name, address, latitude, longitude, category)
        VALUES
        (1, 'Dubai Mall', 'Downtown Dubai, Dubai, UAE', 25.1972, 55.2744, 'mall'),
        (2, 'Dubai Marina', 'Dubai Marina, Dubai, UAE', 25.0800, 55.1400, 'district'),
        (3, 'Downtown Dubai', 'Downtown Dubai, Dubai, UAE', 25.2048, 55.2708, 'district'),
        (4, 'Business Bay', 'Business Bay, Dubai, UAE', 25.1850, 55.2770, 'business_district'),
        (5, 'DXB Airport', 'Dubai International Airport, Dubai, UAE', 25.2532, 55.3657, 'airport'),
        (6, 'Jumeirah', 'Jumeirah, Dubai, UAE', 25.2048, 55.2520, 'district'),
        (7, 'Sharjah', 'Sharjah, UAE', 25.3463, 55.4209, 'city'),
        (8, 'Academic City', 'Dubai International Academic City, Dubai, UAE', 25.1250, 55.4200, 'education');

        INSERT OR IGNORE INTO saved_places
        (saved_place_id, user_id, label, location_id)
        VALUES
        (1, 1, 'Home', 2),
        (2, 1, 'Work', 4),
        (3, 1, 'University', 8),
        (4, 1, 'Airport', 5);

        INSERT OR IGNORE INTO user_preferences
        (preference_id, user_id, preferred_route_mode, avoid_tolls, eco_mode, parking_preference)
        VALUES
        (1, 1, 'balanced', 0, 1, 'near_destination'),
        (2, 2, 'fastest', 0, 0, 'covered_parking'),
        (3, 3, 'eco', 1, 1, 'low_cost'),
        (4, 4, 'least_congested', 0, 1, 'near_destination'),
        (5, 5, 'balanced', 0, 0, 'any');

        INSERT OR IGNORE INTO trip_requests
        (request_id, user_id, start_location, destination, start_lat, start_lng, dest_lat, dest_lng, status)
        VALUES
        (1, 1, 'Dubai Marina', 'Dubai Mall', 25.0800, 55.1400, 25.1972, 55.2744, 'completed');

        INSERT OR IGNORE INTO route_options
        (route_id, request_id, route_name, estimated_time, distance_km, congestion_score, assigned_users, route_score, is_recommended)
        VALUES
        (1, 1, 'Route A - Sheikh Zayed Road', 22, 24.5, 8, 14, 59, 0),
        (2, 1, 'Route B - Al Khail Road', 26, 27.2, 4, 6, 43, 1),
        (3, 1, 'Route C - Jumeirah Road', 31, 29.8, 2, 3, 39.5, 0);

        INSERT OR IGNORE INTO trip_sessions
        (trip_id, user_id, start_location, destination, selected_route, status, started_at, ended_at)
        VALUES
        (1, 1, 'Dubai Marina', 'Dubai Mall', 2, 'completed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

        INSERT OR IGNORE INTO route_steps
        (step_id, route_id, step_number, instruction, distance, duration)
        VALUES
        (1, 2, 1, 'Start from Dubai Marina and head toward Al Khail Road.', 3.2, 5),
        (2, 2, 2, 'Continue on Al Khail Road toward Business Bay.', 15.4, 14),
        (3, 2, 3, 'Take the exit toward Downtown Dubai.', 5.1, 5),
        (4, 2, 4, 'Continue toward Dubai Mall parking entrance.', 3.5, 2);

        INSERT OR IGNORE INTO route_assignments
        (assignment_id, user_id, route_id, assignment_reason)
        VALUES
        (1, 1, 2, 'Balanced route with lower congestion and acceptable ETA');

        INSERT OR IGNORE INTO road_segments
        (segment_id, road_name, area, max_capacity)
        VALUES
        (1, 'Sheikh Zayed Road', 'Downtown Dubai', 1000),
        (2, 'Al Khail Road', 'Business Bay', 900),
        (3, 'Jumeirah Road', 'Jumeirah', 700),
        (4, 'Airport Road', 'DXB Airport', 850),
        (5, 'Academic City Road', 'Academic City', 650);

        INSERT OR IGNORE INTO traffic_data
        (traffic_id, segment_id, vehicle_count, avg_speed, congestion_level)
        VALUES
        (1, 1, 870, 38, 8),
        (2, 2, 520, 62, 4),
        (3, 3, 310, 70, 2),
        (4, 4, 760, 42, 7),
        (5, 5, 280, 72, 3);

        INSERT OR IGNORE INTO route_segments
        (route_segment_id, route_id, segment_id, segment_order)
        VALUES
        (1, 1, 1, 1),
        (2, 2, 2, 1),
        (3, 3, 3, 1);

        INSERT OR IGNORE INTO alerts
        (alert_id, alert_type, message, zone, severity)
        VALUES
        (1, 'traffic', 'Heavy traffic near Downtown Dubai.', 'Downtown Dubai', 'high'),
        (2, 'accident', 'Minor accident reported near Business Bay exit.', 'Business Bay', 'medium'),
        (3, 'roadwork', 'Roadwork near Academic City Road.', 'Academic City', 'low'),
        (4, 'airport_delay', 'Slow-moving traffic around DXB Airport Terminal 1.', 'DXB Airport', 'medium');

        INSERT OR IGNORE INTO trip_analytics
        (analytics_id, assignment_id, estimated_time_saved, fuel_saved, congestion_reduction)
        VALUES
        (1, 1, 6, 0.8, 18);
    """)

    connection.commit()
    connection.close()

    print("Advanced FlowSync sample data inserted successfully.")

if __name__ == "__main__":
    seed_database()