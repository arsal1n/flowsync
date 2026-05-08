# FlowSync Frontend API Contract

Backend base URL:

http://127.0.0.1:8000

Swagger:

http://127.0.0.1:8000/docs

## Main frontend flow

1. User logs in.
2. User searches start and destination.
3. Frontend requests route recommendation.
4. Frontend displays route cards and map polyline.
5. User starts navigation.
6. Frontend polls live navigation.
7. User ends trip.
8. Frontend displays trip summary.

## Authentication

POST /api/auth/login

Request:

{
  "email": "driver@flowsync.local",
  "password": "flowsync123"
}

Use token:

Authorization: Bearer TOKEN_HERE

## Location search

GET /api/locations/search?q=dubai

Used for:

- autocomplete
- dropdown search
- start marker
- destination marker

## Route recommendation

POST /api/routes/recommend

Request:

{
  "start_location": "Dubai Mall",
  "destination": "Dubai Marina",
  "vehicle_type": "car",
  "route_preference": "balanced",
  "user_role": "driver"
}

Frontend must use:

- recommended_route.route_name
- recommended_route.estimated_time
- recommended_route.distance_km
- recommended_route.congestion_score
- recommended_route.route_score
- recommended_route.assigned_users
- recommended_route.road_capacity
- recommended_route.coordinates
- recommended_route.polyline
- recommended_route.turn_by_turn_steps
- recommended_route.alerts
- recommended_route.incidents
- all_routes
- database_record.request_id
- routing_provider
- provider_status

## Start navigation

POST /api/trips/start

Request:

{
  "start_location": "Dubai Mall",
  "destination": "Dubai Marina",
  "vehicle_type": "car",
  "route_preference": "balanced",
  "user_role": "driver",
  "user_id": "demo-driver",
  "request_id": 1
}

Frontend must store:

- session.session_id
- request_id

## Live navigation

GET /api/live/navigation/{session_id}

Poll every 3 seconds during navigation.

## Update progress

POST /api/trips/progress

Request:

{
  "session_id": "NAV-...",
  "current_step_index": 1
}

## End trip

POST /api/trips/end

Request:

{
  "session_id": "NAV-...",
  "status": "completed"
}

Allowed statuses:

- completed
- cancelled
- interrupted

## Trip summary

GET /api/trips/{request_id}/summary

## Dashboard

GET /api/dashboard

GET /api/live/dashboard

Poll live dashboard every 5 seconds.

## Parking

GET /api/parking/predict?destination=Dubai%20Mall

## Alerts

GET /api/alerts/driver

POST /api/alerts/create

GET /api/live/feed

## Frontend pages to build

- Login page
- Driver dashboard
- Location search page
- Route cards page
- Interactive map page
- Turn-by-turn navigation panel
- Parking prediction page
- Alerts panel
- Trip summary page
- Admin redirect page
- Emergency redirect page
