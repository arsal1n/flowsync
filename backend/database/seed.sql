PRAGMA foreign_keys = ON;

-- =========================================================
-- FLOWSYNC FINAL COMMERCIAL SEED DATA
-- For local demo/testing only
-- =========================================================

-- =========================================================
-- 1. ROLES
-- =========================================================

INSERT OR IGNORE INTO roles
(role_id, role_name, description, permissions_json, status)
VALUES
(1, 'driver', 'Normal driver/user account', '{"can_request_trip":true,"can_navigate":true}', 'active'),
(2, 'admin', 'System administrator account', '{"can_manage_users":true,"can_manage_system":true,"can_view_dashboard":true}', 'active'),
(3, 'operator', 'Traffic operations dashboard user', '{"can_view_traffic":true,"can_manage_alerts":true}', 'active'),
(4, 'emergency', 'Emergency vehicle priority user', '{"can_request_priority_route":true}', 'active'),
(5, 'guest', 'Limited guest access', '{"can_search_locations":true}', 'active');

-- =========================================================
-- 2. USERS
-- Demo password reference: flowsync123
-- password_hash is demo-only placeholder unless backend uses real hashing.
-- =========================================================

INSERT OR IGNORE INTO users
(user_id, role_id, name, email, password_hash, phone, account_status)
VALUES
(1, 1, 'Demo Driver', 'driver@flowsync.local', 'flowsync123', '+971500000001', 'active'),
(2, 2, 'FlowSync Admin', 'admin@flowsync.local', 'flowsync123', '+971500000002', 'active'),
(3, 3, 'Traffic Operator', 'operator@flowsync.local', 'flowsync123', '+971500000003', 'active'),
(4, 4, 'Emergency Vehicle User', 'emergency@flowsync.local', 'flowsync123', '+971500000004', 'active'),
(5, 1, 'Dubai Commuter', 'commuter@flowsync.local', 'flowsync123', '+971500000005', 'active');

INSERT OR IGNORE INTO user_profiles
(profile_id, user_id, full_name, preferred_language, city, emirate, profile_status)
VALUES
(1, 1, 'Demo Driver', 'en', 'Dubai', 'Dubai', 'active'),
(2, 2, 'FlowSync Admin', 'en', 'Dubai', 'Dubai', 'active'),
(3, 3, 'Traffic Operator', 'en', 'Dubai', 'Dubai', 'active'),
(4, 4, 'Emergency Vehicle User', 'en', 'Dubai', 'Dubai', 'active'),
(5, 5, 'Dubai Commuter', 'en', 'Sharjah', 'Sharjah', 'active');

INSERT OR IGNORE INTO vehicles
(vehicle_id, user_id, vehicle_type, plate_number, make, model, color, fuel_type, is_default, status)
VALUES
(1, 1, 'car', 'D-12345', 'Toyota', 'Camry', 'White', 'petrol', 1, 'active'),
(2, 5, 'car', 'S-44551', 'Nissan', 'Altima', 'Silver', 'petrol', 1, 'active'),
(3, 4, 'ambulance', 'E-91101', 'Mercedes', 'Sprinter', 'White/Red', 'diesel', 1, 'active');

INSERT OR IGNORE INTO user_preferences
(preference_id, user_id, preferred_route_mode, avoid_tolls, avoid_highways, eco_mode, parking_preference, alert_sensitivity)
VALUES
(1, 1, 'balanced', 0, 0, 1, 'near_destination', 'medium'),
(2, 2, 'fastest', 0, 0, 0, 'any', 'high'),
(3, 3, 'least_congested', 0, 0, 1, 'any', 'high'),
(4, 4, 'priority', 0, 0, 0, 'emergency_access', 'high'),
(5, 5, 'eco', 1, 0, 1, 'low_cost', 'medium');

-- =========================================================
-- 3. UAE LOCATION DATA
-- =========================================================

INSERT OR IGNORE INTO emirates
(emirate_id, name, code, status)
VALUES
(1, 'Dubai', 'DXB', 'active'),
(2, 'Abu Dhabi', 'AUH', 'active'),
(3, 'Sharjah', 'SHJ', 'active'),
(4, 'Ajman', 'AJM', 'active'),
(5, 'Umm Al Quwain', 'UAQ', 'active'),
(6, 'Ras Al Khaimah', 'RAK', 'active'),
(7, 'Fujairah', 'FUJ', 'active');

INSERT OR IGNORE INTO cities
(city_id, emirate_id, name, status)
VALUES
(1, 1, 'Dubai', 'active'),
(2, 2, 'Abu Dhabi City', 'active'),
(3, 3, 'Sharjah City', 'active'),
(4, 4, 'Ajman City', 'active'),
(5, 5, 'Umm Al Quwain City', 'active'),
(6, 6, 'Ras Al Khaimah City', 'active'),
(7, 7, 'Fujairah City', 'active'),
(8, 2, 'Al Ain', 'active');

INSERT OR IGNORE INTO areas
(area_id, city_id, name, latitude, longitude, status)
VALUES
(1, 1, 'Downtown Dubai', 25.2048, 55.2708, 'active'),
(2, 1, 'Dubai Marina', 25.0800, 55.1400, 'active'),
(3, 1, 'Business Bay', 25.1850, 55.2770, 'active'),
(4, 1, 'DXB Airport', 25.2532, 55.3657, 'active'),
(5, 1, 'Jumeirah', 25.2048, 55.2520, 'active'),
(6, 1, 'Dubai Academic City', 25.1250, 55.4200, 'active'),
(7, 1, 'Palm Jumeirah', 25.1124, 55.1390, 'active'),
(8, 1, 'Mall of the Emirates', 25.1181, 55.2006, 'active'),
(9, 1, 'Expo City Dubai', 24.9609, 55.1507, 'active'),
(10, 3, 'Sharjah Central', 25.3463, 55.4209, 'active'),
(11, 3, 'University City Sharjah', 25.3043, 55.4846, 'active'),
(12, 2, 'Abu Dhabi Corniche', 24.4667, 54.3667, 'active'),
(13, 2, 'Yas Island', 24.4958, 54.6070, 'active'),
(14, 8, 'Al Ain Central', 24.2075, 55.7447, 'active'),
(15, 4, 'Ajman Corniche', 25.4052, 55.5136, 'active'),
(16, 6, 'Jebel Jais', 25.9531, 56.1839, 'active'),
(17, 7, 'Fujairah Corniche', 25.1288, 56.3265, 'active');

INSERT OR IGNORE INTO location_categories
(category_id, category_name, description, icon_name, status)
VALUES
(1, 'mall', 'Shopping malls and retail centers', 'shopping-bag', 'active'),
(2, 'airport', 'Airports and terminals', 'plane', 'active'),
(3, 'business_district', 'Business and office districts', 'building', 'active'),
(4, 'residential_area', 'Residential communities', 'home', 'active'),
(5, 'university', 'Universities and academic institutions', 'graduation-cap', 'active'),
(6, 'tourist_attraction', 'Tourism and landmark locations', 'camera', 'active'),
(7, 'beach', 'Beach and waterfront areas', 'waves', 'active'),
(8, 'road', 'Major roads and highways', 'route', 'active'),
(9, 'parking_zone', 'Parking zones and parking areas', 'parking-circle', 'active'),
(10, 'government_office', 'Government buildings and services', 'landmark', 'active'),
(11, 'hospital', 'Hospitals and healthcare locations', 'hospital', 'active'),
(12, 'hotel', 'Hotels and hospitality areas', 'hotel', 'active'),
(13, 'metro_station', 'Metro stations and public transport', 'train', 'active'),
(14, 'landmark', 'Important UAE landmarks', 'map-pin', 'active');

