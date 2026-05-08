# FlowSync Backend API Documentation

## Backend Version

FlowSync Smart Mobility Backend API  
Version: 1.0.1

## Base URL

```text
http://127.0.0.1:8000
```

Swagger documentation:

```text
http://127.0.0.1:8000/docs
```

## Run Backend

From project root:

```powershell
cd backend
.\venv\Scripts\python.exe -m uvicorn main:app --reload
```

If the local SQLite database causes old schema issues:

```powershell
Remove-Item backend\flowsync.db -Force -ErrorAction SilentlyContinue
```

Then restart backend.

---

# Backend Overview

The FlowSync backend is a FastAPI smart mobility platform.

It currently supports:

- Adaptive route distribution
- Hyperlocal smart routing
- Route fairness and road capacity scoring
- AI prediction endpoints
- IoT sensor endpoints
- Smart parking prediction
- Admin / police control dashboard
- Emergency priority routing
- Event traffic simulation
- Safety intelligence
- Sustainability metrics
- Crowd-sourced reports
- Digital twin simulation
- Ride-sharing matching
- User personalization
- Demo reset and seed tools
- Navigation support for frontend maps

---

# 1. System Endpoints

## GET /

Checks whether the backend is running.

### Response Example

```json
{
  "message": "FlowSync smart mobility backend is running",
  "version": "1.0.1",
  "database": "SQLite connected",
  "platform": "Smart-city traffic intelligence system",
  "navigation_support": "enabled"
}
```

Frontend use:

- Show backend status
- Show backend version
- Confirm database connection
- Confirm navigation support

---

## GET /api/features

Returns all 30 FlowSync smart mobility features.

### Response Includes

```json
{
  "total_features": 30,
  "features": [
    "Adaptive Route Distribution",
    "Hyperlocal Smart Routing",
    "AI-Driven Decision Making",
    "Historical Traffic Prediction",
    "IoT Sensor Integration",
    "Smart Mobility Mobile App",
    "Police / Government Control Dashboard",
    "Emergency Priority Routing",
    "Cooperative Driver Alert System",
    "Intelligent Parking Prediction",
    "Smart Parking Flow Balancing",
    "Smart Event Traffic Management",
    "AI Incident Detection",
    "AI Weather-Aware Routing",
    "Green Mobility Optimization",
    "Dynamic Fuel Optimization Engine",
    "Driver Behavior Intelligence",
    "AI Route Fairness Engine",
    "Real-Time Road Capacity Monitoring",
    "AI Accident Probability Prediction",
    "Emergency Crowd Clearing System",
    "AI Convoy Mode",
    "VIP / Critical Personnel Routing",
    "Crowd-Sourced Road Intelligence",
    "Digital Twin City Simulation",
    "Smart School Zone Protection",
    "Smart Construction Zone Management",
    "Urban Stress Index",
    "Smart Ride-Sharing Fusion",
    "Smart Commute Scheduling"
  ]
}
```

Frontend use:

- Feature showcase page
- Presentation feature list
- Landing page feature cards

---

# 2. Demo Tools

Demo tools help prepare clean data before a teacher presentation.

## GET /api/demo/status

Shows current demo database status.

Response includes:

- dashboard data
- route loads
- recent trips
- latest sensor readings
- driver alerts
- events
- incidents
- reports
- parking zones
- emergency vehicles
- table counts

Frontend/admin use:

- Show current demo state
- Confirm data exists before demo

---

## POST /api/demo/reset

Clears demo data and resets demo tables.

Use this before starting a clean demo.

Frontend/admin use:

- Reset backend to clean state
- Remove old test data

---

## POST /api/demo/seed

Adds clean sample demo data.

Seeded data includes:

- trips
- route assignments
- traffic sensor readings
- parking sensor readings
- driver alerts
- event simulation record
- admin action
- user road report
- parking zones
- emergency vehicles

Recommended demo flow:

1. `POST /api/demo/reset`
2. `POST /api/demo/seed`
3. `GET /api/demo/status`
4. `GET /api/dashboard`
5. `GET /api/admin/dashboard`
6. `GET /api/trips`
7. `GET /api/alerts/driver`

---

# 3. Location Search / Autocomplete

## GET /api/locations/search

Searches locations for frontend autocomplete.

### Query Parameter

```text
q
```

### Example

```text
/api/locations/search?q=dubai
```

### Response Example

