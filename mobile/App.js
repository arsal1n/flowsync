import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Linking,
  PanResponder,
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
  latitudeDelta: 0.22,
  longitudeDelta: 0.22,
};

const UAE_LOCATIONS = [
  { name: "Dubai Mall", latitude: 25.1972, longitude: 55.2744, category: "Mall" },
  { name: "Dubai Marina", latitude: 25.08, longitude: 55.14, category: "Waterfront" },
  { name: "DXB Airport", latitude: 25.2532, longitude: 55.3657, category: "Airport" },
  { name: "Business Bay", latitude: 25.186, longitude: 55.2608, category: "Business" },
  { name: "Academic City", latitude: 25.1256, longitude: 55.4209, category: "Education" },
  { name: "Sharjah", latitude: 25.3463, longitude: 55.4209, category: "City" },
  { name: "Mall of the Emirates", latitude: 25.1181, longitude: 55.2006, category: "Mall" },
  { name: "Jumeirah", latitude: 25.2048, longitude: 55.2553, category: "District" },
  { name: "Expo City Dubai", latitude: 24.9606, longitude: 55.1496, category: "Event" },
];

const DEMO_ACCOUNTS = [
  { role: "Driver", email: "driver@flowsync.local", description: "Route search and navigation" },
  { role: "Admin", email: "admin@flowsync.local", description: "Operations dashboard" },
  { role: "Emergency", email: "emergency@flowsync.local", description: "Priority routing" },
];

const FALLBACK_ROUTES = [
  {
    route_id: "ROUTE-A",
    route_name: "Route A - Sheikh Zayed Road",
    estimated_time_min: 22,
    eta_text: "22 min",
    distance_km: 14.5,
    distance_text: "14.5 km",
    traffic_delay_min: 8,
    congestion_score: 8,
    traffic_display: "Heavy traffic • 8/10",
    route_score: 72.4,
    flowsync_score: 72.4,
    is_recommended: false,
    recommendation_reason: "Fast route, but it adds pressure to a crowded corridor.",
    assigned_users: 18,
    road_capacity: 22,
    load_ratio: 0.82,
    load_status: "high",
    route_coordinates: [
      { latitude: 25.1972, longitude: 55.2744 },
      { latitude: 25.167, longitude: 55.217 },
      { latitude: 25.124, longitude: 55.18 },
      { latitude: 25.08, longitude: 55.14 },
    ],
    turn_by_turn_steps: [
      { step_index: 0, instruction: "Start from Dubai Mall and head toward Sheikh Zayed Road.", distance_m: 900, duration_min: 3 },
      { step_index: 1, instruction: "Merge onto Sheikh Zayed Road southbound.", distance_m: 5200, duration_min: 8 },
      { step_index: 2, instruction: "Continue toward Dubai Marina exit.", distance_m: 6200, duration_min: 9 },
      { step_index: 3, instruction: "Take the exit toward Dubai Marina.", distance_m: 2200, duration_min: 4 },
      { step_index: 4, instruction: "Arrive at Dubai Marina.", distance_m: 0, duration_min: 0 },
    ],
    alerts: [{ title: "Heavy traffic on Sheikh Zayed Road", severity: "high" }],
    incidents: [],
    in_app_navigation: true,
    external_navigation_required: false,
  },
  {
    route_id: "ROUTE-D",
    route_name: "Route D - Jumeirah Coastal Alternative",
    estimated_time_min: 25,
    eta_text: "25 min",
    distance_km: 21.2,
    distance_text: "21.2 km",
    traffic_delay_min: 3,
    congestion_score: 3,
    traffic_display: "Light traffic • 3/10",
    route_score: 24.7,
    flowsync_score: 24.7,
    is_recommended: true,
    recommendation_reason:
      "Best balanced route because it avoids heavy congestion near Sheikh Zayed Road and has lower route load.",
    assigned_users: 6,
    road_capacity: 22,
    load_ratio: 0.27,
    load_status: "low",
    route_coordinates: [
      { latitude: 25.1972, longitude: 55.2744 },
      { latitude: 25.185, longitude: 55.24 },
      { latitude: 25.15, longitude: 55.205 },
      { latitude: 25.1124, longitude: 55.139 },
      { latitude: 25.08, longitude: 55.14 },
    ],
    turn_by_turn_steps: [
      { step_index: 0, instruction: "Start from Dubai Mall and head toward Jumeirah Coastal Road.", distance_m: 1200, duration_min: 3 },
      { step_index: 1, instruction: "Merge onto Jumeirah Coastal Road.", distance_m: 4800, duration_min: 6 },
      { step_index: 2, instruction: "Continue on Jumeirah Coastal Road; FlowSync is monitoring traffic pressure.", distance_m: 7800, duration_min: 9 },
      { step_index: 3, instruction: "Take the connector toward Dubai Marina.", distance_m: 3200, duration_min: 5 },
      { step_index: 4, instruction: "Arrive at Dubai Marina.", distance_m: 0, duration_min: 0 },
    ],
    alerts: [{ title: "FlowSync balanced route active", severity: "low" }],
    incidents: [],
    in_app_navigation: true,
    external_navigation_required: false,
  },
  {
    route_id: "ROUTE-C",
    route_name: "Route C - Business Bay Side Streets",
    estimated_time_min: 30,
    eta_text: "30 min",
    distance_km: 18.1,
    distance_text: "18.1 km",
    traffic_delay_min: 2,
    congestion_score: 2,
    traffic_display: "Clear roads • 2/10",
    route_score: 31.8,
    flowsync_score: 31.8,
    is_recommended: false,
    recommendation_reason: "Low congestion, but longer than the best balanced route.",
    assigned_users: 4,
    road_capacity: 18,
    load_ratio: 0.22,
    load_status: "low",
    route_coordinates: [
      { latitude: 25.1972, longitude: 55.2744 },
      { latitude: 25.186, longitude: 55.2608 },
      { latitude: 25.145, longitude: 55.24 },
      { latitude: 25.1181, longitude: 55.2006 },
      { latitude: 25.08, longitude: 55.14 },
    ],
    turn_by_turn_steps: [
      { step_index: 0, instruction: "Start from Dubai Mall toward Business Bay.", distance_m: 900, duration_min: 3 },
      { step_index: 1, instruction: "Use Business Bay side streets to avoid central congestion.", distance_m: 6000, duration_min: 10 },
      { step_index: 2, instruction: "Continue toward Al Barsha connector.", distance_m: 5200, duration_min: 9 },
      { step_index: 3, instruction: "Enter Dubai Marina area.", distance_m: 2100, duration_min: 4 },
    ],
    alerts: [],
    incidents: [],
    in_app_navigation: true,
    external_navigation_required: false,
  },
];

function findTokenDeep(value) {
  if (!value || typeof value !== "object") return null;

  const keys = ["access_token", "accessToken", "token", "jwt", "auth_token", "session_token"];

  for (const key of keys) {
    if (typeof value[key] === "string" && value[key].length > 5) return value[key];
  }

  for (const key of Object.keys(value)) {
    const found = findTokenDeep(value[key]);
    if (found) return found;
  }

  return null;
}

