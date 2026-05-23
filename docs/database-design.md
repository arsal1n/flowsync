# FlowSync Final Database Design

## 1. Overview

The FlowSync database is designed as the final foundation for a commercial-style smart mobility app.

It supports:

- user login and roles
- UAE-wide location search
- public map API caching
- trip requests
- route options
- route scoring
- adaptive route distribution
- live navigation progress
- traffic and incident tracking
- alerts and notifications
- dashboard analytics
- parking prediction support
- admin/system monitoring
- future mobile app and AI expansion

The local development database uses SQLite, while the future production target can use PostgreSQL through `DATABASE_URL`.

---

## 2. Database File Locations

Final database schema:

```text
backend/database/schema.sql
```

Final seed data:

```text
backend/database/seed.sql
```

Database reset helper:

```text
backend/database/reset_db.py
```

Database seed helper:

```text
backend/database/seed_db.py
```

Sample queries:

```text
backend/database/sample_queries.sql
```

Generated local SQLite database:

```text
backend/flowsync.db
```

The generated database file should not be committed.

---

## 3. User/Auth Module

Tables:

```text
roles
users
user_profiles
vehicles
user_preferences
saved_places
login_sessions
refresh_tokens
audit_logs
```

Purpose:

This module supports drivers, admins, operators, emergency users, login sessions, user preferences, saved places, vehicles, and auditing.

Important relationships:

- `users.role_id` references `roles.role_id`
- `user_profiles.user_id` references `users.user_id`
- `vehicles.user_id` references `users.user_id`
- `user_preferences.user_id` references `users.user_id`
- `saved_places.user_id` references `users.user_id`
- `login_sessions.user_id` references `users.user_id`
- `refresh_tokens.user_id` references `users.user_id`

Demo users included in seed data:

```text
driver@flowsync.local
admin@flowsync.local
operator@flowsync.local
emergency@flowsync.local
```

Demo password reference:

```text
flowsync123
```

---

## 4. UAE Location/Search Module

Tables:

```text
emirates
cities
areas
location_categories
locations
popular_places
geocoding_cache
map_provider_cache
search_history
```

Purpose:

This module allows FlowSync to support searchable UAE locations instead of hard-coded frontend-only locations.

The app can search by:

- location name
- emirate
- city
- area
- category
- keywords
- popular places

The `locations` table includes:

```text
external_place_id
provider_name
search_keywords
latitude
longitude
```

This makes the database ready for future imports from public map APIs such as OpenStreetMap, OpenRouteService, Google Maps API, or Mapbox.

---

## 5. Public Maps API Cache Support

FlowSync will use public map/routing APIs through the backend.

The database does not call the APIs directly. It stores provider results so repeated searches and route requests can be reused.

Relevant tables:

```text
geocoding_cache
map_provider_cache
locations
```

Flow:

```text
User searches location
→ backend checks locations table
→ backend checks geocoding_cache
→ if missing, backend can call public map API
→ API result is stored in map_provider_cache/geocoding_cache
→ future requests reuse cached data
```

Important columns:

```text
locations.external_place_id
locations.provider_name
locations.search_keywords
geocoding_cache.provider_name
map_provider_cache.provider_name
map_provider_cache.request_hash
map_provider_cache.response_json
map_provider_cache.expires_at
```

This allows FlowSync to later support thousands of UAE places without redesigning the database.

---

## 6. Road/Map/Traffic Module

Tables:

```text
road_segments
intersections
route_segment_mapping
traffic_snapshots
congestion_history
road_incidents
road_closures
speed_limits
traffic_signals
toll_gates
```

Purpose:

This module stores road network data, traffic levels, congestion history, road closures, incidents, speed limits, traffic signals, and toll gates.

This supports:

- route scoring
- congestion analysis
- incident-aware routing
- dashboard traffic monitoring
- road load estimation

Important relationships:

- `traffic_snapshots.road_segment_id` references `road_segments.road_segment_id`
- `congestion_history.road_segment_id` references `road_segments.road_segment_id`
- `road_incidents.road_segment_id` references `road_segments.road_segment_id`
- `road_closures.road_segment_id` references `road_segments.road_segment_id`
- `speed_limits.road_segment_id` references `road_segments.road_segment_id`

---

## 7. Trip/Routing Module

Tables:

```text
trip_requests
route_options
route_steps
route_segments
route_assignments
trip_sessions
navigation_progress
trip_status_history
trip_feedback
```

Purpose:

This module supports the full trip lifecycle.

Trip flow:

```text
User requests trip
→ backend creates trip_request
→ route options are generated
→ route scores are calculated
→ best route is assigned
→ trip session starts
→ navigation progress updates
→ trip ends
→ feedback and analytics are saved
```

Important relationships:

- `trip_requests.user_id` references `users.user_id`
- `route_options.trip_request_id` references `trip_requests.trip_request_id`
- `route_steps.route_id` references `route_options.route_id`
- `route_segments.route_id` references `route_options.route_id`
- `route_assignments.trip_request_id` references `trip_requests.trip_request_id`
- `trip_sessions.trip_request_id` references `trip_requests.trip_request_id`
- `navigation_progress.session_id` references `trip_sessions.session_id`

