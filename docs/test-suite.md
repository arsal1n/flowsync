@'
# FlowSync Backend Test Suite

FlowSync Backend v1 now includes an automated pytest test suite.

## Purpose

The test suite verifies that the backend is stable for:

- frontend integration
- mobile integration
- admin dashboard integration
- maps/routing integration
- database integration
- deployment demos

## Test Coverage

The tests cover:

- system health
- feature catalog
- authentication
- admin role protection
- location search
- route recommendation
- navigation lifecycle
- trip progress
- live updates
- background jobs
- database readiness
- provider contract fields
- 30-feature backend coverage

## Run Tests

From the backend folder:

```powershell
.\venv\Scripts\python.exe -m pytest -q