function normalizeCoordinate(point) {
  if (!point) return null;

  if (Array.isArray(point) && point.length >= 2) {
    return { latitude: Number(point[0]), longitude: Number(point[1]) };
  }

  const latitude = Number(point.latitude ?? point.lat);
  const longitude = Number(point.longitude ?? point.lng ?? point.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

function getRouteCoordinates(route) {
  const raw = route?.route_coordinates || route?.coordinates || route?.polyline_points || [];
  const normalized = Array.isArray(raw) ? raw.map(normalizeCoordinate).filter(Boolean) : [];

  if (normalized.length >= 2) return normalized;
  return FALLBACK_ROUTES[1].route_coordinates;
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

function normalizeRoute(route) {
  return {
    ...route,
    route_id: route.route_id || route.id || route.route_code || route.name || "ROUTE-UNKNOWN",
    route_name: route.route_name || route.name || "FlowSync Route",
    eta_text: route.eta_text || `${route.estimated_time_min || route.estimated_time || "--"} min`,
    distance_text: route.distance_text || `${route.distance_km || route.distance || "--"} km`,
    estimated_time_min: Number(route.estimated_time_min ?? route.estimated_time ?? 0),
    distance_km: Number(route.distance_km ?? route.distance ?? 0),
    flowsync_score: Number(route.flowsync_score ?? route.route_score ?? route.score ?? 0),
    route_coordinates: getRouteCoordinates(route),
    turn_by_turn_steps: route.turn_by_turn_steps || route.steps || route.route_steps || [],
    alerts: route.alerts || [],
    incidents: route.incidents || [],
  };
}

function normalizeRouteResponse(data) {
  const rawRoutes = data?.all_routes || data?.routes || data?.data?.all_routes || data?.data?.routes || [];
  const routes = Array.isArray(rawRoutes) && rawRoutes.length > 0 ? rawRoutes.map(normalizeRoute) : FALLBACK_ROUTES;

  const recommendedRouteId =
    data?.recommended_route_id ||
    data?.recommended_route?.route_id ||
    data?.data?.recommended_route_id ||
    routes.find((route) => route.is_recommended)?.route_id ||
    routes[0]?.route_id;

  return {
    trip_id: data?.trip_id || data?.request_id || data?.data?.trip_id || `LOCAL-TRIP-${Date.now()}`,
    recommended_route_id: recommendedRouteId,
    recommendation_reason:
      data?.recommendation_reason ||
      data?.recommended_route?.recommendation_reason ||
      "FlowSync selected the best balanced route based on ETA, congestion, route load, and incidents.",
    provider: data?.provider || data?.routing_provider || "flowsync_demo",
    provider_status: data?.provider_status || "demo_fallback_ready",
    all_routes: routes,
  };
}
function getDistanceMeters(pointA, pointB) {
  if (!pointA || !pointB) return Infinity;

  const earthRadiusMeters = 6371000;
  const lat1 = (pointA.latitude * Math.PI) / 180;
  const lat2 = (pointB.latitude * Math.PI) / 180;
  const deltaLat = ((pointB.latitude - pointA.latitude) * Math.PI) / 180;
  const deltaLng = ((pointB.longitude - pointA.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMeters * c;
}

function getRouteDistanceKm(coords, startIndex = 0) {
  if (!coords || coords.length < 2) return 0;

  let totalMeters = 0;

  for (let index = startIndex; index < coords.length - 1; index += 1) {
    totalMeters += getDistanceMeters(coords[index], coords[index + 1]);
  }

  return totalMeters / 1000;
}

function findClosestRoutePointIndex(currentLocation, coords) {
  if (!currentLocation || !coords?.length) return 0;

  let closestIndex = 0;
  let closestDistance = Infinity;

  coords.forEach((point, index) => {
    const distance = getDistanceMeters(currentLocation, point);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });

  return closestIndex;
}

function getStepCoordinate(step, index, coords) {
  const directStepPoint = normalizeCoordinate(step);

  if (directStepPoint) return directStepPoint;

  if (coords?.[index]) return coords[index];

  if (coords?.length) return coords[coords.length - 1];

  return null;
}

export default function App() {
  const mapRef = useRef(null);
  const locationWatcherRef = useRef(null);
const currentStepIndexRef = useRef(0);
const routeCoordinatesRef = useRef([]);
const turnStepsRef = useRef([]);
const selectedRouteRef = useRef(null);
const sessionIdRef = useRef("");

  const [screen, setScreen] = useState("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [email, setEmail] = useState("driver@flowsync.local");
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);

  const [startLocation, setStartLocation] = useState("Dubai Mall");
  const [destination, setDestination] = useState("Dubai Marina");
  const [routePreference, setRoutePreference] = useState("balanced");

  const [tripId, setTripId] = useState(null);
  const [routes, setRoutes] = useState(FALLBACK_ROUTES);
  const [recommendedRouteId, setRecommendedRouteId] = useState("ROUTE-D");
  const [selectedRouteId, setSelectedRouteId] = useState("ROUTE-D");
  const [providerStatus, setProviderStatus] = useState("Demo fallback active");
  const [recommendationReason, setRecommendationReason] = useState(
    "FlowSync recommends Route D because it balances travel time with lower congestion and route load."
  );

  const [mapRegion, setMapRegion] = useState(regionForCoordinates(FALLBACK_ROUTES[1].route_coordinates));
  const [userLocation, setUserLocation] = useState(null);
  const [sessionId, setSessionId] = useState("");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [tripSummary, setTripSummary] = useState(null);
const [isTracking, setIsTracking] = useState(false);
const [liveRemainingDistanceKm, setLiveRemainingDistanceKm] = useState(null);
const [liveRemainingEtaMin, setLiveRemainingEtaMin] = useState(null);
const [homeSheetExpanded, setHomeSheetExpanded] = useState(false);
const [homeSheetHidden, setHomeSheetHidden] = useState(false);  
const selectedRoute = useMemo(() => {
    return (
      routes.find((route) => route.route_id === selectedRouteId) ||
      routes.find((route) => route.route_id === recommendedRouteId) ||
      routes[0]
    );
  }, [routes, selectedRouteId, recommendedRouteId]);

  const routeCoordinates = useMemo(() => getRouteCoordinates(selectedRoute), [selectedRoute]);
  const turnSteps = selectedRoute?.turn_by_turn_steps || [];
  const activeStep = turnSteps[currentStepIndex] || turnSteps[0];
useEffect(() => {
  currentStepIndexRef.current = currentStepIndex;
}, [currentStepIndex]);

useEffect(() => {
  routeCoordinatesRef.current = routeCoordinates;
}, [routeCoordinates]);

useEffect(() => {
  turnStepsRef.current = turnSteps;
}, [turnSteps]);

useEffect(() => {
  selectedRouteRef.current = selectedRoute;
}, [selectedRoute]);

useEffect(() => {
  sessionIdRef.current = sessionId;
}, [sessionId]);

useEffect(() => {
  return () => {
    if (locationWatcherRef.current) {
      locationWatcherRef.current.remove();
      locationWatcherRef.current = null;
    }
  };
}, []);
  const progressPercent = turnSteps.length
    ? Math.round(((currentStepIndex + 1) / turnSteps.length) * 100)
    : sessionId
    ? 20
    : 0;

  const fallbackRemainingEta = Math.max(
  Math.round((selectedRoute?.estimated_time_min || 25) * (1 - progressPercent / 100)),
  1
);

const fallbackRemainingDistance = Math.max(
  ((selectedRoute?.distance_km || 0) * (1 - progressPercent / 100)).toFixed(1),
  0
);

const displayRemainingEta = liveRemainingEtaMin || fallbackRemainingEta;
const displayRemainingDistance = liveRemainingDistanceKm ?? fallbackRemainingDistance;
const sheetPanResponder = useMemo(
  () =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 10,
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 90) {
          setHomeSheetHidden(true);
          setHomeSheetExpanded(false);
          return;
        }

        if (gesture.dy > 30) {
          setHomeSheetHidden(false);
          setHomeSheetExpanded(false);
          return;
        }

        if (gesture.dy < -30) {
          setHomeSheetHidden(false);
          setHomeSheetExpanded(true);
        }
      },
    }),
  []
);
  async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token && token !== "DEMO_LOCAL_TOKEN" ? { Authorization: `Bearer ${token}` } : {}),
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
      const message = typeof data.detail === "string" ? data.detail : data.message || data.error || `HTTP ${response.status}`;
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

  async function login() {
    await runAction(async () => {
      let data = {};

      try {
        data = await apiRequest("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
      } catch {
        data = {};
      }

      const nextToken = findTokenDeep(data) || "DEMO_LOCAL_TOKEN";
      const userData = data.user || data.data?.user || {
        name: "FlowSync Driver",
        email,
        role: email.includes("admin") ? "admin" : email.includes("emergency") ? "emergency" : "driver",
      };

      setToken(nextToken);
      setUser(userData);
      setScreen("home");
    });
  }

  async function getMyLocation() {
    await runAction(async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") throw new Error("Location permission was denied.");

      const current = await Location.getCurrentPositionAsync({});
      const nextLocation = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      };

      setUserLocation(nextLocation);
      setMapRegion({ ...nextLocation, latitudeDelta: 0.04, longitudeDelta: 0.04 });
    });
  }