INSERT OR IGNORE INTO locations
(location_id, area_id, category_id, name, address, latitude, longitude, external_place_id, provider_name, search_keywords, popularity_score, status)
VALUES
(1, 1, 1, 'Dubai Mall', 'Downtown Dubai, Dubai, UAE', 25.1972, 55.2744, 'seed_dubai_mall', 'seed', 'dubai mall,downtown,shopping,burj khalifa', 99, 'active'),
(2, 2, 4, 'Dubai Marina', 'Dubai Marina, Dubai, UAE', 25.0800, 55.1400, 'seed_dubai_marina', 'seed', 'dubai marina,jbr,waterfront,residential', 95, 'active'),
(3, 1, 14, 'Burj Khalifa', 'Downtown Dubai, Dubai, UAE', 25.1972, 55.2744, 'seed_burj_khalifa', 'seed', 'burj khalifa,downtown,landmark,tourist', 100, 'active'),
(4, 1, 3, 'Downtown Dubai', 'Downtown Dubai, Dubai, UAE', 25.2048, 55.2708, 'seed_downtown', 'seed', 'downtown dubai,business,tourist', 96, 'active'),
(5, 3, 3, 'Business Bay', 'Business Bay, Dubai, UAE', 25.1850, 55.2770, 'seed_business_bay', 'seed', 'business bay,offices,canal', 90, 'active'),
(6, 4, 2, 'DXB Airport', 'Dubai International Airport, Dubai, UAE', 25.2532, 55.3657, 'seed_dxb_airport', 'seed', 'dxb,dubai airport,terminal,airport', 98, 'active'),
(7, 5, 7, 'Jumeirah', 'Jumeirah, Dubai, UAE', 25.2048, 55.2520, 'seed_jumeirah', 'seed', 'jumeirah,beach,residential', 87, 'active'),
(8, 6, 5, 'Dubai Academic City', 'Dubai International Academic City, Dubai, UAE', 25.1250, 55.4200, 'seed_academic_city', 'seed', 'academic city,university,student', 80, 'active'),
(9, 10, 4, 'Sharjah City', 'Sharjah, UAE', 25.3463, 55.4209, 'seed_sharjah_city', 'seed', 'sharjah,city,commute', 89, 'active'),
(10, 11, 5, 'University City Sharjah', 'University City, Sharjah, UAE', 25.3043, 55.4846, 'seed_university_city_shj', 'seed', 'sharjah university,aus,university city', 82, 'active'),
(11, 8, 1, 'Mall of the Emirates', 'Al Barsha, Dubai, UAE', 25.1181, 55.2006, 'seed_moe', 'seed', 'mall of emirates,moe,shopping,ski dubai', 91, 'active'),
(12, 7, 6, 'Palm Jumeirah', 'Palm Jumeirah, Dubai, UAE', 25.1124, 55.1390, 'seed_palm', 'seed', 'palm jumeirah,atlantis,tourist', 94, 'active'),
(13, 9, 6, 'Expo City Dubai', 'Expo City Dubai, Dubai, UAE', 24.9609, 55.1507, 'seed_expo_city', 'seed', 'expo city,dubai south,event', 86, 'active'),
(14, 12, 6, 'Corniche Abu Dhabi', 'Corniche, Abu Dhabi, UAE', 24.4667, 54.3667, 'seed_corniche_auh', 'seed', 'abu dhabi,corniche,waterfront', 84, 'active'),
(15, 13, 6, 'Yas Island', 'Yas Island, Abu Dhabi, UAE', 24.4958, 54.6070, 'seed_yas_island', 'seed', 'yas island,ferrari world,yas mall', 88, 'active'),
(16, 14, 6, 'Al Ain Mall', 'Al Ain, Abu Dhabi, UAE', 24.2075, 55.7447, 'seed_al_ain_mall', 'seed', 'al ain,mall,abu dhabi', 72, 'active'),
(17, 15, 7, 'Ajman Corniche', 'Ajman Corniche, Ajman, UAE', 25.4052, 55.5136, 'seed_ajman_corniche', 'seed', 'ajman,corniche,beach', 70, 'active'),
(18, 16, 6, 'Jebel Jais', 'Ras Al Khaimah, UAE', 25.9531, 56.1839, 'seed_jebel_jais', 'seed', 'jebel jais,ras al khaimah,mountain,tourism', 78, 'active'),
(19, 17, 7, 'Fujairah Corniche', 'Fujairah Corniche, Fujairah, UAE', 25.1288, 56.3265, 'seed_fujairah_corniche', 'seed', 'fujairah,corniche,beach', 69, 'active'),
(20, 4, 2, 'DXB Terminal 3', 'Dubai International Airport Terminal 3, Dubai, UAE', 25.2444, 55.3642, 'seed_dxb_t3', 'seed', 'terminal 3,dxb,emirates airport', 92, 'active');

INSERT OR IGNORE INTO saved_places
(saved_place_id, user_id, label, location_id, custom_name)
VALUES
(1, 1, 'Home', 2, 'Dubai Marina Home'),
(2, 1, 'Work', 5, 'Business Bay Office'),
(3, 1, 'University', 8, 'Academic City Campus'),
(4, 1, 'Airport', 6, 'DXB Airport'),
(5, 5, 'Home', 9, 'Sharjah Home'),
(6, 5, 'Work', 1, 'Dubai Mall Work');

INSERT OR IGNORE INTO popular_places
(popular_place_id, location_id, rank_score, search_count, trip_count, status)
VALUES
(1, 1, 99, 850, 420, 'active'),
(2, 2, 95, 720, 380, 'active'),
(3, 6, 98, 900, 510, 'active'),
(4, 5, 90, 560, 300, 'active'),
(5, 8, 80, 310, 190, 'active'),
(6, 9, 89, 630, 410, 'active'),
(7, 11, 91, 490, 260, 'active'),
(8, 15, 88, 330, 150, 'active');

INSERT OR IGNORE INTO geocoding_cache
(geocoding_cache_id, query_text, provider_name, external_place_id, latitude, longitude, formatted_address, response_json, expires_at)
VALUES
(1, 'Dubai Mall', 'seed', 'seed_dubai_mall', 25.1972, 55.2744, 'Dubai Mall, Downtown Dubai, UAE', '{"source":"seed"}', '2027-01-01'),
(2, 'Dubai Marina', 'seed', 'seed_dubai_marina', 25.0800, 55.1400, 'Dubai Marina, Dubai, UAE', '{"source":"seed"}', '2027-01-01'),
(3, 'Academic City', 'seed', 'seed_academic_city', 25.1250, 55.4200, 'Dubai Academic City, UAE', '{"source":"seed"}', '2027-01-01');

INSERT OR IGNORE INTO map_provider_cache
(cache_id, provider_name, request_type, request_hash, request_json, response_json, expires_at)
VALUES
(1, 'openroute_seed', 'directions', 'dubai_mall_to_marina_balanced', '{"from":"Dubai Mall","to":"Dubai Marina"}', '{"routes":3,"source":"seed"}', '2027-01-01');

INSERT OR IGNORE INTO search_history
(search_history_id, user_id, query_text, selected_location_id, result_count, provider_name)
VALUES
(1, 1, 'Dubai Mall', 1, 3, 'seed'),
(2, 1, 'Dubai Marina', 2, 2, 'seed'),
(3, 5, 'Academic City', 8, 2, 'seed'),
(4, 5, 'Sharjah', 9, 4, 'seed');

-- =========================================================
-- 4. ROADS / TRAFFIC / INCIDENTS
-- =========================================================

INSERT OR IGNORE INTO road_segments
(road_segment_id, road_name, emirate_id, city_id, area_id, start_latitude, start_longitude, end_latitude, end_longitude, road_type, max_capacity, status)
VALUES
(1, 'Sheikh Zayed Road', 1, 1, 1, 25.1972, 55.2744, 25.0800, 55.1400, 'highway', 1200, 'open'),
(2, 'Al Khail Road', 1, 1, 3, 25.1850, 55.2770, 25.0800, 55.1400, 'highway', 1000, 'open'),
(3, 'Emirates Road E611', 1, 1, 6, 25.1250, 55.4200, 25.3463, 55.4209, 'highway', 1400, 'open'),
(4, 'Sheikh Mohammed Bin Zayed Road E311', 1, 1, 6, 25.1250, 55.4200, 25.3043, 55.4846, 'highway', 1500, 'open'),
(5, 'Airport Road', 1, 1, 4, 25.2532, 55.3657, 25.1850, 55.2770, 'main', 900, 'open'),
(6, 'Jumeirah Beach Road', 1, 1, 5, 25.2048, 55.2520, 25.0800, 55.1400, 'main', 700, 'open'),
(7, 'Al Ittihad Road', 3, 3, 10, 25.3463, 55.4209, 25.2532, 55.3657, 'highway', 1100, 'open'),
(8, 'Hessa Street', 1, 1, 2, 25.0800, 55.1400, 25.1181, 55.2006, 'main', 800, 'open'),
(9, 'Garhoud Bridge', 1, 1, 4, 25.2532, 55.3657, 25.2048, 55.2708, 'bridge', 850, 'open'),
(10, 'Business Bay Crossing', 1, 1, 3, 25.1850, 55.2770, 25.2048, 55.2708, 'bridge', 750, 'open');

INSERT OR IGNORE INTO intersections
(intersection_id, name, latitude, longitude, area_id, signal_controlled, status)
VALUES
(1, 'Downtown Interchange', 25.2048, 55.2708, 1, 1, 'active'),
(2, 'Business Bay Exit', 25.1850, 55.2770, 3, 1, 'active'),
(3, 'Dubai Marina Exit', 25.0800, 55.1400, 2, 1, 'active');