---

## 8. FlowSync Route Distribution Module

Tables:

```text
route_loads
route_scores
distribution_decisions
assignment_reasons
route_balancing_rules
route_demand_history
```

Purpose:

This module supports FlowSync’s core innovation: adaptive route distribution.

FlowSync does not simply choose the fastest route. It compares travel time, congestion, incidents, road load, route demand, and user distribution.

Example decision:

```text
Route B selected because Route A is faster but currently overloaded and has high congestion.
```

Important data stored:

- route load
- route score
- selected route
- fastest route
- overloaded route
- decision reason
- route demand history
- balancing rule weights

This allows FlowSync to explain why a route was recommended.

---

## 9. Route Learning and History Support

FlowSync learns from past trips by storing route history and route performance.

Relevant tables:

```text
route_demand_history
route_performance
congestion_history
navigation_progress
trip_feedback
distribution_decisions
route_scores
route_loads
trip_analytics
daily_summary_stats
```

Learning flow:

```text
User requests trip
→ route options are scored
→ distribution decision is saved
→ route assignment is saved
→ trip session starts
→ navigation progress is tracked
→ trip feedback is saved
→ dashboard analytics are updated
→ future route decisions can use historical data
```

This supports future AI prediction features.

---

## 10. Dashboard/Analytics Module

Tables:

```text
trip_analytics
route_performance
congestion_analytics
fuel_saving_estimates
emissions_saving_estimates
system_metrics
daily_summary_stats
```

Purpose:

This module gives the dashboard real-looking analytics.

Dashboard can show:

- total trips
- active trips
- completed trips
- route distribution
- traffic level
- congestion reduction
- average travel time
- fuel saved
- CO2 saved
- incidents
- route performance
- busiest roads/areas
- parking status

---

## 11. Alerts/Notification Module

Tables:

```text
alerts
user_notifications
emergency_vehicles
emergency_routes
incident_updates
notification_preferences
```

Purpose:

This module supports Waze-style alerts and emergency routing.

It supports:

- accident alerts
- congestion alerts
- road closure alerts
- roadwork alerts
- rerouting alerts
- emergency vehicle priority routing
- user notification preferences

---

## 12. Parking/Future Scope Module

Tables:

```text
parking_zones
parking_spots
parking_availability
parking_predictions
parking_booking_history
```

Purpose:

Parking prediction is future scope, but the database is ready for it.

It supports:

- parking zones
- parking spots
- parking availability
- prediction probability
- estimated wait time
- walking distance
- safety score
- difficulty score
- parking booking history

---

## 13. Admin/System Module

Tables:

```text
admin_actions
system_settings
api_logs
error_logs
data_import_logs
feature_flags
```

Purpose:

This module supports admin monitoring, debugging, feature control, logs, and future deployment readiness.

It supports:

- admin action tracking
- API request logs
- error logs
- data import logs
- system settings
- feature flags

---

## 14. Seed Data Included

The seed data includes:

- roles
- demo users
- vehicles
- preferences
- all 7 UAE emirates
- cities
- areas
- location categories
- major UAE locations
- popular places
- saved places
- geocoding cache
- map provider cache
- roads
- traffic snapshots
- congestion history
- incidents
- road closures
- speed limits
- toll gates
- trip requests
- route options
- route steps
- route assignments
- route scores
- distribution decisions
- trip sessions
- navigation progress
- analytics
- alerts
- notifications
- emergency vehicle data
- parking zones
- parking predictions
- system settings
- feature flags
- logs

---

## 15. Backend API Support

The database is designed to support backend APIs for:

```text
auth
users
vehicles
locations
saved places
trips
routes
navigation
traffic
incidents
alerts
dashboard
parking
admin
system logs
```

Frontend and maps should not directly edit the database file.

Correct flow:

```text
Frontend → FastAPI Backend → Database
Maps → FastAPI Backend → Database
```

Incorrect flow:

```text
Frontend → SQLite file
Maps → SQLite file
Manual database editing
```

---

## 16. Production Readiness

Local mode:

```text
backend/flowsync.db
```

Future production target:

```text
DATABASE_URL=postgresql://user:password@host:5432/flowsync
```

SQLite is used for local development and classroom testing. PostgreSQL migration, hosted database setup, cloud backups, and production migrations are future deployment tasks.

---

## 17. Important Git Rule

Do not commit generated files:

```text
backend/flowsync.db
backend/venv/
backend/__pycache__/
backend/backups/
backend/tests/__pycache__/
```

Commit only database source/design files:

```text
backend/database/schema.sql
backend/database/seed.sql
backend/database/reset_db.py
backend/database/seed_db.py
backend/database/sample_queries.sql
docs/database-design.md
docs/database-progress.md
```
---

## Real Routing and Mobile Navigation Support

The database now supports the final mobile routing contract needed by the backend, maps, and mobile frontend.

### Location Search Support

The `locations` table supports mobile search response fields:

```text
name
display_name
latitude
longitude
city
area
category
provider_name
external_place_id
search_keywords