```json
{
  "query": "dubai",
  "results": [
    {
      "name": "Dubai Mall",
      "address": "Downtown Dubai",
      "lat": 25.1972,
      "lng": 55.2744,
      "type": "mall"
    },
    {
      "name": "Dubai Marina",
      "address": "Dubai Marina",
      "lat": 25.08,
      "lng": 55.14,
      "type": "district"
    }
  ],
  "count": 2
}
```

Frontend use:

- Search bar autocomplete
- Destination dropdown
- Start location dropdown
- Map marker placement

---

# 4. Adaptive Routing Endpoints

## POST /api/routes/recommend

Main FlowSync route recommendation endpoint.

It accepts a trip request, scores multiple routes, recommends the best route, and saves the trip assignment to SQLite.

### Request Body

```json
{
  "start_location": "Dubai Mall",
  "destination": "Dubai Marina",
  "vehicle_type": "car",
  "route_preference": "balanced",
  "user_role": "driver"
}
```

### Supported Route Preferences

```text
balanced
fastest
eco
cheapest
low_stress
```

### Supported User Roles

```text
driver
ambulance
police
fire_truck
rta_operator
vip
```

### Response Includes

```json
{
  "start_location": "Dubai Mall",
  "destination": "Dubai Marina",
  "route_preference": "balanced",
  "user_role": "driver",
  "routing_mode": "adaptive_distribution",
  "recommended_route": {
    "route_name": "Route B - Al Khail Road",
    "estimated_time": 26,
    "distance_km": 16.2,
    "congestion_score": 4,
    "road_capacity": 15,
    "route_type": "arterial_road",
    "assigned_users": 0,
    "route_score": 41.9,
    "capacity_ratio": 0,
    "fairness_penalty": 3,
    "coordinates": [
      {
        "lat": 25.1972,
        "lng": 55.2744
      }
    ],
    "polyline": [
      {
        "lat": 25.1972,
        "lng": 55.2744
      }
    ],
    "turn_steps": [],
    "turn_by_turn_steps": [],
    "alerts": [],
    "incidents": []
  },
  "all_routes": [],
  "vehicle_type": "car",
  "database_record": {
    "request_id": 1,
    "assignment_id": 1
  }
}
```

Frontend should display:

- recommended route name
- estimated time
- distance
- congestion score
- route score
- assigned users
- road capacity
- route type
- route coordinates on map
- route polyline
- turn-by-turn steps
- alerts
- incidents
- all route options

---

## GET /api/routes/load

Returns route load and road capacity.

Frontend should display:

- route name
- assigned users
- road capacity
- capacity ratio
- load status

---

## GET /api/routes/options

Returns available route options and recommended route.

### Query Parameters

```text
start_location
destination
route_preference
```

### Example

```text
/api/routes/options?start_location=Dubai Mall&destination=Dubai Marina&route_preference=balanced
```

Frontend use:

- Route cards
- Route comparison screen
- Map route options

---

## GET /api/routes/fairness

Explains FlowSync route fairness logic.

Frontend use:

- Admin dashboard fairness card
- Presentation explanation
- Route fairness status

---

## POST /api/routes/simulate

Simulates adaptive route distribution for many drivers.

### Request Body

```json
{
  "total_drivers": 100,
  "start_location": "Concert Venue",
  "destination": "City Exit Routes",
  "route_preference": "balanced"
}
```

### Response Includes

```json
{
  "total_drivers_simulated": 100,
  "distribution": {
    "Route A - Sheikh Zayed Road": 27,
    "Route B - Al Khail Road": 26,
    "Route C - Business Bay Side Streets": 23,
    "Route D - Jumeirah Coastal Alternative": 24
  },
  "estimated_congestion_reduction": "24%"
}
```

Frontend should display:

- route distribution chart
- event/concert simulation result
- congestion reduction percentage
- sample assigned routes

---

## GET /api/routes/{route_mode}

Returns route based on selected route mode.

Valid route modes:

```text
fastest
balanced
eco
cheapest
low_stress
```

Example:

```text
/api/routes/eco
```

---

# 5. Navigation Session Endpoints

These endpoints support the frontend navigation flow:

User searches destination → selects destination → map updates → route options show → user starts navigation → turn-by-turn UI appears.

---

## POST /api/trips/start

Starts a navigation session.

### Request Body

```json
{
  "start_location": "Dubai Mall",
  "destination": "Dubai Marina",
  "vehicle_type": "car",
  "route_preference": "balanced",
  "user_role": "driver",
  "route_name": null,
  "user_id": "demo-driver"
}
```

`route_name` is optional. If frontend sends it, backend starts navigation using that selected route. If not, backend uses the recommended route.

### Response Includes