INSERT OR IGNORE INTO traffic_snapshots
(traffic_snapshot_id, road_segment_id, vehicle_count, average_speed, congestion_level, traffic_status, source)
VALUES
(1, 1, 980, 38, 8.5, 'high', 'simulated'),
(2, 2, 560, 64, 4.0, 'medium', 'simulated'),
(3, 3, 420, 82, 3.0, 'low', 'simulated'),
(4, 4, 730, 58, 5.5, 'medium', 'simulated'),
(5, 5, 860, 35, 7.5, 'high', 'simulated'),
(6, 6, 310, 48, 3.5, 'low', 'simulated'),
(7, 7, 1050, 28, 9.0, 'high', 'simulated'),
(8, 8, 640, 42, 6.0, 'medium', 'simulated');

INSERT OR IGNORE INTO congestion_history
(congestion_history_id, road_segment_id, congestion_level, average_speed, vehicle_count, day_of_week, hour_of_day)
VALUES
(1, 1, 8.5, 38, 980, 'Monday', 18),
(2, 2, 4.0, 64, 560, 'Monday', 18),
(3, 5, 7.5, 35, 860, 'Monday', 18),
(4, 7, 9.0, 28, 1050, 'Monday', 18);

INSERT OR IGNORE INTO road_incidents
(incident_id, road_segment_id, incident_type, title, description, severity, latitude, longitude, status, reported_by_user_id)
VALUES
(1, 1, 'congestion', 'Heavy traffic on Sheikh Zayed Road', 'Traffic build-up near Downtown Dubai toward Dubai Marina.', 'high', 25.1972, 55.2744, 'active', 3),
(2, 5, 'accident', 'Minor accident near Airport Road', 'Slow movement near DXB Airport exit.', 'medium', 25.2532, 55.3657, 'active', 3),
(3, 8, 'slow_speed', 'Slow traffic on Hessa Street', 'Moderate congestion near Marina access.', 'medium', 25.0800, 55.1400, 'active', 1);

INSERT OR IGNORE INTO road_closures
(closure_id, road_segment_id, reason, start_time, end_time, status)
VALUES
(1, 6, 'Planned maintenance on Jumeirah Beach Road shoulder lane', CURRENT_TIMESTAMP, NULL, 'scheduled');

INSERT OR IGNORE INTO speed_limits
(speed_limit_id, road_segment_id, speed_limit_kmh, status)
VALUES
(1, 1, 100, 'active'),
(2, 2, 100, 'active'),
(3, 3, 110, 'active'),
(4, 4, 110, 'active'),
(5, 5, 80, 'active'),
(6, 6, 70, 'active');

INSERT OR IGNORE INTO toll_gates
(toll_gate_id, road_segment_id, name, latitude, longitude, toll_amount, provider_name, status)
VALUES
(1, 1, 'Al Safa Salik Gate', 25.1800, 55.2400, 4.0, 'salik', 'active'),
(2, 9, 'Airport Tunnel Salik Gate', 25.2500, 55.3600, 4.0, 'salik', 'active');

-- =========================================================
-- 5. TRIPS / ROUTES / ROUTE DISTRIBUTION
-- =========================================================

INSERT OR IGNORE INTO trip_requests
(trip_request_id, user_id, vehicle_id, start_location_id, destination_location_id, start_location, destination, start_latitude, start_longitude, destination_latitude, destination_longitude, vehicle_type, route_preference, user_role, status)
VALUES
(1, 1, 1, 1, 2, 'Dubai Mall', 'Dubai Marina', 25.1972, 55.2744, 25.0800, 55.1400, 'car', 'balanced', 'driver', 'assigned'),
(2, 1, 1, 6, 5, 'DXB Airport', 'Business Bay', 25.2532, 55.3657, 25.1850, 55.2770, 'car', 'fastest', 'driver', 'completed'),
(3, 5, 2, 9, 8, 'Sharjah City', 'Dubai Academic City', 25.3463, 55.4209, 25.1250, 55.4200, 'car', 'least_congested', 'driver', 'active'),
(4, 5, 2, 11, 4, 'Mall of the Emirates', 'Downtown Dubai', 25.1181, 55.2006, 25.2048, 55.2708, 'car', 'balanced', 'driver', 'requested');

INSERT OR IGNORE INTO route_options
(route_id, trip_request_id, route_name, provider_name, external_route_id, estimated_time_minutes, distance_km, congestion_score, route_score, assigned_users, road_capacity, geometry_json, is_recommended, status)
VALUES
(1, 1, 'Route A - Sheikh Zayed Road', 'seed', 'route_a_szr', 24, 23.8, 8.5, 62.0, 42, 1200, '{"type":"LineString","coordinates":[[55.2744,25.1972],[55.1400,25.0800]]}', 0, 'available'),
(2, 1, 'Route B - Al Khail Road', 'seed', 'route_b_alkhail', 28, 27.2, 4.0, 43.5, 18, 1000, '{"type":"LineString","coordinates":[[55.2744,25.1972],[55.2770,25.1850],[55.1400,25.0800]]}', 1, 'available'),
(3, 1, 'Route C - Jumeirah Beach Road', 'seed', 'route_c_jumeirah', 34, 29.5, 3.5, 47.0, 10, 700, '{"type":"LineString","coordinates":[[55.2744,25.1972],[55.2520,25.2048],[55.1400,25.0800]]}', 0, 'available'),

(4, 2, 'Route A - Airport Road Direct', 'seed', 'route_airport_direct', 18, 14.2, 7.5, 48.0, 22, 900, '{"type":"LineString","coordinates":[[55.3657,25.2532],[55.2770,25.1850]]}', 0, 'completed'),
(5, 2, 'Route B - Garhoud Bridge Balanced', 'seed', 'route_airport_garhoud', 22, 17.4, 5.0, 39.0, 12, 850, '{"type":"LineString","coordinates":[[55.3657,25.2532],[55.2708,25.2048],[55.2770,25.1850]]}', 1, 'completed'),

(6, 3, 'Route A - Al Ittihad Road', 'seed', 'route_shj_ittihad', 44, 34.0, 9.0, 78.0, 58, 1100, '{"type":"LineString","coordinates":[[55.4209,25.3463],[55.3657,25.2532],[55.4200,25.1250]]}', 0, 'available'),
(7, 3, 'Route B - E311 Academic City', 'seed', 'route_shj_e311', 49, 39.5, 5.5, 55.0, 21, 1500, '{"type":"LineString","coordinates":[[55.4209,25.3463],[55.4846,25.3043],[55.4200,25.1250]]}', 1, 'available');

INSERT OR IGNORE INTO route_steps
(route_step_id, route_id, step_number, instruction, distance_meters, duration_seconds, latitude, longitude, maneuver_type)
VALUES
(1, 2, 1, 'Start from Dubai Mall and head toward Al Khail Road.', 3200, 360, 25.1972, 55.2744, 'depart'),
(2, 2, 2, 'Continue on Al Khail Road toward Dubai Marina.', 18500, 1200, 25.1850, 55.2770, 'continue'),
(3, 2, 3, 'Take the exit toward Dubai Marina.', 3700, 420, 25.0800, 55.1400, 'exit'),
(4, 2, 4, 'Arrive at Dubai Marina.', 800, 120, 25.0800, 55.1400, 'arrive'),

(5, 7, 1, 'Start from Sharjah City and join E311.', 5000, 480, 25.3463, 55.4209, 'depart'),
(6, 7, 2, 'Continue on Sheikh Mohammed Bin Zayed Road toward Academic City.', 30000, 2100, 25.3043, 55.4846, 'continue'),
(7, 7, 3, 'Take Academic City exit.', 4500, 360, 25.1250, 55.4200, 'exit'),
(8, 7, 4, 'Arrive at Dubai Academic City.', 500, 60, 25.1250, 55.4200, 'arrive');

INSERT OR IGNORE INTO route_segments
(route_segment_id, route_id, road_segment_id, segment_order, distance_km, estimated_time_minutes)
VALUES
(1, 1, 1, 1, 23.8, 24),
(2, 2, 2, 1, 27.2, 28),
(3, 3, 6, 1, 29.5, 34),
(4, 4, 5, 1, 14.2, 18),
(5, 5, 9, 1, 17.4, 22),
(6, 6, 7, 1, 34.0, 44),
(7, 7, 4, 1, 39.5, 49);

