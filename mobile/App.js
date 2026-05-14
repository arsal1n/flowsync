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
  latitudeDelta: 0.35,
  longitudeDelta: 0.35,
};

const DUBAI_LOCATIONS = [
  { name: "Dubai Mall", address: "Downtown Dubai", latitude: 25.1972, longitude: 55.2744, category: "Mall" },
  { name: "Dubai Marina", address: "Dubai Marina", latitude: 25.08, longitude: 55.14, category: "District" },
  { name: "Sharjah", address: "Sharjah City", latitude: 25.3463, longitude: 55.4209, category: "City" },
  { name: "Sharjah City Centre", address: "Al Wahda Street, Sharjah", latitude: 25.3315, longitude: 55.3955, category: "Mall" },
  { name: "University City Sharjah", address: "University City, Sharjah", latitude: 25.2867, longitude: 55.4636, category: "Education" },
  { name: "DXB Airport", address: "Dubai International Airport", latitude: 25.2532, longitude: 55.3657, category: "Airport" },
  { name: "Downtown Dubai", address: "Downtown Dubai", latitude: 25.1948, longitude: 55.2708, category: "District" },
  { name: "Business Bay", address: "Business Bay", latitude: 25.186, longitude: 55.2608, category: "Business" },
  { name: "Mall of the Emirates", address: "Al Barsha", latitude: 25.1181, longitude: 55.2006, category: "Mall" },
  { name: "Academic City", address: "Dubai Academic City", latitude: 25.1256, longitude: 55.4209, category: "Education" },
  { name: "Dubai Silicon Oasis", address: "DSO", latitude: 25.125, longitude: 55.38, category: "Technology" },
  { name: "Palm Jumeirah", address: "Palm Jumeirah", latitude: 25.1124, longitude: 55.139, category: "Landmark" },
];

const DEMO_ACCOUNTS = [
  {
    role: "Driver",
    email: "driver@flowsync.local",
    description: "Route planning, traffic-aware navigation, alerts, trip summary",
  },
  {
    role: "Admin",
    email: "admin@flowsync.local",
    description: "Operations dashboard, analytics, route load monitoring",
  },
  {
    role: "RTA Operator",
    email: "rta@flowsync.local",
    description: "City traffic operations, sensors, incidents, smart routing",
  },
  {
    role: "Emergency",
    email: "emergency@flowsync.local",
    description: "Priority routing, emergency vehicle support, incident response",
  },
];

const OPERATIONS = [
  ["Routing", "Active", "In-app route generation and route alternatives"],
  ["Live Map", "Active", "Polyline, markers, bounds, current route focus"],
  ["Navigation", "Active", "Turn-by-turn flow inside FlowSync"],
  ["Traffic", "Active", "Traffic label, traffic score, alerts, incidents"],
  ["Parking", "Backend Ready", "Parking provider can be connected by API key/feed"],
  ["Emergency", "Backend Ready", "Emergency routing endpoints and role support"],
  ["Sensors", "Backend Ready", "Traffic and parking sensor ingestion endpoints"],
  ["Dashboard", "Backend Ready", "Admin and city operations dashboard endpoints"],
  ["Realtime", "Backend Ready", "Polling and SSE streaming available"],
  ["Database", "Ready", "SQLite demo now, PostgreSQL production later"],
];

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

  const latitude = Number(point.latitude ?? point.lat);
  const longitude = Number(point.longitude ?? point.lng ?? point.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
}

function routeCoordinates(route) {
  const raw =
    route?.coordinates ||
    route?.route_coordinates ||
    route?.polyline ||
    route?.polyline_points ||
    [];

  const coords = Array.isArray(raw)
    ? raw.map(normalizeCoordinate).filter(Boolean)
    : [];

  if (coords.length >= 2) {
    return coords;
  }

  return [
    { latitude: 25.1972, longitude: 55.2744 },
    { latitude: 25.23, longitude: 55.31 },
    { latitude: 25.28, longitude: 55.36 },
    { latitude: 25.3463, longitude: 55.4209 },
  ];
}

