# FlowSync Database Final Handoff

## Purpose

This document explains how Member 2 backend and Member 4 maps should use the final FlowSync database for production-ready mobile navigation.

## Core Tables

| Area | Tables |
|---|---|
| Location search | locations, geocoding_cache, map_provider_cache |
| Trips/routes | trip_requests, route_options, route_coordinates, route_steps |
| Selected route | trip_sessions.selected_route_id, trip_sessions.selected_route_public_id |
| Navigation progress | navigation_progress |
| Alerts/reports | alerts, road_incidents, road_closures, user_reports, user_report_confirmations |
| Analytics | trip_analytics, daily_summary_stats |
| Roles/users | users, roles, user_preferences |

## Route Coordinate Rule

Use:

```sql
SELECT *
FROM route_coordinates
WHERE route_id = ?
ORDER BY point_index ASC;