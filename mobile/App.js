import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "https://flowsync-ox5z.onrender.com";

const DEMO_PASSWORD = "flowsync123";

const DEFAULT_REGION = {
  latitude: 25.2048,
  longitude: 55.2708,
  latitudeDelta: 0.28,
  longitudeDelta: 0.28,
};

const DUBAI_LOCATIONS = [
  { name: "Dubai Mall", address: "Downtown Dubai", latitude: 25.1972, longitude: 55.2744, category: "mall" },
  { name: "Dubai Marina", address: "Dubai Marina", latitude: 25.0800, longitude: 55.1400, category: "waterfront" },
  { name: "Downtown Dubai", address: "Downtown Dubai", latitude: 25.1948, longitude: 55.2708, category: "district" },
  { name: "Business Bay", address: "Business Bay", latitude: 25.1860, longitude: 55.2608, category: "business" },
  { name: "DXB Airport", address: "Dubai International Airport", latitude: 25.2532, longitude: 55.3657, category: "airport" },
  { name: "Jumeirah", address: "Jumeirah Beach Road", latitude: 25.2048, longitude: 55.2553, category: "district" },
  { name: "Palm Jumeirah", address: "Palm Jumeirah", latitude: 25.1124, longitude: 55.1390, category: "landmark" },
  { name: "Mall of the Emirates", address: "Al Barsha", latitude: 25.1181, longitude: 55.2006, category: "mall" },
  { name: "Dubai Internet City", address: "Dubai Internet City", latitude: 25.0953, longitude: 55.1562, category: "business" },
  { name: "Dubai Media City", address: "Dubai Media City", latitude: 25.0923, longitude: 55.1525, category: "business" },
  { name: "JBR", address: "Jumeirah Beach Residence", latitude: 25.0793, longitude: 55.1338, category: "beach" },
  { name: "Academic City", address: "Dubai Academic City", latitude: 25.1256, longitude: 55.4209, category: "education" },
  { name: "Sharjah", address: "Sharjah City", latitude: 25.3463, longitude: 55.4209, category: "city" },
  { name: "Dubai Silicon Oasis", address: "DSO", latitude: 25.1250, longitude: 55.3800, category: "technology" },
  { name: "Dubai Festival City", address: "Festival City", latitude: 25.2222, longitude: 55.3494, category: "mall" },
  { name: "Deira City Centre", address: "Deira", latitude: 25.2536, longitude: 55.3306, category: "mall" },
];

const DEMO_ACCOUNTS = [
  { role: "Driver", email: "driver@flowsync.local", description: "Route search, navigation, alerts, parking" },
  { role: "Admin", email: "admin@flowsync.local", description: "Control room, dashboard, route loads" },
  { role: "RTA Operator", email: "rta@flowsync.local", description: "Traffic operations and city monitoring" },
  { role: "Emergency", email: "emergency@flowsync.local", description: "Priority routing and emergency vehicles" },
];

const FEATURES = [
  ["Authentication", "Login and role access", "/api/auth/login"],
  ["Role-Based Access", "Driver/admin/emergency/RTA roles", "/api/auth/me"],
  ["Location Search", "Dubai autocomplete and place selection", "/api/locations/search?q=dubai"],
  ["Saved Places", "Home/work/favorite destinations", "/api/saved-places"],
  ["User Preferences", "Route mode, eco mode, parking preferences", "/api/user/preferences"],
  ["Smart Routing", "Adaptive route recommendations", "/api/routes/recommend"],
  ["Route Options", "Multiple ranked route alternatives", "/api/client/route-contract"],
  ["Active Map", "Mobile route preview with markers", "mobile"],
  ["Turn-by-Turn", "Step preview and navigation progress", "mobile"],
  ["Trip Lifecycle", "Start, progress, end, summary", "/api/trips/start"],
  ["Live Navigation", "Live session updates", "/api/live/navigation/{session_id}"],
  ["Realtime Streaming", "SSE live dashboard/navigation", "/api/stream/dashboard"],
  ["Driver Alerts", "Congestion/parking/incident alerts", "/api/alerts/driver"],
  ["Parking Prediction", "Destination parking difficulty", "/api/parking/predict?destination=Dubai%20Mall"],
  ["Route Loads", "Road load balancing", "/api/routes/load"],
  ["Traffic Sensors", "Traffic IoT readings", "/api/sensors/latest"],
  ["Parking Sensors", "Parking sensor readings", "/api/sensors/latest"],
  ["Crowd Reports", "User reported incidents", "/api/reports/latest"],
  ["Incidents", "Traffic incidents and disruptions", "/api/incidents/latest"],
  ["Events", "City events affecting mobility", "/api/events/list"],
  ["Emergency Vehicles", "Emergency fleet visibility", "/api/emergency/vehicles"],
  ["Emergency Routing", "Priority response routing", "/api/emergency/routes"],
  ["Admin Dashboard", "Control room APIs", "/api/admin/dashboard"],
  ["Digital Twin", "Simulation and what-if planning", "/api/digital-twin"],
  ["Sustainability", "Fuel/CO2/time saved metrics", "/api/sustainability"],
  ["Ride Sharing", "Future carpool foundation", "/api/rideshare"],
  ["Background Jobs", "Scheduled backend jobs", "/api/jobs/status"],
  ["Database Readiness", "SQLite now, PostgreSQL later", "/api/database/readiness"],
  ["Provider Status", "Mock vs real provider visibility", "/api/client/bootstrap"],
  ["Mobile Deployment", "Expo app using deployed backend", "mobile"],
];

