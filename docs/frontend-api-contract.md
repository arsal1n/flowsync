# FlowSync Frontend API Contract

Backend base URL:

http://127.0.0.1:8000

Swagger:

http://127.0.0.1:8000/docs

Health check:

GET /api/health

## Main Frontend Flow

1. User logs in.
2. User searches start and destination.
3. Frontend requests route recommendation.
4. Frontend displays route cards and map polyline.
5. User starts navigation.
6. Frontend polls live navigation.
7. User updates trip progress.
8. User ends trip.
9. Frontend displays trip summary.

## Authentication

POST /api/auth/login

Request:

{
  "email": "driver@flowsync.local",
  "password": "flowsync123"
}

Use the returned token:

Authorization: Bearer TOKEN_HERE

## Location Search

GET /api/locations/search?q=dubai

Frontend uses this for:

- autocomplete dropdown
- start marker
- destination marker
- map search

## Route Recommendation

POST /api/routes/recommend

Request:

{
  "start_location": "Dubai Mall",
  "destination": "Dubai Marina",
  "vehicle_type": "car",
  "route_preference": "balanced",
  "user_role": "driver"
}

Frontend must use these response fields:

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

## Start Navigation

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

## Live Navigation

GET /api/live/navigation/{session_id}

Poll every 3 seconds while navigation is active.

## Update Navigation Progress

POST /api/trips/progress

Request:

{
  "session_id": "NAV-...",
  "current_step_index": 1
}

## End Trip

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

## Trip Summary

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

## Frontend Pages To Build

- Login page
- Driver dashboard
- Location search page
- Route recommendation cards
- Interactive map page
- Turn-by-turn navigation panel
- Parking prediction page
- Alerts panel
- Trip summary page
- Admin redirect page
- Emergency redirect page

## Frontend Integration Checklist

- Login using /api/auth/login
- Store Bearer token
- Use /api/locations/search for dropdown search
- Use /api/routes/recommend for route cards and map polyline
- Use coordinates/polyline to draw map route
- Use database_record.request_id when starting navigation
- Use /api/trips/start to create session
- Poll /api/live/navigation/{session_id}
- Use /api/trips/progress to update current step
- Use /api/trips/end when trip finishes
- Use /api/trips/{request_id}/summary for final summary screen