INSERT OR IGNORE INTO route_loads
(route_load_id, route_id, active_users, road_capacity, load_percentage, load_status)
VALUES
(1, 1, 42, 1200, 72.0, 'overloaded'),
(2, 2, 18, 1000, 38.0, 'normal'),
(3, 3, 10, 700, 24.0, 'low'),
(4, 6, 58, 1100, 81.0, 'overloaded'),
(5, 7, 21, 1500, 41.0, 'normal');

INSERT OR IGNORE INTO route_scores
(route_score_id, route_id, time_score, distance_score, congestion_score, load_score, incident_score, eco_score, final_score, scoring_model_version)
VALUES
(1, 1, 24, 23.8, 17.0, 21.0, 4.0, 2.0, 62.0, 'v1'),
(2, 2, 28, 27.2, 8.0, 9.0, 0.0, 4.5, 43.5, 'v1'),
(3, 3, 34, 29.5, 7.0, 5.0, 0.0, 5.5, 47.0, 'v1'),
(4, 6, 44, 34.0, 18.0, 29.0, 4.0, 3.0, 78.0, 'v1'),
(5, 7, 49, 39.5, 11.0, 10.0, 0.0, 5.0, 55.0, 'v1');

INSERT OR IGNORE INTO route_assignments
(assignment_id, trip_request_id, user_id, route_id, assignment_reason, status)
VALUES
(1, 1, 1, 2, 'Route B selected because Route A is faster but currently overloaded and has high congestion.', 'assigned'),
(2, 2, 1, 5, 'Balanced airport route selected to avoid congestion near Airport Road.', 'completed'),
(3, 3, 5, 7, 'E311 route selected because Al Ittihad Road has heavy route load and high congestion.', 'assigned');

INSERT OR IGNORE INTO distribution_decisions
(decision_id, trip_request_id, selected_route_id, fastest_route_id, overloaded_route_id, decision_reason, congestion_factor, load_factor, time_factor, incident_factor)
VALUES
(1, 1, 2, 1, 1, 'Route B selected because Route A is faster but overloaded and congested.', 8.5, 72.0, 28.0, 4.0),
(2, 3, 7, 6, 6, 'Route B selected because Al Ittihad Road has high congestion and route load.', 9.0, 81.0, 49.0, 3.0);

INSERT OR IGNORE INTO assignment_reasons
(assignment_reason_id, assignment_id, reason_code, reason_text)
VALUES
(1, 1, 'BALANCED_ROUTE', 'Lower congestion and acceptable ETA.'),
(2, 2, 'AVOID_AIRPORT_DELAY', 'Avoids slow-moving Airport Road traffic.'),
(3, 3, 'AVOID_OVERLOAD', 'Avoids overloaded Sharjah-Dubai commuter road.');

INSERT OR IGNORE INTO route_balancing_rules
(rule_id, rule_name, description, congestion_weight, load_weight, time_weight, incident_weight, eco_weight, is_active)
VALUES
(1, 'Balanced Smart Mobility Rule', 'Balances travel time, congestion, incidents, and route load.', 2.0, 1.5, 1.0, 1.2, 0.5, 1);

INSERT OR IGNORE INTO route_demand_history
(demand_history_id, route_id, start_area_id, destination_area_id, requested_count, assigned_count, day_of_week, hour_of_day, recorded_date)
VALUES
(1, 1, 1, 2, 120, 52, 'Monday', 18, DATE('now')),
(2, 2, 1, 2, 110, 74, 'Monday', 18, DATE('now')),
(3, 6, 10, 6, 150, 55, 'Monday', 18, DATE('now')),
(4, 7, 10, 6, 130, 80, 'Monday', 18, DATE('now'));

-- =========================================================
-- 6. TRIP SESSIONS / NAVIGATION
-- =========================================================

INSERT OR IGNORE INTO trip_sessions
(session_id, trip_request_id, user_id, assignment_id, selected_route_id, status, current_step_index, started_at, ended_at)
VALUES
(1, 1, 1, 1, 2, 'active', 1, CURRENT_TIMESTAMP, NULL),
(2, 2, 1, 2, 5, 'completed', 4, DATETIME('now', '-2 hours'), DATETIME('now', '-1 hours')),
(3, 3, 5, 3, 7, 'active', 2, CURRENT_TIMESTAMP, NULL);

INSERT OR IGNORE INTO navigation_progress
(
    navigation_progress_id,
    session_id,
    current_step_index,
    latitude,
    longitude,
    speed_kmh,
    remaining_distance_km,
    remaining_time_minutes,
    remaining_time_min,
    progress_percent,
    progress_percentage,
    event_type
)
VALUES
(1, 1, 1, 25.1850, 55.2770, 62, 21.5, 22, 22, 25, 25, 'location_update'),
(2, 2, 4, 25.1850, 55.2770, 0, 0, 0, 0, 100, 100, 'arrived'),
(3, 3, 2, 25.3043, 55.4846, 70, 18.0, 28, 28, 55, 55, 'location_update');

INSERT OR IGNORE INTO trip_status_history
(status_history_id, session_id, old_status, new_status, message)
VALUES
(1, 1, 'assigned', 'active', 'Navigation started.'),
(2, 2, 'active', 'completed', 'Trip completed successfully.'),
(3, 3, 'assigned', 'active', 'Navigation started from Sharjah.');

INSERT OR IGNORE INTO trip_feedback
(feedback_id, session_id, user_id, rating, feedback_text, route_accuracy_rating, congestion_accuracy_rating)
VALUES
(1, 2, 1, 5, 'Route avoided the airport congestion well.', 5, 4);

-- =========================================================
-- 7. DASHBOARD ANALYTICS
-- =========================================================

INSERT OR IGNORE INTO trip_analytics
(analytics_id, session_id, assignment_id, user_id, estimated_time_saved_minutes, fuel_saved_liters, co2_saved_kg, congestion_reduction_percent, actual_duration_minutes, actual_distance_km)
VALUES
(1, 1, 1, 1, 7, 0.9, 2.1, 18, NULL, NULL),
(2, 2, 2, 1, 5, 0.6, 1.4, 12, 21, 17.4),
(3, 3, 3, 5, 11, 1.2, 2.8, 22, NULL, NULL);

INSERT OR IGNORE INTO route_performance
(route_performance_id, route_id, average_duration_minutes, average_speed_kmh, completion_count, cancellation_count, average_rating, performance_date)
VALUES
(1, 2, 29, 58, 84, 3, 4.6, DATE('now')),
(2, 5, 22, 52, 39, 1, 4.4, DATE('now')),
(3, 7, 50, 67, 61, 2, 4.2, DATE('now'));

INSERT OR IGNORE INTO congestion_analytics
(congestion_analytics_id, road_segment_id, area_id, average_congestion_level, peak_congestion_level, congestion_reduction_percent, analytics_date)
VALUES
(1, 1, 1, 7.8, 9.0, 14, DATE('now')),
(2, 2, 3, 4.5, 6.0, 20, DATE('now')),
(3, 7, 10, 8.7, 9.5, 9, DATE('now'));

INSERT OR IGNORE INTO fuel_saving_estimates
(fuel_saving_id, trip_request_id, route_id, estimated_fuel_saved_liters, calculation_method)
VALUES
(1, 1, 2, 0.9, 'distance_time_congestion'),
(2, 2, 5, 0.6, 'distance_time_congestion'),
(3, 3, 7, 1.2, 'distance_time_congestion');

INSERT OR IGNORE INTO emissions_saving_estimates
(emissions_saving_id, trip_request_id, route_id, estimated_co2_saved_kg, calculation_method)
VALUES
(1, 1, 2, 2.1, 'fuel_to_co2_estimate'),
(2, 2, 5, 1.4, 'fuel_to_co2_estimate'),
(3, 3, 7, 2.8, 'fuel_to_co2_estimate');

INSERT OR IGNORE INTO system_metrics
(system_metric_id, metric_name, metric_value, metric_unit, metric_category)
VALUES
(1, 'active_trips', 2, 'count', 'dashboard'),
(2, 'total_trips_today', 48, 'count', 'dashboard'),
(3, 'average_congestion_reduction', 18, 'percent', 'analytics'),
(4, 'total_fuel_saved_today', 24.7, 'liters', 'savings'),
(5, 'total_co2_saved_today', 57.2, 'kg', 'savings');

INSERT OR IGNORE INTO daily_summary_stats
(daily_summary_id, summary_date, total_trips, active_trips, completed_trips, cancelled_trips, average_travel_time_minutes, congestion_reduction_percent, total_fuel_saved_liters, total_co2_saved_kg, active_alerts)
VALUES
(1, DATE('now'), 48, 2, 41, 5, 31.5, 18, 24.7, 57.2, 4);

