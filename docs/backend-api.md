@"

---

## Demo Tools Quick Reference

Backend version 1.0.1 added demo preparation endpoints.

### Demo Endpoints

- GET /api/demo/status
- POST /api/demo/reset
- POST /api/demo/seed

Use POST /api/demo/reset before the teacher demo to clear old local test data.

Use POST /api/demo/seed to load clean sample demo data for:

- trips
- route assignments
- traffic sensors
- parking sensors
- driver alerts
- event simulation
- admin actions
- user reports
- parking zones
- emergency vehicles

Recommended teacher demo flow:

1. POST /api/demo/reset
2. POST /api/demo/seed
3. GET /api/demo/status
4. GET /api/dashboard
5. GET /api/admin/dashboard
6. GET /api/trips
7. GET /api/alerts/driver

"@ | Add-Content docs/backend-api.md