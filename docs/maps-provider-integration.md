# FlowSync Maps Provider Integration

FlowSync Backend v1 now supports a real-map-provider integration layer.

## Current Default Mode

By default, the backend still runs safely using mock fallback data.

```text
FLOWSYNC_ROUTING_PROVIDER=mock
FLOWSYNC_GEOCODING_PROVIDER=sqlite
FLOWSYNC_MOCK_FALLBACK=true