function findTokenDeep(value) {
  if (!value || typeof value !== "object") return null;

  const keys = [
    "access_token",
    "accessToken",
    "token",
    "jwt",
    "auth_token",
    "authToken",
    "session_token",
    "sessionToken",
  ];

  for (const key of keys) {
    if (typeof value[key] === "string" && value[key].length > 5) {
      return value[key];
    }
  }

  for (const key of Object.keys(value)) {
    const found = findTokenDeep(value[key]);
    if (found) return found;
  }

  return null;
}

function normalizeArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.locations)) return data.locations;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function normalizeCoordinate(point) {
  if (!point) return null;

  if (Array.isArray(point) && point.length >= 2) {
    return {
      latitude: Number(point[0]),
      longitude: Number(point[1]),
    };
  }

  const latitude = Number(point.latitude ?? point.lat);
  const longitude = Number(point.longitude ?? point.lng ?? point.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
}

function getRouteCoordinates(route) {
  const raw =
    route?.coordinates ||
    route?.route_coordinates ||
    route?.polyline_points ||
    route?.geometry ||
    [];

  const normalized = Array.isArray(raw)
    ? raw.map(normalizeCoordinate).filter(Boolean)
    : [];

  if (normalized.length >= 2) return normalized;

  return [
    { latitude: 25.1972, longitude: 55.2744 },
    { latitude: 25.1860, longitude: 55.2608 },
    { latitude: 25.1550, longitude: 55.2200 },
    { latitude: 25.1181, longitude: 55.2006 },
    { latitude: 25.0800, longitude: 55.1400 },
  ];
}

function regionForCoordinates(coords) {
  if (!coords.length) return DEFAULT_REGION;

  const latitudes = coords.map((p) => p.latitude);
  const longitudes = coords.map((p) => p.longitude);

  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(maxLat - minLat + 0.08, 0.08),
    longitudeDelta: Math.max(maxLng - minLng + 0.08, 0.08),
  };
}