function updateNavigationProgressFromLocation(currentLocation) {
  const coords = routeCoordinatesRef.current;
  const steps = turnStepsRef.current;
  const route = selectedRouteRef.current;

  if (!currentLocation || !coords?.length) return;

  const closestRouteIndex = findClosestRoutePointIndex(currentLocation, coords);
  const remainingKm = getRouteDistanceKm(coords, closestRouteIndex);

  const totalRouteKm =
    Number(route?.distance_km) || getRouteDistanceKm(coords, 0) || 1;

  const totalRouteEta = Number(route?.estimated_time_min) || 25;

  const calculatedEta = Math.max(
    Math.round((remainingKm / totalRouteKm) * totalRouteEta),
    1
  );

  setLiveRemainingDistanceKm(Number(remainingKm.toFixed(1)));
  setLiveRemainingEtaMin(calculatedEta);

  const activeIndex = currentStepIndexRef.current;
  const nextStep = steps[activeIndex + 1];

  if (!nextStep) return;

  const nextStepPoint = getStepCoordinate(nextStep, activeIndex + 1, coords);

  if (!nextStepPoint) return;

  const distanceToNextStep = getDistanceMeters(currentLocation, nextStepPoint);

  if (distanceToNextStep <= 80 && activeIndex < steps.length - 1) {
    const nextIndex = activeIndex + 1;

    currentStepIndexRef.current = nextIndex;
    setCurrentStepIndex(nextIndex);

    const activeSession = sessionIdRef.current;

    if (activeSession && !activeSession.startsWith("LOCAL-")) {
      apiRequest("/api/trips/progress", {
        method: "POST",
        body: JSON.stringify({
          session_id: activeSession,
          current_step_index: nextIndex,
        }),
      }).catch(() => {
        // Do not stop navigation if backend progress update fails.
      });
    }
  }
}

async function startLiveTracking() {
  if (locationWatcherRef.current) {
    locationWatcherRef.current.remove();
    locationWatcherRef.current = null;
  }

  const permission = await Location.requestForegroundPermissionsAsync();

  if (permission.status !== "granted") {
    throw new Error("Location permission is required for real navigation.");
  }

  const current = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  const currentLocation = {
    latitude: current.coords.latitude,
    longitude: current.coords.longitude,
  };

  setUserLocation(currentLocation);
  updateNavigationProgressFromLocation(currentLocation);

  mapRef.current?.animateCamera(
    {
      center: currentLocation,
      zoom: 17,
      pitch: 55,
      heading: current.coords.heading || 0,
    },
    { duration: 800 }
  );

  locationWatcherRef.current = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 2000,
      distanceInterval: 10,
    },
    (location) => {
      const nextLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setUserLocation(nextLocation);
      updateNavigationProgressFromLocation(nextLocation);

      mapRef.current?.animateCamera(
        {
          center: nextLocation,
          zoom: 17,
          pitch: 55,
          heading: location.coords.heading || 0,
        },
        { duration: 700 }
      );
    }
  );

  setIsTracking(true);
}

function stopLiveTracking() {
  if (locationWatcherRef.current) {
    locationWatcherRef.current.remove();
    locationWatcherRef.current = null;
  }

  setIsTracking(false);
}
  async function recommendRoute() {
    await runAction(async () => {
      let data;

      try {
        data = await apiRequest("/api/routes/recommend", {
          method: "POST",
          body: JSON.stringify({
            start_location: startLocation,
            destination,
            vehicle_type: "car",
            route_preference: routePreference,
            user_role: user?.role || "driver",
          }),
        });
      } catch {
        data = {
          trip_id: `LOCAL-TRIP-${Date.now()}`,
          recommended_route_id: "ROUTE-D",
          provider: "local_demo",
          provider_status: "backend_unavailable_demo_active",
          all_routes: FALLBACK_ROUTES,
        };
      }

      const normalized = normalizeRouteResponse(data);
      setTripId(normalized.trip_id);
      setRoutes(normalized.all_routes);
      setRecommendedRouteId(normalized.recommended_route_id);
      setSelectedRouteId(normalized.recommended_route_id);
      setRecommendationReason(normalized.recommendation_reason);
      setProviderStatus(`${normalized.provider} • ${normalized.provider_status}`);

      const defaultRoute =
        normalized.all_routes.find((route) => route.route_id === normalized.recommended_route_id) ||
        normalized.all_routes[0];

      const coords = getRouteCoordinates(defaultRoute);
      setMapRegion(regionForCoordinates(coords));
      setCurrentStepIndex(0);
      setTripSummary(null);
      setScreen("home");
    });
  }
