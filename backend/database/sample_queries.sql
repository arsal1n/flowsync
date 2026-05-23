-- =========================================================
-- FLOWSYNC SAMPLE DATABASE QUERIES
-- For testing final commercial database seed data
-- =========================================================

-- 1. Search locations by keyword
SELECT
    location_id,
    name,
    address,
    latitude,
    longitude,
    provider_name,
    search_keywords
FROM locations
WHERE LOWER(name) LIKE LOWER('%Dubai Mall%')
   OR LOWER(search_keywords) LIKE LOWER('%Dubai Mall%');

-- 2. Show popular places
SELECT
    locations.name,
    locations.address,
    popular_places.rank_score,
    popular_places.search_count,
    popular_places.trip_count
FROM popular_places
JOIN locations ON popular_places.location_id = locations.location_id
ORDER BY popular_places.rank_score DESC;

-- 3. Show active trip sessions
SELECT
    trip_sessions.session_id,
    users.name AS user_name,
    trip_requests.start_location,
    trip_requests.destination,
    route_options.route_name,
    trip_sessions.status,
    trip_sessions.current_step_index
FROM trip_sessions
JOIN users ON trip_sessions.user_id = users.user_id
JOIN trip_requests ON trip_sessions.trip_request_id = trip_requests.trip_request_id
LEFT JOIN route_options ON trip_sessions.selected_route_id = route_options.route_id
WHERE trip_sessions.status = 'active';

-- 4. Show route options and scores for a trip
SELECT
    trip_requests.start_location,
    trip_requests.destination,
    route_options.route_name,
    route_options.estimated_time_minutes,
    route_options.distance_km,
    route_options.congestion_score,
    route_options.route_score,
    route_options.assigned_users,
    route_options.is_recommended
FROM route_options
JOIN trip_requests ON route_options.trip_request_id = trip_requests.trip_request_id
WHERE trip_requests.trip_request_id = 1
ORDER BY route_options.route_score ASC;

-- 5. Show why FlowSync selected a route
SELECT
    distribution_decisions.decision_id,
    trip_requests.start_location,
    trip_requests.destination,
    selected_route.route_name AS selected_route,
    fastest_route.route_name AS fastest_route,
    overloaded_route.route_name AS overloaded_route,
    distribution_decisions.decision_reason
FROM distribution_decisions
JOIN trip_requests ON distribution_decisions.trip_request_id = trip_requests.trip_request_id
JOIN route_options selected_route ON distribution_decisions.selected_route_id = selected_route.route_id
LEFT JOIN route_options fastest_route ON distribution_decisions.fastest_route_id = fastest_route.route_id
LEFT JOIN route_options overloaded_route ON distribution_decisions.overloaded_route_id = overloaded_route.route_id;

-- 6. Dashboard summary stats
SELECT
    summary_date,
    total_trips,
    active_trips,
    completed_trips,
    average_travel_time_minutes,
    congestion_reduction_percent,
    total_fuel_saved_liters,
    total_co2_saved_kg,
    active_alerts
FROM daily_summary_stats
ORDER BY summary_date DESC;

-- 7. Active alerts/incidents
SELECT
    alert_type,
    message,
    zone,
    severity,
    status,
    created_at
FROM alerts
WHERE status = 'active'
ORDER BY severity DESC, created_at DESC;

-- 8. Parking predictions
SELECT
    parking_zones.zone_name,
    parking_predictions.destination,
    parking_predictions.availability_probability,
    parking_predictions.estimated_wait_time_minutes,
    parking_predictions.walking_distance_meters,
    parking_predictions.safety_score,
    parking_predictions.difficulty_score
FROM parking_predictions
JOIN parking_zones ON parking_predictions.parking_zone_id = parking_zones.parking_zone_id
ORDER BY parking_predictions.availability_probability DESC;

-- 9. Route learning/history data
SELECT
    route_options.route_name,
    route_demand_history.requested_count,
    route_demand_history.assigned_count,
    route_demand_history.day_of_week,
    route_demand_history.hour_of_day,
    route_demand_history.recorded_date
FROM route_demand_history
JOIN route_options ON route_demand_history.route_id = route_options.route_id
ORDER BY route_demand_history.requested_count DESC;

-- 10. Traffic snapshots
SELECT
    road_segments.road_name,
    traffic_snapshots.vehicle_count,
    traffic_snapshots.average_speed,
    traffic_snapshots.congestion_level,
    traffic_snapshots.traffic_status,
    traffic_snapshots.source,
    traffic_snapshots.recorded_at
FROM traffic_snapshots
JOIN road_segments ON traffic_snapshots.road_segment_id = road_segments.road_segment_id
ORDER BY traffic_snapshots.congestion_level DESC;
-- =========================================================
-- REAL ROUTING / MOBILE NAVIGATION SUPPORT QUERIES
-- =========================================================

-- 11. Mobile location search fields
SELECT
    location_id,
    name,
    display_name,
    latitude,
    longitude,
    city,
    area,
    category,
    provider_name,
    external_place_id,
    search_keywords
FROM locations
WHERE LOWER(name) LIKE LOWER('%Dubai Marina%')
   OR LOWER(search_keywords) LIKE LOWER('%Dubai Marina%');

-- 12. Mobile route card contract
SELECT
    route_id,
    route_public_id,
    route_name,
    estimated_time_min,
    eta_text,
    distance_km,
    distance_text,
    traffic_delay_min,
    congestion_score,
    traffic_display,
    flowsync_score,
    assigned_users,
    road_capacity,
    load_ratio,
    load_status,
    recommendation_reason,
    is_recommended,
    in_app_navigation,
    external_navigation_required
FROM route_options
WHERE trip_request_id = 1
ORDER BY flowsync_score ASC;

-- 13. Route coordinates for map polyline
SELECT
    route_public_id,
    point_index,
    latitude,
    longitude,
    distance_from_start_m
FROM route_coordinates
WHERE route_public_id = 'ROUTE-D'
ORDER BY point_index ASC;

-- 14. Turn-by-turn steps for selected route
SELECT
    route_id,
    step_index,
    instruction,
    distance_m,
    duration_min,
    maneuver,
    latitude,
    longitude
FROM route_steps
WHERE route_id = 8
ORDER BY step_index ASC;

-- 15. Selected route stored in trip session
SELECT
    trip_sessions.session_id,
    trip_sessions.trip_request_id,
    trip_sessions.selected_route_id,
    trip_sessions.selected_route_public_id,
    route_options.route_name,
    trip_sessions.status,
    trip_sessions.current_step_index
FROM trip_sessions
JOIN route_options ON trip_sessions.selected_route_id = route_options.route_id
WHERE trip_sessions.session_id = 8;

-- 16. Navigation progress fields for mobile
SELECT
    session_id,
    current_step_index,
    latitude,
    longitude,
    remaining_distance_km,
    remaining_time_minutes,
    remaining_time_min,
    progress_percent,
    progress_percentage,
    event_type,
    recorded_at
FROM navigation_progress
WHERE session_id = 8;