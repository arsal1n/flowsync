PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    vehicle_type TEXT DEFAULT 'car',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS locations (
    location_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    category TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS saved_places (
    saved_place_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    label TEXT NOT NULL,
    location_id INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (location_id) REFERENCES locations(location_id),
    UNIQUE(user_id, label)
);

CREATE TABLE IF NOT EXISTS user_preferences (
    preference_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    preferred_route_mode TEXT DEFAULT 'balanced',
    avoid_tolls INTEGER DEFAULT 0,
    eco_mode INTEGER DEFAULT 0,
    parking_preference TEXT DEFAULT 'near_destination',
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS trip_requests (
    request_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    start_location TEXT NOT NULL,
    destination TEXT NOT NULL,
    start_lat REAL,
    start_lng REAL,
    dest_lat REAL,
    dest_lng REAL,
    request_time TEXT DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'pending',
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS route_options (
    route_id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER NOT NULL,
    route_name TEXT NOT NULL,
    estimated_time REAL NOT NULL,
    distance_km REAL NOT NULL,
    congestion_score REAL NOT NULL,
    assigned_users INTEGER DEFAULT 0,
    route_score REAL,
    geometry_json TEXT,
    is_recommended INTEGER DEFAULT 0,
    FOREIGN KEY (request_id) REFERENCES trip_requests(request_id)
);

CREATE TABLE IF NOT EXISTS trip_sessions (
    trip_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    start_location TEXT NOT NULL,
    destination TEXT NOT NULL,
    selected_route INTEGER,
    status TEXT DEFAULT 'active',
    started_at TEXT DEFAULT CURRENT_TIMESTAMP,
    ended_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (selected_route) REFERENCES route_options(route_id)
);

CREATE TABLE IF NOT EXISTS route_steps (
    step_id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_id INTEGER NOT NULL,
    step_number INTEGER NOT NULL,
    instruction TEXT NOT NULL,
    distance REAL,
    duration REAL,
    FOREIGN KEY (route_id) REFERENCES route_options(route_id),
    UNIQUE(route_id, step_number)
);

CREATE TABLE IF NOT EXISTS route_assignments (
    assignment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    route_id INTEGER NOT NULL,
    assigned_time TEXT DEFAULT CURRENT_TIMESTAMP,
    assignment_reason TEXT,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (route_id) REFERENCES route_options(route_id)
);

CREATE TABLE IF NOT EXISTS road_segments (
    segment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    road_name TEXT NOT NULL,
    area TEXT,
    max_capacity REAL
);

CREATE TABLE IF NOT EXISTS traffic_data (
    traffic_id INTEGER PRIMARY KEY AUTOINCREMENT,
    segment_id INTEGER NOT NULL,
    vehicle_count INTEGER,
    avg_speed REAL,
    congestion_level REAL,
    recorded_time TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (segment_id) REFERENCES road_segments(segment_id)
);

CREATE TABLE IF NOT EXISTS route_segments (
    route_segment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_id INTEGER NOT NULL,
    segment_id INTEGER NOT NULL,
    segment_order INTEGER,
    FOREIGN KEY (route_id) REFERENCES route_options(route_id),
    FOREIGN KEY (segment_id) REFERENCES road_segments(segment_id)
);

CREATE TABLE IF NOT EXISTS alerts (
    alert_id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_type TEXT NOT NULL,
    message TEXT NOT NULL,
    zone TEXT,
    severity TEXT DEFAULT 'medium',
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trip_analytics (
    analytics_id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id INTEGER NOT NULL,
    estimated_time_saved REAL,
    fuel_saved REAL,
    congestion_reduction REAL,
    FOREIGN KEY (assignment_id) REFERENCES route_assignments(assignment_id)
);