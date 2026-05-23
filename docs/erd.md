# FlowSync ER Diagram

This ERD represents the Backend Complete v1 database target for the final FlowSync smart mobility app.

It supports:

- users/auth
- locations/search
- saved places
- trip sessions
- route assignments
- route steps
- navigation events
- alerts
- parking data
- IoT sensor data
- background jobs
- trip lifecycle records

```mermaid
erDiagram
    AUTH_USERS ||--o{ AUTH_SESSIONS : owns
    AUTH_USERS ||--o{ SAVED_PLACES : saves
    AUTH_USERS ||--|| USER_PREFERENCES : configures
    AUTH_USERS ||--o{ TRIP_REQUESTS : creates
    AUTH_USERS ||--o{ TRIP_SESSIONS : starts
    AUTH_USERS ||--o{ ROUTE_ASSIGNMENTS : receives

    LOCATIONS ||--o{ SAVED_PLACES : referenced_by
    LOCATIONS ||--o{ PARKING_SENSOR_READINGS : has
    LOCATIONS ||--o{ ALERTS : receives

    TRIP_REQUESTS ||--o{ ROUTE_OPTIONS : generates
    ROUTE_OPTIONS ||--o{ ROUTE_ASSIGNMENTS : assigned_as
    ROUTE_OPTIONS ||--o{ ROUTE_STEPS : has
    ROUTE_OPTIONS ||--o{ TRIP_SESSIONS : selected_for

    TRIP_SESSIONS ||--o{ NAVIGATION_EVENTS : records
    TRIP_SESSIONS ||--o{ TRIP_LIFECYCLE_RECORDS : tracks
    TRIP_SESSIONS ||--o{ TRIP_ANALYTICS : produces

    ROAD_SEGMENTS ||--o{ TRAFFIC_SENSOR_READINGS : reports
    ROAD_SEGMENTS ||--o{ ALERTS : affects

    ROUTE_ASSIGNMENTS ||--o{ TRIP_ANALYTICS : produces

    AUTH_USERS {
        int user_id PK
        string name
        string email
        string password_hash
        string role
        string vehicle_type
        int is_active
        datetime created_at
        datetime updated_at
    }

    AUTH_SESSIONS {
        int session_id PK
        int user_id FK
        string token_hash
        datetime issued_at
        datetime expires_at
        datetime revoked_at
    }

    LOCATIONS {
        int location_id PK
        string name
        string address
        float latitude
        float longitude
        string category
        datetime created_at
    }

    SAVED_PLACES {
        int saved_place_id PK
        int user_id FK
        string label
        int location_id FK
        datetime created_at
    }

    USER_PREFERENCES {
        int preference_id PK
        int user_id FK
        string preferred_route_mode
        int avoid_tolls
        int eco_mode
        string parking_preference
        datetime updated_at
    }

    TRIP_REQUESTS {
        int request_id PK
        int user_id FK
        string start_location
        string destination
        float start_lat
        float start_lng
        float dest_lat
        float dest_lng
        datetime request_time
        string status
    }

    ROUTE_OPTIONS {
        int route_id PK
        int request_id FK
        string route_name
        float estimated_time
        float distance_km
        float congestion_score
        int assigned_users
        float route_score
        string geometry_json
        int is_recommended
        datetime created_at
    }

    ROUTE_ASSIGNMENTS {
        int assignment_id PK
        int user_id FK
        int route_id FK
        datetime assigned_time
        string assignment_reason
    }

    TRIP_SESSIONS {
        int trip_id PK
        int user_id FK
        int request_id FK
        string start_location
        string destination
        int selected_route_id FK
        string status
        datetime started_at
        datetime ended_at
    }

    TRIP_LIFECYCLE_RECORDS {
        int lifecycle_id PK
        int trip_id FK
        string status
        string event_message
        datetime recorded_at
    }

    ROUTE_STEPS {
        int step_id PK
        int route_id FK
        int step_number
        string instruction
        float distance
        float duration
        string maneuver_type
    }

    NAVIGATION_EVENTS {
        int event_id PK
        int trip_id FK
        string event_type
        float latitude
        float longitude
        float speed
        string message
        datetime created_at
    }

    ROAD_SEGMENTS {
        int segment_id PK
        string road_name
        string area
        float max_capacity
    }

    TRAFFIC_SENSOR_READINGS {
        int reading_id PK
        int segment_id FK
        string road_name
        string zone
        int vehicle_count
        float avg_speed
        float congestion_level
        string source
        datetime recorded_at
    }

    PARKING_SENSOR_READINGS {
        int parking_reading_id PK
        int location_id FK
        string zone
        int total_spaces
        int available_spaces
        float occupancy_rate
        string source
        datetime recorded_at
    }

    ALERTS {
        int alert_id PK
        string alert_type
        string message
        string zone
        string severity
        float latitude
        float longitude
        int segment_id FK
        int location_id FK
        datetime timestamp
    }

    BACKGROUND_JOB_RUNS {
        int job_run_id PK
        string job_name
        string status
        datetime started_at
        datetime ended_at
        int records_processed
        string error_message
    }

    TRIP_ANALYTICS {
        int analytics_id PK
        int assignment_id FK
        int trip_id FK
        float estimated_time_saved
        float fuel_saved
        float congestion_reduction
        float emissions_reduction
        datetime created_at
    }
```

## Entity Explanation

### Users/Auth

`auth_users` stores authenticated users, roles, vehicle type, and account status. `auth_sessions` stores session/token records for login tracking.

### Locations/Search

`locations` stores searchable Dubai places used by the frontend trip form and map search.

Seeded locations include Dubai Mall, Dubai Marina, Downtown Dubai, Business Bay, DXB Airport, Jumeirah, Sharjah, and Academic City.

### Saved Places

`saved_places` stores user shortcuts such as Home, Work, University, and Airport.

### Trip Sessions

`trip_sessions` represents active or completed navigation sessions. It connects a user to a selected route and stores trip status.

### Route Assignments

`route_assignments` stores which route was assigned to a user and why FlowSync recommended it.

### Route Steps

`route_steps` stores turn-by-turn instructions for route guidance.

### Navigation Events

`navigation_events` stores live trip events such as location updates, reroutes, speed updates, and arrival events.

### Alerts

`alerts` stores Waze-style alerts such as traffic, accident, roadwork, congestion, and airport delay messages.

### Parking Data

`parking_sensor_readings` stores simulated or real parking availability near important locations.

### IoT Sensor Data

`traffic_sensor_readings` stores simulated or real traffic sensor readings such as vehicle count, average speed, and congestion level.

### Background Jobs

`background_job_runs` stores backend job history for scheduled syncs, analytics updates, database backups, and sensor refresh tasks.

### Trip Lifecycle Records

`trip_lifecycle_records` stores the history of trip status changes from requested to active, completed, cancelled, or rerouted.