-- =========================================================
-- 8. ALERTS / NOTIFICATIONS / EMERGENCY
-- =========================================================

INSERT OR IGNORE INTO alerts
(alert_id, alert_type, message, zone, severity, latitude, longitude, road_segment_id, location_id, status)
VALUES
(1, 'traffic', 'Heavy traffic near Downtown Dubai on Sheikh Zayed Road.', 'Downtown Dubai', 'high', 25.1972, 55.2744, 1, 1, 'active'),
(2, 'accident', 'Minor accident reported near Airport Road exit.', 'DXB Airport', 'medium', 25.2532, 55.3657, 5, 6, 'active'),
(3, 'roadwork', 'Scheduled roadwork near Jumeirah Beach Road.', 'Jumeirah', 'low', 25.2048, 55.2520, 6, 7, 'active'),
(4, 'congestion', 'High congestion detected on Al Ittihad Road from Sharjah to Dubai.', 'Sharjah', 'high', 25.3463, 55.4209, 7, 9, 'active');

INSERT OR IGNORE INTO user_notifications
(notification_id, user_id, alert_id, title, message, notification_type, is_read)
VALUES
(1, 1, 1, 'Traffic Alert', 'Heavy traffic near Downtown Dubai.', 'traffic', 0),
(2, 1, 2, 'Incident Alert', 'Minor accident near Airport Road.', 'incident', 0),
(3, 5, 4, 'Congestion Alert', 'High congestion on Al Ittihad Road.', 'traffic', 0);

INSERT OR IGNORE INTO emergency_vehicles
(emergency_vehicle_id, user_id, vehicle_identifier, emergency_type, current_latitude, current_longitude, status)
VALUES
(1, 4, 'AMB-DXB-001', 'ambulance', 25.2532, 55.3657, 'available');

INSERT OR IGNORE INTO emergency_routes
(emergency_route_id, emergency_vehicle_id, route_id, priority_level, start_location, destination, status)
VALUES
(1, 1, 5, 'high', 'DXB Airport', 'Business Bay', 'active');

INSERT OR IGNORE INTO incident_updates
(incident_update_id, incident_id, updated_by_user_id, update_message, new_status)
VALUES
(1, 1, 3, 'Traffic remains heavy but moving slowly.', 'active'),
(2, 2, 3, 'Accident reported as minor. Police notified.', 'active');

INSERT OR IGNORE INTO notification_preferences
(notification_preference_id, user_id, traffic_alerts, incident_alerts, parking_alerts, emergency_alerts, push_enabled, email_enabled)
VALUES
(1, 1, 1, 1, 1, 1, 1, 0),
(2, 5, 1, 1, 1, 1, 1, 0),
(3, 3, 1, 1, 1, 1, 1, 1);

-- =========================================================
-- 9. PARKING SAMPLE DATA
-- =========================================================

INSERT OR IGNORE INTO parking_zones
(parking_zone_id, location_id, zone_name, destination, latitude, longitude, total_spaces, zone_type, status)
VALUES
(1, 1, 'Dubai Mall Grand Parking', 'Dubai Mall', 25.1975, 55.2760, 14000, 'mall', 'active'),
(2, 2, 'Dubai Marina Public Parking', 'Dubai Marina', 25.0802, 55.1405, 900, 'public', 'active'),
(3, 5, 'Business Bay Visitor Parking', 'Business Bay', 25.1852, 55.2775, 1200, 'public', 'active'),
(4, 6, 'DXB Terminal 3 Parking', 'DXB Airport', 25.2444, 55.3642, 5000, 'airport', 'active');

INSERT OR IGNORE INTO parking_spots
(parking_spot_id, parking_zone_id, spot_code, spot_type, is_available, status)
VALUES
(1, 1, 'DM-A-101', 'standard', 1, 'active'),
(2, 1, 'DM-A-102', 'standard', 0, 'active'),
(3, 2, 'MAR-B-201', 'standard', 1, 'active'),
(4, 3, 'BB-C-301', 'covered', 1, 'active'),
(5, 4, 'DXB-T3-401', 'airport', 0, 'active');

INSERT OR IGNORE INTO parking_availability
(parking_availability_id, parking_zone_id, available_spaces, occupied_spaces, occupancy_rate, source)
VALUES
(1, 1, 3200, 10800, 77.1, 'simulated'),
(2, 2, 210, 690, 76.6, 'simulated'),
(3, 3, 480, 720, 60.0, 'simulated'),
(4, 4, 900, 4100, 82.0, 'simulated');

INSERT OR IGNORE INTO parking_predictions
(parking_prediction_id, parking_zone_id, destination, availability_probability, estimated_wait_time_minutes, walking_distance_meters, safety_score, difficulty_score, prediction_model_version)
VALUES
(1, 1, 'Dubai Mall', 0.72, 6, 250, 8.8, 5.5, 'v1'),
(2, 2, 'Dubai Marina', 0.46, 12, 400, 8.0, 7.2, 'v1'),
(3, 3, 'Business Bay', 0.68, 8, 300, 8.5, 5.9, 'v1'),
(4, 4, 'DXB Airport', 0.38, 18, 600, 9.0, 8.1, 'v1');

-- =========================================================
-- 10. ADMIN / SYSTEM SETTINGS / FEATURE FLAGS
-- =========================================================

INSERT OR IGNORE INTO system_settings
(setting_id, setting_key, setting_value, setting_type, description, is_public)
VALUES
(1, 'route_scoring_model_version', 'v1', 'string', 'Current FlowSync route scoring model version.', 1),
(2, 'default_route_mode', 'balanced', 'string', 'Default route preference for new users.', 1),
(3, 'maps_provider', 'public_api_ready', 'string', 'Public maps API support is prepared through provider cache tables.', 0),
(4, 'parking_prediction_enabled', 'true', 'boolean', 'Controls parking prediction UI support.', 1),
(5, 'emergency_priority_enabled', 'true', 'boolean', 'Controls emergency priority routing support.', 0);

INSERT OR IGNORE INTO feature_flags
(feature_flag_id, flag_key, flag_name, description, is_enabled, rollout_percentage)
VALUES
(1, 'advanced_frontend', 'Advanced Frontend Integration', 'Enables database-backed frontend app behavior.', 1, 100),
(2, 'live_navigation', 'Live Navigation', 'Enables trip session and navigation progress updates.', 1, 100),
(3, 'parking_prediction', 'Parking Prediction', 'Future parking prediction module support.', 1, 60),
(4, 'emergency_priority_routing', 'Emergency Priority Routing', 'Emergency vehicle routing support.', 1, 80),
(5, 'public_maps_cache', 'Public Maps Provider Cache', 'Enables storing map provider responses.', 1, 100);

INSERT OR IGNORE INTO api_logs
(api_log_id, user_id, endpoint, method, status_code, request_body, response_time_ms, ip_address)
VALUES
(1, 1, '/api/locations/search', 'GET', 200, '{"q":"Dubai Mall"}', 42, '127.0.0.1'),
(2, 1, '/api/routes/recommend', 'POST', 200, '{"start":"Dubai Mall","destination":"Dubai Marina"}', 180, '127.0.0.1'),
(3, 2, '/api/dashboard/stats', 'GET', 200, '{}', 65, '127.0.0.1');

INSERT OR IGNORE INTO admin_actions
(admin_action_id, admin_user_id, action_type, target_entity, target_entity_id, action_details)
VALUES
(1, 2, 'seed_database_review', 'database', 1, 'Reviewed final commercial-ready seed dataset.');

INSERT OR IGNORE INTO audit_logs
(audit_log_id, user_id, action, entity_name, entity_id, old_value_json, new_value_json, ip_address)
VALUES
(1, 2, 'DATABASE_SEED_LOADED', 'seed.sql', 1, NULL, '{"status":"completed"}', '127.0.0.1');

INSERT OR IGNORE INTO error_logs
(error_log_id, user_id, error_type, error_message, stack_trace, endpoint, severity, resolved)
VALUES
(1, 2, 'demo_log', 'No active error. This is a sample error log record for dashboard testing.', NULL, '/api/demo', 'low', 1);

INSERT OR IGNORE INTO data_import_logs
(data_import_log_id, import_type, provider_name, source_file, records_processed, records_inserted, records_failed, status, error_message)
VALUES
(1, 'seed_import', 'seed', 'backend/database/seed.sql', 150, 150, 0, 'completed', NULL);
-- =========================================================
-- EXTRA REAL-LIFE DUBAI LOCATION SEED DATA
-- Approximate coordinates for demo/testing.
-- Production should verify/import using public map APIs.
-- =========================================================

