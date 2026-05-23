PRAGMA foreign_keys = ON;

-- FlowSync Backend v1 Production-Ready Target Schema
-- Local development database:
--   backend/flowsync.db
--
-- Production target:
--   PostgreSQL using DATABASE_URL
--   Example:
--   DATABASE_URL=postgresql://user:password@host:5432/flowsync
--
-- Note:
-- SQLite is used for local demo/testing.
-- PostgreSQL migrations are future deployment work.

CREATE TABLE IF NOT EXISTS auth_users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    role TEXT DEFAULT 'user',
    vehicle_type TEXT DEFAULT 'car',
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auth_sessions (
    session_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL,
    issued_at TEXT DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT,
    revoked_at TEXT,
    FOREIGN KEY (user_id) REFERENCES auth_users(user_id)
);

CREATE TABLE IF NOT EXISTS locations (
    location_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
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
    FOREIGN KEY (user_id) REFERENCES auth_users(user_id),
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
    FOREIGN KEY (user_id) REFERENCES auth_users(user_id)
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
    FOREIGN KEY (user_id) REFERENCES auth_users(user_id)
);

CREATE TABLE IF NOT EXISTS route_options (
    route_id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER,
    route_name TEXT NOT NULL,
    estimated_time REAL NOT NULL,
    distance_km REAL NOT NULL,
    congestion_score REAL DEFAULT 0,
    assigned_users INTEGER DEFAULT 0,
    route_score REAL,
    geometry_json TEXT,
    is_recommended INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES trip_requests(request_id)
);

CREATE TABLE IF NOT EXISTS route_assignments (
    assignment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    route_id INTEGER NOT NULL,
    assigned_time TEXT DEFAULT CURRENT_TIMESTAMP,
    assignment_reason TEXT,
    FOREIGN KEY (user_id) REFERENCES auth_users(user_id),
    FOREIGN KEY (route_id) REFERENCES route_options(route_id)
);

CREATE TABLE IF NOT EXISTS trip_sessions (
    trip_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    request_id INTEGER,
    start_location TEXT NOT NULL,
    destination TEXT NOT NULL,
    selected_route_id INTEGER,
    status TEXT DEFAULT 'active',
    started_at TEXT DEFAULT CURRENT_TIMESTAMP,
    ended_at TEXT,
    FOREIGN KEY (user_id) REFERENCES auth_users(user_id),
    FOREIGN KEY (request_id) REFERENCES trip_requests(request_id),
    FOREIGN KEY (selected_route_id) REFERENCES route_options(route_id)
);

CREATE TABLE IF NOT EXISTS trip_lifecycle_records (
    lifecycle_id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id INTEGER NOT NULL,
    status TEXT NOT NULL,
    event_message TEXT,
    recorded_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_id) REFERENCES trip_sessions(trip_id)
);

CREATE TABLE IF NOT EXISTS route_steps (
    step_id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_id INTEGER NOT NULL,
    step_number INTEGER NOT NULL,
    instruction TEXT NOT NULL,
    distance REAL,
    duration REAL,
    maneuver_type TEXT,
    FOREIGN KEY (route_id) REFERENCES route_options(route_id),
    UNIQUE(route_id, step_number)
);

CREATE TABLE IF NOT EXISTS navigation_events (
    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    speed REAL,
    message TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_id) REFERENCES trip_sessions(trip_id)
);

CREATE TABLE IF NOT EXISTS road_segments (
    segment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    road_name TEXT NOT NULL,
    area TEXT,
    max_capacity REAL
);

CREATE TABLE IF NOT EXISTS traffic_sensor_readings (
    reading_id INTEGER PRIMARY KEY AUTOINCREMENT,
    segment_id INTEGER,
    road_name TEXT,
    zone TEXT,
    vehicle_count INTEGER,
    avg_speed REAL,
    congestion_level REAL,
    source TEXT DEFAULT 'simulated',
    recorded_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (segment_id) REFERENCES road_segments(segment_id)
);

CREATE TABLE IF NOT EXISTS parking_sensor_readings (
    parking_reading_id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER,
    zone TEXT,
    total_spaces INTEGER,
    available_spaces INTEGER,
    occupancy_rate REAL,
    source TEXT DEFAULT 'simulated',
    recorded_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations(location_id)
);

CREATE TABLE IF NOT EXISTS alerts (
    alert_id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_type TEXT NOT NULL,
    message TEXT NOT NULL,
    zone TEXT,
    severity TEXT DEFAULT 'medium',
    latitude REAL,
    longitude REAL,
    segment_id INTEGER,
    location_id INTEGER,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (segment_id) REFERENCES road_segments(segment_id),
    FOREIGN KEY (location_id) REFERENCES locations(location_id)
);

CREATE TABLE IF NOT EXISTS background_job_runs (
    job_run_id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_name TEXT NOT NULL,
    status TEXT NOT NULL,
    started_at TEXT DEFAULT CURRENT_TIMESTAMP,
    ended_at TEXT,
    records_processed INTEGER DEFAULT 0,
    error_message TEXT
);

CREATE TABLE IF NOT EXISTS trip_analytics (
    analytics_id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id INTEGER,
    trip_id INTEGER,
    estimated_time_saved REAL,
    fuel_saved REAL,
    congestion_reduction REAL,
    emissions_reduction REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assignment_id) REFERENCES route_assignments(assignment_id),
    FOREIGN KEY (trip_id) REFERENCES trip_sessions(trip_id)
);

CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users(email);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_locations_name ON locations(name);
CREATE INDEX IF NOT EXISTS idx_locations_category ON locations(category);
CREATE INDEX IF NOT EXISTS idx_saved_places_user_id ON saved_places(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_requests_user_id ON trip_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_route_options_request_id ON route_options(request_id);
CREATE INDEX IF NOT EXISTS idx_trip_sessions_user_id ON trip_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_sessions_status ON trip_sessions(status);
CREATE INDEX IF NOT EXISTS idx_navigation_events_trip_id ON navigation_events(trip_id);
CREATE INDEX IF NOT EXISTS idx_alerts_zone ON alerts(zone);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_traffic_sensor_zone ON traffic_sensor_readings(zone);
CREATE INDEX IF NOT EXISTS idx_parking_sensor_location ON parking_sensor_readings(location_id);
CREATE INDEX IF NOT EXISTS idx_background_job_name ON background_job_runs(job_name);

-- Seed data section for local demo/searchable Dubai places.
-- Production seed/migration tooling should be handled through PostgreSQL migrations.

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