```json
{
  "message": "Navigation session started.",
  "session": {
    "session_id": "NAV-ABC123",
    "user_id": "demo-driver",
    "status": "active",
    "start_location": "Dubai Mall",
    "destination": "Dubai Marina",
    "vehicle_type": "car",
    "route_preference": "balanced",
    "user_role": "driver",
    "selected_route": {},
    "started_time": "2026-05-08T10:00:00",
    "ended_time": null,
    "live_navigation": {
      "current_step_index": 0,
      "next_instruction": "Start from Dubai Mall and head toward Business Bay crossing.",
      "remaining_steps": [],
      "route_coordinates": [],
      "polyline": [],
      "alerts": [],
      "incidents": []
    }
  }
}
```

Frontend should display:

- active session ID
- selected route
- current turn instruction
- remaining turn steps
- route polyline
- alerts
- incidents
- navigation status

---

## GET /api/trips/active

Returns active navigation sessions.

Frontend/admin use:

- Show active users
- Show ongoing trips
- Control-room active navigation view

---

## POST /api/trips/end

Ends a navigation session.

### Request Body

```json
{
  "session_id": "NAV-ABC123",
  "status": "completed"
}
```

Supported statuses:

```text
completed
cancelled
interrupted
```

Frontend use:

- Stop navigation
- End trip summary
- Clear active navigation UI

---

# 6. Dashboard Endpoints

## GET /api/dashboard

Returns main dashboard statistics.

Frontend should display:

- total trip requests
- route distribution
- route loads
- estimated congestion reduction
- average time saved
- fuel saved estimate
- system status

---

## GET /api/trips

Returns recent saved trip requests.

Frontend should display:

- start location
- destination
- vehicle type
- route preference
- user role
- assigned route
- estimated time
- route score
- request time

---

# 7. Mobile App Endpoints

## GET /api/mobile/home

Returns mobile app quick actions.

### Example

```text
/api/mobile/home?user_id=demo-driver
```

Frontend should display:

- Find FlowSync Route
- Check Parking
- Report Road Issue
- View Alerts

---

## GET /api/alerts/driver

Returns latest driver alerts.

Frontend should display:

- alert type
- message
- zone
- severity
- created time

---

## POST /api/alerts/create

Creates a driver alert.

### Request Body

```json
{
  "alert_type": "congestion",
  "message": "Heavy congestion ahead near Business Bay.",
  "zone_name": "Business Bay",
  "severity": "medium"
}
```

---

# 8. AI Prediction Endpoints

## GET /api/ai/congestion-prediction

Predicts congestion risk.

### Example

```text
/api/ai/congestion-prediction?start_location=Dubai&destination=Sharjah&time_of_day=17:00
```

Returns:

- predicted congestion risk
- prediction level
- reason
- recommended action

---

## GET /api/ai/departure-suggestion

Suggests better departure time.

### Example

```text
/api/ai/departure-suggestion?route_name=Dubai to Sharjah
```

---

## GET /api/ai/weather-risk

Returns weather risk.

### Example

```text
/api/ai/weather-risk?area=Dubai
```

---

## GET /api/ai/accident-risk

Returns accident probability.

### Example

```text
/api/ai/accident-risk?area=Dubai
```

---

# 9. IoT Sensor Endpoints

## POST /api/sensors/traffic

Saves traffic sensor data.

### Request Body

```json
{
  "sensor_type": "traffic",
  "zone_name": "Sheikh Zayed Road",
  "vehicle_count": 920,
  "average_speed": 38,
  "congestion_level": 8.2,
  "parking_occupancy": 0,
  "road_capacity_score": 78
}
```

---

## POST /api/sensors/parking

Saves parking sensor data.

### Request Body

```json
{
  "sensor_type": "parking",
  "zone_name": "Dubai Mall",
  "vehicle_count": 0,
  "average_speed": 0,
  "congestion_level": 0,
  "parking_occupancy": 78,
  "road_capacity_score": 0
}
```

---

## GET /api/sensors/latest

Returns latest sensor readings.

---

## GET /api/zones/density

Returns zone density based on latest sensor readings.

---

# 10. Parking Endpoints

## GET /api/parking/predict

Predicts parking availability near selected destination.

### Example

```text
/api/parking/predict?destination=Dubai Mall
```

Returns:

- best parking zone
- parking predictions
- availability probability
- estimated wait time
- walking distance
- safety score
- difficulty score

Frontend should display:

- parking recommendation card
- parking probability
- best parking option
- alternative parking zones

---