INSERT OR IGNORE INTO locations
(location_id, area_id, category_id, name, address, latitude, longitude, external_place_id, provider_name, search_keywords, popularity_score, status)
VALUES
(101, NULL, 7, 'JBR', 'Jumeirah Beach Residence, Dubai, UAE', 25.0772, 55.1338, 'seed_jbr', 'manual_seed', 'jbr,jumeirah beach residence,beach,marina,walk', 88, 'active'),

(102, 7, 6, 'Atlantis The Palm', 'Palm Jumeirah, Dubai, UAE', 25.1304, 55.1171, 'seed_atlantis_the_palm', 'manual_seed', 'atlantis,palm jumeirah,hotel,tourist,aquaventure', 94, 'active'),

(103, NULL, 1, 'Dubai Hills Mall', 'Dubai Hills Estate, Dubai, UAE', 25.1019, 55.2388, 'seed_dubai_hills_mall', 'manual_seed', 'dubai hills mall,shopping,mall,dubai hills', 84, 'active'),

(104, NULL, 6, 'City Walk', 'Al Wasl, Dubai, UAE', 25.2076, 55.2630, 'seed_city_walk', 'manual_seed', 'city walk,al wasl,shopping,restaurant,tourist', 86, 'active'),

(105, NULL, 6, 'Bluewaters Island', 'Bluewaters Island, Dubai, UAE', 25.0804, 55.1223, 'seed_bluewaters', 'manual_seed', 'bluewaters island,ain dubai,jbr,tourist', 87, 'active'),

(106, NULL, 4, 'Dubai Creek Harbour', 'Dubai Creek Harbour, Dubai, UAE', 25.1975, 55.3459, 'seed_dubai_creek_harbour', 'manual_seed', 'creek harbour,dubai creek,residential,waterfront', 82, 'active'),

(107, NULL, 4, 'Deira', 'Deira, Dubai, UAE', 25.2695, 55.3088, 'seed_deira', 'manual_seed', 'deira,old dubai,market,gold souk,creek', 83, 'active'),

(108, NULL, 4, 'Bur Dubai', 'Bur Dubai, Dubai, UAE', 25.2632, 55.2972, 'seed_bur_dubai', 'manual_seed', 'bur dubai,old dubai,creek,heritage', 82, 'active'),

(109, NULL, 4, 'Al Barsha', 'Al Barsha, Dubai, UAE', 25.1124, 55.2036, 'seed_al_barsha', 'manual_seed', 'al barsha,residential,mall of emirates', 80, 'active'),

(110, 5, 7, 'Jumeirah Beach', 'Jumeirah Beach, Dubai, UAE', 25.2048, 55.2520, 'seed_jumeirah_beach', 'manual_seed', 'jumeirah beach,beach,tourist,waterfront', 85, 'active'),

(111, NULL, 4, 'Jumeirah 1', 'Jumeirah 1, Dubai, UAE', 25.2312, 55.2631, 'seed_jumeirah_1', 'manual_seed', 'jumeirah 1,residential,beach', 74, 'active'),

(112, NULL, 4, 'Jumeirah 2', 'Jumeirah 2, Dubai, UAE', 25.2113, 55.2548, 'seed_jumeirah_2', 'manual_seed', 'jumeirah 2,residential,beach', 73, 'active'),

(113, NULL, 4, 'Jumeirah 3', 'Jumeirah 3, Dubai, UAE', 25.1901, 55.2414, 'seed_jumeirah_3', 'manual_seed', 'jumeirah 3,residential,beach', 72, 'active'),

(114, NULL, 4, 'Umm Suqeim', 'Umm Suqeim, Dubai, UAE', 25.1485, 55.2055, 'seed_umm_suqeim', 'manual_seed', 'umm suqeim,beach,residential,burj al arab', 81, 'active'),

(115, NULL, 3, 'Dubai Internet City', 'Dubai Internet City, Dubai, UAE', 25.0952, 55.1608, 'seed_dubai_internet_city', 'manual_seed', 'internet city,dic,business,technology,offices', 83, 'active'),

(116, NULL, 3, 'Dubai Media City', 'Dubai Media City, Dubai, UAE', 25.0960, 55.1566, 'seed_dubai_media_city', 'manual_seed', 'media city,dmc,business,offices,media', 82, 'active'),

(117, NULL, 5, 'Dubai Knowledge Park', 'Dubai Knowledge Park, Dubai, UAE', 25.1048, 55.1647, 'seed_dubai_knowledge_park', 'manual_seed', 'knowledge park,education,university,training', 76, 'active'),

(118, NULL, 4, 'Dubai Silicon Oasis', 'Dubai Silicon Oasis, Dubai, UAE', 25.1257, 55.3816, 'seed_dubai_silicon_oasis', 'manual_seed', 'silicon oasis,dso,residential,technology', 79, 'active'),

(119, NULL, 4, 'International City', 'International City, Dubai, UAE', 25.1657, 55.4079, 'seed_international_city', 'manual_seed', 'international city,residential,dragon mart', 78, 'active'),

(120, NULL, 1, 'Dragon Mart', 'International City, Dubai, UAE', 25.1736, 55.4098, 'seed_dragon_mart', 'manual_seed', 'dragon mart,shopping,international city,mall', 82, 'active'),

(121, NULL, 4, 'Mirdif', 'Mirdif, Dubai, UAE', 25.2241, 55.4244, 'seed_mirdif', 'manual_seed', 'mirdif,residential,city centre', 79, 'active'),

(122, NULL, 1, 'City Centre Mirdif', 'Mirdif, Dubai, UAE', 25.2167, 55.4073, 'seed_city_centre_mirdif', 'manual_seed', 'city centre mirdif,mirdif,mall,shopping', 86, 'active'),

(123, NULL, 1, 'Dubai Festival City Mall', 'Dubai Festival City, Dubai, UAE', 25.2211, 55.3501, 'seed_dubai_festival_city_mall', 'manual_seed', 'festival city mall,shopping,creek,festival city', 85, 'active'),

(124, NULL, 2, 'DXB Terminal 1', 'Dubai International Airport Terminal 1, Dubai, UAE', 25.2480, 55.3529, 'seed_dxb_terminal_1', 'manual_seed', 'dxb terminal 1,airport,dubai airport', 89, 'active'),

(125, NULL, 2, 'DXB Terminal 2', 'Dubai International Airport Terminal 2, Dubai, UAE', 25.2630, 55.3863, 'seed_dxb_terminal_2', 'manual_seed', 'dxb terminal 2,airport,dubai airport', 84, 'active'),

(126, NULL, 4, 'Al Nahda Dubai', 'Al Nahda, Dubai, UAE', 25.2905, 55.3760, 'seed_al_nahda_dubai', 'manual_seed', 'al nahda dubai,residential,sharjah border', 78, 'active'),

(127, NULL, 4, 'Al Qusais', 'Al Qusais, Dubai, UAE', 25.2769, 55.3894, 'seed_al_qusais', 'manual_seed', 'al qusais,residential,industrial,airport side', 77, 'active'),

(128, NULL, 4, 'Al Warqa', 'Al Warqa, Dubai, UAE', 25.1917, 55.4083, 'seed_al_warqa', 'manual_seed', 'al warqa,residential,mirdif,international city', 72, 'active'),

(129, NULL, 6, 'Ras Al Khor Wildlife Sanctuary', 'Ras Al Khor, Dubai, UAE', 25.1905, 55.3230, 'seed_ras_al_khor_wildlife', 'manual_seed', 'ras al khor,wildlife sanctuary,flamingo,tourist', 76, 'active'),

(130, NULL, 6, 'Dubai Frame', 'Zabeel Park, Dubai, UAE', 25.2355, 55.3003, 'seed_dubai_frame', 'manual_seed', 'dubai frame,zabeel,landmark,tourist', 90, 'active'),

(131, NULL, 6, 'Zabeel Park', 'Zabeel, Dubai, UAE', 25.2344, 55.2956, 'seed_zabeel_park', 'manual_seed', 'zabeel park,dubai frame,park,family', 80, 'active'),

(132, NULL, 6, 'Museum of the Future', 'Sheikh Zayed Road, Dubai, UAE', 25.2191, 55.2810, 'seed_museum_future', 'manual_seed', 'museum of the future,sheikh zayed road,landmark,tourist', 93, 'active'),

(133, NULL, 3, 'Dubai World Trade Centre', 'Trade Centre, Dubai, UAE', 25.2262, 55.2888, 'seed_world_trade_centre', 'manual_seed', 'world trade centre,dwtc,exhibition,business', 88, 'active'),