export default function App() {
  const mapRef = useRef(null);

  const [screen, setScreen] = useState("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [email, setEmail] = useState("driver@flowsync.local");
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);

  const [health, setHealth] = useState(null);
  const [bootstrap, setBootstrap] = useState(null);

  const [query, setQuery] = useState("dubai");
  const [locations, setLocations] = useState(DUBAI_LOCATIONS);

  const [startLocation, setStartLocation] = useState("Dubai Mall");
  const [destination, setDestination] = useState("Dubai Marina");
  const [routeResult, setRouteResult] = useState(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);

  const [mapRegion, setMapRegion] = useState(DEFAULT_REGION);
  const [userLocation, setUserLocation] = useState(null);

  const [sessionId, setSessionId] = useState("");
  const [requestId, setRequestId] = useState("");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [tripSummary, setTripSummary] = useState(null);

  const selectedRoute = useMemo(() => {
    const recommended =
      routeResult?.recommended_route ||
      routeResult?.recommendedRoute ||
      routeResult?.data?.recommended_route ||
      null;

    const routes =
      routeResult?.all_routes ||
      routeResult?.routes ||
      routeResult?.data?.all_routes ||
      [];

    if (Array.isArray(routes) && routes.length > 0) {
      return routes[selectedRouteIndex] || routes[0];
    }

    return recommended;
  }, [routeResult, selectedRouteIndex]);

  const allRoutes = useMemo(() => {
    const routes =
      routeResult?.all_routes ||
      routeResult?.routes ||
      routeResult?.data?.all_routes ||
      [];

    if (Array.isArray(routes) && routes.length > 0) return routes;
    return selectedRoute ? [selectedRoute] : [];
  }, [routeResult, selectedRoute]);

  const routeCoordinates = useMemo(
    () => getRouteCoordinates(selectedRoute),
    [selectedRoute]
  );

  const turnSteps = useMemo(() => {
    return (
      selectedRoute?.turn_by_turn_steps ||
      selectedRoute?.steps ||
      selectedRoute?.route_steps ||
      []
    );
  }, [selectedRoute]);

  const progressPercent =
    turnSteps.length > 0
      ? Math.round(((currentStepIndex + 1) / turnSteps.length) * 100)
      : sessionId
      ? 20
      : 0;

  async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token && token !== "DEMO_LOCAL_TOKEN"
          ? { Authorization: `Bearer ${token}` }
          : {}),
        ...(options.headers || {}),
      },
      ...options,
    });

    const text = await response.text();

    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      const message =
        typeof data.detail === "string"
          ? data.detail
          : data.message || data.error || `HTTP ${response.status}`;

      throw new Error(message);
    }

    return data;
  }

  async function runAction(action) {
    setLoading(true);
    setError("");

    try {
      await action();
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  }

  async function testBackend() {
    await runAction(async () => {
      const healthData = await apiRequest("/api/health");
      const bootstrapData = await apiRequest("/api/client/bootstrap");

      setHealth(healthData);
      setBootstrap(bootstrapData);
    });
  }

  async function login() {
    await runAction(async () => {
      const data = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      const nextToken = findTokenDeep(data);
      const userData = data.user || data.data?.user || {
        name: "FlowSync Driver",
        email,
        role: email.includes("admin")
          ? "admin"
          : email.includes("emergency")
          ? "emergency"
          : "driver",
      };

      setUser(userData);
      setToken(nextToken || "DEMO_LOCAL_TOKEN");
      setScreen("dashboard");

      if (!nextToken) {
        setError(
          "Login worked, but backend did not return a token. Continuing in demo mobile mode."
        );
      }
    });
  }

  async function searchLocations() {
    await runAction(async () => {
      const data = await apiRequest(
        `/api/locations/search?q=${encodeURIComponent(query)}`
      );

      const apiLocations = normalizeArray(data);
      setLocations(apiLocations.length > 0 ? apiLocations : DUBAI_LOCATIONS);
    });
  }

  async function getMyLocation() {
    await runAction(async () => {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        throw new Error("Location permission was denied.");
      }

      const current = await Location.getCurrentPositionAsync({});
      const nextLocation = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      };

      setUserLocation(nextLocation);
      setMapRegion({
        ...nextLocation,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      });
    });
  }

  async function recommendRoute() {
    await runAction(async () => {
      const data = await apiRequest("/api/routes/recommend", {
        method: "POST",
        body: JSON.stringify({
          start_location: startLocation,
          destination,
          vehicle_type: "car",
          route_preference: "balanced",
          user_role: user?.role || "driver",
        }),
      });

      setRouteResult(data);
      setSelectedRouteIndex(0);

      const req =
        data.database_record?.request_id ||
        data.request_id ||
        data.data?.request_id;

      if (req) setRequestId(String(req));

      const recommended =
        data.recommended_route || data.data?.recommended_route || data.routes?.[0];

      const coords = getRouteCoordinates(recommended);
      const nextRegion = regionForCoordinates(coords);
      setMapRegion(nextRegion);

      setScreen("map");
    });
  }

  function openExternalNavigation() {
    const url =
      `https://www.google.com/maps/dir/?api=1` +
      `&origin=${encodeURIComponent(startLocation)}` +
      `&destination=${encodeURIComponent(destination)}` +
      `&travelmode=driving`;

    Linking.openURL(url);
  }

  async function startTrip() {
    await runAction(async () => {
      if (!selectedRoute) {
        throw new Error("Get a route before starting navigation.");
      }

      let data = null;

      const routeName =
        selectedRoute.route_name || selectedRoute.name || "Recommended Route";

      const bodies = [
        {
          request_id: requestId || routeResult?.database_record?.request_id || null,
          start_location: startLocation,
          destination,
          route_name: routeName,
          selected_route: selectedRoute,
          route: selectedRoute,
          current_step_index: 0,
        },
        {
          start_location: startLocation,
          destination,
          selected_route: routeName,
          route_name: routeName,
          route_steps: turnSteps,
        },
      ];

      for (const body of bodies) {
        try {
          data = await apiRequest("/api/trips/start", {
            method: "POST",
            body: JSON.stringify(body),
          });
          break;
        } catch {
          data = null;
        }
      }

      const nextSession =
        data?.session_id ||
        data?.session?.session_id ||
        data?.navigation_session?.session_id ||
        `LOCAL-${Date.now()}`;

      const nextRequest =
        data?.request_id ||
        data?.database_record?.request_id ||
        requestId ||
        `LOCAL-REQ-${Date.now()}`;

      setSessionId(String(nextSession));
      setRequestId(String(nextRequest));
      setCurrentStepIndex(0);
      setTripSummary(null);
      setScreen("nav");

      if (!data) {
        setError(
          "Backend start trip failed. Continuing with local demo navigation."
        );
      }
    });
  }

  async function nextStep() {
    await runAction(async () => {
      if (!sessionId) throw new Error("Start navigation first.");

      const nextIndex = Math.min(
        currentStepIndex + 1,
        Math.max(turnSteps.length - 1, 0)
      );

      if (!sessionId.startsWith("LOCAL-")) {
        try {
          await apiRequest("/api/trips/progress", {
            method: "POST",
            body: JSON.stringify({
              session_id: sessionId,
              current_step_index: nextIndex,
            }),
          });
        } catch {
          setError("Backend progress update failed. Continuing locally.");
        }
      }

      setCurrentStepIndex(nextIndex);
    });
  }

  async function endTrip() {
    await runAction(async () => {
      if (!sessionId) throw new Error("No active session.");

      if (!sessionId.startsWith("LOCAL-")) {
        try {
          await apiRequest("/api/trips/end", {
            method: "POST",
            body: JSON.stringify({
              session_id: sessionId,
              status: "completed",
            }),
          });
        } catch {
          setError("Backend end trip failed. Showing local summary.");
        }
      }

      setTripSummary({
        status: "completed",
        route_name:
          selectedRoute?.route_name || selectedRoute?.name || "Recommended Route",
        start_location: startLocation,
        destination,
        progress: progressPercent,
        provider: routeResult?.routing_provider || "mock",
      });

      setScreen("summary");
    });
  }

  async function testFeature(feature) {
    await runAction(async () => {
      if (feature[2] === "mobile") {
        setError("This feature is handled directly inside the mobile app.");
        return;
      }

      if (feature[2].includes("{session_id}") && !sessionId) {
        setError("Start a trip first to test this live session endpoint.");
        return;
      }

      const endpoint = feature[2].replace("{session_id}", sessionId);
      await apiRequest(endpoint);
      setError(`${feature[0]} endpoint responded successfully.`);
    });
  }

  function selectDemoAccount(account) {
    setEmail(account.email);
    setPassword(DEMO_PASSWORD);
    setScreen("login");
  }

  function renderHeader() {
    return (
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>FlowSync</Text>
          <Text style={styles.subtitle}>Smart City Mobility</Text>
        </View>
        <View style={styles.liveBadge}>
          <Text style={styles.liveText}>LIVE API</Text>
        </View>
      </View>
    );
  }

  function renderTabs() {
    if (!token) return null;

    const tabs = [
      ["Home", "dashboard"],
      ["Map", "map"],
      ["Route", "route"],
      ["Nav", "nav"],
      ["Features", "features"],
      ["Account", "account"],
    ];

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
        {tabs.map(([label, value]) => (
          <TouchableOpacity
            key={value}
            style={[styles.tab, screen === value ? styles.tabActive : null]}
            onPress={() => setScreen(value)}
          >
            <Text style={[styles.tabText, screen === value ? styles.tabTextActive : null]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  }

  function renderLogin() {
    return (
      <>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Move through Dubai smarter.</Text>
          <Text style={styles.heroText}>
            Live backend, route intelligence, active maps, smart-city features,
            and mobile navigation flow.
          </Text>

          <TouchableOpacity style={styles.outlineButton} onPress={testBackend}>
            <Text style={styles.outlineButtonText}>Test Deployed Backend</Text>
          </TouchableOpacity>

          {health && (
            <View style={styles.successBox}>
              <Text style={styles.successTitle}>Backend reachable</Text>
              <Text style={styles.muted}>
                {health.message || health.service || "FlowSync API online"}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Sign in</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity style={styles.primaryButton} onPress={login}>
            <Text style={styles.primaryButtonText}>Enter FlowSync</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Demo accounts</Text>
          {DEMO_ACCOUNTS.map((account) => (
            <TouchableOpacity
              key={account.email}
              style={styles.listItem}
              onPress={() => selectDemoAccount(account)}
            >
              <Text style={styles.listTitle}>{account.role}</Text>
              <Text style={styles.muted}>{account.email}</Text>
              <Text style={styles.muted}>{account.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </>
    );
  }

  function renderDashboard() {
    return (
      <>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Control your journey.</Text>
          <Text style={styles.heroText}>
            {user?.name || "FlowSync User"} • {user?.role || "driver"}
          </Text>

          <View style={styles.metricsRow}>
            <Metric label="Features" value="30" />
            <Metric label="Backend" value="Live" />
            <Metric label="Mode" value="Mobile" />
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={() => setScreen("route")}>
            <Text style={styles.primaryButtonText}>Plan Smart Route</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Quick actions</Text>

          <View style={styles.actionGrid}>
            <Action title="Use My Location" onPress={getMyLocation} />
            <Action title="Search Places" onPress={searchLocations} />
            <Action title="Get Route" onPress={recommendRoute} />
            <Action title="Open Map" onPress={() => setScreen("map")} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Provider status</Text>
          <Text style={styles.muted}>
            Backend: {API_BASE_URL}
          </Text>
          <Text style={styles.muted}>
            Provider: {routeResult?.routing_provider || "mock"}
          </Text>
          <Text style={styles.muted}>
            Status: {routeResult?.provider_status || "mock_fallback"}
          </Text>
        </View>
      </>
    );
  }

  function renderRoute() {
    return (
      <>
        <View style={styles.card}>
          <Text style={styles.title}>Location search</Text>

          <View style={styles.searchRow}>
            <TextInput
              style={[styles.input, styles.searchInput]}
              value={query}
              onChangeText={setQuery}
              placeholder="Search Dubai"
              placeholderTextColor="#8aa0b8"
            />
            <TouchableOpacity style={styles.searchButton} onPress={searchLocations}>
              <Text style={styles.searchButtonText}>Search</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {locations.slice(0, 12).map((item, index) => (
              <TouchableOpacity
                key={`${item.name || index}`}
                style={styles.locationChip}
                onPress={() => setDestination(item.name)}
              >
                <Text style={styles.locationChipTitle}>{item.name}</Text>
                <Text style={styles.locationChipText}>{item.category || "Dubai"}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Route planner</Text>

          <Text style={styles.label}>Start</Text>
          <TextInput
            style={styles.input}
            value={startLocation}
            onChangeText={setStartLocation}
          />

          <Text style={styles.label}>Destination</Text>
          <TextInput
            style={styles.input}
            value={destination}
            onChangeText={setDestination}
          />

          <TouchableOpacity style={styles.primaryButton} onPress={recommendRoute}>
            <Text style={styles.primaryButtonText}>Generate Smart Route</Text>
          </TouchableOpacity>
        </View>

        {allRoutes.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.title}>Route options</Text>

            {allRoutes.slice(0, 4).map((route, index) => (
              <TouchableOpacity
                key={`${route.route_name || index}`}
                style={[
                  styles.routeOption,
                  selectedRouteIndex === index ? styles.routeOptionActive : null,
                ]}
                onPress={() => {
                  setSelectedRouteIndex(index);
                  setMapRegion(regionForCoordinates(getRouteCoordinates(route)));
                }}
              >
                <Text style={styles.listTitle}>
                  {route.route_name || route.name || `Route ${index + 1}`}
                </Text>
                <Text style={styles.muted}>
                  {route.estimated_time || "--"} min • {route.distance_km || "--"} km • traffic{" "}
                  {route.congestion_score ?? "--"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </>
    );
  }

  function renderMap() {
    const start = routeCoordinates[0];
    const end = routeCoordinates[routeCoordinates.length - 1];

    return (
      <>
        <View style={styles.mapCard}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
            region={mapRegion}
            onRegionChangeComplete={setMapRegion}
            showsUserLocation
            showsMyLocationButton
          >
            {start && (
              <Marker coordinate={start} title="Start" description={startLocation} />
            )}
            {end && (
              <Marker coordinate={end} title="Destination" description={destination} />
            )}
            {userLocation && (
              <Marker coordinate={userLocation} title="You" pinColor="blue" />
            )}
            {routeCoordinates.length > 1 && (
              <Polyline
                coordinates={routeCoordinates}
                strokeWidth={6}
                strokeColor="#22c55e"
              />
            )}
          </MapView>

          <View style={styles.mapOverlay}>
            <Text style={styles.mapTitle}>
              {selectedRoute?.route_name || selectedRoute?.name || "Smart Route"}
            </Text>
            <Text style={styles.mapText}>
              {startLocation} → {destination}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Active route</Text>

          <View style={styles.metricsRow}>
            <Metric label="Time" value={`${selectedRoute?.estimated_time || "--"}m`} />
            <Metric label="Distance" value={`${selectedRoute?.distance_km || "--"}km`} />
            <Metric label="Traffic" value={String(selectedRoute?.congestion_score ?? "--")} />
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={startTrip}>
            <Text style={styles.primaryButtonText}>Start Navigation</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.outlineButton} onPress={openExternalNavigation}>
            <Text style={styles.outlineButtonText}>Open in Google Maps</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.outlineButton} onPress={getMyLocation}>
            <Text style={styles.outlineButtonText}>Center on My Location</Text>
          </TouchableOpacity>
        </View>

        {turnSteps.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.title}>Directions preview</Text>
            {turnSteps.slice(0, 6).map((step, index) => (
              <View key={`${index}`} style={styles.stepRow}>
                <Text style={styles.stepCircle}>{index + 1}</Text>
                <Text style={styles.stepText}>
                  {step.instruction || step.text || JSON.stringify(step)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </>
    );
  }

  function renderNavigation() {
    const currentStep = turnSteps[currentStepIndex];

    return (
      <>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>
            {sessionId ? "Navigation active" : "No active trip"}
          </Text>
          <Text style={styles.heroText}>
            {sessionId
              ? `${startLocation} → ${destination}`
              : "Generate a route and start navigation first."}
          </Text>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>

          <Text style={styles.muted}>{progressPercent}% complete</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Current instruction</Text>
          <Text style={styles.bigInstruction}>
            {currentStep?.instruction ||
              currentStep?.text ||
              "Continue on the recommended route."}
          </Text>

          <Text style={styles.muted}>
            Step {Math.min(currentStepIndex + 1, Math.max(turnSteps.length, 1))} of{" "}
            {Math.max(turnSteps.length, 1)}
          </Text>

          <TouchableOpacity style={styles.primaryButton} onPress={nextStep}>
            <Text style={styles.primaryButtonText}>Next Step</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.outlineButton} onPress={openExternalNavigation}>
            <Text style={styles.outlineButtonText}>Open Real Navigation App</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dangerButton} onPress={endTrip}>
            <Text style={styles.dangerButtonText}>End Trip</Text>
          </TouchableOpacity>
        </View>

        {turnSteps.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.title}>Turn-by-turn</Text>
            {turnSteps.slice(0, 10).map((step, index) => (
              <View
                key={`${index}`}
                style={[
                  styles.stepRow,
                  index === currentStepIndex ? styles.activeStep : null,
                ]}
              >
                <Text style={styles.stepCircle}>{index + 1}</Text>
                <Text style={styles.stepText}>
                  {step.instruction || step.text || JSON.stringify(step)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </>
    );
  }

  function renderFeatures() {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>30 smart-city features</Text>
        <Text style={styles.muted}>
          Tap a feature to test its endpoint or view its mobile capability.
        </Text>

        <View style={styles.featureGrid}>
          {FEATURES.map((feature, index) => (
            <TouchableOpacity
              key={`${feature[0]}-${index}`}
              style={styles.featureCard}
              onPress={() => testFeature(feature)}
            >
              <Text style={styles.featureNumber}>{String(index + 1).padStart(2, "0")}</Text>
              <Text style={styles.featureTitle}>{feature[0]}</Text>
              <Text style={styles.featureText}>{feature[1]}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  function renderAccount() {
    return (
      <>
        <View style={styles.card}>
          <Text style={styles.title}>Account and roles</Text>
          <Text style={styles.listTitle}>{user?.name || "FlowSync User"}</Text>
          <Text style={styles.muted}>{user?.email || email}</Text>
          <Text style={styles.muted}>Role: {user?.role || "driver"}</Text>

          <TouchableOpacity
            style={styles.dangerButton}
            onPress={() => {
              setToken("");
              setUser(null);
              setScreen("login");
            }}
          >
            <Text style={styles.dangerButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Switch demo role</Text>
          {DEMO_ACCOUNTS.map((account) => (
            <TouchableOpacity
              key={account.email}
              style={styles.listItem}
              onPress={() => selectDemoAccount(account)}
            >
              <Text style={styles.listTitle}>{account.role}</Text>
              <Text style={styles.muted}>{account.email}</Text>
              <Text style={styles.muted}>{account.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </>
    );
  }

  function renderSummary() {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Trip summary</Text>

        {tripSummary ? (
          <>
            <View style={styles.successBox}>
              <Text style={styles.successTitle}>Trip completed</Text>
              <Text style={styles.muted}>
                {tripSummary.start_location} → {tripSummary.destination}
              </Text>
            </View>

            <Text style={styles.muted}>Route: {tripSummary.route_name}</Text>
            <Text style={styles.muted}>Provider: {tripSummary.provider}</Text>
            <Text style={styles.muted}>Progress: {tripSummary.progress}%</Text>
          </>
        ) : (
          <>
            <Text style={styles.muted}>No completed trip yet.</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setScreen("route")}>
              <Text style={styles.primaryButtonText}>Plan Route</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.container}>
        {renderHeader()}
        {renderTabs()}

        {screen === "login" && renderLogin()}
        {screen === "dashboard" && renderDashboard()}
        {screen === "route" && renderRoute()}
        {screen === "map" && renderMap()}
        {screen === "nav" && renderNavigation()}
        {screen === "features" && renderFeatures()}
        {screen === "account" && renderAccount()}
        {screen === "summary" && renderSummary()}

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" />
            <Text style={styles.muted}>Loading...</Text>
          </View>
        )}

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Text style={styles.footer}>
          Real traffic, parking, IoT and production DB become real when external providers are connected.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ label, value }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function Action({ title, onPress }) {
  return (
    <TouchableOpacity style={styles.action} onPress={onPress}>
      <Text style={styles.actionText}>{title}</Text>
    </TouchableOpacity>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#06111f",
  },
  container: {
    padding: 16,
    paddingBottom: 42,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  logo: {
    color: "#ffffff",
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -1,
  },
  subtitle: {
    color: "#93a9c2",
    marginTop: 3,
  },
  liveBadge: {
    backgroundColor: "#052e1a",
    borderColor: "#22c55e",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  liveText: {
    color: "#86efac",
    fontWeight: "900",
    fontSize: 11,
  },
  tabs: {
    marginBottom: 14,
  },
  tab: {
    backgroundColor: "#0c1829",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#1e3350",
  },
  tabActive: {
    backgroundColor: "#22c55e",
    borderColor: "#22c55e",
  },
  tabText: {
    color: "#9fb4c8",
    fontWeight: "800",
  },
  tabTextActive: {
    color: "#03120a",
  },
  heroCard: {
    backgroundColor: "#0f2440",
    borderRadius: 28,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#1e3a5f",
  },
  heroTitle: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 34,
  },
  heroText: {
    color: "#b6c7d8",
    marginTop: 8,
    lineHeight: 21,
  },
  card: {
    backgroundColor: "#101c2e",
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#1f334f",
  },
  title: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 12,
  },
  label: {
    color: "#9fb4c8",
    marginBottom: 6,
    marginTop: 8,
    fontWeight: "700",
  },
  input: {
    backgroundColor: "#07111f",
    borderColor: "#1f334f",
    borderWidth: 1,
    borderRadius: 16,
    color: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: "#22c55e",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
  },
  primaryButtonText: {
    color: "#03120a",
    fontWeight: "900",
    fontSize: 15,
  },
  outlineButton: {
    borderColor: "#38bdf8",
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
  },
  outlineButtonText: {
    color: "#7dd3fc",
    fontWeight: "900",
  },
  dangerButton: {
    backgroundColor: "#ef4444",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
  },
  dangerButtonText: {
    color: "#2b0505",
    fontWeight: "900",
  },
  successBox: {
    backgroundColor: "#052e1a",
    borderColor: "#16a34a",
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginTop: 12,
  },
  successTitle: {
    color: "#86efac",
    fontWeight: "900",
  },
  muted: {
    color: "#9fb4c8",
    fontSize: 13,
    marginTop: 4,
  },
  listItem: {
    backgroundColor: "#0b1626",
    borderRadius: 16,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#1f334f",
  },
  listTitle: {
    color: "#ffffff",
    fontWeight: "900",
  },
  metricsRow: {
    flexDirection: "row",
    marginTop: 16,
  },
  metric: {
    flex: 1,
    backgroundColor: "#07111f",
    borderRadius: 18,
    padding: 12,
    marginRight: 8,
    alignItems: "center",
  },
  metricValue: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
  },
  metricLabel: {
    color: "#9fb4c8",
    fontSize: 11,
    marginTop: 3,
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
  },
  action: {
    width: "48%",
    backgroundColor: "#0b1626",
    borderRadius: 16,
    padding: 14,
    marginRight: "2%",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1f334f",
  },
  actionText: {
    color: "#ffffff",
    fontWeight: "900",
  },
  searchRow: {
    flexDirection: "row",
  },
  searchInput: {
    flex: 1,
    marginRight: 8,
  },
  searchButton: {
    backgroundColor: "#0ea5e9",
    borderRadius: 16,
    paddingHorizontal: 16,
    justifyContent: "center",
    marginBottom: 12,
  },
  searchButtonText: {
    color: "#02131f",
    fontWeight: "900",
  },
  locationChip: {
    width: 150,
    backgroundColor: "#0b1626",
    borderRadius: 18,
    padding: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#1f334f",
  },
  locationChipTitle: {
    color: "#ffffff",
    fontWeight: "900",
  },
  locationChipText: {
    color: "#9fb4c8",
    marginTop: 4,
    fontSize: 12,
  },
  routeOption: {
    backgroundColor: "#0b1626",
    borderRadius: 16,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#1f334f",
  },
  routeOptionActive: {
    borderColor: "#22c55e",
    backgroundColor: "#123458",
  },
  mapCard: {
    height: Math.min(width * 1.05, 430),
    borderRadius: 26,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#1f334f",
  },
  map: {
    flex: 1,
  },
  mapOverlay: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    backgroundColor: "rgba(6,17,31,0.92)",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1f334f",
  },
  mapTitle: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 16,
  },
  mapText: {
    color: "#9fb4c8",
    marginTop: 3,
  },
  stepRow: {
    flexDirection: "row",
    backgroundColor: "#0b1626",
    borderRadius: 14,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#1f334f",
  },
  activeStep: {
    borderColor: "#22c55e",
    backgroundColor: "#123458",
  },
  stepCircle: {
    backgroundColor: "#22c55e",
    color: "#03120a",
    width: 26,
    height: 26,
    borderRadius: 13,
    textAlign: "center",
    paddingTop: 3,
    fontWeight: "900",
    marginRight: 10,
  },
  stepText: {
    color: "#dbeafe",
    flex: 1,
    lineHeight: 20,
  },
  progressTrack: {
    height: 12,
    backgroundColor: "#07111f",
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 16,
  },
  progressFill: {
    height: 12,
    backgroundColor: "#22c55e",
    borderRadius: 999,
  },
  bigInstruction: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 28,
  },
  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 14,
  },
  featureCard: {
    width: "48%",
    backgroundColor: "#0b1626",
    borderRadius: 18,
    padding: 12,
    marginRight: "2%",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1f334f",
  },
  featureNumber: {
    color: "#5eead4",
    fontWeight: "900",
    fontSize: 12,
  },
  featureTitle: {
    color: "#ffffff",
    fontWeight: "900",
    marginTop: 6,
  },
  featureText: {
    color: "#9fb4c8",
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },
  loadingBox: {
    alignItems: "center",
    marginVertical: 14,
  },
  errorBox: {
    backgroundColor: "#3f1212",
    borderColor: "#ef4444",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  errorText: {
    color: "#fecaca",
  },
  footer: {
    color: "#64748b",
    textAlign: "center",
    fontSize: 12,
    marginTop: 4,
  },
});