## GET /api/parking/zones

Returns parking zones and parking balancing data.

---

## GET /api/parking/balance

Returns smart parking balancing strategy.

---

# 11. Admin Control Room Endpoints

## GET /api/admin/dashboard

Returns smart city control room dashboard.

Frontend should display:

- route loads
- sensor readings
- latest incidents
- latest reports
- urban stress index
- control actions
- parking data
- emergency data

---

## POST /api/admin/road-closure

Creates road closure action.

### Request Body

```json
{
  "target_area": "Business Bay",
  "description": "Temporary road closure due to accident."
}
```

---

## POST /api/admin/reroute-zone

Creates rerouting action.

### Request Body

```json
{
  "target_area": "Downtown Dubai",
  "description": "Reroute vehicles away from overloaded roads."
}
```

---

## POST /api/admin/no-entry-zone

Creates no-entry zone action.

### Request Body

```json
{
  "target_area": "Event Exit Gate A",
  "description": "Temporary no-entry zone after concert."
}
```

---

## GET /api/admin/urban-stress

Returns urban stress index.

---

# 12. Emergency Routing Endpoints

## POST /api/emergency/route

Creates emergency priority route.

### Request Body

```json
{
  "start_location": "Downtown Dubai",
  "destination": "Rashid Hospital",
  "emergency_type": "ambulance"
}
```

Frontend should display:

- emergency route
- fastest route
- emergency mode
- driver alert
- control room status
- route polyline
- turn instructions

---

## GET /api/emergency/vehicles

Returns emergency vehicle units.

---

## POST /api/emergency/clear-corridor

Creates emergency corridor alert.

### Request Body

```json
{
  "area": "Business Bay",
  "emergency_type": "ambulance"
}
```

---

## POST /api/emergency/convoy

Creates convoy route.

### Request Body

```json
{
  "start_location": "Police HQ",
  "destination": "Dubai Airport",
  "emergency_type": "police"
}
```

---

## POST /api/priority/vip-route

Creates VIP priority route.

### Request Body

```json
{
  "start_location": "Downtown Dubai",
  "destination": "Dubai Airport",
  "emergency_type": "vip"
}
```

---

# 13. Event Endpoints

## POST /api/events/simulate

Simulates event traffic.

### Request Body

```json
{
  "event_name": "Concert Exit Simulation",
  "location": "Dubai Arena",
  "total_drivers": 100,
  "event_time": "17:00"
}
```

Frontend should display:

- event name
- location
- event time
- route distribution
- congestion reduction
- sample assignments

---

## GET /api/events/list

Returns saved event simulations.

---

# 14. Safety Endpoints

## GET /api/safety/overview

Returns:

- latest incidents
- school zones
- construction zones
- accident risk

---

## GET /api/safety/accident-risk

Returns accident risk by area.

### Example

```text
/api/safety/accident-risk?area=Dubai
```

---

# 15. Sustainability Endpoints

## GET /api/sustainability/metrics

Returns:

- fuel saved
- CO2 saved
- idle time reduced
- eco route support
- available route modes

---

## GET /api/sustainability/eco-route

Returns eco route recommendation.

### Example

```text
/api/sustainability/eco-route?start_location=Dubai Mall&destination=Dubai Marina
```

---

# 16. Crowd Report Endpoints

## POST /api/reports/create

Creates user road report.

### Request Body

```json
{
  "report_type": "accident",
  "location": "Business Bay",
  "description": "Minor accident near exit road."
}
```

---

## GET /api/reports/latest

Returns latest user road reports.

---

# 17. Digital Twin Endpoints

## POST /api/digital-twin/simulate

Runs digital twin city simulation.

### Request Body

```json
{
  "scenario_type": "event_traffic",
  "area": "Downtown Dubai",
  "total_vehicles": 500
}
```

Frontend should display:

- scenario type
- area
- total vehicles
- predicted congestion change
- recommended action
- digital twin outputs

---

# 18. Ride Sharing Endpoints

## POST /api/rideshare/match

Finds ride-sharing matches.

### Request Body

```json
{
  "start_location": "Dubai Mall",
  "destination": "Dubai Marina",
  "passengers": 1
}
```

Frontend should display:

- suggested matches
- pickup point
- destination similarity
- estimated vehicle reduction

---

# 19. User Personalization Endpoints

## GET /api/users/preferences

Returns user route preferences.

### Example

```text
/api/users/preferences?user_id=demo-driver
```

---

## POST /api/users/preferences

Updates user preferences.

### Request Body

