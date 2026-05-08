# FlowSync Admin API Contract

Backend base URL:

http://127.0.0.1:8000

## Admin login

POST /api/auth/login

Request:

{
  "email": "admin@flowsync.local",
  "password": "flowsync123"
}

Use token:

Authorization: Bearer TOKEN_HERE

Admin roles:

- admin
- rta_operator

## Admin dashboard

GET /api/admin/dashboard

## Live admin dashboard

GET /api/live/admin

Poll every 5 seconds.

Response includes:

- admin_dashboard
- route_loads
- latest_sensor_readings
- active_navigation
- trip_lifecycle
- emergency_vehicles
- driver_alerts

## Route monitoring

GET /api/routes/load

GET /api/routes/fairness

GET /api/routes/options

## Manual traffic control

POST /api/admin/road-closure

POST /api/admin/reroute-zone

POST /api/admin/no-entry-zone

## Emergency control room

GET /api/live/emergency

POST /api/emergency/route

GET /api/emergency/vehicles

POST /api/emergency/clear-corridor

POST /api/emergency/convoy

Allowed roles:

- admin
- rta_operator
- ambulance
- police
- fire_truck

## IoT sensor data

POST /api/sensors/traffic

POST /api/sensors/parking

GET /api/sensors/latest

GET /api/zones/density

## Digital twin

POST /api/digital-twin/simulate

## Event traffic

POST /api/events/simulate

GET /api/events/list

## Urban stress

GET /api/admin/urban-stress

## Background jobs

GET /api/jobs/status

POST /api/jobs/run

POST /api/jobs/run/{job_name}

GET /api/jobs/history

Jobs:

- cleanup_stale_navigation
- generate_live_system_snapshot
- refresh_route_load_snapshot
- scan_emergency_alerts
- refresh_parking_congestion

## User management

GET /api/auth/users

POST /api/auth/users

GET /api/auth/roles

## Admin dashboard pages

- Login
- Control room overview
- Live city dashboard
- Route load monitor
- Emergency dashboard
- IoT dashboard
- Parking analytics
- Event simulation
- Digital twin simulation
- Background jobs
- User management
- Urban stress dashboard
