## Demo Tools

These endpoints help prepare a clean teacher demo.

### GET /api/demo/status

Shows current demo database status, including:

- dashboard data
- route loads
- recent trips
- sensor readings
- alerts
- events
- incidents
- reports
- parking zones
- emergency vehicles
- table counts

### POST /api/demo/reset

Clears demo database data and resets demo tables.

Use this before starting a clean demo.

### POST /api/demo/seed

Adds clean sample demo data including:

- sample trips
- route assignments
- traffic sensor readings
- parking sensor readings
- driver alerts
- event simulation record
- admin action
- user road report
- parking zones
- emergency vehicles

Recommended demo order:

1. POST /api/demo/reset
2. POST /api/demo/seed
3. GET /api/demo/status
4. GET /api/dashboard
5. GET /api/admin/dashboard
6. GET /api/trips
7. GET /api/alerts/driver