function recenterOnUserLocation() {
  if (!userLocation) {
    getMyLocation();
    return;
  }

  mapRef.current?.animateCamera(
    {
      center: userLocation,
      zoom: 17,
      pitch: 55,
    },
    { duration: 700 }
  );
}

  function selectRoute(route) {
    setSelectedRouteId(route.route_id);
    setMapRegion(regionForCoordinates(getRouteCoordinates(route)));
    setCurrentStepIndex(0);
  }

  async function startTrip() {
  await runAction(async () => {
    if (!selectedRoute) {
      throw new Error("Select a route before starting navigation.");
    }

    const body = {
      trip_id: tripId,
      selected_route_id: selectedRoute.route_id,
      route_name: selectedRoute.route_name,
      start_location: startLocation,
      destination,
      selected_route: selectedRoute,
      route_steps: selectedRoute.turn_by_turn_steps,
      current_step_index: 0,
    };

    let data = null;

    try {
      data = await apiRequest("/api/trips/start", {
        method: "POST",
        body: JSON.stringify(body),
      });
    } catch {
      data = null;
    }

    const nextSession = String(
      data?.session_id || data?.session?.session_id || `LOCAL-${Date.now()}`
    );

    setSessionId(nextSession);
    sessionIdRef.current = nextSession;

    setCurrentStepIndex(0);
    currentStepIndexRef.current = 0;

    setLiveRemainingDistanceKm(selectedRoute.distance_km || null);
    setLiveRemainingEtaMin(selectedRoute.estimated_time_min || null);

    await startLiveTracking();

    setScreen("nav");

    if (!data) {
      setError("Backend trip start unavailable. Real GPS navigation is still active.");
    }
  });
}

  async function nextStep() {
    await runAction(async () => {
      if (!sessionId) throw new Error("Start navigation first.");

      const nextIndex = Math.min(currentStepIndex + 1, Math.max(turnSteps.length - 1, 0));

      if (!sessionId.startsWith("LOCAL-")) {
        try {
          await apiRequest("/api/trips/progress", {
            method: "POST",
            body: JSON.stringify({ session_id: sessionId, current_step_index: nextIndex }),
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
    if (!sessionId) {
      throw new Error("No active session.");
    }

    stopLiveTracking();

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
      route_id: selectedRoute.route_id,
      route_name: selectedRoute.route_name,
      start_location: startLocation,
      destination,
      eta_text: selectedRoute.eta_text,
      distance_text: selectedRoute.distance_text,
      congestion_score: selectedRoute.congestion_score,
      flowsync_score: selectedRoute.flowsync_score || selectedRoute.route_score,
      progress: progressPercent,
    });

    setSessionId("");
    sessionIdRef.current = "";
    setLiveRemainingDistanceKm(null);
    setLiveRemainingEtaMin(null);
    setScreen("summary");
  });
}

  function swapLocations() {
    setStartLocation(destination);
    setDestination(startLocation);
  }

  function renderHeader() {
  return null;
}

  function renderTabs() {
  if (!token || screen === "nav") return null;

  const tabs = [
    ["Explore", "home"],
    ["Routes", "routes"],
    ["Ops", "operations"],
    ["Me", "account"],
  ];

  return (
    <View style={styles.gmBottomTabs}>
      {tabs.map(([label, value]) => (
        <TouchableOpacity
          key={value}
          style={[
            styles.gmBottomTab,
            screen === value ? styles.gmBottomTabActive : null,
          ]}
          onPress={() => setScreen(value)}
        >
          <Text
            style={[
              styles.gmBottomTabText,
              screen === value ? styles.gmBottomTabTextActive : null,
            ]}
          >
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

  function renderLogin() {
    return (
      <ScrollView contentContainerStyle={styles.loginContainer}>
        <Text style={styles.logoHero}>FlowSync</Text>
        <Text style={styles.loginSubtitle}>Smart City Navigation</Text>

        <View style={styles.loginCard}>
          <Text style={styles.heroTitle}>Move through Dubai smarter.</Text>
          <Text style={styles.bodyText}>Plan routes, compare congestion, start in-app navigation, and see why FlowSync selected your route.</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" />

          <Text style={styles.label}>Password</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />

          <TouchableOpacity style={styles.primaryButton} onPress={login}>
            <Text style={styles.primaryButtonText}>Enter FlowSync</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Demo accounts</Text>
          {DEMO_ACCOUNTS.map((account) => (
            <TouchableOpacity key={account.email} style={styles.demoRow} onPress={() => setEmail(account.email)}>
              <Text style={styles.listTitle}>{account.role}</Text>
              <Text style={styles.muted}>{account.email}</Text>
              <Text style={styles.muted}>{account.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  }

  function renderMap({ navigation = false } = {}) {
  const start = routeCoordinates[0];
  const end = routeCoordinates[routeCoordinates.length - 1];

  return (
    <View style={styles.gmMapShell}>
      <MapView
        ref={mapRef}
        style={styles.gmMap}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        region={mapRegion}
        onRegionChangeComplete={setMapRegion}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {start && (
          <Marker coordinate={start} title="Start" description={startLocation} />
        )}

        {end && (
          <Marker coordinate={end} title="Destination" description={destination} />
        )}

        {!navigation && userLocation && (
          <Marker coordinate={userLocation} title="You" pinColor="blue" />
        )}

        {navigation && userLocation && (
          <Marker
            coordinate={userLocation}
            title="FlowSync vehicle"
            description="Real GPS location"
            pinColor="green"
          />
        )}

        {routeCoordinates.length > 1 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeWidth={navigation ? 9 : 7}
            strokeColor={navigation ? "#00d9ff" : "#22c55e"}
          />
        )}
      </MapView>

      <View style={styles.gmMapButtons}>
        <TouchableOpacity style={styles.gmCircleButton} onPress={getMyLocation}>
          <Text style={styles.gmCircleButtonText}>⌖</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.gmCircleButton}>
          <Text style={styles.gmCircleButtonText}>▣</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.gmCircleButton}>
          <Text style={styles.gmCircleButtonText}>⚠</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

  function renderHome() {
  const isCollapsed = !homeSheetExpanded;

  return (
    <View style={styles.gmScreen}>
      {renderMap()}

      <View style={styles.gmSearchCard}>
        <View style={styles.gmSearchTop}>
          <Text style={styles.gmSearchIcon}>⌕</Text>

          <View style={styles.gmSearchInputs}>
            <TextInput
              style={styles.gmSearchInput}
              value={startLocation}
              onChangeText={setStartLocation}
              placeholder="Start location"
              placeholderTextColor="#9ca3af"
            />

            <View style={styles.gmDivider} />

            <TextInput
              style={styles.gmSearchInput}
              value={destination}
              onChangeText={setDestination}
              placeholder="Where to?"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <TouchableOpacity style={styles.gmSwapButton} onPress={swapLocations}>
            <Text style={styles.gmSwapText}>⇅</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.gmFindButton}
          onPress={() => {
            setHomeSheetHidden(false);
            setHomeSheetExpanded(false);
            recommendRoute();
          }}
        >
          <Text style={styles.gmFindButtonText}>Find FlowSync Route</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.gmChipRow}
      >
        {["Restaurants", "Parking", "Traffic", "Alerts", "Low congestion"].map(
          (item) => (
            <TouchableOpacity key={item} style={styles.gmChip}>
              <Text style={styles.gmChipText}>{item}</Text>
            </TouchableOpacity>
          )
        )}
      </ScrollView>

      {homeSheetHidden ? (
        <TouchableOpacity
          style={styles.gmHiddenRoutePill}
          onPress={() => {
            setHomeSheetHidden(false);
            setHomeSheetExpanded(false);
          }}
        >
          <View>
            <Text style={styles.gmHiddenRouteTitle}>
              {selectedRoute?.eta_text || "--"} • {selectedRoute?.route_id}
            </Text>
            <Text style={styles.gmHiddenRouteSub}>Show route details</Text>
          </View>

          <Text style={styles.gmHiddenRouteArrow}>⌃</Text>
        </TouchableOpacity>
      ) : (
        <View
          style={[
            styles.gmRouteSheet,
            isCollapsed
              ? styles.gmRouteSheetCollapsed
              : styles.gmRouteSheetExpanded,
          ]}
        >
          <View
            style={styles.gmSheetHandleButton}
            {...sheetPanResponder.panHandlers}
          >
            <View style={styles.gmHandle} />
            <Text style={styles.gmSwipeHint}>
              {isCollapsed
                ? "Swipe up for details • swipe down to hide"
                : "Swipe down to collapse or hide"}
            </Text>
          </View>

          <View style={styles.gmSheetHeader}>
            <View style={{ flex: 1 }}>
              <Text
                style={styles.gmRouteTitle}
                numberOfLines={isCollapsed ? 1 : 3}
              >
                {selectedRoute?.route_name || "FlowSync Route"}
              </Text>

              <Text style={styles.gmRouteSub}>
                {startLocation} → {destination}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.gmSheetToggleButton}
              onPress={() => {
                if (homeSheetExpanded) {
                  setHomeSheetExpanded(false);
                } else {
                  setHomeSheetHidden(false);
                  setHomeSheetExpanded(true);
                }
              }}
            >
              <Text style={styles.gmSheetToggleText}>
                {isCollapsed ? "⌃" : "⌄"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.gmMiniMetrics}>
            <View style={styles.gmMiniMetric}>
              <Text style={styles.gmMiniMetricValue}>
                {selectedRoute?.eta_text || "--"}
              </Text>
              <Text style={styles.gmMiniMetricLabel}>ETA</Text>
            </View>

            <View style={styles.gmMiniMetric}>
              <Text style={styles.gmMiniMetricValue}>
                {selectedRoute?.distance_text || "--"}
              </Text>
              <Text style={styles.gmMiniMetricLabel}>Distance</Text>
            </View>

            <View style={styles.gmMiniMetric}>
              <Text style={styles.gmMiniMetricValue}>
                {selectedRoute?.congestion_score ?? "--"}
              </Text>
              <Text style={styles.gmMiniMetricLabel}>Traffic</Text>
            </View>
          </View>

          {homeSheetExpanded && (
            <View style={styles.gmFlowBox}>
              <Text style={styles.gmFlowTitle}>Why FlowSync chose this</Text>
              <Text style={styles.gmFlowText}>
                {selectedRoute?.recommendation_reason || recommendationReason}
              </Text>
              <Text style={styles.gmFlowSmall}>
                Selected Route: {selectedRoute?.route_id} • Score:{" "}
                {selectedRoute?.flowsync_score || selectedRoute?.route_score}
              </Text>
              <Text style={styles.gmFlowSmall}>
                Load: {selectedRoute?.assigned_users || 0}/
                {selectedRoute?.road_capacity || "--"} •{" "}
                {selectedRoute?.load_status || "balanced"}
              </Text>
            </View>
          )}

          <View style={styles.gmActionRow}>
            <TouchableOpacity
              style={styles.gmSecondaryButton}
              onPress={() => setScreen("routes")}
            >
              <Text style={styles.gmSecondaryButtonText}>Routes</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.gmPrimaryButton} onPress={startTrip}>
              <Text style={styles.gmPrimaryButtonText}>Start</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.gmHideSheetButton}
            onPress={() => {
              setHomeSheetHidden(true);
              setHomeSheetExpanded(false);
            }}
          >
            <Text style={styles.gmHideSheetText}>Hide route panel</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

  function renderRoutes() {
    return (
      <ScrollView contentContainerStyle={styles.screenContainer}>
        <Text style={styles.pageTitle}>Route options</Text>
        <Text style={styles.bodyText}>Recommended route is only the default. If you select Route D, map, ETA, navigation, and trip summary all use Route D.</Text>

        {routes.map((route) => (
          <TouchableOpacity key={route.route_id} style={[styles.routeCard, route.route_id === selectedRouteId ? styles.routeCardActive : null]} onPress={() => selectRoute(route)}>
            <View style={styles.sheetTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.routeName}>{route.route_name}</Text>
                <Text style={styles.muted}>{route.traffic_display || `Traffic ${route.congestion_score}/10`}</Text>
              </View>
              {route.route_id === recommendedRouteId ? <Text style={styles.recommendedPill}>Best</Text> : null}
              {route.route_id === selectedRouteId ? <Text style={styles.selectedPill}>Selected</Text> : null}
            </View>

            <View style={styles.metricsRow}>
              <Metric label="ETA" value={route.eta_text || `${route.estimated_time_min} min`} />
              <Metric label="Distance" value={route.distance_text || `${route.distance_km} km`} />
              <Metric label="Score" value={String(route.flowsync_score || route.route_score)} />
            </View>

            <Text style={styles.reasonText}>{route.recommendation_reason}</Text>
            <View style={styles.loadTrack}><View style={[styles.loadFill, { width: `${Math.min((route.load_ratio || 0.2) * 100, 100)}%` }]} /></View>
            <Text style={styles.muted}>Route load: {route.assigned_users || 0}/{route.road_capacity || "--"} • {route.load_status || "balanced"}</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.primaryButton} onPress={() => setScreen("home")}>
          <Text style={styles.primaryButtonText}>Use Selected Route</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

function renderNavigation() {
  return (
    <View style={styles.gmScreen}>
      {renderMap({ navigation: true })}

      <View style={styles.gmNavInstruction}>
        <View style={styles.gmArrowBox}>
          <Text style={styles.gmArrowText}>↑</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.gmNavTitle}>
            {activeStep?.instruction || "Continue on selected route"}
          </Text>

          <Text style={styles.gmNavSub}>
            Step {Math.min(currentStepIndex + 1, Math.max(turnSteps.length, 1))} of{" "}
            {Math.max(turnSteps.length, 1)}
          </Text>
        </View>
      </View>

      <View style={styles.gmNavFloating}>
        <TouchableOpacity style={styles.gmCircleButton} onPress={getMyLocation}>
          <Text style={styles.gmCircleButtonText}>⌖</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.gmCircleButton}>
          <Text style={styles.gmCircleButtonText}>🔇</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.gmReportButton}>
          <Text style={styles.gmReportText}>⚠ Report</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.gmNavSheet}>
        <View style={styles.gmHandle} />

        <View style={styles.gmNavMetrics}>
          <View style={{ flex: 1 }}>
            <Text style={styles.gmNavEta}>{displayRemainingEta} min</Text>
            <Text style={styles.gmRouteSub}>
              {displayRemainingDistance} km •{" "}
              {selectedRoute?.traffic_display || "Live traffic"}
            </Text>
          </View>

          <TouchableOpacity style={styles.gmEndIconButton} onPress={endTrip}>
            <Text style={styles.gmEndIconText}>×</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.gmProgressTrack}>
          <View
            style={[
              styles.gmProgressFill,
              { width: `${progressPercent}%` },
            ]}
          />
        </View>

        <TouchableOpacity style={styles.gmDangerWide} onPress={endTrip}>
          <Text style={styles.gmDangerText}>End Trip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

  function renderOperations() {
    return (
      <ScrollView contentContainerStyle={styles.screenContainer}>
        <Text style={styles.pageTitle}>Operations Hub</Text>
        <View style={styles.card}>
          <Text style={styles.title}>Provider status</Text>
          <Text style={styles.muted}>Backend: {API_BASE_URL}</Text>
          <Text style={styles.muted}>Status: {providerStatus}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.title}>Today</Text>
          <View style={styles.metricsRow}>
            <Metric label="Trips" value="124" />
            <Metric label="Avoided" value="18%" />
            <Metric label="CO₂" value="Low" />
          </View>
        </View>
      </ScrollView>
    );
  }

  function renderAccount() {
    return (
      <ScrollView contentContainerStyle={styles.screenContainer}>
        <Text style={styles.pageTitle}>Profile</Text>
        <View style={styles.card}>
          <Text style={styles.title}>{user?.name || "FlowSync User"}</Text>
          <Text style={styles.muted}>{user?.email || email}</Text>
          <Text style={styles.muted}>Role: {user?.role || "driver"}</Text>
          <TouchableOpacity style={styles.dangerButton} onPress={() => { setToken(""); setUser(null); setScreen("login"); }}>
            <Text style={styles.dangerButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  function renderSummary() {
    return (
      <ScrollView contentContainerStyle={styles.screenContainer}>
        <Text style={styles.pageTitle}>Trip summary</Text>
        <View style={styles.card}>
          {tripSummary ? (
            <>
              <Text style={styles.title}>Trip completed</Text>
              <Text style={styles.routeName}>{tripSummary.route_name}</Text>
              <Text style={styles.muted}>{tripSummary.start_location} → {tripSummary.destination}</Text>
              <View style={styles.metricsRow}>
                <Metric label="Time" value={tripSummary.eta_text} />
                <Metric label="Distance" value={tripSummary.distance_text} />
                <Metric label="Score" value={String(tripSummary.flowsync_score)} />
              </View>
              <Text style={styles.selectedText}>Route used: {tripSummary.route_id}</Text>
              <TouchableOpacity style={styles.primaryButton} onPress={() => setScreen("home")}>
                <Text style={styles.primaryButtonText}>Back to Home</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.muted}>No completed trip yet.</Text>
              <TouchableOpacity style={styles.primaryButton} onPress={() => setScreen("home")}>
                <Text style={styles.primaryButtonText}>Plan Route</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    );
  }

  if (!token) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" />
        {renderLogin()}
        {loading ? <LoadingOverlay /> : null}
        {error ? <ErrorToast message={error} /> : null}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      {renderHeader()}

      <View style={styles.contentArea}>
        {screen === "home" && renderHome()}
        {screen === "routes" && renderRoutes()}
        {screen === "nav" && renderNavigation()}
        {screen === "operations" && renderOperations()}
        {screen === "account" && renderAccount()}
        {screen === "summary" && renderSummary()}
      </View>

      {renderTabs()}
      {loading ? <LoadingOverlay /> : null}
      {error ? <ErrorToast message={error} /> : null}
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

function LoadingOverlay() {
  return (
    <View style={styles.loadingOverlay}>
      <ActivityIndicator size="large" color="#22c55e" />
      <Text style={styles.muted}>Loading...</Text>
    </View>
  );
}

function ErrorToast({ message }) {
  return (
    <View style={styles.errorToast}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#06111f" },
  contentArea: { flex: 1 },
  screenContainer: { paddingHorizontal: 16, paddingBottom: 100 },
  loginContainer: { padding: 18, paddingBottom: 50 },
  logoHero: { color: "#fff", fontSize: 46, fontWeight: "900", letterSpacing: -2, marginTop: 20 },
  loginSubtitle: { color: "#9fb4c8", fontSize: 18, marginTop: 4, marginBottom: 22 },
  headerCompact: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8 },
  logoSmall: { color: "#fff", fontSize: 28, fontWeight: "900", letterSpacing: -1 },
  subtitleSmall: { color: "#9fb4c8", fontSize: 12, marginTop: 2 },
  liveBadge: { backgroundColor: "#052e1a", borderColor: "#22c55e", borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  liveText: { color: "#86efac", fontWeight: "900", fontSize: 11 },
  loginCard: { backgroundColor: "#0f2440", borderRadius: 28, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: "#1e3a5f" },
  heroTitle: { color: "#fff", fontSize: 30, fontWeight: "900", lineHeight: 36 },
  bodyText: { color: "#b6c7d8", marginTop: 8, lineHeight: 21 },
  card: { backgroundColor: "#101c2e", borderRadius: 24, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#1f334f" },
  title: { color: "#fff", fontSize: 20, fontWeight: "900", marginBottom: 12 },
  pageTitle: { color: "#fff", fontSize: 28, fontWeight: "900", marginTop: 8, marginBottom: 10 },
  label: { color: "#9fb4c8", marginBottom: 6, marginTop: 12, fontWeight: "700" },
  input: { backgroundColor: "#07111f", borderColor: "#1f334f", borderWidth: 1, borderRadius: 16, color: "#fff", paddingHorizontal: 14, paddingVertical: 13, marginBottom: 8 },
  primaryButton: { backgroundColor: "#22c55e", borderRadius: 18, paddingVertical: 15, alignItems: "center", marginTop: 12 },
  primaryButtonText: { color: "#03120a", fontWeight: "900", fontSize: 15 },
  outlineButton: { borderColor: "#38bdf8", borderWidth: 1, borderRadius: 18, paddingVertical: 15, alignItems: "center", marginTop: 10 },
  outlineButtonText: { color: "#7dd3fc", fontWeight: "900" },
  dangerButton: { backgroundColor: "#ef4444", borderRadius: 18, paddingVertical: 15, alignItems: "center", marginTop: 10 },
  dangerButtonText: { color: "#2b0505", fontWeight: "900" },
  demoRow: { backgroundColor: "#0b1626", borderRadius: 16, padding: 12, marginTop: 8, borderWidth: 1, borderColor: "#1f334f" },
  listTitle: { color: "#fff", fontWeight: "900" },
  muted: { color: "#9fb4c8", fontSize: 13, marginTop: 4 },
  searchPanel: { backgroundColor: "#101c2e", borderRadius: 24, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "#1f334f" },
  sectionKicker: { color: "#22c55e", fontWeight: "900", fontSize: 11, textTransform: "uppercase", letterSpacing: 1.3, marginBottom: 8 },
  inputRow: { gap: 8 },
  routeInput: { backgroundColor: "#07111f", borderColor: "#1f334f", borderWidth: 1, borderRadius: 14, color: "#fff", paddingHorizontal: 14, paddingVertical: 12 },
  swapButton: { alignSelf: "center", backgroundColor: "#0b1626", width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", borderColor: "#1f334f", borderWidth: 1 },
  swapText: { color: "#7dd3fc", fontSize: 18, fontWeight: "900" },
  preferenceScroll: { marginTop: 12 },
  preferenceChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: "#0b1626", borderColor: "#1f334f", borderWidth: 1, marginRight: 8 },
  preferenceChipActive: { backgroundColor: "#22c55e", borderColor: "#22c55e" },
  preferenceText: { color: "#9fb4c8", fontWeight: "900", textTransform: "capitalize" },
  preferenceTextActive: { color: "#03120a" },
  mapCard: { height: Math.min(width * 1.16, 470), borderRadius: 28, overflow: "hidden", marginBottom: 12, borderWidth: 1, borderColor: "#1f334f" },
  mapCardCompact: { height: Math.min(width * 0.82, 360) },
  map: { flex: 1 },
  mapSearchOverlay: { position: "absolute", top: 14, left: 14, right: 14, backgroundColor: "rgba(6,17,31,0.92)", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#1f334f" },
  overlaySmall: { color: "#22c55e", fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  overlayTitle: { color: "#fff", fontSize: 16, fontWeight: "900", marginTop: 3 },
  locationFab: { position: "absolute", right: 14, bottom: 14, width: 48, height: 48, borderRadius: 24, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  fabText: { color: "#06111f", fontSize: 24, fontWeight: "900" },
  routeSheet: { backgroundColor: "#101c2e", borderRadius: 28, padding: 16, borderWidth: 1, borderColor: "#1f334f", marginBottom: 16 },
  sheetTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  routeName: { color: "#fff", fontSize: 18, fontWeight: "900", lineHeight: 24 },
  recommendedPill: { color: "#03120a", backgroundColor: "#22c55e", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, fontSize: 11, fontWeight: "900", overflow: "hidden" },
  selectedPill: { color: "#03120a", backgroundColor: "#7dd3fc", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, fontSize: 11, fontWeight: "900", overflow: "hidden" },
  metricsRow: { flexDirection: "row", marginTop: 14, gap: 8 },
  metric: { flex: 1, backgroundColor: "#07111f", borderRadius: 18, padding: 12, alignItems: "center" },
  metricValue: { color: "#fff", fontSize: 18, fontWeight: "900", textAlign: "center" },
  metricLabel: { color: "#9fb4c8", fontSize: 11, marginTop: 3, textAlign: "center" },
  selectedBox: { backgroundColor: "#07111f", borderRadius: 16, padding: 12, marginTop: 12, borderWidth: 1, borderColor: "#1f334f" },
  selectedText: { color: "#86efac", fontWeight: "900" },
  twoButtonRow: { flexDirection: "row", gap: 10, marginTop: 2 },
  outlineButtonHalf: { flex: 1, borderColor: "#38bdf8", borderWidth: 1, borderRadius: 18, paddingVertical: 15, alignItems: "center", marginTop: 10 },
  primaryButtonHalf: { flex: 1, backgroundColor: "#22c55e", borderRadius: 18, paddingVertical: 15, alignItems: "center", marginTop: 10 },
  routeCard: { backgroundColor: "#101c2e", borderRadius: 24, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#1f334f" },
  routeCardActive: { borderColor: "#22c55e", backgroundColor: "#123458" },
  reasonText: { color: "#dbeafe", lineHeight: 20, marginTop: 10 },
  loadTrack: { height: 10, borderRadius: 999, backgroundColor: "#07111f", overflow: "hidden", marginTop: 12 },
  loadFill: { height: 10, backgroundColor: "#22c55e", borderRadius: 999 },
  nextTurnCard: { backgroundColor: "#22c55e", borderRadius: 26, padding: 18, marginBottom: 12 },
  nextTurnLabel: { color: "#052e1a", fontWeight: "900", fontSize: 12, textTransform: "uppercase" },
  nextTurnText: { color: "#03120a", fontSize: 24, fontWeight: "900", lineHeight: 30, marginTop: 5 },
  navSheet: { backgroundColor: "#101c2e", borderRadius: 24, padding: 16, borderWidth: 1, borderColor: "#1f334f", marginBottom: 16 },
  progressTrack: { height: 12, backgroundColor: "#07111f", borderRadius: 999, overflow: "hidden", marginTop: 14 },
  progressFill: { height: 12, backgroundColor: "#22c55e", borderRadius: 999 },
  alertBox: { backgroundColor: "#3f2f12", borderColor: "#f59e0b", borderWidth: 1, borderRadius: 16, padding: 12, marginTop: 12 },
  alertTitle: { color: "#fcd34d", fontWeight: "900" },
  stepRow: { flexDirection: "row", backgroundColor: "#0b1626", borderRadius: 16, padding: 12, marginTop: 8, borderWidth: 1, borderColor: "#1f334f" },
  activeStep: { borderColor: "#22c55e", backgroundColor: "#123458" },
  stepCircle: { backgroundColor: "#22c55e", color: "#03120a", width: 30, height: 30, borderRadius: 15, textAlign: "center", paddingTop: 5, fontWeight: "900", marginRight: 10 },
  stepText: { color: "#dbeafe", flex: 1, lineHeight: 21, fontSize: 14 },
  bottomTabs: { position: "absolute", left: 14, right: 14, bottom: 10, flexDirection: "row", backgroundColor: "#0b1626", borderRadius: 24, padding: 8, borderWidth: 1, borderColor: "#1f334f" },
  bottomTab: { flex: 1, alignItems: "center", paddingVertical: 10 },
  bottomTabText: { color: "#9fb4c8", fontWeight: "900", fontSize: 12 },
  bottomTabTextActive: { color: "#22c55e" },
    gmScreen: {
    flex: 1,
    position: "relative",
    backgroundColor: "#06111f",
  },
  gmMapShell: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#06111f",
  },
  gmMap: {
    flex: 1,
  },
  gmSearchCard: {
    position: "absolute",
    top: 14,
    left: 16,
    right: 16,
    backgroundColor: "rgba(20,20,20,0.94)",
    borderRadius: 28,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  gmSearchTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  gmSearchIcon: {
    color: "#22c55e",
    fontSize: 24,
    fontWeight: "900",
    marginRight: 10,
  },
  gmSearchInputs: {
    flex: 1,
  },
  gmSearchInput: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    paddingVertical: 5,
  },
  gmDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginVertical: 4,
  },
  gmSwapButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#2b2b2b",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  gmSwapText: {
    color: "#7dd3fc",
    fontSize: 20,
    fontWeight: "900",
  },
  gmFindButton: {
    backgroundColor: "#22c55e",
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: "center",
    marginTop: 12,
  },
  gmFindButtonText: {
    color: "#03120a",
    fontWeight: "900",
    fontSize: 15,
  },
  gmChipRow: {
    position: "absolute",
    top: 160,
    left: 16,
    right: 0,
  },
  gmChip: {
    backgroundColor: "rgba(35,35,35,0.95)",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  gmChipText: {
    color: "#ffffff",
    fontWeight: "800",
  },
  gmMapButtons: {
    position: "absolute",
    right: 16,
    top: 230,
    gap: 12,
  },
  gmCircleButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(255,255,255,0.96)",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },
  gmCircleButtonText: {
    color: "#172033",
    fontSize: 22,
    fontWeight: "900",
  },
  gmRouteSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 72,
    backgroundColor: "rgba(18,18,18,0.97)",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 18,
    paddingBottom: 20,
  },
  gmHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.28)",
    marginBottom: 14,
  },
  gmSheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  gmRouteTitle: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 30,
  },
  gmRouteSub: {
    color: "#b8c2d4",
    fontSize: 14,
    marginTop: 4,
  },
  gmRecommended: {
    color: "#03120a",
    backgroundColor: "#22c55e",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
  },
  gmSelected: {
    color: "#03120a",
    backgroundColor: "#7dd3fc",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
  },
  gmMetrics: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  gmMetricBox: {
    flex: 1,
    backgroundColor: "#202124",
    borderRadius: 18,
    padding: 12,
    alignItems: "center",
  },
  gmMetricValue: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
  },
  gmMetricLabel: {
    color: "#a8b3c4",
    fontSize: 12,
    marginTop: 4,
  },
  gmFlowBox: {
    backgroundColor: "#0b1626",
    borderColor: "#1f334f",
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    marginTop: 14,
  },
  gmFlowTitle: {
    color: "#86efac",
    fontWeight: "900",
    marginBottom: 4,
  },
  gmFlowText: {
    color: "#dbeafe",
    lineHeight: 20,
  },
  gmFlowSmall: {
    color: "#9fb4c8",
    fontSize: 12,
    marginTop: 6,
  },
  gmActionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
  },
  gmSecondaryButton: {
    flex: 1,
    borderColor: "#38bdf8",
    borderWidth: 1,
    borderRadius: 22,
    paddingVertical: 15,
    alignItems: "center",
  },
  gmSecondaryButtonText: {
    color: "#7dd3fc",
    fontWeight: "900",
  },
  gmPrimaryButton: {
    flex: 1,
    backgroundColor: "#22c55e",
    borderRadius: 22,
    paddingVertical: 15,
    alignItems: "center",
  },
  gmPrimaryButtonText: {
    color: "#03120a",
    fontWeight: "900",
  },
  gmBottomTabs: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 74,
    flexDirection: "row",
    backgroundColor: "rgba(18,18,18,0.98)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  gmBottomTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  gmBottomTabActive: {
    backgroundColor: "rgba(34,197,94,0.14)",
    borderRadius: 18,
  },
  gmBottomTabText: {
    color: "#9ca3af",
    fontWeight: "900",
    fontSize: 12,
  },
  gmBottomTabTextActive: {
    color: "#22c55e",
  },
  gmNavInstruction: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: "#006d6b",
    borderRadius: 24,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  gmArrowBox: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  gmArrowText: {
    color: "#ffffff",
    fontSize: 42,
    fontWeight: "900",
  },
  gmNavTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 27,
  },
  gmNavSub: {
    color: "#d1fae5",
    marginTop: 5,
    fontSize: 13,
  },
  gmNavFloating: {
    position: "absolute",
    right: 16,
    top: 255,
    alignItems: "flex-end",
    gap: 12,
  },
  gmReportButton: {
    backgroundColor: "rgba(255,255,255,0.96)",
    paddingHorizontal: 18,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  gmReportText: {
    color: "#172033",
    fontWeight: "900",
  },
  gmNavSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.98)",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 18,
    paddingBottom: 24,
  },
  gmNavMetrics: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gmNavEta: {
    color: "#dc2626",
    fontSize: 32,
    fontWeight: "900",
  },
  gmEndIconButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: "#9ca3af",
    alignItems: "center",
    justifyContent: "center",
  },
  gmEndIconText: {
    color: "#111827",
    fontSize: 34,
    fontWeight: "800",
  },
  gmProgressTrack: {
    height: 10,
    backgroundColor: "#e5e7eb",
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 14,
  },
  gmProgressFill: {
    height: 10,
    backgroundColor: "#22c55e",
    borderRadius: 999,
  },
  gmDangerWide: {
    backgroundColor: "#ef4444",
    borderRadius: 22,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 12,
  },
  gmDangerText: {
    color: "#2b0505",
    fontWeight: "900",
  },
    gmRouteSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 72,
    backgroundColor: "rgba(18,18,18,0.97)",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 18,
  },
  gmRouteSheetCollapsed: {
    height: 265,
  },
  gmRouteSheetExpanded: {
    maxHeight: 540,
  },
  gmSheetHandleButton: {
    alignItems: "center",
    paddingTop: 4,
    paddingBottom: 8,
  },
  gmSwipeHint: {
    color: "#9ca3af",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },
  gmSheetToggleButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#202124",
    alignItems: "center",
    justifyContent: "center",
  },
  gmSheetToggleText: {
    color: "#7dd3fc",
    fontSize: 24,
    fontWeight: "900",
  },
  gmMiniMetrics: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  gmMiniMetric: {
    flex: 1,
    backgroundColor: "#202124",
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  gmMiniMetricValue: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },
  gmMiniMetricLabel: {
    color: "#a8b3c4",
    fontSize: 11,
    marginTop: 3,
  },
  loadingOverlay: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(6,17,31,0.65)" },
  errorToast: { position: "absolute", left: 16, right: 16, bottom: 88, backgroundColor: "#3f1212", borderColor: "#ef4444", borderWidth: 1, borderRadius: 16, padding: 14 },
    errorText: {
    color: "#fecaca",
  },
    gmRouteSheetCollapsed: {
    maxHeight: 345,
  },
  gmSheetHandleButton: {
    alignItems: "center",
    paddingVertical: 4,
  },
  gmCollapsedHint: {
    color: "#9fb4c8",
    fontSize: 12,
    marginTop: 10,
    textAlign: "center",
  },
    gmHiddenRoutePill: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 88,
    backgroundColor: "rgba(18,18,18,0.96)",
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 8,
  },
  gmHiddenRouteTitle: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 16,
  },
  gmHiddenRouteSub: {
    color: "#9ca3af",
    fontSize: 12,
    marginTop: 3,
  },
  gmHiddenRouteArrow: {
    color: "#22c55e",
    fontSize: 28,
    fontWeight: "900",
  },
  gmHideSheetButton: {
    alignItems: "center",
    paddingTop: 12,
  },
  gmHideSheetText: {
    color: "#9ca3af",
    fontSize: 12,
    fontWeight: "800",
  },
});