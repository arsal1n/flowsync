# FlowSync Backend Mobile Deployment

This document explains how to deploy the FlowSync backend for frontend and mobile integration.

## Purpose

Mobile apps cannot reliably use:

http://127.0.0.1:8000

because that only points to the device itself.

The mobile app needs either:

- a deployed backend URL, or
- a laptop LAN IP during local testing.

Recommended target:

https://flowsync-backend.onrender.com

## Render Deployment Settings

Root directory:

backend

Build command:

pip install -r requirements.txt

Start command:

uvicorn main:app --host 0.0.0.0 --port $PORT

## Environment Variables

```text
FLOWSYNC_ENV=production
FLOWSYNC_ROUTING_PROVIDER=mock
FLOWSYNC_GEOCODING_PROVIDER=sqlite
FLOWSYNC_MOCK_FALLBACK=true
FLOWSYNC_ROUTING_API_KEY=
FLOWSYNC_GEOCODING_API_KEY=
FLOWSYNC_ROUTING_BASE_URL=
FLOWSYNC_GEOCODING_BASE_URL=
```

## Important Provider Note

If the backend returns:

```text
routing_provider: mock
provider_status: mock_fallback
```

that means the backend is working, but real external routing or traffic provider keys are not connected yet.

It does not automatically mean frontend fallback data is being used.

## Mobile API Base URL

After deployment, mobile should use:

```text
EXPO_PUBLIC_API_BASE_URL=https://YOUR_RENDER_BACKEND_URL
```

Example:

```text
EXPO_PUBLIC_API_BASE_URL=https://flowsync-backend.onrender.com
```

## Test URLs

After deployment, test:

```text
Backend root:
https://YOUR_RENDER_BACKEND_URL/

Swagger:
https://YOUR_RENDER_BACKEND_URL/docs

Health:
https://YOUR_RENDER_BACKEND_URL/api/health

Client bootstrap:
https://YOUR_RENDER_BACKEND_URL/api/client/bootstrap

Route contract:
https://YOUR_RENDER_BACKEND_URL/api/client/route-contract
```

## Local Mobile Testing Alternative

If the backend is not deployed yet, use the laptop LAN IP instead of 127.0.0.1.

Example:

```text
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:8000
```

The phone and laptop must be on the same Wi-Fi network.

## Production Extras Later

These are not required before the mobile demo:

- custom domain
- production PostgreSQL
- real traffic provider
- real parking provider
- real IoT feed
- Play Store / App Store launch

## Final Team Note

For the deadline, the priority is:

- backend stable
- deployed or LAN-accessible API URL
- frontend connected to backend
- mobile app connected to backend
- working route search/navigation demo on phone

Real provider integrations can be added later through environment variables without changing frontend or mobile API calls.