```json
{
  "user_id": "demo-driver",
  "preferences": {
    "preferred_route_mode": "eco",
    "avoid_tolls": true,
    "parking_preference": "safe_and_close"
  }
}
```

---

# Recommended Frontend Navigation Flow

1. User opens route screen.
2. Frontend calls `GET /api/locations/search?q=dubai`.
3. User selects start and destination.
4. Frontend calls `POST /api/routes/recommend`.
5. Frontend shows route cards.
6. Frontend draws route polyline on map.
7. User selects a route.
8. Frontend calls `POST /api/trips/start`.
9. Frontend shows turn-by-turn navigation UI.
10. Frontend shows alerts and incidents.
11. User ends trip.
12. Frontend calls `POST /api/trips/end`.

---

# Recommended Teacher Demo Order

1. `GET /`
2. `GET /api/features`
3. `POST /api/demo/reset`
4. `POST /api/demo/seed`
5. `GET /api/demo/status`
6. `GET /api/locations/search?q=dubai`
7. `POST /api/routes/recommend`
8. `POST /api/trips/start`
9. `GET /api/trips/active`
10. `POST /api/trips/end`
11. `GET /api/dashboard`
12. `GET /api/admin/dashboard`
13. `POST /api/emergency/route`
14. `GET /api/parking/predict`
15. `GET /api/ai/congestion-prediction`
16. `POST /api/digital-twin/simulate`

---

# Current Limitations

The current backend is functional for demo and frontend integration, but still uses mock smart-city data.

Production upgrades needed:

- Real map/routing API
- Real geocoding/autocomplete API
- Real traffic API
- Real IoT sensor feed
- Persistent navigation sessions in database
- Authentication and user accounts
- Role-based access control
- PostgreSQL production database
- Real AI/ML prediction models
- Real parking provider integration
- Background jobs for live updates
- WebSocket/SSE live navigation updates
- Testing suite
- Deployment configuration

---

# Role-Based Access Control

The backend now protects sensitive endpoints using Bearer token authentication.

## Protected Endpoint Groups

### Admin / RTA only

Required roles:

```text
admin
rta_operator

---

# Next Backend Development Target

The next backend goal is to move from demo-ready backend to fully functional backend.

Priority order:

1. Persist navigation sessions into SQLite instead of memory.
2. Add locations table and searchable saved locations.
3. Add real database-backed trip lifecycle.
4. Add proper response schemas.
5. Add API error handling and validation.
6. Add automated endpoint smoke tests.
7. Add authentication and user roles.
8. Integrate real routing/geocoding API.
9. Add WebSocket or polling support for live navigation.
10. Prepare deployment setup.

---

# Real Routing Provider Foundation

The backend now has a provider-ready routing and geocoding foundation.

Current mode:

- Routing provider: mock fallback
- Geocoding provider: SQLite locations table
- Real provider integration: prepared but not enabled yet

## Environment Variables

```text
FLOWSYNC_ENV=local
FLOWSYNC_ROUTING_PROVIDER=mock
FLOWSYNC_GEOCODING_PROVIDER=sqlite
FLOWSYNC_ROUTING_API_KEY=
FLOWSYNC_GEOCODING_API_KEY=
FLOWSYNC_ROUTING_BASE_URL=
FLOWSYNC_GEOCODING_BASE_URL=
FLOWSYNC_MOCK_FALLBACK=true

---

# Live Updates

The backend now supports polling-based live updates for frontend, mobile, admin control room, navigation, and emergency dashboards.

## GET /api/live/system

Returns live backend system status.

Includes:

- backend status
- provider status
- active navigation session count
- active trip count
- completed trip count
- recommended polling interval

## GET /api/live/dashboard

Returns live dashboard data for frontend refresh.

Includes:

- main dashboard stats
- route loads
- active navigation sessions
- trip lifecycle dashboard
- latest sensor readings
- driver alerts

## GET /api/live/navigation

Returns live active navigation sessions.

Frontend use:

- active trip map
- user navigation status
- driver progress tracking

## GET /api/live/navigation/{session_id}

Returns live status for one navigation session.

Frontend use:

- turn-by-turn refresh
- current instruction
- remaining steps
- route alerts
- route incidents

## GET /api/live/admin

Protected endpoint.

Required roles:

```text
admin
rta_operator

---

# Background Jobs

The backend now supports admin-controlled background jobs.

These jobs help FlowSync behave more like a production backend by handling cleanup, snapshots, scans, and refresh operations.

## Protected Access

All background job endpoints are protected.

Required roles:

```text
admin
rta_operator