function regionFromCoordinates(coords) {
  if (!coords.length) return DEFAULT_REGION;

  const latitudes = coords.map((point) => point.latitude);
  const longitudes = coords.map((point) => point.longitude);

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

function findTokenDeep(value) {
  if (!value || typeof value !== "object") return null;

  const tokenKeys = [
    "access_token",
    "accessToken",
    "token",
    "jwt",
    "auth_token",
    "authToken",
    "session_token",
    "sessionToken",
  ];

  for (const key of tokenKeys) {
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

function getTrafficDisplay(route) {
  if (route?.traffic_display) return route.traffic_display;
  if (route?.traffic_description) return route.traffic_description;

  const score = route?.traffic_score ?? route?.congestion_score;

  if (score === undefined || score === null) {
    return "Traffic data pending";
  }

  if (score >= 8) return `Heavy traffic • ${score}/10`;
  if (score >= 6) return `Moderate traffic • ${score}/10`;
  if (score >= 4) return `Light traffic • ${score}/10`;
  return `Clear traffic • ${score}/10`;
}

function getRouteName(route) {
  return route?.route_name || route?.name || "Recommended Route";
}

function getRouteDestination(route, fallback) {
  return route?.destination || fallback || "Destination";
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
  const [locations, setLocations] = useState(DUBAI_LOCATIONS);
  const [query, setQuery] = useState("shj");

  const [startLocation, setStartLocation] = useState("Dubai Mall");
  const [destination, setDestination] = useState("shj");
  const [routeResult, setRouteResult] = useState(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);

  const [mapRegion, setMapRegion] = useState(DEFAULT_REGION);
  const [userLocation, setUserLocation] = useState(null);

  const [sessionId, setSessionId] = useState("");
  const [requestId, setRequestId] = useState("");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [tripSummary, setTripSummary] = useState(null);

  const routes = useMemo(() => {
    const all =
      routeResult?.all_routes ||
      routeResult?.routes ||
      routeResult?.data?.all_routes ||
      [];

    if (Array.isArray(all) && all.length > 0) return all;

    const recommended =
      routeResult?.recommended_route ||
      routeResult?.recommendedRoute ||
      routeResult?.data?.recommended_route ||
      null;

    return recommended ? [recommended] : [];
  }, [routeResult]);

  const selectedRoute = routes[selectedRouteIndex] || routes[0] || null;

  const coords = useMemo(() => routeCoordinates(selectedRoute), [selectedRoute]);

  const steps = useMemo(() => {
    return (
      selectedRoute?.turn_by_turn_steps ||
      selectedRoute?.turn_steps ||
      selectedRoute?.steps ||
      []
    );
  }, [selectedRoute]);

  const currentStep = steps[currentStepIndex] || null;

  const progressPercent =
    steps.length > 0
      ? Math.min(100, Math.round(((currentStepIndex + 1) / steps.length) * 100))
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
      const data = await apiRequest("/api/health");
      setHealth(data);
    });
  }

  async function login() {
    await runAction(async () => {
      const data = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      const nextToken = findTokenDeep(data);

      const userData = data.user ||
        data.data?.user || {
          name: email.includes("admin")
            ? "FlowSync Admin"
            : email.includes("emergency")
            ? "Emergency Operator"
            : email.includes("rta")
            ? "RTA Operator"
            : "FlowSync Driver",
          email,
          role: email.includes("admin")
            ? "admin"
            : email.includes("emergency")
            ? "emergency"
            : email.includes("rta")
            ? "rta"
            : "driver",
        };

      setUser(userData);
      setToken(nextToken || "DEMO_LOCAL_TOKEN");
      setScreen("dashboard");

      if (!nextToken) {
        setError("Login accepted. Demo token mode active for mobile.");
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

  async function useMyLocation() {
    await runAction(async () => {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        throw new Error("Location permission denied.");
      }

      const current = await Location.getCurrentPositionAsync({});
      const next = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      };

      setUserLocation(next);
      setMapRegion({
        ...next,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      });
    });
  }

  async function generateRoute() {
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

      const firstRoute =
        data.recommended_route ||
        data.routes?.[0] ||
        data.all_routes?.[0] ||
        data.data?.recommended_route;

      const nextCoords = routeCoordinates(firstRoute);
      setMapRegion(regionFromCoordinates(nextCoords));
      setScreen("map");
    });
  }

  async function startNavigation() {
    await runAction(async () => {
      if (!selectedRoute) {
        throw new Error("Generate a route before starting navigation.");
      }

      const routeName = getRouteName(selectedRoute);
      let data = null;

      const bodies = [
        {
          request_id: requestId || routeResult?.database_record?.request_id || null,
          start_location: startLocation,
          destination: getRouteDestination(selectedRoute, destination),
          route_name: routeName,
          selected_route: selectedRoute,
          route: selectedRoute,
          current_step_index: 0,
        },
        {
          start_location: startLocation,
          destination: getRouteDestination(selectedRoute, destination),
          selected_route: routeName,
          route_name: routeName,
          route_steps: steps,
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
      setScreen("navigation");

      if (!data) {
        setError("Backend trip start failed. In-app demo navigation is still active.");
      }
    });
  }

  async function nextStep() {
    await runAction(async () => {
      if (!sessionId) {
        throw new Error("Start navigation first.");
      }

      const nextIndex = Math.min(
        currentStepIndex + 1,
        Math.max(steps.length - 1, 0)
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
          setError("Backend progress update failed. Continuing in-app locally.");
        }
      }

      setCurrentStepIndex(nextIndex);
    });
  }

  async function endTrip() {
    await runAction(async () => {
      if (!sessionId) {
        throw new Error("No active trip.");
      }

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
        route_name: getRouteName(selectedRoute),
        start_location: startLocation,
        destination: getRouteDestination(selectedRoute, destination),
        traffic: getTrafficDisplay(selectedRoute),
        distance: selectedRoute?.distance_text || `${selectedRoute?.distance_km || "--"} km`,
        duration: selectedRoute?.duration_text || `${selectedRoute?.estimated_time || "--"} min`,
        progress: progressPercent,
      });

      setScreen("summary");
    });
  }

  function openBackupNavigation() {
    const url =
      `https://www.google.com/maps/dir/?api=1` +
      `&origin=${encodeURIComponent(startLocation)}` +
      `&destination=${encodeURIComponent(getRouteDestination(selectedRoute, destination))}` +
      `&travelmode=driving`;

    Linking.openURL(url);
  }

  function focusRoute(route = selectedRoute) {
    const nextCoords = routeCoordinates(route);
    const nextRegion = regionFromCoordinates(nextCoords);
    setMapRegion(nextRegion);

    if (mapRef.current) {
      mapRef.current.animateToRegion(nextRegion, 600);
    }
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
          <Text style={styles.subtitle}>In-app smart mobility navigation</Text>
        </View>
        <View style={styles.liveBadge}>
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>
    );
  }

  function renderTabs() {
    if (!token) return null;

    const tabs = [
      ["Home", "dashboard"],
      ["Route", "route"],
      ["Map", "map"],
      ["Navigate", "navigation"],
      ["Ops", "operations"],
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
          <Text style={styles.heroTitle}>Dubai to Sharjah, inside FlowSync.</Text>
          <Text style={styles.heroText}>
            Active map, in-app route line, markers, traffic display, and turn-by-turn navigation.
          </Text>

          <TouchableOpacity style={styles.outlineButton} onPress={testBackend}>
            <Text style={styles.outlineButtonText}>Test Backend</Text>
          </TouchableOpacity>

          {health && (
            <View style={styles.successBox}>
              <Text style={styles.successTitle}>Backend online</Text>
              <Text style={styles.muted}>{health.message || health.service}</Text>
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
            <Text style={styles.primaryButtonText}>Enter App</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Role accounts</Text>
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
          <Text style={styles.heroTitle}>Ready for smart navigation.</Text>
          <Text style={styles.heroText}>
            {user?.name || "FlowSync Driver"} • {user?.role || "driver"}
          </Text>

          <View style={styles.metricsRow}>
            <Metric label="Backend" value="Live" />
            <Metric label="Map" value="In-app" />
            <Metric label="Ops" value="30+" />
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={() => setScreen("route")}>
            <Text style={styles.primaryButtonText}>Plan Route</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Quick actions</Text>

          <View style={styles.actionGrid}>
            <Action title="Use GPS" onPress={useMyLocation} />
            <Action title="Search SHJ" onPress={searchLocations} />
            <Action title="Get Route" onPress={generateRoute} />
            <Action title="Open Map" onPress={() => setScreen("map")} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>System status</Text>
          <Text style={styles.muted}>API: {API_BASE_URL}</Text>
          <Text style={styles.muted}>Routing: {routeResult?.provider_status || "ready"}</Text>
          <Text style={styles.muted}>Navigation: In-app primary mode</Text>
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
              placeholder="Search Dubai / Sharjah"
              placeholderTextColor="#8aa0b8"
            />

            <TouchableOpacity style={styles.searchButton} onPress={searchLocations}>
              <Text style={styles.searchButtonText}>Search</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {locations.slice(0, 12).map((item, index) => (
              <TouchableOpacity
                key={`${item.name}-${index}`}
                style={styles.locationChip}
                onPress={() => setDestination(item.name)}
              >
                <Text style={styles.locationChipTitle}>{item.name}</Text>
                <Text style={styles.locationChipText}>
                  {item.city || item.category || item.type || "UAE"}
                </Text>
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

          <TouchableOpacity style={styles.primaryButton} onPress={generateRoute}>
            <Text style={styles.primaryButtonText}>Generate In-app Route</Text>
          </TouchableOpacity>
        </View>

        {routes.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.title}>Route options</Text>

            {routes.slice(0, 4).map((route, index) => (
              <TouchableOpacity
                key={`${getRouteName(route)}-${index}`}
                style={[
                  styles.routeOption,
                  selectedRouteIndex === index ? styles.routeOptionActive : null,
                ]}
                onPress={() => {
                  setSelectedRouteIndex(index);
                  focusRoute(route);
                }}
              >
                <Text style={styles.listTitle}>{getRouteName(route)}</Text>
                <Text style={styles.muted}>
                  {route.duration_text || `${route.estimated_time || "--"} min`} •{" "}
                  {route.distance_text || `${route.distance_km || "--"} km`}
                </Text>
                <Text style={styles.trafficText}>{getTrafficDisplay(route)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </>
    );
  }

  function renderMapView({ compact = false } = {}) {
    const start = coords[0];
    const end = coords[coords.length - 1];

    return (
      <View style={[styles.mapCard, compact ? styles.mapCardCompact : null]}>
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
            <Marker
              coordinate={end}
              title="Destination"
              description={getRouteDestination(selectedRoute, destination)}
            />
          )}

          {userLocation && (
            <Marker coordinate={userLocation} title="You" pinColor="blue" />
          )}

          {coords.length > 1 && (
            <Polyline coordinates={coords} strokeWidth={6} strokeColor="#22c55e" />
          )}
        </MapView>

        <View style={styles.mapOverlay}>
          <Text style={styles.mapTitle}>
            {selectedRoute ? getRouteName(selectedRoute) : "No route selected"}
          </Text>
          <Text style={styles.mapText}>
            {startLocation} → {getRouteDestination(selectedRoute, destination)}
          </Text>
          <Text style={styles.trafficText}>
            {selectedRoute ? getTrafficDisplay(selectedRoute) : "Generate a route first"}
          </Text>
        </View>
      </View>
    );
  }

  function renderMap() {
    return (
      <>
        {renderMapView()}

        <View style={styles.card}>
          <Text style={styles.title}>In-app route control</Text>

          {selectedRoute ? (
            <>
              <View style={styles.metricsRow}>
                <Metric
                  label="Time"
                  value={selectedRoute.duration_text || `${selectedRoute.estimated_time || "--"}m`}
                />
                <Metric
                  label="Distance"
                  value={selectedRoute.distance_text || `${selectedRoute.distance_km || "--"}km`}
                />
                <Metric
                  label="Traffic"
                  value={`${selectedRoute.traffic_score ?? selectedRoute.congestion_score ?? "--"}/10`}
                />
              </View>

              <Text style={styles.trafficBig}>{getTrafficDisplay(selectedRoute)}</Text>

              <TouchableOpacity style={styles.primaryButton} onPress={startNavigation}>
                <Text style={styles.primaryButtonText}>Start In-app Navigation</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.outlineButton} onPress={() => focusRoute()}>
                <Text style={styles.outlineButtonText}>Center Route</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.smallBackupButton} onPress={openBackupNavigation}>
                <Text style={styles.smallBackupText}>Backup only: open system maps</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.muted}>Generate a route first.</Text>
              <TouchableOpacity style={styles.primaryButton} onPress={() => setScreen("route")}>
                <Text style={styles.primaryButtonText}>Go to Route Planner</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {steps.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.title}>Directions preview</Text>
            {steps.slice(0, 6).map((step, index) => (
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
    return (
      <>
        {renderMapView({ compact: true })}

        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>
            {sessionId ? "In-app navigation active" : "Navigation not started"}
          </Text>
          <Text style={styles.heroText}>
            {startLocation} → {getRouteDestination(selectedRoute, destination)}
          </Text>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>

          <Text style={styles.muted}>{progressPercent}% route progress</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Current instruction</Text>

          <Text style={styles.bigInstruction}>
            {currentStep?.instruction ||
              currentStep?.text ||
              "Start navigation to begin turn-by-turn guidance."}
          </Text>

          <Text style={styles.muted}>
            Step {Math.min(currentStepIndex + 1, Math.max(steps.length, 1))} of{" "}
            {Math.max(steps.length, 1)}
          </Text>

          <TouchableOpacity style={styles.primaryButton} onPress={nextStep}>
            <Text style={styles.primaryButtonText}>Next Step</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dangerButton} onPress={endTrip}>
            <Text style={styles.dangerButtonText}>End Trip</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.smallBackupButton} onPress={openBackupNavigation}>
            <Text style={styles.smallBackupText}>Emergency backup: system maps</Text>
          </TouchableOpacity>
        </View>

        {steps.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.title}>Turn-by-turn</Text>

            {steps.slice(0, 10).map((step, index) => (
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

  function renderOperations() {
    return (
      <>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Operations Hub</Text>
          <Text style={styles.heroText}>
            Structured view of FlowSync city mobility modules. This is not an ad page;
            it shows what is active, backend-ready, or provider-ready.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Operational modules</Text>

          {OPERATIONS.map((item, index) => (
            <View key={`${item[0]}-${index}`} style={styles.operationItem}>
              <View style={styles.operationNumber}>
                <Text style={styles.operationNumberText}>{index + 1}</Text>
              </View>

              <View style={styles.operationBody}>
                <Text style={styles.listTitle}>{item[0]}</Text>
                <Text style={styles.muted}>{item[2]}</Text>
              </View>

              <View style={styles.statusPill}>
                <Text style={styles.statusText}>{item[1]}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Current route intelligence</Text>
          <Text style={styles.muted}>
            Route: {selectedRoute ? getRouteName(selectedRoute) : "No route selected"}
          </Text>
          <Text style={styles.muted}>
            Destination: {getRouteDestination(selectedRoute, destination)}
          </Text>
          <Text style={styles.trafficBig}>
            {selectedRoute ? getTrafficDisplay(selectedRoute) : "Traffic pending"}
          </Text>
          <Text style={styles.muted}>
            Provider: {routeResult?.provider_status || "waiting for route"}
          </Text>
        </View>
      </>
    );
  }

  function renderAccount() {
    return (
      <>
        <View style={styles.card}>
          <Text style={styles.title}>Account</Text>
          <Text style={styles.listTitle}>{user?.name || "FlowSync User"}</Text>
          <Text style={styles.muted}>{user?.email || email}</Text>
          <Text style={styles.muted}>Role: {user?.role || "driver"}</Text>

          <TouchableOpacity
            style={styles.dangerButton}
            onPress={() => {
              setToken("");
              setUser(null);
              setSessionId("");
              setScreen("login");
            }}
          >
            <Text style={styles.dangerButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Switch role</Text>
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
            <Text style={styles.muted}>Duration: {tripSummary.duration}</Text>
            <Text style={styles.muted}>Distance: {tripSummary.distance}</Text>
            <Text style={styles.trafficBig}>{tripSummary.traffic}</Text>
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
        {screen === "navigation" && renderNavigation()}
        {screen === "operations" && renderOperations()}
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
          FlowSync uses in-app navigation first. External maps are backup only.
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
  smallBackupButton: {
    borderColor: "#475569",
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: "center",
    marginTop: 10,
  },
  smallBackupText: {
    color: "#94a3b8",
    fontWeight: "800",
    fontSize: 12,
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
  trafficText: {
    color: "#fbbf24",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 6,
  },
  trafficBig: {
    color: "#fbbf24",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 12,
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
    fontSize: 18,
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
    width: 160,
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
    height: Math.min(width * 1.08, 440),
    borderRadius: 26,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#1f334f",
  },
  mapCardCompact: {
    height: 310,
  },
  map: {
    flex: 1,
  },
  mapOverlay: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    backgroundColor: "rgba(6,17,31,0.93)",
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
  operationItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0b1626",
    borderRadius: 16,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#1f334f",
  },
  operationNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  operationNumberText: {
    color: "#03120a",
    fontWeight: "900",
  },
  operationBody: {
    flex: 1,
  },
  statusPill: {
    backgroundColor: "#0f2440",
    borderColor: "#38bdf8",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    color: "#7dd3fc",
    fontSize: 10,
    fontWeight: "900",
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
