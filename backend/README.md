# FlowSync Backend

FlowSync is a smart-city mobility backend built with FastAPI.

## Backend Capabilities

The backend supports:

- adaptive route distribution
- navigation sessions
- trip lifecycle tracking
- authentication and roles
- admin control room APIs
- emergency routing APIs
- live update endpoints
- background jobs
- provider-ready routing/geocoding
- smoke testing
- deployment readiness

## Run Locally

From the backend folder:

```powershell
.\venv\Scripts\python.exe -m uvicorn main:app --reload