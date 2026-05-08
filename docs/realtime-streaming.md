# FlowSync Realtime Streaming

FlowSync Backend v1 now supports Server-Sent Events style realtime streaming.

## Purpose

The streaming endpoints allow frontend, mobile, admin dashboard, maps, and emergency control room screens to receive live backend updates without repeatedly making normal REST requests.

Polling endpoints still exist and remain safe fallback options.

## Streaming Status

```text
GET /api/stream/status