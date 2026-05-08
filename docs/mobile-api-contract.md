# FlowSync Mobile API Contract

Backend base URL for local testing:

http://127.0.0.1:8000

For real phone testing, use the laptop IP address:

http://YOUR_LAPTOP_IP:8000

## Mobile screens

- Login
- Home
- Search destination
- Route options
- Navigation
- Alerts
- Parking
- Trip summary
- Profile
- Emergency mode
- VIP mode

## Login

POST /api/auth/login

Driver account:

{
  "email": "driver@flowsync.local",
  "password": "flowsync123"
}

Emergency accounts:

- ambulance@flowsync.local / flowsync123
- police@flowsync.local / flowsync123
- vip@flowsync.local / flowsync123

## Mobile home

GET /api/mobile/home

## Search destination

GET /api/locations/search?q=dubai

## Recommend route

POST /api/routes/recommend

Request:

{
  "start_location": "Dubai Mall",
  "destination": "Dubai Marina",
  "vehicle_type": "car",
  "route_preference": "balanced",
  "user_role": "driver"
}

Supported route preferences:

- balanced
- fastest
- eco
- cheapest
- low_stress

## Route fields mobile must use

- recommended_route.route_name
- recommended_route.estimated_time
- recommended_route.distance_km
- recommended_route.coordinates
- recommended_route.polyline
- recommended_route.turn_by_turn_steps
- recommended_route.alerts
- recommended_route.incidents
- database_record.request_id

## Start navigation

POST /api/trips/start

Mobile stores:

- session_id
- request_id
- route_name
- current_step_index

## Live navigation

GET /api/live/navigation/{session_id}

Poll every 3 seconds.

## Progress update

POST /api/trips/progress

## End trip

POST /api/trips/end

## Trip summary

GET /api/trips/{request_id}/summary

## Parking

GET /api/parking/predict?destination=Dubai%20Mall

## Alerts

GET /api/alerts/driver

GET /api/live/feed

## Emergency mobile mode

Emergency routing:

POST /api/emergency/route

VIP routing:

POST /api/priority/vip-route

These require Bearer token authorization.

## Mobile checklist

- Login first
- Store Bearer token
- Use location search
- Call route recommendation
- Draw polyline on map
- Start navigation
- Poll live navigation
- Update progress
- End trip
- Show trip summary
- Show live alerts
- Show parking suggestions