(134, NULL, 8, 'Sheikh Zayed Road', 'Sheikh Zayed Road, Dubai, UAE', 25.2048, 55.2708, 'seed_sheikh_zayed_road_location', 'manual_seed', 'sheikh zayed road,szr,e11,road,business', 94, 'active'),

(135, NULL, 3, 'Dubai Design District', 'Dubai Design District, Dubai, UAE', 25.1911, 55.2988, 'seed_d3', 'manual_seed', 'dubai design district,d3,business,design', 82, 'active'),

(136, NULL, 3, 'Al Quoz', 'Al Quoz, Dubai, UAE', 25.1400, 55.2260, 'seed_al_quoz', 'manual_seed', 'al quoz,industrial,warehouse,art,alserkal', 79, 'active'),

(137, NULL, 4, 'Al Safa', 'Al Safa, Dubai, UAE', 25.1688, 55.2407, 'seed_al_safa', 'manual_seed', 'al safa,residential,safa park', 76, 'active'),

(138, NULL, 11, 'Dubai Healthcare City', 'Dubai Healthcare City, Dubai, UAE', 25.2335, 55.3210, 'seed_dubai_healthcare_city', 'manual_seed', 'healthcare city,hospital,clinic,medical', 81, 'active'),

(139, NULL, 6, 'Dubai Creek', 'Dubai Creek, Dubai, UAE', 25.2582, 55.3047, 'seed_dubai_creek', 'manual_seed', 'dubai creek,old dubai,waterfront,heritage', 84, 'active'),

(140, NULL, 6, 'Gold Souk', 'Deira, Dubai, UAE', 25.2711, 55.2972, 'seed_gold_souk', 'manual_seed', 'gold souk,deira,market,old dubai', 86, 'active'),

(141, NULL, 6, 'Spice Souk', 'Deira, Dubai, UAE', 25.2674, 55.2978, 'seed_spice_souk', 'manual_seed', 'spice souk,deira,market,old dubai', 82, 'active'),

(142, NULL, 6, 'Global Village', 'Sheikh Mohammed Bin Zayed Road, Dubai, UAE', 25.0719, 55.3063, 'seed_global_village', 'manual_seed', 'global village,tourist,festival,family', 90, 'active'),

(143, NULL, 6, 'Dubai Miracle Garden', 'Al Barsha South, Dubai, UAE', 25.0600, 55.2440, 'seed_miracle_garden', 'manual_seed', 'miracle garden,flowers,tourist,al barsha south', 88, 'active'),

(144, NULL, 6, 'IMG Worlds of Adventure', 'City of Arabia, Dubai, UAE', 25.0822, 55.3164, 'seed_img_worlds', 'manual_seed', 'img worlds,theme park,tourist,city of arabia', 86, 'active'),

(145, NULL, 1, 'Dubai Outlet Mall', 'Dubai-Al Ain Road, Dubai, UAE', 25.0732, 55.3995, 'seed_dubai_outlet_mall', 'manual_seed', 'outlet mall,dubai al ain road,shopping', 78, 'active'),

(146, 9, 6, 'Expo City Dubai', 'Expo City Dubai, Dubai, UAE', 24.9609, 55.1507, 'seed_expo_city_extra', 'manual_seed', 'expo city,dubai south,event,tourist', 87, 'active'),

(147, NULL, 3, 'Dubai Investment Park', 'Dubai Investment Park, Dubai, UAE', 24.9737, 55.1801, 'seed_dip', 'manual_seed', 'dubai investment park,dip,business,industrial,residential', 76, 'active'),

(148, NULL, 3, 'Jebel Ali', 'Jebel Ali, Dubai, UAE', 24.9857, 55.0273, 'seed_jebel_ali', 'manual_seed', 'jebel ali,port,industrial,jafza', 82, 'active'),

(149, NULL, 3, 'JAFZA', 'Jebel Ali Free Zone, Dubai, UAE', 24.9890, 55.0610, 'seed_jafza', 'manual_seed', 'jafza,jebel ali free zone,industrial,free zone', 80, 'active'),

(150, NULL, 4, 'Al Furjan', 'Al Furjan, Dubai, UAE', 25.0276, 55.1443, 'seed_al_furjan', 'manual_seed', 'al furjan,residential,metro', 76, 'active'),

(151, NULL, 4, 'Discovery Gardens', 'Discovery Gardens, Dubai, UAE', 25.0394, 55.1393, 'seed_discovery_gardens', 'manual_seed', 'discovery gardens,residential,ibn battuta', 77, 'active'),

(152, NULL, 4, 'The Gardens', 'The Gardens, Dubai, UAE', 25.0466, 55.1228, 'seed_the_gardens', 'manual_seed', 'the gardens,residential,jebel ali', 73, 'active'),

(153, NULL, 1, 'Ibn Battuta Mall', 'Jebel Ali Village, Dubai, UAE', 25.0446, 55.1199, 'seed_ibn_battuta_mall', 'manual_seed', 'ibn battuta mall,shopping,jebel ali,metro', 86, 'active'),

(154, NULL, 4, 'Dubai Sports City', 'Dubai Sports City, Dubai, UAE', 25.0380, 55.2180, 'seed_dubai_sports_city', 'manual_seed', 'sports city,residential,stadium,cricket', 76, 'active'),

(155, NULL, 4, 'Motor City', 'Motor City, Dubai, UAE', 25.0469, 55.2390, 'seed_motor_city', 'manual_seed', 'motor city,residential,autodrome', 75, 'active'),

(156, NULL, 4, 'Arabian Ranches', 'Arabian Ranches, Dubai, UAE', 25.0526, 55.2708, 'seed_arabian_ranches', 'manual_seed', 'arabian ranches,residential,villas', 74, 'active'),

(157, NULL, 4, 'Dubai South', 'Dubai South, Dubai, UAE', 24.8876, 55.1614, 'seed_dubai_south', 'manual_seed', 'dubai south,residential,expo,airport', 78, 'active'),

(158, NULL, 2, 'Al Maktoum International Airport', 'Dubai World Central, Dubai, UAE', 24.8964, 55.1614, 'seed_almaktoum_airport', 'manual_seed', 'al maktoum airport,dwc,dubai south,airport', 83, 'active'),

(159, NULL, 13, 'Burj Khalifa/Dubai Mall Metro Station', 'Downtown Dubai, Dubai, UAE', 25.2013, 55.2694, 'seed_burj_khalifa_metro', 'manual_seed', 'burj khalifa metro,dubai mall metro,metro station', 88, 'active'),

(160, NULL, 13, 'Mall of the Emirates Metro Station', 'Al Barsha, Dubai, UAE', 25.1200, 55.2000, 'seed_moe_metro', 'manual_seed', 'mall of emirates metro,metro station,al barsha', 82, 'active');

-- Extra mobile search location: Ras Al Khaimah
INSERT OR IGNORE INTO locations
(location_id, area_id, category_id, name, address, latitude, longitude, external_place_id, provider_name, search_keywords, popularity_score, status)
VALUES
(161, 16, 4, 'Ras Al Khaimah City', 'Ras Al Khaimah, UAE', 25.8007, 55.9762, 'seed_ras_al_khaimah_city', 'seed', 'ras al khaimah,rak,city,uae,northern emirates', 78, 'active');
-- =========================================================
-- REAL ROUTING + MOBILE NAVIGATION SEED SUPPORT
-- =========================================================

UPDATE locations
SET
    display_name = COALESCE(display_name, name || ', ' || COALESCE(address, 'UAE')),
    city = COALESCE(
        city,
        CASE
            WHEN LOWER(name) LIKE '%sharjah%' OR LOWER(address) LIKE '%sharjah%' THEN 'Sharjah'
            WHEN LOWER(name) LIKE '%abu dhabi%' OR LOWER(address) LIKE '%abu dhabi%' OR LOWER(name) LIKE '%yas%' THEN 'Abu Dhabi'
            WHEN LOWER(name) LIKE '%ajman%' OR LOWER(address) LIKE '%ajman%' THEN 'Ajman'
            WHEN LOWER(name) LIKE '%fujairah%' OR LOWER(address) LIKE '%fujairah%' THEN 'Fujairah'
            WHEN LOWER(name) LIKE '%ras al khaimah%' OR LOWER(address) LIKE '%ras al khaimah%' THEN 'Ras Al Khaimah'
            ELSE 'Dubai'
        END
    ),
    area = COALESCE(
        area,
        (SELECT areas.name FROM areas WHERE areas.area_id = locations.area_id),
        name
    ),
    category = COALESCE(
        category,
        (SELECT location_categories.category_name FROM location_categories WHERE location_categories.category_id = locations.category_id),
        'place'
    );

