PRAGMA foreign_keys = ON;

-- =========================================================
-- FLOWSYNC FINAL COMMERCIAL DATABASE SCHEMA
-- Local target: SQLite
-- Future production target: PostgreSQL via DATABASE_URL
-- =========================================================

-- =========================================================
-- A. USER / AUTH MODULE
-- =========================================================

CREATE TABLE IF NOT EXISTS roles (
    role_id INTEGER PRIMARY KEY AUTOINCREMENT,
    role_name TEXT NOT NULL UNIQUE CHECK (
        role_name IN ('driver', 'admin', 'operator', 'emergency', 'guest')
    ),
    description TEXT,
    permissions_json TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    role_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    account_status TEXT DEFAULT 'active' CHECK (
        account_status IN ('active', 'inactive', 'suspended', 'deleted')
    ),
    last_login_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(role_id)
);

CREATE TABLE IF NOT EXISTS user_profiles (
    profile_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    full_name TEXT,
    preferred_language TEXT DEFAULT 'en',
    city TEXT,
    emirate TEXT,
    driver_license_number TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    profile_status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS vehicles (
    vehicle_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    vehicle_type TEXT DEFAULT 'car',
    plate_number TEXT,
    make TEXT,
    model TEXT,
    color TEXT,
    fuel_type TEXT DEFAULT 'petrol',
    is_default INTEGER DEFAULT 0 CHECK (is_default IN (0, 1)),
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS user_preferences (
    preference_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    preferred_route_mode TEXT DEFAULT 'balanced',
    avoid_tolls INTEGER DEFAULT 0 CHECK (avoid_tolls IN (0, 1)),
    avoid_highways INTEGER DEFAULT 0 CHECK (avoid_highways IN (0, 1)),
    eco_mode INTEGER DEFAULT 0 CHECK (eco_mode IN (0, 1)),
    parking_preference TEXT DEFAULT 'near_destination',
    alert_sensitivity TEXT DEFAULT 'medium',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS login_sessions (
    session_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL,
    device_info TEXT,
    ip_address TEXT,
    login_at TEXT DEFAULT CURRENT_TIMESTAMP,
    logout_at TEXT,
    expires_at TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    refresh_token_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    session_id INTEGER,
    token_hash TEXT NOT NULL UNIQUE,
    issued_at TEXT DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL,
    revoked_at TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (session_id) REFERENCES login_sessions(session_id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
    audit_log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    entity_name TEXT,
    entity_id INTEGER,
    old_value_json TEXT,
    new_value_json TEXT,
    ip_address TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- =========================================================
-- B. UAE LOCATION / SEARCH MODULE
-- =========================================================

CREATE TABLE IF NOT EXISTS emirates (
    emirate_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    code TEXT UNIQUE,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cities (
    city_id INTEGER PRIMARY KEY AUTOINCREMENT,
    emirate_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (emirate_id) REFERENCES emirates(emirate_id),
    UNIQUE(emirate_id, name)
);

CREATE TABLE IF NOT EXISTS areas (
    area_id INTEGER PRIMARY KEY AUTOINCREMENT,
    city_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (city_id) REFERENCES cities(city_id),
    UNIQUE(city_id, name)
);

CREATE TABLE IF NOT EXISTS location_categories (
    category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon_name TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS locations (
    location_id INTEGER PRIMARY KEY AUTOINCREMENT,
    area_id INTEGER,
    category_id INTEGER,
    name TEXT NOT NULL,
    address TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    external_place_id TEXT,
    provider_name TEXT DEFAULT 'seed',
    search_keywords TEXT,
    popularity_score REAL DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (area_id) REFERENCES areas(area_id),
    FOREIGN KEY (category_id) REFERENCES location_categories(category_id)
);
CREATE TABLE IF NOT EXISTS saved_places (
    saved_place_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    label TEXT NOT NULL,
    location_id INTEGER NOT NULL,
    custom_name TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (location_id) REFERENCES locations(location_id),
    UNIQUE(user_id, label)
);

CREATE TABLE IF NOT EXISTS popular_places (
    popular_place_id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL,
    rank_score REAL DEFAULT 0,
    search_count INTEGER DEFAULT 0,
    trip_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations(location_id)
);

CREATE TABLE IF NOT EXISTS geocoding_cache (
    geocoding_cache_id INTEGER PRIMARY KEY AUTOINCREMENT,
    query_text TEXT NOT NULL,
    provider_name TEXT NOT NULL,
    external_place_id TEXT,
    latitude REAL,
    longitude REAL,
    formatted_address TEXT,
    response_json TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT
);

CREATE TABLE IF NOT EXISTS map_provider_cache (
    cache_id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_name TEXT NOT NULL,
    request_type TEXT NOT NULL,
    request_hash TEXT NOT NULL UNIQUE,
    request_json TEXT,
    response_json TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT
);

CREATE TABLE IF NOT EXISTS search_history (
    search_history_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    query_text TEXT NOT NULL,
    selected_location_id INTEGER,
    result_count INTEGER DEFAULT 0,
    provider_name TEXT,
    searched_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (selected_location_id) REFERENCES locations(location_id)
);

-- =========================================================
-- C. ROAD / MAP / TRAFFIC MODULE
-- =========================================================

CREATE TABLE IF NOT EXISTS road_segments (
    road_segment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    road_name TEXT NOT NULL,
    emirate_id INTEGER,
    city_id INTEGER,
    area_id INTEGER,
    start_latitude REAL,
    start_longitude REAL,
    end_latitude REAL,
    end_longitude REAL,
    road_type TEXT DEFAULT 'main',
    max_capacity INTEGER,
    status TEXT DEFAULT 'open',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (emirate_id) REFERENCES emirates(emirate_id),
    FOREIGN KEY (city_id) REFERENCES cities(city_id),
    FOREIGN KEY (area_id) REFERENCES areas(area_id)
);

CREATE TABLE IF NOT EXISTS intersections (
    intersection_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    area_id INTEGER,
    signal_controlled INTEGER DEFAULT 0 CHECK (signal_controlled IN (0, 1)),
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (area_id) REFERENCES areas(area_id)
);

CREATE TABLE IF NOT EXISTS traffic_snapshots (
    traffic_snapshot_id INTEGER PRIMARY KEY AUTOINCREMENT,
    road_segment_id INTEGER NOT NULL,
    vehicle_count INTEGER DEFAULT 0,
    average_speed REAL,
    congestion_level REAL DEFAULT 0,
    traffic_status TEXT DEFAULT 'medium',
    source TEXT DEFAULT 'simulated',
    recorded_at TEXT DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (road_segment_id) REFERENCES road_segments(road_segment_id)
);

CREATE TABLE IF NOT EXISTS congestion_history (
    congestion_history_id INTEGER PRIMARY KEY AUTOINCREMENT,
    road_segment_id INTEGER NOT NULL,
    congestion_level REAL NOT NULL,
    average_speed REAL,
    vehicle_count INTEGER,
    day_of_week TEXT,
    hour_of_day INTEGER,
    recorded_at TEXT DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (road_segment_id) REFERENCES road_segments(road_segment_id)
);

CREATE TABLE IF NOT EXISTS road_incidents (
    incident_id INTEGER PRIMARY KEY AUTOINCREMENT,
    road_segment_id INTEGER,
    incident_type TEXT NOT NULL,
    title TEXT,
    description TEXT,
    severity TEXT DEFAULT 'medium',
    latitude REAL,
    longitude REAL,
    status TEXT DEFAULT 'active',
    reported_by_user_id INTEGER,
    reported_at TEXT DEFAULT CURRENT_TIMESTAMP,
    resolved_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (road_segment_id) REFERENCES road_segments(road_segment_id),
    FOREIGN KEY (reported_by_user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS road_closures (
    closure_id INTEGER PRIMARY KEY AUTOINCREMENT,
    road_segment_id INTEGER NOT NULL,
    reason TEXT,
    start_time TEXT NOT NULL,
    end_time TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (road_segment_id) REFERENCES road_segments(road_segment_id)
);

CREATE TABLE IF NOT EXISTS speed_limits (
    speed_limit_id INTEGER PRIMARY KEY AUTOINCREMENT,
    road_segment_id INTEGER NOT NULL,
    speed_limit_kmh INTEGER NOT NULL,
    effective_from TEXT DEFAULT CURRENT_TIMESTAMP,
    effective_to TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (road_segment_id) REFERENCES road_segments(road_segment_id)
);

CREATE TABLE IF NOT EXISTS traffic_signals (
    traffic_signal_id INTEGER PRIMARY KEY AUTOINCREMENT,
    intersection_id INTEGER NOT NULL,
    signal_name TEXT,
    cycle_duration_seconds INTEGER,
    current_state TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (intersection_id) REFERENCES intersections(intersection_id)
);

CREATE TABLE IF NOT EXISTS toll_gates (
    toll_gate_id INTEGER PRIMARY KEY AUTOINCREMENT,
    road_segment_id INTEGER,
    name TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    toll_amount REAL DEFAULT 0,
    provider_name TEXT DEFAULT 'salik',
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (road_segment_id) REFERENCES road_segments(road_segment_id)
);

-- =========================================================
-- D. TRIP / ROUTING MODULE
-- =========================================================

CREATE TABLE IF NOT EXISTS trip_requests (
    trip_request_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    vehicle_id INTEGER,
    start_location_id INTEGER,
    destination_location_id INTEGER,
    start_location TEXT NOT NULL,
    destination TEXT NOT NULL,
    start_latitude REAL,
    start_longitude REAL,
    destination_latitude REAL,
    destination_longitude REAL,
    vehicle_type TEXT DEFAULT 'car',
    route_preference TEXT DEFAULT 'balanced',
    user_role TEXT DEFAULT 'driver',
    status TEXT DEFAULT 'requested',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id),
    FOREIGN KEY (start_location_id) REFERENCES locations(location_id),
    FOREIGN KEY (destination_location_id) REFERENCES locations(location_id)
);

CREATE TABLE IF NOT EXISTS route_options (
    route_id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_request_id INTEGER NOT NULL,
    route_name TEXT NOT NULL,
    provider_name TEXT DEFAULT 'internal',
    external_route_id TEXT,
    estimated_time_minutes REAL NOT NULL,
    distance_km REAL NOT NULL,
    congestion_score REAL DEFAULT 0,
    route_score REAL DEFAULT 0,
    assigned_users INTEGER DEFAULT 0,
    road_capacity INTEGER,
    geometry_json TEXT,
    is_recommended INTEGER DEFAULT 0 CHECK (is_recommended IN (0, 1)),
    status TEXT DEFAULT 'available',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_request_id) REFERENCES trip_requests(trip_request_id)
);

CREATE TABLE IF NOT EXISTS route_steps (
    route_step_id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_id INTEGER NOT NULL,
    step_number INTEGER NOT NULL,
    instruction TEXT NOT NULL,
    distance_meters REAL,
    duration_seconds REAL,
    latitude REAL,
    longitude REAL,
    maneuver_type TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (route_id) REFERENCES route_options(route_id),
    UNIQUE(route_id, step_number)
);

CREATE TABLE IF NOT EXISTS route_segments (
    route_segment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_id INTEGER NOT NULL,
    road_segment_id INTEGER NOT NULL,
    segment_order INTEGER NOT NULL,
    distance_km REAL,
    estimated_time_minutes REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (route_id) REFERENCES route_options(route_id),
    FOREIGN KEY (road_segment_id) REFERENCES road_segments(road_segment_id)
);

CREATE TABLE IF NOT EXISTS route_segment_mapping (
    mapping_id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_id INTEGER,
    road_segment_id INTEGER NOT NULL,
    map_provider_segment_id TEXT,
    provider_name TEXT DEFAULT 'seed',
    mapping_confidence REAL DEFAULT 1.0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (route_id) REFERENCES route_options(route_id),
    FOREIGN KEY (road_segment_id) REFERENCES road_segments(road_segment_id)
);

CREATE TABLE IF NOT EXISTS route_assignments (
    assignment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_request_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    route_id INTEGER NOT NULL,
    assignment_reason TEXT,
    assigned_at TEXT DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'assigned',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_request_id) REFERENCES trip_requests(trip_request_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (route_id) REFERENCES route_options(route_id)
);

CREATE TABLE IF NOT EXISTS trip_sessions (
    session_id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_request_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    assignment_id INTEGER,
    selected_route_id INTEGER,
    status TEXT DEFAULT 'active',
    current_step_index INTEGER DEFAULT 0,
    started_at TEXT DEFAULT CURRENT_TIMESTAMP,
    ended_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_request_id) REFERENCES trip_requests(trip_request_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (assignment_id) REFERENCES route_assignments(assignment_id),
    FOREIGN KEY (selected_route_id) REFERENCES route_options(route_id)
);

CREATE TABLE IF NOT EXISTS navigation_progress (
    navigation_progress_id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    current_step_index INTEGER DEFAULT 0,
    latitude REAL,
    longitude REAL,
    speed_kmh REAL,
    remaining_time_min REAL,
    progress_percentage REAL DEFAULT 0,
    remaining_distance_km REAL,
    remaining_time_minutes REAL,
    progress_percent REAL DEFAULT 0,
    event_type TEXT DEFAULT 'location_update',
    recorded_at TEXT DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES trip_sessions(session_id)
);

CREATE TABLE IF NOT EXISTS trip_status_history (
    status_history_id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    old_status TEXT,
    new_status TEXT NOT NULL,
    message TEXT,
    changed_at TEXT DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES trip_sessions(session_id)
);

CREATE TABLE IF NOT EXISTS trip_feedback (
    feedback_id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    feedback_text TEXT,
    route_accuracy_rating INTEGER CHECK (route_accuracy_rating BETWEEN 1 AND 5),
    congestion_accuracy_rating INTEGER CHECK (congestion_accuracy_rating BETWEEN 1 AND 5),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES trip_sessions(session_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- =========================================================
-- E. FLOWSYNC ROUTE DISTRIBUTION MODULE
-- =========================================================

CREATE TABLE IF NOT EXISTS route_loads (
    route_load_id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_id INTEGER NOT NULL,
    active_users INTEGER DEFAULT 0,
    road_capacity INTEGER,
    load_percentage REAL DEFAULT 0,
    load_status TEXT DEFAULT 'normal',
    recorded_at TEXT DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (route_id) REFERENCES route_options(route_id)
);

CREATE TABLE IF NOT EXISTS route_scores (
    route_score_id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_id INTEGER NOT NULL,
    time_score REAL DEFAULT 0,
    distance_score REAL DEFAULT 0,
    congestion_score REAL DEFAULT 0,
    load_score REAL DEFAULT 0,
    incident_score REAL DEFAULT 0,
    eco_score REAL DEFAULT 0,
    final_score REAL DEFAULT 0,
    scoring_model_version TEXT DEFAULT 'v1',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (route_id) REFERENCES route_options(route_id)
);

CREATE TABLE IF NOT EXISTS distribution_decisions (
    decision_id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_request_id INTEGER NOT NULL,
    selected_route_id INTEGER NOT NULL,
    fastest_route_id INTEGER,
    overloaded_route_id INTEGER,
    decision_reason TEXT NOT NULL,
    congestion_factor REAL DEFAULT 0,
    load_factor REAL DEFAULT 0,
    time_factor REAL DEFAULT 0,
    incident_factor REAL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_request_id) REFERENCES trip_requests(trip_request_id),
    FOREIGN KEY (selected_route_id) REFERENCES route_options(route_id),
    FOREIGN KEY (fastest_route_id) REFERENCES route_options(route_id),
    FOREIGN KEY (overloaded_route_id) REFERENCES route_options(route_id)
);

CREATE TABLE IF NOT EXISTS assignment_reasons (
    assignment_reason_id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id INTEGER NOT NULL,
    reason_code TEXT NOT NULL,
    reason_text TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assignment_id) REFERENCES route_assignments(assignment_id)
);

CREATE TABLE IF NOT EXISTS route_balancing_rules (
    rule_id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_name TEXT NOT NULL UNIQUE,
    description TEXT,
    congestion_weight REAL DEFAULT 1.0,
    load_weight REAL DEFAULT 1.0,
    time_weight REAL DEFAULT 1.0,
    incident_weight REAL DEFAULT 1.0,
    eco_weight REAL DEFAULT 0.5,
    is_active INTEGER DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS route_demand_history (
    demand_history_id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_id INTEGER,
    start_area_id INTEGER,
    destination_area_id INTEGER,
    requested_count INTEGER DEFAULT 0,
    assigned_count INTEGER DEFAULT 0,
    day_of_week TEXT,
    hour_of_day INTEGER,
    recorded_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (route_id) REFERENCES route_options(route_id),
    FOREIGN KEY (start_area_id) REFERENCES areas(area_id),
    FOREIGN KEY (destination_area_id) REFERENCES areas(area_id)
);

-- =========================================================
-- F. DASHBOARD / ANALYTICS MODULE
-- =========================================================

CREATE TABLE IF NOT EXISTS trip_analytics (
    analytics_id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER,
    assignment_id INTEGER,
    user_id INTEGER,
    estimated_time_saved_minutes REAL DEFAULT 0,
    fuel_saved_liters REAL DEFAULT 0,
    co2_saved_kg REAL DEFAULT 0,
    congestion_reduction_percent REAL DEFAULT 0,
    actual_duration_minutes REAL,
    actual_distance_km REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES trip_sessions(session_id),
    FOREIGN KEY (assignment_id) REFERENCES route_assignments(assignment_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS route_performance (
    route_performance_id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_id INTEGER NOT NULL,
    average_duration_minutes REAL,
    average_speed_kmh REAL,
    completion_count INTEGER DEFAULT 0,
    cancellation_count INTEGER DEFAULT 0,
    average_rating REAL,
    performance_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (route_id) REFERENCES route_options(route_id)
);

CREATE TABLE IF NOT EXISTS congestion_analytics (
    congestion_analytics_id INTEGER PRIMARY KEY AUTOINCREMENT,
    road_segment_id INTEGER,
    area_id INTEGER,
    average_congestion_level REAL,
    peak_congestion_level REAL,
    congestion_reduction_percent REAL DEFAULT 0,
    analytics_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (road_segment_id) REFERENCES road_segments(road_segment_id),
    FOREIGN KEY (area_id) REFERENCES areas(area_id)
);

CREATE TABLE IF NOT EXISTS fuel_saving_estimates (
    fuel_saving_id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_request_id INTEGER,
    route_id INTEGER,
    estimated_fuel_saved_liters REAL DEFAULT 0,
    calculation_method TEXT DEFAULT 'distance_time_congestion',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_request_id) REFERENCES trip_requests(trip_request_id),
    FOREIGN KEY (route_id) REFERENCES route_options(route_id)
);

CREATE TABLE IF NOT EXISTS emissions_saving_estimates (
    emissions_saving_id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_request_id INTEGER,
    route_id INTEGER,
    estimated_co2_saved_kg REAL DEFAULT 0,
    calculation_method TEXT DEFAULT 'fuel_to_co2_estimate',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_request_id) REFERENCES trip_requests(trip_request_id),
    FOREIGN KEY (route_id) REFERENCES route_options(route_id)
);

CREATE TABLE IF NOT EXISTS system_metrics (
    system_metric_id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_name TEXT NOT NULL,
    metric_value REAL,
    metric_unit TEXT,
    metric_category TEXT,
    recorded_at TEXT DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS daily_summary_stats (
    daily_summary_id INTEGER PRIMARY KEY AUTOINCREMENT,
    summary_date TEXT NOT NULL UNIQUE,
    total_trips INTEGER DEFAULT 0,
    active_trips INTEGER DEFAULT 0,
    completed_trips INTEGER DEFAULT 0,
    cancelled_trips INTEGER DEFAULT 0,
    average_travel_time_minutes REAL DEFAULT 0,
    congestion_reduction_percent REAL DEFAULT 0,
    total_fuel_saved_liters REAL DEFAULT 0,
    total_co2_saved_kg REAL DEFAULT 0,
    active_alerts INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- G. ALERTS / NOTIFICATION MODULE
-- =========================================================

CREATE TABLE IF NOT EXISTS alerts (
    alert_id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_type TEXT NOT NULL,
    message TEXT NOT NULL,
    zone TEXT,
    severity TEXT DEFAULT 'medium',
    latitude REAL,
    longitude REAL,
    road_segment_id INTEGER,
    location_id INTEGER,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (road_segment_id) REFERENCES road_segments(road_segment_id),
    FOREIGN KEY (location_id) REFERENCES locations(location_id)
);

CREATE TABLE IF NOT EXISTS user_notifications (
    notification_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    alert_id INTEGER,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    notification_type TEXT DEFAULT 'info',
    is_read INTEGER DEFAULT 0 CHECK (is_read IN (0, 1)),
    sent_at TEXT DEFAULT CURRENT_TIMESTAMP,
    read_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (alert_id) REFERENCES alerts(alert_id)
);

CREATE TABLE IF NOT EXISTS emergency_vehicles (
    emergency_vehicle_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    vehicle_identifier TEXT NOT NULL UNIQUE,
    emergency_type TEXT NOT NULL,
    current_latitude REAL,
    current_longitude REAL,
    status TEXT DEFAULT 'available',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS emergency_routes (
    emergency_route_id INTEGER PRIMARY KEY AUTOINCREMENT,
    emergency_vehicle_id INTEGER NOT NULL,
    route_id INTEGER,
    priority_level TEXT DEFAULT 'high',
    start_location TEXT,
    destination TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (emergency_vehicle_id) REFERENCES emergency_vehicles(emergency_vehicle_id),
    FOREIGN KEY (route_id) REFERENCES route_options(route_id)
);

CREATE TABLE IF NOT EXISTS incident_updates (
    incident_update_id INTEGER PRIMARY KEY AUTOINCREMENT,
    incident_id INTEGER NOT NULL,
    updated_by_user_id INTEGER,
    update_message TEXT NOT NULL,
    new_status TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (incident_id) REFERENCES road_incidents(incident_id),
    FOREIGN KEY (updated_by_user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS notification_preferences (
    notification_preference_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    traffic_alerts INTEGER DEFAULT 1 CHECK (traffic_alerts IN (0, 1)),
    incident_alerts INTEGER DEFAULT 1 CHECK (incident_alerts IN (0, 1)),
    parking_alerts INTEGER DEFAULT 1 CHECK (parking_alerts IN (0, 1)),
    emergency_alerts INTEGER DEFAULT 1 CHECK (emergency_alerts IN (0, 1)),
    push_enabled INTEGER DEFAULT 1 CHECK (push_enabled IN (0, 1)),
    email_enabled INTEGER DEFAULT 0 CHECK (email_enabled IN (0, 1)),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- =========================================================
-- H. PARKING / FUTURE SCOPE MODULE
-- =========================================================

CREATE TABLE IF NOT EXISTS parking_zones (
    parking_zone_id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER,
    zone_name TEXT NOT NULL,
    destination TEXT,
    latitude REAL,
    longitude REAL,
    total_spaces INTEGER DEFAULT 0,
    zone_type TEXT DEFAULT 'public',
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations(location_id)
);

CREATE TABLE IF NOT EXISTS parking_spots (
    parking_spot_id INTEGER PRIMARY KEY AUTOINCREMENT,
    parking_zone_id INTEGER NOT NULL,
    spot_code TEXT NOT NULL,
    spot_type TEXT DEFAULT 'standard',
    is_available INTEGER DEFAULT 1 CHECK (is_available IN (0, 1)),
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parking_zone_id) REFERENCES parking_zones(parking_zone_id),
    UNIQUE(parking_zone_id, spot_code)
);

CREATE TABLE IF NOT EXISTS parking_availability (
    parking_availability_id INTEGER PRIMARY KEY AUTOINCREMENT,
    parking_zone_id INTEGER NOT NULL,
    available_spaces INTEGER DEFAULT 0,
    occupied_spaces INTEGER DEFAULT 0,
    occupancy_rate REAL DEFAULT 0,
    source TEXT DEFAULT 'simulated',
    recorded_at TEXT DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parking_zone_id) REFERENCES parking_zones(parking_zone_id)
);

CREATE TABLE IF NOT EXISTS parking_predictions (
    parking_prediction_id INTEGER PRIMARY KEY AUTOINCREMENT,
    parking_zone_id INTEGER NOT NULL,
    destination TEXT,
    availability_probability REAL DEFAULT 0,
    estimated_wait_time_minutes REAL DEFAULT 0,
    walking_distance_meters REAL DEFAULT 0,
    safety_score REAL DEFAULT 0,
    difficulty_score REAL DEFAULT 0,
    prediction_model_version TEXT DEFAULT 'v1',
    prediction_time TEXT DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parking_zone_id) REFERENCES parking_zones(parking_zone_id)
);

CREATE TABLE IF NOT EXISTS parking_booking_history (
    parking_booking_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    parking_zone_id INTEGER NOT NULL,
    parking_spot_id INTEGER,
    booking_status TEXT DEFAULT 'reserved',
    booked_at TEXT DEFAULT CURRENT_TIMESTAMP,
    started_at TEXT,
    ended_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (parking_zone_id) REFERENCES parking_zones(parking_zone_id),
    FOREIGN KEY (parking_spot_id) REFERENCES parking_spots(parking_spot_id)
);

-- =========================================================
-- I. ADMIN / SYSTEM MODULE
-- =========================================================

CREATE TABLE IF NOT EXISTS admin_actions (
    admin_action_id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_user_id INTEGER NOT NULL,
    action_type TEXT NOT NULL,
    target_entity TEXT,
    target_entity_id INTEGER,
    action_details TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS system_settings (
    setting_id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT,
    setting_type TEXT DEFAULT 'string',
    description TEXT,
    is_public INTEGER DEFAULT 0 CHECK (is_public IN (0, 1)),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS api_logs (
    api_log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER,
    request_body TEXT,
    response_time_ms REAL,
    ip_address TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS error_logs (
    error_log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    error_type TEXT,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    endpoint TEXT,
    severity TEXT DEFAULT 'medium',
    resolved INTEGER DEFAULT 0 CHECK (resolved IN (0, 1)),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS data_import_logs (
    data_import_log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    import_type TEXT NOT NULL,
    provider_name TEXT,
    source_file TEXT,
    records_processed INTEGER DEFAULT 0,
    records_inserted INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    error_message TEXT,
    started_at TEXT DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feature_flags (
    feature_flag_id INTEGER PRIMARY KEY AUTOINCREMENT,
    flag_key TEXT NOT NULL UNIQUE,
    flag_name TEXT NOT NULL,
    description TEXT,
    is_enabled INTEGER DEFAULT 0 CHECK (is_enabled IN (0, 1)),
    rollout_percentage REAL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- INDEXES FOR SEARCH + PERFORMANCE
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_places_user_id ON saved_places(user_id);
CREATE INDEX IF NOT EXISTS idx_login_sessions_user_id ON login_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_cities_emirate_id ON cities(emirate_id);
CREATE INDEX IF NOT EXISTS idx_areas_city_id ON areas(city_id);
CREATE INDEX IF NOT EXISTS idx_locations_name ON locations(name);
CREATE INDEX IF NOT EXISTS idx_locations_area_id ON locations(area_id);
CREATE INDEX IF NOT EXISTS idx_locations_category_id ON locations(category_id);
CREATE INDEX IF NOT EXISTS idx_locations_provider ON locations(provider_name);
CREATE INDEX IF NOT EXISTS idx_locations_external_place_id ON locations(external_place_id);
CREATE INDEX IF NOT EXISTS idx_geocoding_cache_query ON geocoding_cache(query_text);
CREATE INDEX IF NOT EXISTS idx_map_provider_cache_hash ON map_provider_cache(request_hash);
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);

CREATE INDEX IF NOT EXISTS idx_road_segments_name ON road_segments(road_name);
CREATE INDEX IF NOT EXISTS idx_traffic_snapshots_road_segment_id ON traffic_snapshots(road_segment_id);
CREATE INDEX IF NOT EXISTS idx_congestion_history_road_segment_id ON congestion_history(road_segment_id);
CREATE INDEX IF NOT EXISTS idx_road_incidents_status ON road_incidents(status);
CREATE INDEX IF NOT EXISTS idx_road_incidents_segment ON road_incidents(road_segment_id);
CREATE INDEX IF NOT EXISTS idx_road_closures_status ON road_closures(status);

CREATE INDEX IF NOT EXISTS idx_trip_requests_user_id ON trip_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_requests_status ON trip_requests(status);
CREATE INDEX IF NOT EXISTS idx_route_options_trip_request_id ON route_options(trip_request_id);
CREATE INDEX IF NOT EXISTS idx_route_assignments_user_id ON route_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_sessions_user_id ON trip_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_sessions_status ON trip_sessions(status);
CREATE INDEX IF NOT EXISTS idx_navigation_progress_session_id ON navigation_progress(session_id);

CREATE INDEX IF NOT EXISTS idx_route_loads_route_id ON route_loads(route_id);
CREATE INDEX IF NOT EXISTS idx_route_scores_route_id ON route_scores(route_id);
CREATE INDEX IF NOT EXISTS idx_distribution_decisions_trip_request_id ON distribution_decisions(trip_request_id);
CREATE INDEX IF NOT EXISTS idx_route_demand_history_route_id ON route_demand_history(route_id);

CREATE INDEX IF NOT EXISTS idx_trip_analytics_session_id ON trip_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_route_performance_route_id ON route_performance(route_id);
CREATE INDEX IF NOT EXISTS idx_congestion_analytics_area_id ON congestion_analytics(area_id);
CREATE INDEX IF NOT EXISTS idx_daily_summary_date ON daily_summary_stats(summary_date);

CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_zone ON alerts(zone);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read ON user_notifications(is_read);

CREATE INDEX IF NOT EXISTS idx_parking_zones_location_id ON parking_zones(location_id);
CREATE INDEX IF NOT EXISTS idx_parking_availability_zone_id ON parking_availability(parking_zone_id);
CREATE INDEX IF NOT EXISTS idx_parking_predictions_zone_id ON parking_predictions(parking_zone_id);

CREATE INDEX IF NOT EXISTS idx_api_logs_user_id ON api_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint ON api_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(flag_key);