UPDATE geocoding_cache
SET
    provider_place_id = COALESCE(provider_place_id, external_place_id),
    raw_response = COALESCE(raw_response, response_json);

UPDATE route_options
SET route_public_id =
    CASE route_id
        WHEN 1 THEN 'ROUTE-A'
        WHEN 2 THEN 'ROUTE-B'
        WHEN 3 THEN 'ROUTE-C'
        WHEN 4 THEN 'ROUTE-A-AIRPORT'
        WHEN 5 THEN 'ROUTE-B-AIRPORT'
        WHEN 6 THEN 'ROUTE-A-SHARJAH'
        WHEN 7 THEN 'ROUTE-D'
        ELSE 'ROUTE-' || route_id
    END;

UPDATE route_options
SET
    estimated_time_min = estimated_time_minutes,
    eta_text = CAST(estimated_time_minutes AS INTEGER) || ' min',
    distance_text = distance_km || ' km',
    traffic_delay_min =
        CASE
            WHEN congestion_score >= 8 THEN 10
            WHEN congestion_score >= 6 THEN 6
            WHEN congestion_score >= 4 THEN 4
            ELSE 2
        END,
    traffic_score = congestion_score,
    traffic_display =
        CASE
            WHEN congestion_score >= 8 THEN 'Heavy traffic • ' || congestion_score || '/10'
            WHEN congestion_score >= 6 THEN 'Moderate traffic • ' || congestion_score || '/10'
            WHEN congestion_score >= 4 THEN 'Medium traffic • ' || congestion_score || '/10'
            ELSE 'Light traffic • ' || congestion_score || '/10'
        END,
    flowsync_score = route_score,
    load_ratio =
        CASE
            WHEN road_capacity IS NOT NULL AND road_capacity > 0
            THEN ROUND((1.0 * assigned_users) / road_capacity, 2)
            ELSE 0
        END,
    load_status =
        CASE
            WHEN road_capacity IS NOT NULL AND road_capacity > 0 AND (1.0 * assigned_users) / road_capacity >= 0.75 THEN 'high'
            WHEN road_capacity IS NOT NULL AND road_capacity > 0 AND (1.0 * assigned_users) / road_capacity >= 0.45 THEN 'medium'
            ELSE 'low'
        END,
    recommendation_reason =
        CASE
            WHEN is_recommended = 1 THEN 'Recommended by FlowSync based on ETA, congestion, route load, incidents, and road capacity.'
            ELSE 'Alternative route option available for user selection.'
        END,
    in_app_navigation = 1,
    external_navigation_required = 0;

UPDATE route_steps
SET
    step_index = step_number - 1,
    distance_m = distance_meters,
    duration_min =
        CASE
            WHEN duration_seconds IS NOT NULL THEN ROUND(duration_seconds / 60.0, 1)
            ELSE NULL
        END,
    maneuver = maneuver_type;

-- Add mobile demo Route D for selected-route testing.
INSERT OR IGNORE INTO route_options
(
    route_id,
    trip_request_id,
    route_public_id,
    route_name,
    provider_name,
    external_route_id,
    estimated_time_minutes,
    estimated_time_min,
    eta_text,
    distance_km,
    distance_text,
    traffic_delay_min,
    congestion_score,
    traffic_score,
    traffic_display,
    route_score,
    flowsync_score,
    assigned_users,
    road_capacity,
    load_ratio,
    load_status,
    recommendation_reason,
    geometry_json,
    is_recommended,
    in_app_navigation,
    external_navigation_required,
    status
)
VALUES
(
    8,
    1,
    'ROUTE-D',
    'Route D - Emirates Road Alternative',
    'seed',
    'route_d_emirates_alt',
    31,
    31,
    '31 min',
    30.4,
    '30.4 km',
    3,
    3,
    3,
    'Light traffic • 3/10',
    24.7,
    24.7,
    6,
    22,
    0.27,
    'low',
    'Route D selected as a balanced alternative with lower congestion and lower route load.',
    '{"type":"LineString","source":"seed","note":"Detailed points stored in route_coordinates"}',
    0,
    1,
    0,
    'available'
);

INSERT OR IGNORE INTO route_steps
(
    route_step_id,
    route_id,
    step_number,
    step_index,
    instruction,
    distance_meters,
    distance_m,
    duration_seconds,
    duration_min,
    latitude,
    longitude,
    maneuver_type,
    maneuver
)
VALUES
(101, 8, 1, 0, 'Start from Dubai Mall and head toward the main road exit.', 1200, 1200, 180, 3, 25.1972, 55.2744, 'depart', 'depart'),
(102, 8, 2, 1, 'Continue toward Al Khail Road alternative corridor.', 5200, 5200, 420, 7, 25.1850, 55.2770, 'continue', 'continue'),
(103, 8, 3, 2, 'Follow the alternative corridor toward Dubai Marina.', 14500, 14500, 960, 16, 25.1450, 55.2350, 'continue', 'continue'),
(104, 8, 4, 3, 'Take the Dubai Marina exit.', 8200, 8200, 420, 7, 25.1000, 55.1700, 'exit', 'exit'),
(105, 8, 5, 4, 'Arrive at Dubai Marina.', 1300, 1300, 120, 2, 25.0800, 55.1400, 'arrive', 'arrive');

INSERT OR IGNORE INTO route_coordinates
(route_id, route_public_id, point_index, latitude, longitude, distance_from_start_m, provider_name)
VALUES
(8, 'ROUTE-D', 1, 25.1972, 55.2744, 0, 'seed'),
(8, 'ROUTE-D', 2, 25.1900, 55.2700, 1500, 'seed'),
(8, 'ROUTE-D', 3, 25.1850, 55.2770, 3500, 'seed'),
(8, 'ROUTE-D', 4, 25.1700, 55.2600, 6200, 'seed'),
(8, 'ROUTE-D', 5, 25.1450, 55.2350, 10500, 'seed'),
(8, 'ROUTE-D', 6, 25.1300, 55.2100, 15000, 'seed'),
(8, 'ROUTE-D', 7, 25.1100, 55.1850, 20500, 'seed'),
(8, 'ROUTE-D', 8, 25.0950, 55.1600, 25500, 'seed'),
(8, 'ROUTE-D', 9, 25.0800, 55.1400, 30400, 'seed');

INSERT OR IGNORE INTO route_scores
(route_score_id, route_id, time_score, distance_score, congestion_score, load_score, incident_score, eco_score, final_score, scoring_model_version)
VALUES
(8, 8, 31, 30.4, 3, 2, 0, 4, 24.7, 'v1');

INSERT OR IGNORE INTO route_loads
(route_load_id, route_id, active_users, road_capacity, load_percentage, load_status)
VALUES
(8, 8, 6, 22, 27.0, 'low');

INSERT OR IGNORE INTO route_assignments
(assignment_id, trip_request_id, user_id, route_id, assignment_reason, status)
VALUES
(8, 1, 1, 8, 'Route D selected by user and stored as selected route for mobile navigation.', 'assigned');

INSERT OR IGNORE INTO trip_sessions
(session_id, trip_request_id, user_id, assignment_id, selected_route_id, selected_route_public_id, status, current_step_index, started_at, ended_at)
VALUES
(8, 1, 1, 8, 8, 'ROUTE-D', 'active', 0, CURRENT_TIMESTAMP, NULL);

INSERT OR IGNORE INTO navigation_progress
(
    navigation_progress_id,
    session_id,
    current_step_index,
    latitude,
    longitude,
    speed_kmh,
    remaining_distance_km,
    remaining_time_minutes,
    remaining_time_min,
    progress_percent,
    progress_percentage,
    event_type
)
VALUES
(8, 8, 0, 25.1972, 55.2744, 0, 30.4, 31, 31, 0, 0, 'navigation_started');

UPDATE alerts
SET title = COALESCE(title, alert_type || ' alert');

UPDATE road_closures
SET
    title = COALESCE(title, 'Road closure update'),
    severity = COALESCE(severity, 'medium'),
    latitude = COALESCE(latitude, 25.2048),
    longitude = COALESCE(longitude, 55.2708);
    -- Backfill selected route public IDs for older demo trip sessions.
UPDATE trip_sessions
SET selected_route_public_id = (
    SELECT route_options.route_public_id
    FROM route_options
    WHERE route_options.route_id = trip_sessions.selected_route_id
)
WHERE selected_route_public_id IS NULL
  AND selected_route_id IS NOT NULL;