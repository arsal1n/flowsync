import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Keyboard,
  Modal,
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
import * as Speech from "expo-speech";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "https://flowsync-ox5z.onrender.com";

const DEMO_PASSWORD = "flowsync123";
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

const PASSWORD_RULES_TEXT =
  "Password must be at least 8 characters and include one letter and one number.";

const GUEST_USER = {
  name: "Guest Driver",
  email: "guest@flowsync.local",
  role: "guest",
};

/*
  Keep this false for real testing.
  If you want the arrow to auto-move without physically driving,
  change it to true only for demo simulation.
*/
const USE_DEMO_NAVIGATION = false;

const { width, height } = Dimensions.get("window");

const SAFE_TOP = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
const SAFE_BOTTOM = Platform.OS === "android" ? 18 : 24;
const TAB_HEIGHT = 84 + SAFE_BOTTOM;
const PANEL_BOTTOM = TAB_HEIGHT - 2;

const COLORS = {
  bg: "#050914",
  panel: "rgba(5, 10, 18, 0.96)",
  panel2: "#0b1424",
  card: "#111c2e",
  card2: "#17243a",
  border: "rgba(148, 163, 184, 0.18)",
  borderStrong: "rgba(34, 211, 238, 0.34)",
  text: "#f8fafc",
  muted: "#94a3b8",
  faint: "#64748b",
  green: "#22c55e",
  greenSoft: "rgba(34, 197, 94, 0.16)",
  cyan: "#22d3ee",
  cyanSoft: "rgba(34, 211, 238, 0.15)",
  blue: "#2563eb",
  amber: "#f59e0b",
  red: "#ef4444",
  white: "#ffffff",
  black: "#020617",
};

const DEFAULT_REGION = {
  latitude: 25.2048,
  longitude: 55.2708,
  latitudeDelta: 0.22,
  longitudeDelta: 0.22,
};

const POPULAR_PLACES = [
  {
    name: "Dubai Mall",
    display_name: "Dubai Mall, Downtown Dubai",
    latitude: 25.1972,
    longitude: 55.2744,
    category: "Mall",
  },
  {
    name: "Dubai Marina",
    display_name: "Dubai Marina, Dubai",
    latitude: 25.08,
    longitude: 55.14,
    category: "Waterfront",
  },
  {
    name: "DXB Airport",
    display_name: "Dubai International Airport",
    latitude: 25.2532,
    longitude: 55.3657,
    category: "Airport",
  },
  {
    name: "Business Bay",
    display_name: "Business Bay, Dubai",
    latitude: 25.186,
    longitude: 55.2608,
    category: "Business",
  },
  {
    name: "Academic City",
    display_name: "Dubai International Academic City",
    latitude: 25.1256,
    longitude: 55.4209,
    category: "Education",
  },
  {
    name: "Sharjah",
    display_name: "Sharjah, UAE",
    latitude: 25.3463,
    longitude: 55.4209,
    category: "City",
  },
];

const QUICK_ACCOUNTS = [
  {
    role: "Driver",
    email: "driver@flowsync.local",
    description: "Route planning and navigation",
  },
  {
    role: "Admin",
    email: "admin@flowsync.local",
    description: "Operations dashboard",
  },
  {
    role: "Emergency",
    email: "emergency@flowsync.local",
    description: "Priority routing view",
  },
];

const REPORT_TYPES = [
  { id: "traffic", label: "Traffic", icon: "🚗" },
  { id: "crash", label: "Crash", icon: "💥" },
  { id: "hazard", label: "Hazard", icon: "⚠️" },
  { id: "police", label: "Police", icon: "👮" },
  { id: "blocked_lane", label: "Blocked lane", icon: "🚧" },
  { id: "closure", label: "Closure", icon: "⛔" },
  { id: "weather", label: "Weather", icon: "⛈️" },
  { id: "parking", label: "Parking", icon: "🅿️" },
  { id: "map_issue", label: "Map issue", icon: "🗺️" },
];

const MAP_STYLE_LIGHT = [
  { elementType: "geometry", stylers: [{ color: "#edf3fb" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#334155" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f8fafc" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#cbd5e1" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#9bdff4" }],
  },
  { featureType: "poi", stylers: [{ visibility: "simplified" }] },
  { featureType: "transit", stylers: [{ visibility: "simplified" }] },
];

const MAP_STYLE_NAV = [
  { elementType: "geometry", stylers: [{ color: "#111827" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#dbeafe" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#020617" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#334155" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#475569" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#082f49" }],
  },
  { featureType: "poi", stylers: [{ visibility: "simplified" }] },
  { featureType: "transit", stylers: [{ visibility: "simplified" }] },
];

const DEFAULT_START_PLACE = POPULAR_PLACES[0];
const DEFAULT_DESTINATION_PLACE = POPULAR_PLACES[1];

function getTokenDeep(value) {
  if (!value || typeof value !== "object") return null;

  const keys = [
    "access_token",
    "accessToken",
    "token",
    "jwt",
    "auth_token",
    "session_token",
  ];

  for (const key of keys) {
    if (typeof value[key] === "string" && value[key].length > 5) {
      return value[key];
    }
  }

  for (const key of Object.keys(value)) {
    const found = getTokenDeep(value[key]);
    if (found) return found;
  }

  return null;
}

function placeTitle(place) {
  return (
    place?.name ||
    place?.place_name ||
    place?.display_name ||
    place?.label ||
    ""
  );
}

function placeSubtitle(place) {
  return (
    place?.display_name ||
    place?.formatted_address ||
    [place?.area, place?.city, place?.category].filter(Boolean).join(" • ") ||
    "Location"
  );
}

function normalizePlace(place) {
  if (!place) return null;

  const latitude = Number(place.latitude ?? place.lat);
  const longitude = Number(place.longitude ?? place.lng ?? place.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const name = placeTitle(place) || "Selected location";

  return {
    ...place,
    place_id: place.place_id || place.external_place_id || place.id || name,
    name,
    display_name: place.display_name || place.label || name,
    latitude,
    longitude,
    lat: latitude,
    lng: longitude,
  };
}

function normalizeCoordinate(point) {
  if (!point) return null;

  if (Array.isArray(point) && point.length >= 2) {
    const first = Number(point[0]);
    const second = Number(point[1]);

    if (!Number.isFinite(first) || !Number.isFinite(second)) return null;

    /*
      ORS sometimes returns [longitude, latitude].
      App map needs { latitude, longitude }.
    */
    if (Math.abs(first) > 35 && Math.abs(second) < 35) {
      return { latitude: second, longitude: first };
    }

    return { latitude: first, longitude: second };
  }

  const latitude = Number(point.latitude ?? point.lat);
  const longitude = Number(point.longitude ?? point.lng ?? point.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return { latitude, longitude };
}

function routeCoordinates(route) {
  const raw =
    route?.route_coordinates ||
    route?.coordinates ||
    route?.polyline ||
    route?.polyline_points ||
    route?.geometry ||
    [];

  if (!Array.isArray(raw)) return [];

  return raw.map(normalizeCoordinate).filter(Boolean);
}

function distanceMeters(pointA, pointB) {
  if (!pointA || !pointB) return Infinity;

  const radius = 6371000;
  const lat1 = (pointA.latitude * Math.PI) / 180;
  const lat2 = (pointB.latitude * Math.PI) / 180;
  const dLat = ((pointB.latitude - pointA.latitude) * Math.PI) / 180;
  const dLng = ((pointB.longitude - pointA.longitude) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function routeDistanceKm(coords, startIndex = 0) {
  if (!Array.isArray(coords) || coords.length < 2) return 0;

  let totalMeters = 0;

  for (let index = startIndex; index < coords.length - 1; index += 1) {
    totalMeters += distanceMeters(coords[index], coords[index + 1]);
  }

  return totalMeters / 1000;
}

function closestRoutePointIndex(currentLocation, coords = []) {
  if (!currentLocation || !coords.length) return 0;

  let closestIndex = 0;
  let closestDistance = Infinity;

  coords.forEach((point, index) => {
    const currentDistance = distanceMeters(currentLocation, point);

    if (currentDistance < closestDistance) {
      closestDistance = currentDistance;
      closestIndex = index;
    }
  });

  return closestIndex;
}

function getClosestPointOnRoute(currentLocation, coords = []) {
  if (!currentLocation || !coords.length) return null;

  let closestPoint = coords[0];
  let closestIndex = 0;
  let closestDistance = Infinity;

  coords.forEach((point, index) => {
    const currentDistance = distanceMeters(currentLocation, point);

    if (currentDistance < closestDistance) {
      closestDistance = currentDistance;
      closestPoint = point;
      closestIndex = index;
    }
  });

  return { point: closestPoint, index: closestIndex, distance: closestDistance };
}

function bearingBetween(pointA, pointB) {
  if (!pointA || !pointB) return 0;

  const lat1 = (pointA.latitude * Math.PI) / 180;
  const lat2 = (pointB.latitude * Math.PI) / 180;
  const lngDiff = ((pointB.longitude - pointA.longitude) * Math.PI) / 180;

  const y = Math.sin(lngDiff) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(lngDiff);

  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

function regionForCoordinates(coords, fallback = DEFAULT_REGION) {
  if (!Array.isArray(coords) || coords.length === 0) return fallback;

  const latitudes = coords.map((point) => point.latitude);
  const longitudes = coords.map((point) => point.longitude);

  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(maxLat - minLat + 0.08, 0.035),
    longitudeDelta: Math.max(maxLng - minLng + 0.08, 0.035),
  };
}

function normalizeStep(step, index, coords = []) {
  const point =
    normalizeCoordinate(step) ||
    normalizeCoordinate(step?.location) ||
    normalizeCoordinate(step?.coordinate) ||
    coords[Math.min(index, Math.max(coords.length - 1, 0))] ||
    null;

  return {
    ...step,
    step_index: Number(step?.step_index ?? step?.index ?? index),
    instruction:
      step?.instruction ||
      step?.text ||
      step?.name ||
      (index === 0 ? "Start navigation" : "Continue on selected route"),
    distance_m: Number(step?.distance_m ?? step?.distance ?? 0),
    duration_min: Number(step?.duration_min ?? step?.duration ?? 0),
    maneuver: step?.maneuver || step?.type || "continue",
    latitude: point?.latitude,
    longitude: point?.longitude,
  };
}

function normalizeTrafficSegment(segment, index = 0) {
  const raw =
    segment?.coordinates ||
    segment?.route_coordinates ||
    segment?.points ||
    [];

  const coordinates = Array.isArray(raw)
    ? raw.map(normalizeCoordinate).filter(Boolean)
    : [];

  return {
    id: segment?.id || segment?.segment_id || `traffic-${index}`,
    coordinates,
    severity:
      segment?.severity ||
      segment?.traffic_level ||
      segment?.congestion_score ||
      segment?.level ||
      0,
    delay_min: Number(segment?.delay_min ?? segment?.delay_minutes ?? 0),
  };
}
function normalizeIncident(incident, index = 0) {
  const coord =
    normalizeCoordinate(incident) ||
    normalizeCoordinate(incident?.coordinate) ||
    normalizeCoordinate(incident?.location) ||
    null;

  return {
    ...incident,
    id: incident?.id || incident?.incident_id || `incident-${index}`,
    type: incident?.type || incident?.category || "incident",
    title:
      incident?.title ||
      incident?.description ||
      incident?.type ||
      "Road alert",
    description: incident?.description || incident?.message || "Reported on route",
    latitude: coord?.latitude,
    longitude: coord?.longitude,
  };
}

function normalizeParking(item, index = 0) {
  const availability = Number(
    item?.availability ?? item?.availability_percent ?? item?.score ?? 0
  );

  return {
    id: item?.id || item?.zone_id || `parking-${index}`,
    name:
      item?.name ||
      item?.zone_name ||
      `Parking Zone ${String.fromCharCode(65 + index)}`,
    availability,
    difficulty:
      item?.difficulty ||
      item?.difficulty_rating ||
      (availability > 65 ? "Low" : availability > 35 ? "Medium" : "High"),
    walk_min: Number(
      item?.walk_min ?? item?.walking_time_min ?? item?.walking_minutes ?? 3
    ),
  };
}

function normalizeRoute(route, index = 0) {
  const coords = routeCoordinates(route);
  const rawSteps =
    route?.turn_by_turn_steps || route?.steps || route?.route_steps || [];

  const estimatedTime = Number(
    route?.estimated_time_min ??
      route?.estimated_time ??
      route?.duration_min ??
      0
  );

  const distanceKm = Number(route?.distance_km ?? route?.distance ?? 0);
  const trafficDelay = Number(route?.traffic_delay_min ?? route?.delay_min ?? 0);
  const congestionScore = Number(
    route?.congestion_score ??
      route?.traffic_score ??
      route?.traffic_pressure ??
      0
  );

  return {
    ...route,

    route_id:
      route?.route_id ||
      route?.route_public_id ||
      route?.id ||
      `ROUTE-${String.fromCharCode(65 + index)}`,

    route_name:
      route?.route_name ||
      route?.name ||
      `Route ${String.fromCharCode(65 + index)} - Smart Balanced Route`,

    estimated_time_min: estimatedTime,
    eta_text: route?.eta_text || `${estimatedTime || "--"} min`,

    distance_km: distanceKm,
    distance_text: route?.distance_text || `${distanceKm || "--"} km`,

    traffic_provider: route?.traffic_provider || "tomtom-ready",
    live_traffic: route?.live_traffic === true,

    traffic_delay_min: trafficDelay,
    congestion_score: congestionScore,

    traffic_display:
      route?.traffic_display ||
      (route?.live_traffic
        ? `TomTom live traffic • ${trafficDelay} min delay`
        : congestionScore
        ? `${congestionScore}% traffic pressure`
        : "Traffic estimate"),

    traffic_segments: Array.isArray(route?.traffic_segments)
      ? route.traffic_segments.map(normalizeTrafficSegment)
      : [],

    flowsync_score: Number(
      route?.flowsync_score ?? route?.route_score ?? route?.score ?? 0
    ),
    route_score: Number(
      route?.route_score ?? route?.flowsync_score ?? route?.score ?? 0
    ),

    assigned_users: Number(route?.assigned_users ?? route?.current_users ?? 0),
    road_capacity: Number(route?.road_capacity ?? route?.capacity ?? 0),
    load_ratio: Number(route?.load_ratio ?? route?.route_load ?? 0),
    load_status: route?.load_status || "balanced",

    recommendation_reason:
      route?.recommendation_reason ||
      route?.reason ||
      "FlowSync selected this route by balancing ETA, congestion, road capacity, route load, and traffic readiness.",

    route_coordinates: coords,

    turn_by_turn_steps: Array.isArray(rawSteps)
      ? rawSteps.map((step, stepIndex) => normalizeStep(step, stepIndex, coords))
      : [],

    alerts: Array.isArray(route?.alerts) ? route.alerts : [],

    incidents: Array.isArray(route?.incidents)
      ? route.incidents
          .map(normalizeIncident)
          .filter((item) => item.latitude && item.longitude)
      : [],

    parking_predictions: Array.isArray(route?.parking_predictions)
      ? route.parking_predictions.map(normalizeParking)
      : [],

    real_geometry: route?.real_geometry === true,
    mock_fallback: route?.mock_fallback === true,
  };
}

function routeShapeKey(route) {
  const coords = routeCoordinates(route);

  if (!coords.length) return "empty-route";

  const sampleCount = 10;
  const step = Math.max(1, Math.floor(coords.length / sampleCount));

  return coords
    .filter((_, index) => index % step === 0)
    .slice(0, sampleCount)
    .map((point) => `${point.latitude.toFixed(4)},${point.longitude.toFixed(4)}`)
    .join("|");
}

function dedupeRoutesByGeometry(routes = []) {
  const seen = new Set();
  const uniqueRoutes = [];

  routes.forEach((route) => {
    const key = routeShapeKey(route);

    if (!seen.has(key)) {
      seen.add(key);
      uniqueRoutes.push(route);
    }
  });

  return uniqueRoutes;
}

function normalizeRouteResponse(data) {
  const rawRoutes =
    data?.all_routes ||
    data?.routes ||
    data?.data?.all_routes ||
    data?.data?.routes ||
    [];

  const normalizedRoutes = Array.isArray(rawRoutes)
    ? rawRoutes
        .map(normalizeRoute)
        .filter((route) => route.route_coordinates.length >= 2)
    : [];

  const allRoutes = dedupeRoutesByGeometry(normalizedRoutes);

  const recommendedRouteId =
    data?.recommended_route_id ||
    data?.recommended_route?.route_id ||
    data?.data?.recommended_route_id ||
    allRoutes.find((route) => route.is_recommended)?.route_id ||
    allRoutes[0]?.route_id ||
    null;

  return {
    trip_id: data?.trip_id || data?.request_id || data?.data?.trip_id || null,

    recommended_route_id: recommendedRouteId,

    recommendation_reason:
      data?.recommendation_reason ||
      data?.recommended_route?.recommendation_reason ||
      "Best FlowSync route based on travel time, route load, congestion, and provider traffic data.",

    provider:
      data?.provider ||
      data?.routing_provider ||
      data?.data?.provider ||
      "unknown",

    provider_status:
      data?.provider_status || data?.data?.provider_status || "unknown",

    traffic_provider:
      data?.traffic_provider || data?.data?.traffic_provider || "TomTom-ready",

    live_traffic:
      data?.live_traffic === true || allRoutes.some((route) => route.live_traffic),

    dashboard: data?.dashboard || data?.analytics || data?.data?.dashboard || null,

    parking_predictions: Array.isArray(data?.parking_predictions)
      ? data.parking_predictions.map(normalizeParking)
      : [],

    message: data?.message || data?.detail || data?.error || "",

    all_routes: allRoutes,
  };
}

function progressFromStep(currentStepIndex, stepsLength) {
  if (!stepsLength) return 0;
  return Math.min(100, Math.round(((currentStepIndex + 1) / stepsLength) * 100));
}

function compactRouteName(name) {
  if (!name) return "FlowSync Route";
  return name.length > 32 ? `${name.slice(0, 29)}...` : name;
}

function formatStepDistance(meters) {
  const value = Number(meters || 0);

  if (!Number.isFinite(value) || value <= 0) return "";

  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)} km`;
  }

  return `${Math.max(10, Math.round(value / 10) * 10)} m`;
}

function maneuverIcon(step) {
  const text = `${step?.maneuver || ""} ${step?.instruction || ""}`.toLowerCase();

  if (text.includes("left")) return "↰";
  if (text.includes("right")) return "↱";
  if (text.includes("roundabout")) return "⟳";
  if (text.includes("merge")) return "⇢";
  if (text.includes("arrive")) return "✓";

  return "↑";
}

function cleanSpokenInstruction(text = "") {
  return String(text)
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isCurrentLocationPlace(place) {
  return (
    place?.provider_status === "current_location" ||
    place?.place_id === "device-current-location" ||
    place?.provider_name === "device_gps" ||
    place?.name === "Current Location"
  );
}

function trafficColor(value) {
  const text = String(value || "").toLowerCase();

  if (text.includes("heavy") || text.includes("severe") || text.includes("red")) {
    return COLORS.red;
  }

  if (
    text.includes("moderate") ||
    text.includes("orange") ||
    text.includes("yellow")
  ) {
    return COLORS.amber;
  }

  if (text.includes("light") || text.includes("green")) {
    return COLORS.green;
  }

  const score = Number(value || 0);

  if (score >= 70) return COLORS.red;
  if (score >= 35) return COLORS.amber;

  return COLORS.green;
}

function splitRouteIntoTrafficSlices(coords = [], congestionScore = 0) {
  if (coords.length < 2) return [];

  const slices = [];
  const chunkSize = Math.max(8, Math.floor(coords.length / 7));

  for (let index = 0; index < coords.length - 1; index += chunkSize) {
    const chunk = coords.slice(index, Math.min(index + chunkSize + 1, coords.length));

    if (chunk.length < 2) continue;

    const score = Math.max(
      0,
      Math.min(100, Number(congestionScore || 0) + (index % 3) * 7)
    );

    slices.push({
      id: `estimate-${index}`,
      coordinates: chunk,
      severity: score,
    });
  }

  return slices;
}
export default function App() {
  const mapRef = useRef(null);
  const watcherRef = useRef(null);
  const simulationRef = useRef(null);

  const selectedRouteRef = useRef(null);
  const routeCoordsRef = useRef([]);
  const turnStepsRef = useRef([]);
  const currentStepIndexRef = useRef(0);
  const sessionIdRef = useRef("");
  const cameraFollowingRef = useRef(true);
  const lastSpokenStepRef = useRef(-1);

  const [screen, setScreen] = useState("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [authMode, setAuthMode] = useState("login");

const [email, setEmail] = useState("driver@flowsync.local");
const [password, setPassword] = useState(DEMO_PASSWORD);

const [signupName, setSignupName] = useState("");
const [signupEmail, setSignupEmail] = useState("");
const [signupPassword, setSignupPassword] = useState("");
const [signupConfirmPassword, setSignupConfirmPassword] = useState("");

const [token, setToken] = useState("");
const [user, setUser] = useState(null);

  const [startLocation, setStartLocation] = useState(DEFAULT_START_PLACE.name);
  const [destination, setDestination] = useState(DEFAULT_DESTINATION_PLACE.name);

  const [selectedStartPlace, setSelectedStartPlace] =
    useState(DEFAULT_START_PLACE);

  const [selectedDestinationPlace, setSelectedDestinationPlace] = useState(
    DEFAULT_DESTINATION_PLACE
  );

  const [startSuggestions, setStartSuggestions] = useState([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);
  const [searchingStart, setSearchingStart] = useState(false);
  const [searchingDestination, setSearchingDestination] = useState(false);

  const [routePreference, setRoutePreference] = useState("balanced");

  const [routes, setRoutes] = useState([]);
  const [tripId, setTripId] = useState(null);
  const [recommendedRouteId, setRecommendedRouteId] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [hasRouteResult, setHasRouteResult] = useState(false);

  const [providerStatus, setProviderStatus] = useState("Ready");
  const [trafficStatus, setTrafficStatus] = useState("Traffic ready");

  const [recommendationReason, setRecommendationReason] = useState(
    "Find a route to see FlowSync recommendation details."
  );

  const [mapRegion, setMapRegion] = useState(DEFAULT_REGION);
  const [userLocation, setUserLocation] = useState(null);
  const [gpsHeading, setGpsHeading] = useState(0);
  const [cameraFollowing, setCameraFollowing] = useState(true);
  const [navPreviewMode, setNavPreviewMode] = useState(false);

  const [sessionId, setSessionId] = useState("");
  const [isTracking, setIsTracking] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [liveRemainingDistanceKm, setLiveRemainingDistanceKm] = useState(null);
  const [liveRemainingEtaMin, setLiveRemainingEtaMin] = useState(null);
  const [tripSummary, setTripSummary] = useState(null);

  const [homeSheetExpanded, setHomeSheetExpanded] = useState(false);
  const [homeSheetHidden, setHomeSheetHidden] = useState(false);
  const [routeSheetMode, setRouteSheetMode] = useState("expanded");
  const [reportModalVisible, setReportModalVisible] = useState(false);

  const [dashboardData, setDashboardData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [parkingPredictions, setParkingPredictions] = useState([]);
  const [localReports, setLocalReports] = useState([]);
  const [savedPlaces, setSavedPlaces] = useState(POPULAR_PLACES.slice(0, 4));

  const selectedRoute = useMemo(() => {
    if (!hasRouteResult || routes.length === 0) return null;

    if (selectedRouteId) {
      return routes.find((route) => route.route_id === selectedRouteId) || null;
    }

    if (recommendedRouteId) {
      return routes.find((route) => route.route_id === recommendedRouteId) || null;
    }

    return routes[0] || null;
  }, [hasRouteResult, routes, selectedRouteId, recommendedRouteId]);

  const selectedRouteCoordinates = useMemo(
    () => routeCoordinates(selectedRoute),
    [selectedRoute]
  );

  const turnSteps = selectedRoute?.turn_by_turn_steps || [];
  const activeStep = turnSteps[currentStepIndex] || turnSteps[0] || null;
  const nextStep = turnSteps[currentStepIndex + 1] || null;

  const progressPercent = progressFromStep(currentStepIndex, turnSteps.length);
  const isFinalStep =
    turnSteps.length > 0 && currentStepIndex >= turnSteps.length - 1;

  const hasArrived = isFinalStep || progressPercent >= 96;

  const fallbackEta = Math.max(
    Math.round((selectedRoute?.estimated_time_min || 1) * (1 - progressPercent / 100)),
    1
  );

  const fallbackDistance = Math.max(
    Number(((selectedRoute?.distance_km || 0) * (1 - progressPercent / 100)).toFixed(1)),
    0
  );

  const displayEta = liveRemainingEtaMin ?? fallbackEta;
  const displayDistance = liveRemainingDistanceKm ?? fallbackDistance;

  const routeIncidents = useMemo(() => {
    const backendIncidents = selectedRoute?.incidents || [];

    const dashboardAlerts = alerts
      .map(normalizeIncident)
      .filter((item) => item.latitude && item.longitude)
      .slice(0, 10);

    return [...backendIncidents, ...dashboardAlerts, ...localReports];
  }, [selectedRoute?.incidents, alerts, localReports]);

  const routeTrafficSegments = useMemo(() => {
    const backendSegments = selectedRoute?.traffic_segments || [];

    if (backendSegments.some((segment) => segment.coordinates?.length > 1)) {
      return backendSegments;
    }

    return splitRouteIntoTrafficSlices(
      selectedRouteCoordinates,
      selectedRoute?.congestion_score || 0
    );
  }, [
    selectedRoute?.traffic_segments,
    selectedRoute?.congestion_score,
    selectedRouteCoordinates,
  ]);

  const parkingForDisplay = useMemo(() => {
    if (selectedRoute?.parking_predictions?.length) {
      return selectedRoute.parking_predictions;
    }

    if (parkingPredictions?.length) {
      return parkingPredictions;
    }

    return [
      {
        id: "zone-a",
        name: "Parking Zone A",
        availability: 82,
        difficulty: "Low",
        walk_min: 3,
      },
      {
        id: "zone-b",
        name: "Parking Zone B",
        availability: 48,
        difficulty: "Medium",
        walk_min: 5,
      },
      {
        id: "zone-c",
        name: "Parking Zone C",
        availability: 17,
        difficulty: "High",
        walk_min: 2,
      },
    ];
  }, [selectedRoute?.parking_predictions, parkingPredictions]);

  useEffect(() => {
    selectedRouteRef.current = selectedRoute;
  }, [selectedRoute]);

  useEffect(() => {
    routeCoordsRef.current = selectedRouteCoordinates;
  }, [selectedRouteCoordinates]);

  useEffect(() => {
    turnStepsRef.current = turnSteps;
  }, [turnSteps]);

  useEffect(() => {
    currentStepIndexRef.current = currentStepIndex;
  }, [currentStepIndex]);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    cameraFollowingRef.current = cameraFollowing;
  }, [cameraFollowing]);

  useEffect(() => {
    if (screen !== "nav") return;
    if (!activeStep?.instruction) return;
    if (lastSpokenStepRef.current === currentStepIndex) return;

    lastSpokenStepRef.current = currentStepIndex;
    speakInstruction(activeStep.instruction);
  }, [screen, currentStepIndex, activeStep?.instruction]);

  useEffect(() => {
    return () => {
      stopLiveTracking();
      Speech.stop();
    };
  }, []);

  const homePanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 12,
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

  const routePanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 12,
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > 90) {
            setRouteSheetMode("hidden");
            return;
          }

          if (gesture.dy > 30) {
            setRouteSheetMode("collapsed");
            return;
          }

          if (gesture.dy < -30) {
            setRouteSheetMode("expanded");
          }
        },
      }),
    []
  );

  async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token && token !== "LOCAL_TOKEN"
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

  async function optionalApiRequest(path, options = {}) {
    try {
      return await apiRequest(path, options);
    } catch {
      return null;
    }
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

  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(""), 3200);
  }

  function speakInstruction(text) {
    const clean = cleanSpokenInstruction(text);

    if (!clean) return;

    Speech.stop();
    Speech.speak(clean, {
      language: "en",
      pitch: 1,
      rate: 0.95,
    });
  }

  function clearRouteResult() {
    stopLiveTracking();

    setRoutes([]);
    setTripId(null);
    setRecommendedRouteId(null);
    setSelectedRouteId(null);
    setHasRouteResult(false);
    setCurrentStepIndex(0);
    setLiveRemainingDistanceKm(null);
    setLiveRemainingEtaMin(null);
    setHomeSheetHidden(false);
    setHomeSheetExpanded(false);
    setRouteSheetMode("expanded");
    setTripSummary(null);
    setNavPreviewMode(false);
    lastSpokenStepRef.current = -1;
  }

  
  async function refreshOperationsData() {
    const [dashboard, analytics, alertsData, saved, prefs] = await Promise.all([
      optionalApiRequest("/api/dashboard/summary"),
      optionalApiRequest("/api/analytics/dashboard"),
      optionalApiRequest("/api/alerts"),
      optionalApiRequest("/api/saved-places"),
      optionalApiRequest("/api/user/preferences"),
    ]);

    setDashboardData(dashboard || analytics || null);

    const rawAlerts =
      alertsData?.alerts || alertsData?.results || alertsData?.data || [];

    if (Array.isArray(rawAlerts)) {
      setAlerts(rawAlerts);
    }

    const rawSaved = saved?.saved_places || saved?.places || saved?.data || [];

    if (Array.isArray(rawSaved) && rawSaved.length) {
      setSavedPlaces(rawSaved.map(normalizePlace).filter(Boolean));
    }

    if (prefs?.route_preference) {
      setRoutePreference(prefs.route_preference);
    }
  }

    function isValidEmail(value) {
    return EMAIL_REGEX.test(String(value || "").trim());
  }

  function isValidPassword(value) {
    const clean = String(value || "");
    return clean.length >= 8 && /[A-Za-z]/.test(clean) && /\d/.test(clean);
  }

  function roleFromEmail(value) {
    const clean = String(value || "").toLowerCase();

    if (clean.includes("admin")) return "admin";
    if (clean.includes("emergency")) return "emergency";
    return "driver";
  }

  function nameFromRole(role) {
    if (role === "admin") return "FlowSync Admin";
    if (role === "emergency") return "FlowSync Emergency";
    if (role === "guest") return "Guest Driver";
    return "FlowSync Driver";
  }

  function buildLocalUser(nextEmail, nextRole = null, nextName = null) {
    const role = nextRole || roleFromEmail(nextEmail);

    return {
      name: nextName || nameFromRole(role),
      email: String(nextEmail || "").trim().toLowerCase(),
      role,
    };
  }

  async function login() {
    const cleanEmail = email.trim().toLowerCase();

    if (!isValidEmail(cleanEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Enter your password.");
      return;
    }

    await runAction(async () => {
      let data = {};

      try {
        data = await apiRequest("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({
            email: cleanEmail,
            password,
          }),
        });
      } catch {
        data = {};
      }

      const matchedDemo = QUICK_ACCOUNTS.find(
        (account) => account.email.toLowerCase() === cleanEmail
      );

      if (!getTokenDeep(data) && !matchedDemo) {
        throw new Error(
          "Backend login is not connected for this account yet. Use a demo role, create local account, or continue as guest."
        );
      }

      const nextToken = getTokenDeep(data) || "LOCAL_DEMO_TOKEN";

      const nextUser =
        data.user ||
        data.data?.user ||
        buildLocalUser(cleanEmail, matchedDemo?.role?.toLowerCase());

      setToken(nextToken);
      setUser(nextUser);
      setScreen("home");
      showToast(`Signed in as ${nextUser.role}`);
      refreshOperationsData();
    });
  }

  function loginWithDemoAccount(account) {
    const role = account.role.toLowerCase();
    const nextUser = buildLocalUser(account.email, role);

    setEmail(account.email);
    setPassword(DEMO_PASSWORD);
    setToken("LOCAL_DEMO_TOKEN");
    setUser(nextUser);
    setScreen("home");
    showToast(`Demo ${account.role} mode`);
    refreshOperationsData();
  }

  function chooseQuickAccount(account) {
    Alert.alert(
      `Continue as ${account.role}?`,
      `This opens the predefined ${account.role} account for testing.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: () => loginWithDemoAccount(account),
        },
      ]
    );
  }

  function createLocalAccount() {
    const cleanName = signupName.trim();
    const cleanEmail = signupEmail.trim().toLowerCase();

    if (cleanName.length < 2) {
      setError("Enter your full name.");
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    if (!isValidPassword(signupPassword)) {
      setError(PASSWORD_RULES_TEXT);
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const nextUser = buildLocalUser(cleanEmail, "driver", cleanName);

    setToken("LOCAL_CREATED_ACCOUNT_TOKEN");
    setUser(nextUser);
    setScreen("home");

    showToast(
      "Account created locally. Email verification will be enabled when backend email service is connected."
    );
  }

  function continueAsGuest() {
    setToken("GUEST_TOKEN");
    setUser(GUEST_USER);
    setScreen("home");
    showToast("Guest mode: route search and navigation only.");
  }

  function forgotPassword() {
    Alert.alert(
      "Password reset",
      "Password reset requires backend email service. The frontend is ready, and this can be connected when the backend endpoint is available.",
      [{ text: "OK" }]
    );
  }

  function logout() {
    Alert.alert("Logout?", "Your current mobile session will close.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => {
          stopLiveTracking();
          setToken("");
          setUser(null);
          setScreen("login");
          setSessionId("");
        },
      },
    ]);
  }
    async function searchPlaces(query, type) {
    const cleanQuery = query.trim();

    if (cleanQuery.length < 2) {
      if (type === "start") setStartSuggestions([]);
      if (type === "destination") setDestinationSuggestions([]);
      return;
    }

    if (type === "start") setSearchingStart(true);
    if (type === "destination") setSearchingDestination(true);

    try {
      const data = await apiRequest(
        `/api/locations/search?q=${encodeURIComponent(cleanQuery)}`
      );

      const rawResults = data?.results || data?.locations || data?.data || [];
      const results = Array.isArray(rawResults)
        ? rawResults.map(normalizePlace).filter(Boolean)
        : [];

      if (type === "start") setStartSuggestions(results.slice(0, 7));
      if (type === "destination") setDestinationSuggestions(results.slice(0, 7));
    } catch {
      const localResults = POPULAR_PLACES.filter((place) =>
        `${place.name} ${place.display_name}`
          .toLowerCase()
          .includes(cleanQuery.toLowerCase())
      );

      if (type === "start") setStartSuggestions(localResults);
      if (type === "destination") setDestinationSuggestions(localResults);

      setError(
        "Location search is using saved Dubai places until backend search responds."
      );
    } finally {
      if (type === "start") setSearchingStart(false);
      if (type === "destination") setSearchingDestination(false);
    }
  }

  function selectSuggestion(place, type) {
    const normalized = normalizePlace(place);

    if (!normalized) {
      setError("Selected place is missing coordinates.");
      return;
    }

    clearRouteResult();
    Keyboard.dismiss();

    if (type === "start") {
      setStartLocation(normalized.name);
      setSelectedStartPlace(normalized);
      setStartSuggestions([]);
    }

    if (type === "destination") {
      setDestination(normalized.name);
      setSelectedDestinationPlace(normalized);
      setDestinationSuggestions([]);
    }

    mapRef.current?.animateCamera(
      {
        center: {
          latitude: normalized.latitude,
          longitude: normalized.longitude,
        },
        zoom: 14,
        pitch: 28,
      },
      { duration: 650 }
    );
  }

  async function getDeviceLocation() {
    const permission = await Location.requestForegroundPermissionsAsync();

    if (permission.status !== "granted") {
      throw new Error("Location permission was denied.");
    }

    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const coords = {
      latitude: current.coords.latitude,
      longitude: current.coords.longitude,
    };

    const heading = Number.isFinite(current.coords.heading)
      ? current.coords.heading
      : 0;

    return { coords, heading, raw: current };
  }

  async function useCurrentLocationAsStart() {
    await runAction(async () => {
      const { coords, heading } = await getDeviceLocation();
      let label = "Current Location";

      try {
        const reverse = await Location.reverseGeocodeAsync(coords);
        const first = reverse?.[0];

        if (first) {
          const parts = [
            first.name,
            first.street,
            first.district,
            first.city,
          ].filter(Boolean);

          if (parts.length) {
            label = parts.join(", ");
          }
        }
      } catch {
        label = "Current Location";
      }

      clearRouteResult();

      const currentPlace = {
        place_id: "device-current-location",
        name: "Current Location",
        display_name: label,
        latitude: coords.latitude,
        longitude: coords.longitude,
        lat: coords.latitude,
        lng: coords.longitude,
        provider_name: "device_gps",
        provider_status: "current_location",
        category: "GPS",
      };

      setUserLocation(coords);
      setGpsHeading(heading);
      setCameraFollowing(true);
      setStartLocation("Current Location");
      setSelectedStartPlace(currentPlace);
      setStartSuggestions([]);

      mapRef.current?.animateCamera(
        {
          center: coords,
          zoom: 16,
          pitch: 35,
          heading,
        },
        { duration: 700 }
      );
    });
  }

  async function getMyLocation() {
    await runAction(async () => {
      const { coords, heading } = await getDeviceLocation();

      setUserLocation(coords);
      setGpsHeading(heading);
      setCameraFollowing(true);

      mapRef.current?.animateCamera(
        {
          center: coords,
          zoom: screen === "nav" ? 19 : 16,
          pitch: screen === "nav" ? 68 : 35,
          heading,
        },
        { duration: 700 }
      );
    });
  }

  function recenterOnUser() {
    const coords = routeCoordsRef.current || [];
    const safeLocation = userLocation || coords[0];

    if (!safeLocation) {
      getMyLocation();
      return;
    }

    setCameraFollowing(true);
    cameraFollowingRef.current = true;

    mapRef.current?.animateCamera(
      {
        center: safeLocation,
        zoom: screen === "nav" ? 19 : 15,
        pitch: screen === "nav" ? 68 : 35,
        heading: gpsHeading || 0,
      },
      { duration: 650 }
    );
  }

  function swapLocations() {
    const oldStartText = startLocation;
    const oldDestinationText = destination;
    const oldStartPlace = selectedStartPlace;
    const oldDestinationPlace = selectedDestinationPlace;

    clearRouteResult();

    setStartLocation(oldDestinationText);
    setDestination(oldStartText);
    setSelectedStartPlace(oldDestinationPlace);
    setSelectedDestinationPlace(oldStartPlace);
  }

  async function recommendRoute() {
    const cleanStart = startLocation.trim();
    const cleanDestination = destination.trim();

    if (!cleanStart || !cleanDestination) {
      setError("Please enter start and destination.");
      return;
    }

    if (cleanStart.toLowerCase() === cleanDestination.toLowerCase()) {
      setError("Start and destination cannot be the same.");
      return;
    }

    const usingCurrentLocation = isCurrentLocationPlace(selectedStartPlace);

    if (!usingCurrentLocation && !selectedStartPlace) {
      setError("Select a start suggestion or use current location.");
      return;
    }

    if (!selectedDestinationPlace) {
      setError("Select destination from suggestions before finding a route.");
      return;
    }

    await runAction(async () => {
      const startPlace = normalizePlace(selectedStartPlace);
      const destinationPlace = normalizePlace(selectedDestinationPlace);

      if (!startPlace || !destinationPlace) {
        throw new Error("Selected locations are missing coordinates.");
      }

      const body = {
        start_location: usingCurrentLocation ? "Current Location" : cleanStart,
        destination: cleanDestination,

        start_latitude: startPlace.latitude,
        start_longitude: startPlace.longitude,

        destination_latitude: destinationPlace.latitude,
        destination_longitude: destinationPlace.longitude,

        vehicle_type: user?.role === "emergency" ? "emergency" : "car",
        route_preference: routePreference,
        user_role: user?.role || "driver",

        include_live_traffic: true,
        traffic_provider: "tomtom",
        include_incidents: true,
        include_parking: true,
        include_route_load: true,
        include_analytics: true,
      };

      console.log("FLOWSYNC FINAL ROUTE REQUEST:", body);

      const data = await apiRequest("/api/routes/recommend", {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (data?.same_location) {
        throw new Error(data.message || "You are already at this location.");
      }

      const normalized = normalizeRouteResponse(data);

      if (!normalized.all_routes.length) {
        console.log("FLOWSYNC NO ROUTE RESPONSE:", data);
        throw new Error(
          normalized.message ||
            "No drivable route returned. Try a different suggestion or nearby place."
        );
      }

      const selectedId =
        normalized.recommended_route_id || normalized.all_routes[0]?.route_id;

      setTripId(normalized.trip_id);
      setRoutes(normalized.all_routes);
      setRecommendedRouteId(selectedId);
      setSelectedRouteId(selectedId);
      setRecommendationReason(normalized.recommendation_reason);
      setProviderStatus(`${normalized.provider} • ${normalized.provider_status}`);
      setTrafficStatus(
        normalized.live_traffic
          ? `${normalized.traffic_provider || "TomTom"} • live traffic`
          : "Traffic estimate"
      );

      setDashboardData(normalized.dashboard);

      if (normalized.parking_predictions.length) {
        setParkingPredictions(normalized.parking_predictions);
      }

      setHasRouteResult(true);
      setCurrentStepIndex(0);
      setTripSummary(null);
      setHomeSheetHidden(true);
      setHomeSheetExpanded(false);
      setRouteSheetMode("expanded");
      lastSpokenStepRef.current = -1;

      const selected =
        normalized.all_routes.find((route) => route.route_id === selectedId) ||
        normalized.all_routes[0];

      const coords = routeCoordinates(selected);
      setMapRegion(regionForCoordinates(coords));

      setTimeout(() => {
        mapRef.current?.fitToCoordinates(coords, {
          edgePadding: {
            top: 130,
            right: 76,
            bottom: 245,
            left: 76,
          },
          animated: true,
        });
      }, 250);

      setScreen("home");
      refreshOperationsData();
    });
  }

  function selectRoute(route) {
    if (!route?.route_id) return;

    setSelectedRouteId(route.route_id);
    setCurrentStepIndex(0);
    currentStepIndexRef.current = 0;
    setLiveRemainingDistanceKm(null);
    setLiveRemainingEtaMin(null);
    lastSpokenStepRef.current = -1;

    const coords = routeCoordinates(route);

    mapRef.current?.fitToCoordinates(coords, {
      edgePadding: {
        top: 130,
        right: 76,
        bottom: 305,
        left: 76,
      },
      animated: true,
    });
  }

  function updateProgressFromLocation(currentLocation) {
    const coords = routeCoordsRef.current;
    const steps = turnStepsRef.current;
    const route = selectedRouteRef.current;

    if (!currentLocation || !coords?.length) return;

    const closestIndex = closestRoutePointIndex(currentLocation, coords);
    const remainingKm = routeDistanceKm(coords, closestIndex);
    const totalKm = Number(route?.distance_km) || routeDistanceKm(coords, 0) || 1;
    const totalEta = Number(route?.estimated_time_min) || 1;

    const eta = Math.max(Math.round((remainingKm / totalKm) * totalEta), 0);

    setLiveRemainingDistanceKm(Number(remainingKm.toFixed(1)));
    setLiveRemainingEtaMin(eta);

    if (steps.length > 0) {
      const progressRatio = closestIndex / Math.max(coords.length - 1, 1);
      const nextStepIndex = Math.min(
        Math.floor(progressRatio * steps.length),
        steps.length - 1
      );

      if (nextStepIndex !== currentStepIndexRef.current) {
        currentStepIndexRef.current = nextStepIndex;
        setCurrentStepIndex(nextStepIndex);
      }

      const activeSession = sessionIdRef.current;

      if (activeSession && !activeSession.startsWith("LOCAL-")) {
        apiRequest("/api/trips/progress", {
          method: "POST",
          body: JSON.stringify({
            session_id: activeSession,
            current_step_index: nextStepIndex,
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            remaining_distance_km: Number(remainingKm.toFixed(1)),
            remaining_time_min: eta,
            progress_percentage: progressFromStep(nextStepIndex, steps.length),
            selected_route_id: route?.route_id,
          }),
        }).catch(() => {});
      }
    }
  }
    function stopRouteSimulation() {
    if (simulationRef.current) {
      clearInterval(simulationRef.current);
      simulationRef.current = null;
    }
  }

  function stopLiveTracking() {
    stopRouteSimulation();

    if (watcherRef.current) {
      watcherRef.current.remove();
      watcherRef.current = null;
    }

    setIsTracking(false);
  }

  function calculateDisplayLocation(rawLocation, routeCoords) {
    if (!routeCoords?.length) {
      return { location: rawLocation, preview: false };
    }

    const routeStart = routeCoords[0];
    const startIsDeviceGps = isCurrentLocationPlace(selectedStartPlace);

    if (!rawLocation) {
      return {
        location: routeStart,
        preview: !startIsDeviceGps,
      };
    }

    const closest = getClosestPointOnRoute(rawLocation, routeCoords);
    const distanceFromRouteStart = distanceMeters(rawLocation, routeStart);

    /*
      Important:
      If the user selected Dubai Mall as start but their phone is somewhere else,
      we do NOT pretend the phone is at Dubai Mall.
      We open preview mode instead.
    */
    if (!startIsDeviceGps && distanceFromRouteStart > 250) {
      return {
        location: routeStart,
        preview: true,
      };
    }

    return {
      location: closest && closest.distance <= 120 ? closest.point : rawLocation,
      preview: false,
    };
  }

  async function startLiveTracking() {
    if (watcherRef.current) {
      watcherRef.current.remove();
      watcherRef.current = null;
    }

    const permission = await Location.requestForegroundPermissionsAsync();

    if (permission.status !== "granted") {
      throw new Error("Location permission is required for live GPS tracking.");
    }

    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const rawCurrentLocation = {
      latitude: current.coords.latitude,
      longitude: current.coords.longitude,
    };

    const routeCoords = routeCoordsRef.current || [];
    const display = calculateDisplayLocation(rawCurrentLocation, routeCoords);
    const currentLocation = display.location;

    const currentClosest = getClosestPointOnRoute(currentLocation, routeCoords);

    const currentNextPoint =
      routeCoords[
        Math.min(
          (currentClosest?.index || 0) + 1,
          Math.max(routeCoords.length - 1, 0)
        )
      ];

    const routeHeading = bearingBetween(currentLocation, currentNextPoint);

    const gpsHeadingValue = Number.isFinite(current.coords.heading)
      ? current.coords.heading
      : null;

    const speedMps = Number(current.coords.speed || 0);

    const currentHeading =
      speedMps > 2 && gpsHeadingValue !== null && !display.preview
        ? gpsHeadingValue
        : routeHeading;

    setNavPreviewMode(display.preview);
    setUserLocation(currentLocation);
    setGpsHeading(currentHeading);
    setCameraFollowing(true);
    cameraFollowingRef.current = true;
    updateProgressFromLocation(currentLocation);

    mapRef.current?.animateCamera(
      {
        center: currentLocation,
        zoom: 19,
        pitch: 68,
        heading: currentHeading,
      },
      { duration: 850 }
    );

    watcherRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 3000,
        distanceInterval: 15,
      },
      (location) => {
        const rawLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };

        const latestRouteCoords = routeCoordsRef.current || [];
        const nextDisplay = calculateDisplayLocation(rawLocation, latestRouteCoords);
        const nextLocation = nextDisplay.location;

        const closest = getClosestPointOnRoute(nextLocation, latestRouteCoords);

        const nextPoint =
          latestRouteCoords[
            Math.min(
              (closest?.index || 0) + 1,
              Math.max(latestRouteCoords.length - 1, 0)
            )
          ];

        const nextRouteHeading = bearingBetween(nextLocation, nextPoint);

        const nextGpsHeading = Number.isFinite(location.coords.heading)
          ? location.coords.heading
          : null;

        const nextSpeedMps = Number(location.coords.speed || 0);

        const nextHeading =
          nextSpeedMps > 2 && nextGpsHeading !== null && !nextDisplay.preview
            ? nextGpsHeading
            : nextRouteHeading;

        setNavPreviewMode(nextDisplay.preview);
        setUserLocation(nextLocation);
        setGpsHeading(nextHeading);
        updateProgressFromLocation(nextLocation);

        if (cameraFollowingRef.current) {
          mapRef.current?.animateCamera(
            {
              center: nextLocation,
              zoom: 19,
              pitch: 68,
              heading: nextHeading,
            },
            { duration: 850 }
          );
        }
      }
    );

    setIsTracking(true);
  }

  function startRouteSimulation() {
    const coords = routeCoordsRef.current;
    const steps = turnStepsRef.current;

    if (!coords || coords.length < 2) {
      setError("No route coordinates available for navigation simulation.");
      return;
    }

    stopRouteSimulation();

    let pointIndex = 0;
    const stepSize = Math.max(1, Math.floor(coords.length / 140));

    setCameraFollowing(true);
    cameraFollowingRef.current = true;
    setNavPreviewMode(false);
    setUserLocation(coords[0]);
    setGpsHeading(bearingBetween(coords[0], coords[1]));
    updateProgressFromLocation(coords[0]);

    mapRef.current?.animateCamera(
      {
        center: coords[0],
        zoom: 19,
        pitch: 68,
        heading: bearingBetween(coords[0], coords[1]),
      },
      { duration: 700 }
    );

    simulationRef.current = setInterval(() => {
      const previousPoint = coords[pointIndex];

      pointIndex = Math.min(pointIndex + stepSize, coords.length - 1);

      const currentPoint = coords[pointIndex];
      const heading = bearingBetween(previousPoint, currentPoint);

      setUserLocation(currentPoint);
      setGpsHeading(heading);
      updateProgressFromLocation(currentPoint);

      if (cameraFollowingRef.current) {
        mapRef.current?.animateCamera(
          {
            center: currentPoint,
            zoom: 19,
            pitch: 68,
            heading,
          },
          { duration: 700 }
        );
      }

      if (steps.length > 0) {
        const progressRatio = pointIndex / Math.max(coords.length - 1, 1);

        const nextStepIndex = Math.min(
          Math.floor(progressRatio * steps.length),
          steps.length - 1
        );

        setCurrentStepIndex(nextStepIndex);
        currentStepIndexRef.current = nextStepIndex;
      }

      if (pointIndex >= coords.length - 1) {
        stopRouteSimulation();

        const finalIndex = Math.max(steps.length - 1, 0);

        setCurrentStepIndex(finalIndex);
        currentStepIndexRef.current = finalIndex;
        setLiveRemainingDistanceKm(0);
        setLiveRemainingEtaMin(0);
      }
    }, 900);

    setIsTracking(true);
  }

  async function startTrip() {
    await runAction(async () => {
      if (!selectedRoute) {
        throw new Error("Select a route before starting navigation.");
      }

      const coords = routeCoordinates(selectedRoute);

      if (coords.length < 2) {
        throw new Error("Selected route has no road geometry.");
      }

      const routeStart = coords[0];
      const routeHeading = bearingBetween(coords[0], coords[1]);

      const body = {
        trip_id: tripId,
        selected_route_id: selectedRoute.route_id,
        route_name: selectedRoute.route_name,
        start_location: startLocation,
        destination,
        current_step_index: 0,
        user_role: user?.role || "driver",
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
        data?.session_id ||
          data?.session?.session_id ||
          data?.trip_session_id ||
          `LOCAL-${Date.now()}`
      );

      setSessionId(nextSession);
      sessionIdRef.current = nextSession;

      setCurrentStepIndex(0);
      currentStepIndexRef.current = 0;

      setLiveRemainingDistanceKm(selectedRoute.distance_km || null);
      setLiveRemainingEtaMin(selectedRoute.estimated_time_min || null);

      setUserLocation(routeStart);
      setGpsHeading(routeHeading);
      setCameraFollowing(true);

      setNavPreviewMode(!isCurrentLocationPlace(selectedStartPlace));
      lastSpokenStepRef.current = -1;

      /*
        Important:
        We switch to nav immediately.
        Then we start GPS tracking after render, so the button never feels dead.
      */
      setScreen("nav");

      setTimeout(() => {
        mapRef.current?.animateCamera(
          {
            center: routeStart,
            zoom: 19,
            pitch: 68,
            heading: routeHeading,
          },
          { duration: 700 }
        );

        if (USE_DEMO_NAVIGATION) {
          startRouteSimulation();
          return;
        }

        startLiveTracking().catch(() => {
          setIsTracking(false);
          setNavPreviewMode(true);
          showToast(
            "Navigation opened in preview. Use current GPS as start for real car movement."
          );
        });
      }, 350);

      if (!data) {
        showToast("Trip started locally. Backend session endpoint did not respond.");
      }
    });
  }
    function requestEndTrip() {
    Alert.alert(
      hasArrived ? "Finish trip?" : "End trip early?",
      hasArrived
        ? "Mark this trip as completed?"
        : "You have not arrived yet. End this trip as cancelled/interrupted?",
      [
        { text: "Continue", style: "cancel" },
        {
          text: hasArrived ? "Finish" : "End early",
          style: hasArrived ? "default" : "destructive",
          onPress: () => endTrip(hasArrived ? "completed" : "cancelled"),
        },
      ]
    );
  }

  async function endTrip(finalStatus = "completed") {
    await runAction(async () => {
      if (!sessionId) {
        throw new Error("No active trip session.");
      }

      stopLiveTracking();
      Speech.stop();

      if (!sessionId.startsWith("LOCAL-")) {
        try {
          await apiRequest("/api/trips/end", {
            method: "POST",
            body: JSON.stringify({
              session_id: sessionId,
              status: finalStatus,
            }),
          });
        } catch {
          showToast("Backend end trip failed. Showing local summary.");
        }
      }

      setTripSummary({
        status: finalStatus,
        route_id: selectedRoute?.route_id,
        route_name: selectedRoute?.route_name,
        start_location: startLocation,
        destination,
        eta_text: selectedRoute?.eta_text,
        distance_text: selectedRoute?.distance_text,
        congestion_score: selectedRoute?.congestion_score,
        flowsync_score: selectedRoute?.flowsync_score || selectedRoute?.route_score,
        live_traffic: selectedRoute?.live_traffic,
        traffic_display: selectedRoute?.traffic_display,
        progress: progressPercent,
      });

      setSessionId("");
      sessionIdRef.current = "";
      setLiveRemainingDistanceKm(null);
      setLiveRemainingEtaMin(null);
      setScreen("summary");
    });
  }

  async function submitReport(reportType) {
    const reportLocation = userLocation || selectedRouteCoordinates[0] || null;

    const nextReport = {
      id: `local-report-${Date.now()}`,
      type: reportType.id,
      title: reportType.label,
      description: `Driver reported ${reportType.label}`,
      latitude: reportLocation?.latitude,
      longitude: reportLocation?.longitude,
      created_at: new Date().toISOString(),
    };

    if (reportLocation) {
      setLocalReports((items) => [nextReport, ...items].slice(0, 8));
    }

    setReportModalVisible(false);
    showToast(`${reportType.label} report submitted`);

    const payload = {
      type: reportType.id,
      title: reportType.label,
      latitude: reportLocation?.latitude,
      longitude: reportLocation?.longitude,
      route_id: selectedRoute?.route_id,
      session_id: sessionId || null,
      user_role: user?.role || "driver",
    };

    await optionalApiRequest("/api/reports", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    await optionalApiRequest("/api/alerts/report", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    await optionalApiRequest("/api/user_reports", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  function renderLogin() {
    const isSignup = authMode === "signup";

    return (
      <ScrollView
        contentContainerStyle={styles.loginShell}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.loginBrandRow}>
          <View style={styles.logoBubble}>
            <Text style={styles.logoBubbleText}>FS</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.loginLogoText}>FlowSync</Text>
            <Text style={styles.loginSubline}>Dubai Smart Mobility OS</Text>
          </View>
        </View>

        <View style={styles.authHeroCard}>
          <View style={styles.heroPillRow}>
            <Pill label="Real app auth" tone="cyan" />
            <Pill label="Guest ready" tone="green" />
          </View>

          <Text style={styles.authHeroTitle}>
            {isSignup ? "Create your FlowSync account." : "Welcome back."}
          </Text>

          <Text style={styles.authHeroText}>
            {isSignup
              ? "Create a driver account now. Email verification is prepared for backend OTP integration later."
              : "Login with email, use demo role accounts, or continue as guest."}
          </Text>

          <View style={styles.authModeTabs}>
            <TouchableOpacity
              style={[
                styles.authModeTab,
                authMode === "login" ? styles.authModeTabActive : null,
              ]}
              onPress={() => setAuthMode("login")}
              activeOpacity={0.86}
            >
              <Text
                style={[
                  styles.authModeText,
                  authMode === "login" ? styles.authModeTextActive : null,
                ]}
              >
                Login
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.authModeTab,
                authMode === "signup" ? styles.authModeTabActive : null,
              ]}
              onPress={() => setAuthMode("signup")}
              activeOpacity={0.86}
            >
              <Text
                style={[
                  styles.authModeText,
                  authMode === "signup" ? styles.authModeTextActive : null,
                ]}
              >
                Create account
              </Text>
            </TouchableOpacity>
          </View>

          {isSignup ? (
            <>
              <Text style={styles.loginLabel}>Full name</Text>
              <TextInput
                style={styles.loginInput}
                value={signupName}
                onChangeText={setSignupName}
                placeholder="Mohd Arsalan"
                placeholderTextColor={COLORS.faint}
              />

              <Text style={styles.loginLabel}>Email</Text>
              <TextInput
                style={styles.loginInput}
                value={signupEmail}
                onChangeText={(text) =>
                  setSignupEmail(text.replace(/\s/g, "").toLowerCase())
                }
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="you@example.com"
                placeholderTextColor={COLORS.faint}
              />

              <Text style={styles.loginLabel}>Password</Text>
              <TextInput
                style={styles.loginInput}
                value={signupPassword}
                onChangeText={setSignupPassword}
                secureTextEntry
                placeholder="Minimum 8 characters"
                placeholderTextColor={COLORS.faint}
              />

              <Text style={styles.loginLabel}>Confirm password</Text>
              <TextInput
                style={styles.loginInput}
                value={signupConfirmPassword}
                onChangeText={setSignupConfirmPassword}
                secureTextEntry
                placeholder="Re-enter password"
                placeholderTextColor={COLORS.faint}
              />

              <Text style={styles.authHelperText}>{PASSWORD_RULES_TEXT}</Text>

              <TouchableOpacity
                style={styles.loginButton}
                onPress={createLocalAccount}
                activeOpacity={0.86}
              >
                <Text style={styles.loginButtonText}>Create Account</Text>
              </TouchableOpacity>

              <Text style={styles.authNote}>
                Email verification is on hold until backend email/OTP service is connected.
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.loginLabel}>Email</Text>
              <TextInput
                style={styles.loginInput}
                value={email}
                onChangeText={(text) =>
                  setEmail(text.replace(/\s/g, "").toLowerCase())
                }
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="driver@flowsync.local"
                placeholderTextColor={COLORS.faint}
              />

              <Text style={styles.loginLabel}>Password</Text>
              <TextInput
                style={styles.loginInput}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Password"
                placeholderTextColor={COLORS.faint}
              />

              <TouchableOpacity
                style={styles.forgotButton}
                onPress={forgotPassword}
                activeOpacity={0.86}
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.loginButton}
                onPress={login}
                activeOpacity={0.86}
              >
                <Text style={styles.loginButtonText}>Login</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.guestButton}
                onPress={continueAsGuest}
                activeOpacity={0.86}
              >
                <Text style={styles.guestButtonText}>Continue as Guest</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {!isSignup ? (
          <View style={styles.quickCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.quickTitle}>Predefined accounts</Text>
              <Text style={styles.quickHint}>Demo roles</Text>
            </View>

            {QUICK_ACCOUNTS.map((account) => (
              <TouchableOpacity
                key={account.email}
                style={styles.quickAccount}
                onPress={() => chooseQuickAccount(account)}
                activeOpacity={0.86}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.quickRole}>{account.role}</Text>
                  <Text style={styles.quickDescription}>{account.description}</Text>
                  <Text style={styles.quickEmail}>{account.email}</Text>
                </View>

                <Text style={styles.quickChevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </ScrollView>
    );
  }

  function renderTrafficSegments(navigation = false) {
    if (!selectedRoute || selectedRouteCoordinates.length < 2) return null;

    return routeTrafficSegments.map((segment, index) => {
      const coordinates = segment.coordinates?.length > 1 ? segment.coordinates : [];

      if (coordinates.length < 2) return null;

      return (
        <Polyline
          key={`${segment.id}-${index}`}
          coordinates={coordinates}
          strokeWidth={navigation ? 11 : 8}
          strokeColor={trafficColor(segment.severity)}
          zIndex={navigation ? 42 : 28}
          lineCap="round"
          lineJoin="round"
        />
      );
    });
  }

  function renderMap({
    navigation = false,
    routeCompare = false,
    showControls = true,
  } = {}) {
    const coords = selectedRouteCoordinates;
    const start = coords[0];
    const end = coords[coords.length - 1];

    const navClosestIndex =
      navigation && userLocation && coords.length > 1
        ? closestRoutePointIndex(userLocation, coords)
        : 0;

    const navRemainingStartIndex = Math.min(
      navClosestIndex,
      Math.max(coords.length - 2, 0)
    );

    const remainingNavCoords = navigation ? coords.slice(navRemainingStartIndex) : coords;

    return (
      <View style={styles.mapShell}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
          customMapStyle={navigation ? MAP_STYLE_NAV : MAP_STYLE_LIGHT}
          initialRegion={mapRegion || DEFAULT_REGION}
          onPanDrag={() => {
            if (screen === "nav") {
              setCameraFollowing(false);
              cameraFollowingRef.current = false;
            }
          }}
          onRegionChangeComplete={(region) => {
            if (screen !== "nav") setMapRegion(region);
          }}
          showsUserLocation={!navigation}
          showsMyLocationButton={false}
          showsCompass={false}
          toolbarEnabled={false}
          loadingEnabled
        >
          {routeCompare
            ? routes.map((route) => {
                const currentCoords = routeCoordinates(route);
                const isSelected = route.route_id === selectedRouteId;

                if (currentCoords.length < 2) return null;

                return (
                  <Polyline
                    key={route.route_id}
                    coordinates={currentCoords}
                    strokeWidth={isSelected ? 9 : 5}
                    strokeColor={
                      isSelected ? COLORS.cyan : "rgba(100,116,139,0.68)"
                    }
                    zIndex={isSelected ? 35 : 5}
                    tappable
                    onPress={() => {
                      selectRoute(route);
                      setRouteSheetMode("collapsed");
                    }}
                    lineCap="round"
                    lineJoin="round"
                  />
                );
              })
            : null}

          {!routeCompare && coords.length > 1 ? (
            <>
              <Polyline
                coordinates={coords}
                strokeWidth={navigation ? 16 : 12}
                strokeColor={
                  navigation ? "rgba(15,23,42,0.88)" : "rgba(15,23,42,0.24)"
                }
                zIndex={8}
                lineCap="round"
                lineJoin="round"
              />

              <Polyline
                coordinates={coords}
                strokeWidth={navigation ? 10 : 7}
                strokeColor={navigation ? COLORS.cyan : COLORS.green}
                zIndex={24}
                lineCap="round"
                lineJoin="round"
              />

              {renderTrafficSegments(navigation)}

              {navigation && remainingNavCoords.length > 1 ? (
                <Polyline
                  coordinates={remainingNavCoords}
                  strokeWidth={12}
                  strokeColor="#67e8f9"
                  zIndex={55}
                  lineCap="round"
                  lineJoin="round"
                />
              ) : null}
            </>
          ) : null}

          {navigation && userLocation ? (
            <Marker
              coordinate={userLocation}
              anchor={{ x: 0.5, y: 0.5 }}
              rotation={gpsHeading || 0}
              flat
            >
              <View style={styles.vehicleMarker}>
                <Text style={styles.vehicleMarkerText}>➤</Text>
              </View>
            </Marker>
          ) : null}

          {!navigation && start ? (
            <Marker coordinate={start} title="Start" description={startLocation} />
          ) : null}

          {end ? (
            <Marker coordinate={end} title="Destination" description={destination} />
          ) : null}

          {routeIncidents.map((incident) => (
            <Marker
              key={incident.id}
              coordinate={{
                latitude: incident.latitude,
                longitude: incident.longitude,
              }}
              title={incident.title}
              description={incident.description}
            >
              <View style={styles.incidentMarker}>
                <Text style={styles.incidentMarkerText}>!</Text>
              </View>
            </Marker>
          ))}
        </MapView>

        {showControls && !navigation ? (
          <View style={styles.mapButtons}>
            <TouchableOpacity
              style={styles.circleButton}
              onPress={recenterOnUser}
              activeOpacity={0.86}
            >
              <Text style={styles.circleButtonText}>⌖</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.circleButton}
              onPress={refreshOperationsData}
              activeOpacity={0.86}
            >
              <Text style={styles.circleButtonText}>↻</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.circleButtonDanger}
              onPress={() => setReportModalVisible(true)}
              activeOpacity={0.86}
            >
              <Text style={styles.circleButtonText}>⚠</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  }
    function renderSuggestionList(type) {
    const suggestions = type === "start" ? startSuggestions : destinationSuggestions;
    const searching = type === "start" ? searchingStart : searchingDestination;

    if (searching) {
      return (
        <View style={styles.suggestionBox}>
          <Text style={styles.suggestionStatus}>Searching Dubai...</Text>
        </View>
      );
    }

    if (!suggestions.length) return null;

    return (
      <View style={styles.suggestionBox}>
        <ScrollView
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          style={styles.suggestionScroll}
        >
          {suggestions.map((place, index) => (
            <TouchableOpacity
              key={`${type}-${place.place_id || index}`}
              style={styles.suggestionItem}
              onPress={() => selectSuggestion(place, type)}
              activeOpacity={0.86}
            >
              <Text style={styles.suggestionTitle}>{placeTitle(place)}</Text>
              <Text style={styles.suggestionSub}>{placeSubtitle(place)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  function renderSearchCard() {
    return (
      <View style={styles.searchCard}>
        <View style={styles.searchHeaderRow}>
          <View>
            <Text style={styles.searchHeaderTitle}>Plan smart route</Text>
            <Text style={styles.searchHeaderSub}>ORS routing • TomTom-ready traffic • FlowSync AI</Text>
          </View>

          <Pill
            label={user?.role || "driver"}
            tone={user?.role === "emergency" ? "red" : "cyan"}
          />
        </View>

        <View style={styles.searchTop}>
          <View style={styles.routeDots}>
            <View style={styles.dotStart} />
            <View style={styles.dotLine} />
            <View style={styles.dotEnd} />
          </View>

          <View style={styles.searchInputs}>
            <TextInput
              style={styles.searchInput}
              value={startLocation}
              onChangeText={(text) => {
                setStartLocation(text);
                setSelectedStartPlace(null);
                clearRouteResult();
                searchPlaces(text, "start");
              }}
              placeholder="Start location"
              placeholderTextColor={COLORS.faint}
            />

            {renderSuggestionList("start")}

            <TouchableOpacity
              style={styles.useLocationButton}
              onPress={useCurrentLocationAsStart}
              activeOpacity={0.86}
            >
              <Text style={styles.useLocationText}>Use live GPS as start</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TextInput
              style={styles.searchInput}
              value={destination}
              onChangeText={(text) => {
                setDestination(text);
                setSelectedDestinationPlace(null);
                clearRouteResult();
                searchPlaces(text, "destination");
              }}
              placeholder="Where to?"
              placeholderTextColor={COLORS.faint}
            />

            {renderSuggestionList("destination")}
          </View>

          <TouchableOpacity
            style={styles.swapButton}
            onPress={swapLocations}
            activeOpacity={0.86}
          >
            <Text style={styles.swapText}>⇅</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.preferenceRow}>
          {[
            ["balanced", "Balanced"],
            ["fastest", "Fastest"],
            ["low_traffic", "Low traffic"],
          ].map(([value, label]) => (
            <TouchableOpacity
              key={value}
              style={[
                styles.preferenceChip,
                routePreference === value ? styles.preferenceChipActive : null,
              ]}
              onPress={() => setRoutePreference(value)}
              activeOpacity={0.86}
            >
              <Text
                style={[
                  styles.preferenceText,
                  routePreference === value ? styles.preferenceTextActive : null,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.findButton}
          onPress={() => {
            Keyboard.dismiss();
            setHomeSheetHidden(false);
            setHomeSheetExpanded(false);
            recommendRoute();
          }}
          activeOpacity={0.86}
        >
          <Text style={styles.findButtonText}>Generate FlowSync route</Text>
        </TouchableOpacity>

        <View style={styles.savedStrip}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {savedPlaces.slice(0, 6).map((place, index) => (
              <TouchableOpacity
                key={`${place.place_id || place.name}-${index}`}
                style={styles.savedChip}
                onPress={() => selectSuggestion(place, "destination")}
                activeOpacity={0.86}
              >
                <Text style={styles.savedChipText}>{place.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    );
  }

  function renderCompactSearchBar() {
    return (
      <TouchableOpacity
        style={styles.compactSearchBar}
        onPress={() => {
          clearRouteResult();
          setHomeSheetHidden(false);
          setHomeSheetExpanded(false);
        }}
        activeOpacity={0.86}
      >
        <Text style={styles.compactSearchMain} numberOfLines={1}>
          {startLocation} → {destination}
        </Text>

        <Text style={styles.compactSearchHint}>
          Tap to edit route • {trafficStatus}
        </Text>
      </TouchableOpacity>
    );
  }

  function renderRoutePanel() {
    if (!hasRouteResult || !selectedRoute) return null;

    if (homeSheetHidden) {
      return (
        <TouchableOpacity
          style={styles.hiddenRoutePill}
          onPress={() => {
            setHomeSheetHidden(false);
            setHomeSheetExpanded(false);
          }}
          activeOpacity={0.9}
        >
          <View>
            <Text style={styles.hiddenRouteTitle}>
              {selectedRoute.eta_text} • {selectedRoute.route_id}
            </Text>

            <Text style={styles.hiddenRouteSub}>
              {selectedRoute.live_traffic
                ? selectedRoute.traffic_display
                : "Show FlowSync intelligence"}
            </Text>
          </View>

          <Text style={styles.hiddenRouteArrow}>⌃</Text>
        </TouchableOpacity>
      );
    }

    const collapsed = !homeSheetExpanded;
    const score = selectedRoute.flowsync_score || selectedRoute.route_score || "--";

    return (
      <View
        style={[
          styles.routeSheet,
          collapsed ? styles.routeSheetCollapsed : styles.routeSheetExpanded,
        ]}
      >
        <View style={styles.sheetHandleArea} {...homePanResponder.panHandlers}>
          <View style={styles.handle} />
          <Text style={styles.swipeHint}>
            {collapsed
              ? "Swipe up for intelligence • swipe down to hide"
              : "Swipe down to collapse or hide"}
          </Text>
        </View>

        <View style={styles.sheetHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.routeLabelRow}>
              <Pill label={selectedRoute.route_id} tone="cyan" />
              {selectedRoute.route_id === recommendedRouteId ? (
                <Pill label="Recommended" tone="green" />
              ) : null}
            </View>

            <Text style={styles.routeTitle} numberOfLines={collapsed ? 1 : 2}>
              {selectedRoute.route_name}
            </Text>

            <Text style={styles.routeSub} numberOfLines={1}>
              {startLocation} → {destination}
            </Text>
          </View>

          <View style={styles.scoreRing}>
            <Text style={styles.scoreRingValue}>{score}</Text>
            <Text style={styles.scoreRingLabel}>score</Text>
          </View>
        </View>

        <View style={styles.metricRow}>
          <MetricBox value={selectedRoute.eta_text} label="ETA" />
          <MetricBox value={selectedRoute.distance_text} label="Distance" />
          <MetricBox
            value={String(selectedRoute.congestion_score || "--")}
            label="Traffic"
          />
        </View>

        {homeSheetExpanded ? (
          <View style={styles.flowBox}>
            <Text style={styles.flowTitle}>FlowSync intelligence engine</Text>

            <Text style={styles.flowText}>
              {selectedRoute.recommendation_reason || recommendationReason}
            </Text>

            <InsightRow label="Routing" value={providerStatus} />

            <InsightRow
              label="Traffic"
              value={
                selectedRoute.live_traffic
                  ? selectedRoute.traffic_display
                  : "Estimate mode until provider confirms live traffic"
              }
            />

            <InsightRow
              label="Load"
              value={`${selectedRoute.assigned_users || 0}/${
                selectedRoute.road_capacity || "--"
              } users • ${selectedRoute.load_status}`}
            />

            <InsightRow
              label="Alerts"
              value={`${routeIncidents.length} active road alert${
                routeIncidents.length === 1 ? "" : "s"
              }`}
            />
          </View>
        ) : null}

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setScreen("routes")}
            activeOpacity={0.86}
          >
            <Text style={styles.secondaryButtonText}>Compare routes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={startTrip}
            activeOpacity={0.86}
          >
            <Text style={styles.primaryButtonText}>Start</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.hideSheetButton}
          onPress={() => {
            setHomeSheetHidden(true);
            setHomeSheetExpanded(false);
          }}
          activeOpacity={0.86}
        >
          <Text style={styles.hideSheetText}>Hide route panel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderHome() {
    return (
      <View style={styles.fullScreen}>
        {renderMap({ showControls: !hasRouteResult })}
        {hasRouteResult ? renderCompactSearchBar() : renderSearchCard()}
        {renderRoutePanel()}
      </View>
    );
  }

  function renderRoutes() {
    if (!hasRouteResult || !routes.length) {
      return (
        <View style={styles.fullScreen}>
          {renderMap({ showControls: false })}

          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No routes yet</Text>
            <Text style={styles.emptyText}>Find a FlowSync route first.</Text>

            <TouchableOpacity
              style={styles.primaryWide}
              onPress={() => setScreen("home")}
              activeOpacity={0.86}
            >
              <Text style={styles.primaryButtonText}>Back to Search</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    const collapsed = routeSheetMode === "collapsed";
    const hidden = routeSheetMode === "hidden";
    const visibleRoutes = collapsed ? [selectedRoute].filter(Boolean) : routes.slice(0, 4);

    return (
      <View style={styles.fullScreen}>
        {renderMap({ routeCompare: true, showControls: false })}

        <View style={styles.routeTopCard}>
          <Text style={styles.routeTopTitle}>Adaptive route distribution</Text>
          <Text style={styles.routeTopSub} numberOfLines={1}>
            {startLocation} → {destination}
          </Text>
        </View>

        <View style={styles.routeLegend}>
          <LegendItem color={COLORS.cyan} text="Selected" />
          <LegendItem color="rgba(100,116,139,0.68)" text="Alternative" />
        </View>

        {hidden ? (
          <TouchableOpacity
            style={styles.routeHiddenPill}
            onPress={() => setRouteSheetMode("collapsed")}
            activeOpacity={0.9}
          >
            <View>
              <Text style={styles.hiddenRouteTitle}>
                {selectedRoute?.eta_text || "--"} • {selectedRoute?.route_id}
              </Text>

              <Text style={styles.hiddenRouteSub}>Tap to show route options</Text>
            </View>

            <Text style={styles.hiddenRouteArrow}>⌃</Text>
          </TouchableOpacity>
        ) : (
          <View
            style={[
              styles.routeCompareSheet,
              collapsed
                ? styles.routeCompareSheetCollapsed
                : styles.routeCompareSheetExpanded,
            ]}
          >
            <View style={styles.sheetHandleArea} {...routePanResponder.panHandlers}>
              <View style={styles.handle} />
              <Text style={styles.swipeHint}>
                {collapsed
                  ? "Swipe up for all routes • swipe down to hide"
                  : "Tap route line on map or swipe down to collapse"}
              </Text>
            </View>

            <View style={styles.routeCompareHeader}>
              <View>
                <Text style={styles.routeCompareTitle}>Route options</Text>

                <Text style={styles.routeCompareSub}>
                  {routes.length === 1
                    ? "Backend returned one unique road geometry"
                    : "Balanced by ETA, traffic, and route load"}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.routeCountPill}
                onPress={() => setRouteSheetMode(collapsed ? "expanded" : "collapsed")}
                activeOpacity={0.86}
              >
                <Text style={styles.routeCountText}>
                  {collapsed
                    ? "Show all"
                    : `${routes.length} route${routes.length === 1 ? "" : "s"}`}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.compactRouteList}>
              {visibleRoutes.map((route) => {
                const selected = route.route_id === selectedRouteId;
                const recommended = route.route_id === recommendedRouteId;

                return (
                  <TouchableOpacity
                    key={route.route_id}
                    style={[
                      styles.compactRouteCard,
                      selected ? styles.compactRouteCardActive : null,
                    ]}
                    onPress={() => selectRoute(route)}
                    activeOpacity={0.86}
                  >
                    <View style={styles.compactRouteLeft}>
                      <View
                        style={[
                          styles.compactRouteDot,
                          selected ? styles.compactRouteDotActive : null,
                        ]}
                      />

                      <View style={{ flex: 1 }}>
                        <View style={styles.compactRouteTitleRow}>
                          <Text style={styles.compactRouteName} numberOfLines={1}>
                            {compactRouteName(route.route_name)}
                          </Text>

                          {recommended ? <Text style={styles.bestPill}>Best</Text> : null}
                          {selected ? <Text style={styles.selectedPill}>Selected</Text> : null}
                        </View>

                        <Text style={styles.compactRouteReason} numberOfLines={1}>
                          {route.live_traffic
                            ? "TomTom live traffic"
                            : route.traffic_display || "Traffic estimate"}{" "}
                          • Load {route.assigned_users || 0}/{route.road_capacity || "--"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.compactRouteStats}>
                      <Text style={styles.compactEta}>{route.eta_text}</Text>
                      <Text style={styles.compactDistance}>{route.distance_text}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.routeActionRow}>
              <TouchableOpacity
                style={styles.routeBackButton}
                onPress={() => setScreen("home")}
                activeOpacity={0.86}
              >
                <Text style={styles.routeBackText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.routeUseButton}
                onPress={() => setScreen("home")}
                activeOpacity={0.86}
              >
                <Text style={styles.routeUseText}>Use selected route</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  }
    function renderNavigation() {
    const currentDistance = formatStepDistance(activeStep?.distance_m);
    const nextDistance = formatStepDistance(nextStep?.distance_m);

    return (
      <View style={styles.fullScreen}>
        {renderMap({ navigation: true, showControls: false })}

        <View style={styles.driveTopBanner}>
          <View style={styles.driveTurnIcon}>
            <Text style={styles.driveTurnIconText}>
              {hasArrived ? "✓" : maneuverIcon(activeStep)}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.driveDistanceText}>
              {hasArrived
                ? "Arrived"
                : currentDistance
                ? `In ${currentDistance}`
                : "Now"}
            </Text>

            <Text style={styles.driveInstructionText} numberOfLines={2}>
              {hasArrived
                ? "Finish trip when safe"
                : activeStep?.instruction || "Continue on selected route"}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.driveAudioButton}
            onPress={() =>
              speakInstruction(activeStep?.instruction || "Continue on selected route")
            }
            activeOpacity={0.86}
          >
            <Text style={styles.driveAudioText}>🔊</Text>
          </TouchableOpacity>
        </View>

        {!hasArrived && nextStep ? (
          <View style={styles.driveNextBanner}>
            <Text style={styles.driveThenText}>Then</Text>
            <Text style={styles.driveNextIcon}>{maneuverIcon(nextStep)}</Text>
            <Text style={styles.driveNextText} numberOfLines={1}>
              {nextDistance ? `${nextDistance} • ` : ""}
              {nextStep.instruction || "Continue"}
            </Text>
          </View>
        ) : null}

        {navPreviewMode ? (
          <View style={styles.previewBadge}>
            <Text style={styles.previewBadgeText}>
              Route preview mode • set start as live GPS for real car movement
            </Text>
          </View>
        ) : null}

        <View style={styles.driveFloatingControls}>
          <TouchableOpacity
            style={styles.driveCircleButton}
            onPress={recenterOnUser}
            activeOpacity={0.86}
          >
            <Text style={styles.driveCircleText}>⌖</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.driveReportButton}
            onPress={() => setReportModalVisible(true)}
            activeOpacity={0.86}
          >
            <Text style={styles.driveReportText}>⚠ Report</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.driveBottomBar}>
          <TouchableOpacity
            style={styles.driveExitButton}
            onPress={requestEndTrip}
            activeOpacity={0.86}
          >
            <Text style={styles.driveExitText}>×</Text>
          </TouchableOpacity>

          <View style={styles.driveBottomCenter}>
            <Text style={styles.driveBottomEta}>
              {hasArrived ? "Arrived" : `${displayEta} min`}
            </Text>

            <Text style={styles.driveBottomSub} numberOfLines={1}>
              {displayDistance} km • {progressPercent}% •{" "}
              {selectedRoute?.live_traffic
                ? selectedRoute?.traffic_display || "TomTom live traffic"
                : selectedRoute?.traffic_display || "Traffic estimate"}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.driveRouteButton}
            onPress={() => setScreen("routes")}
            activeOpacity={0.86}
          >
            <Text style={styles.driveRouteText}>↱</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderOperations() {
    const activeRoute = selectedRoute;
    const liveTraffic = activeRoute?.live_traffic;

    const activeUsers =
      dashboardData?.active_users ||
      dashboardData?.active_drivers ||
      activeRoute?.assigned_users ||
      0;

    const avgSpeed =
      dashboardData?.average_speed ||
      dashboardData?.avg_speed ||
      activeRoute?.average_speed ||
      "--";

    const congestion =
      activeRoute?.congestion_score || dashboardData?.congestion_score || "--";

    return (
      <ScrollView contentContainerStyle={styles.screenContainer}>
        <View style={styles.commandHero}>
          <Text style={styles.pageKicker}>FLOW COMMAND</Text>
          <Text style={styles.pageTitle}>Operations Hub</Text>
          <Text style={styles.commandText}>
            Monitor routing, traffic, parking, incidents, and role-based mobility
            intelligence from one screen.
          </Text>
        </View>

        <View style={styles.opsGrid}>
          <OpsTile label="Provider" value={providerStatus} sub="Routing geometry" />

          <OpsTile
            label="Traffic"
            value={liveTraffic ? "Live" : "Estimate"}
            sub={activeRoute?.traffic_display || trafficStatus}
          />

          <OpsTile
            label="Active users"
            value={String(activeUsers)}
            sub="Route load balancing"
          />

          <OpsTile
            label="Avg speed"
            value={String(avgSpeed)}
            sub="Network analytics"
          />

          <OpsTile
            label="Congestion"
            value={String(congestion)}
            sub="Traffic pressure"
          />

          <OpsTile
            label="Alerts"
            value={String(routeIncidents.length)}
            sub="Reports + incidents"
          />
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.title}>AI parking prediction</Text>
            <Pill label="Future scope" tone="cyan" />
          </View>

          {parkingForDisplay.slice(0, 3).map((item) => (
            <ParkingRow key={item.id} item={item} />
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Role intelligence</Text>
          <Text style={styles.muted}>
            {user?.role === "admin"
              ? "Admin mode highlights system load, provider readiness, route distribution, incidents, and dashboard metrics."
              : user?.role === "emergency"
              ? "Emergency mode sends priority route context to the backend and keeps incident intelligence visible."
              : "Driver mode focuses on search, selected-route consistency, turn-by-turn navigation, reports, and trip progress."}
          </Text>
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
          <Text style={styles.muted}>API: {API_BASE_URL}</Text>

          <TouchableOpacity
            style={styles.dangerButton}
            onPress={logout}
            activeOpacity={0.86}
          >
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
              <Text style={styles.title}>
                {tripSummary.status === "completed"
                  ? "Trip completed"
                  : "Trip ended early"}
              </Text>

              <Text style={styles.routeSummaryName}>{tripSummary.route_name}</Text>

              <Text style={styles.muted}>
                {tripSummary.start_location} → {tripSummary.destination}
              </Text>

              <View style={styles.metricsRow}>
                <Metric label="Time" value={tripSummary.eta_text || "--"} />
                <Metric label="Distance" value={tripSummary.distance_text || "--"} />
                <Metric
                  label="Score"
                  value={String(tripSummary.flowsync_score || "--")}
                />
              </View>

              <Text style={styles.selectedText}>
                Route used: {tripSummary.route_id}
              </Text>

              <Text style={styles.muted}>
                {tripSummary.live_traffic
                  ? tripSummary.traffic_display
                  : "Traffic estimate"}
              </Text>

              <TouchableOpacity
                style={styles.primaryWide}
                onPress={() => setScreen("home")}
                activeOpacity={0.86}
              >
                <Text style={styles.primaryButtonText}>Back to Home</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.muted}>No trip summary yet.</Text>

              <TouchableOpacity
                style={styles.primaryWide}
                onPress={() => setScreen("home")}
                activeOpacity={0.86}
              >
                <Text style={styles.primaryButtonText}>Plan Route</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    );
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
      <View style={styles.bottomTabs}>
        {tabs.map(([label, value]) => (
          <TouchableOpacity
            key={value}
            style={[
              styles.bottomTab,
              screen === value ? styles.bottomTabActive : null,
            ]}
            onPress={() => setScreen(value)}
            activeOpacity={0.86}
          >
            <Text
              style={[
                styles.bottomTabText,
                screen === value ? styles.bottomTabTextActive : null,
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  function renderReportModal() {
    return (
      <Modal
        visible={reportModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={styles.modalShade}>
          <View style={styles.reportSheet}>
            <View style={styles.reportHeader}>
              <Text style={styles.reportTitle}>What do you see?</Text>

              <TouchableOpacity
                onPress={() => setReportModalVisible(false)}
                activeOpacity={0.86}
              >
                <Text style={styles.reportClose}>×</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.reportGrid}>
              {REPORT_TYPES.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.reportItem}
                  onPress={() => submitReport(item)}
                  activeOpacity={0.86}
                >
                  <View style={styles.reportIcon}>
                    <Text style={styles.reportIconText}>{item.icon}</Text>
                  </View>

                  <Text style={styles.reportLabel}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  if (!token) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
        {renderLogin()}
        {loading ? <LoadingOverlay /> : null}
        {error ? <ErrorToast message={error} onClose={() => setError("")} /> : null}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      <View style={styles.content}>
        {screen === "home" && renderHome()}
        {screen === "routes" && renderRoutes()}
        {screen === "nav" && renderNavigation()}
        {screen === "operations" && renderOperations()}
        {screen === "account" && renderAccount()}
        {screen === "summary" && renderSummary()}
      </View>

      {renderTabs()}
      {renderReportModal()}
      {loading ? <LoadingOverlay /> : null}
      {error ? <ErrorToast message={error} onClose={() => setError("")} /> : null}
      {toast ? <Toast message={toast} /> : null}
    </SafeAreaView>
  );
}
function Pill({ label, tone = "green" }) {
  const palette =
    {
      green: {
        bg: COLORS.greenSoft,
        fg: "#86efac",
        border: "rgba(34,197,94,0.35)",
      },
      cyan: {
        bg: COLORS.cyanSoft,
        fg: "#7dd3fc",
        border: "rgba(34,211,238,0.35)",
      },
      red: {
        bg: "rgba(239,68,68,0.14)",
        fg: "#fca5a5",
        border: "rgba(239,68,68,0.35)",
      },
    }[tone] || {
      bg: COLORS.greenSoft,
      fg: "#86efac",
      border: "rgba(34,197,94,0.35)",
    };

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
        },
      ]}
    >
      <Text style={[styles.pillText, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

function Metric({ label, value }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function MetricBox({ label, value }) {
  return (
    <View style={styles.miniMetric}>
      <Text style={styles.miniMetricValue}>{value}</Text>
      <Text style={styles.miniMetricLabel}>{label}</Text>
    </View>
  );
}

function InsightRow({ label, value }) {
  return (
    <View style={styles.insightRow}>
      <Text style={styles.insightLabel}>{label}</Text>
      <Text style={styles.insightValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function LegendItem({ color, text }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendLine, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{text}</Text>
    </View>
  );
}

function OpsTile({ label, value, sub }) {
  return (
    <View style={styles.opsTile}>
      <Text style={styles.opsTileLabel}>{label}</Text>
      <Text style={styles.opsTileValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.opsTileSub} numberOfLines={2}>
        {sub}
      </Text>
    </View>
  );
}

function ParkingRow({ item }) {
  const color =
    item.availability >= 70
      ? COLORS.green
      : item.availability >= 35
      ? COLORS.amber
      : COLORS.red;

  return (
    <View style={styles.parkingRow}>
      <View style={[styles.parkingBadge, { borderColor: color }]}>
        <Text style={[styles.parkingBadgeText, { color }]}>
          {item.name.slice(-1)}
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.parkingName}>{item.name}</Text>
        <Text style={styles.muted}>
          {item.walk_min} min walk • {item.difficulty} difficulty
        </Text>
      </View>

      <Text style={[styles.parkingPercent, { color }]}>
        {item.availability}%
      </Text>
    </View>
  );
}

function LoadingOverlay() {
  return (
    <View style={styles.loadingOverlay}>
      <ActivityIndicator size="large" color={COLORS.green} />
      <Text style={styles.loadingText}>Syncing city intelligence...</Text>
    </View>
  );
}

function ErrorToast({ message, onClose }) {
  return (
    <TouchableOpacity
      style={styles.errorToast}
      onPress={onClose}
      activeOpacity={0.9}
    >
      <Text style={styles.errorText}>{message}</Text>
    </TouchableOpacity>
  );
}

function Toast({ message }) {
  return (
    <View style={styles.toast}>
      <Text style={styles.toastText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingTop: SAFE_TOP,
  },
  content: {
    flex: 1,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  screenContainer: {
    paddingHorizontal: 16,
    paddingBottom: TAB_HEIGHT + 18,
    paddingTop: 14,
  },

  loginShell: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 42,
  },
  loginBrandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },
  logoBubble: {
    width: 62,
    height: 62,
    borderRadius: 24,
    backgroundColor: COLORS.green,
    alignItems: "center",
    justifyContent: "center",
  },
  logoBubbleText: {
    color: COLORS.black,
    fontWeight: "900",
    fontSize: 21,
  },
  loginLogoText: {
    color: COLORS.text,
    fontSize: 43,
    fontWeight: "900",
    letterSpacing: -2.1,
  },
  loginSubline: {
    color: COLORS.muted,
    fontSize: 17,
    fontWeight: "800",
  },
  loginHeroCard: {
    backgroundColor: COLORS.panel2,
    borderRadius: 32,
    padding: 22,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    shadowColor: COLORS.cyan,
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 7,
  },
  heroPillRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  loginHeroTitle: {
    color: COLORS.text,
    fontSize: 33,
    lineHeight: 40,
    fontWeight: "900",
    letterSpacing: -0.6,
  },
  loginHeroText: {
    color: "#cbd5e1",
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
    marginBottom: 18,
  },
  loginLabel: {
    color: "#cbd5e1",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 12,
    marginBottom: 6,
  },
  loginInput: {
    backgroundColor: "#050b16",
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 13,
    fontSize: 16,
    fontWeight: "800",
  },
  loginButton: {
    backgroundColor: COLORS.green,
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 20,
  },
  loginButtonText: {
    color: COLORS.black,
    fontSize: 18,
    fontWeight: "900",
  },
    authHeroCard: {
    backgroundColor: COLORS.panel2,
    borderRadius: 32,
    padding: 22,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    shadowColor: COLORS.cyan,
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 7,
  },
  authHeroTitle: {
    color: COLORS.text,
    fontSize: 32,
    lineHeight: 39,
    fontWeight: "900",
    letterSpacing: -0.6,
  },
  authHeroText: {
    color: "#cbd5e1",
    fontSize: 15,
    lineHeight: 23,
    marginTop: 10,
    marginBottom: 16,
    fontWeight: "700",
  },
  authModeTabs: {
    flexDirection: "row",
    backgroundColor: "rgba(15,23,42,0.75)",
    borderRadius: 18,
    padding: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  authModeTab: {
    flex: 1,
    paddingVertical: 11,
    alignItems: "center",
    borderRadius: 14,
  },
  authModeTabActive: {
    backgroundColor: COLORS.green,
  },
  authModeText: {
    color: COLORS.muted,
    fontWeight: "900",
    fontSize: 14,
  },
  authModeTextActive: {
    color: COLORS.black,
  },
  authHelperText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 8,
    lineHeight: 18,
  },
  authNote: {
    color: "#7dd3fc",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 12,
    lineHeight: 18,
  },
  forgotButton: {
    alignSelf: "flex-end",
    paddingVertical: 8,
  },
  forgotText: {
    color: "#7dd3fc",
    fontWeight: "900",
    fontSize: 13,
  },
  guestButton: {
    borderColor: COLORS.cyan,
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 12,
    backgroundColor: COLORS.cyanSoft,
  },
  guestButtonText: {
    color: "#7dd3fc",
    fontWeight: "900",
    fontSize: 16,
  },
  
  quickCard: {
    backgroundColor: COLORS.panel2,
    borderRadius: 28,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  quickTitle: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: "900",
  },
  quickHint: {
    color: COLORS.muted,
    fontWeight: "800",
  },
  quickAccount: {
    backgroundColor: "#070d18",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 16,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  quickAccountActive: {
    borderColor: COLORS.green,
    backgroundColor: "#062412",
  },
  quickRole: {
    color: COLORS.text,
    fontSize: 19,
    fontWeight: "900",
  },
  quickRoleActive: {
    color: "#86efac",
  },
  quickDescription: {
    color: COLORS.muted,
    marginTop: 4,
    fontWeight: "700",
  },
  quickEmail: {
    color: "#7dd3fc",
    marginTop: 8,
    fontWeight: "900",
  },
  quickChevron: {
    color: COLORS.faint,
    fontSize: 34,
    fontWeight: "300",
  },

  pill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start",
  },
  pillText: {
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  mapShell: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  mapButtons: {
    position: "absolute",
    right: 14,
    top: 158,
    gap: 10,
    zIndex: 35,
  },
  circleButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.96)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
  circleButtonDanger: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
  circleButtonText: {
    color: COLORS.black,
    fontSize: 24,
    fontWeight: "900",
  },

  searchCard: {
    position: "absolute",
    top: 14,
    left: 14,
    right: 14,
    backgroundColor: COLORS.panel,
    borderRadius: 26,
    paddingHorizontal: 14,
    paddingVertical: 14,
    zIndex: 100,
    elevation: 12,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
  },
  searchHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    gap: 12,
  },
  searchHeaderTitle: {
    color: COLORS.text,
    fontSize: 21,
    fontWeight: "900",
  },
  searchHeaderSub: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 3,
  },
  searchTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  routeDots: {
    width: 24,
    alignItems: "center",
    paddingTop: 10,
    marginRight: 8,
  },
  dotStart: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.green,
  },
  dotLine: {
    width: 2,
    height: 45,
    backgroundColor: "rgba(148,163,184,0.5)",
    marginVertical: 5,
  },
  dotEnd: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.red,
  },
  searchInputs: {
    flex: 1,
  },
  searchInput: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
    paddingVertical: 6,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginVertical: 3,
  },
  swapButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.cyanSoft,
    borderWidth: 1,
    borderColor: "rgba(34,211,238,0.28)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    marginTop: 35,
  },
  swapText: {
    color: "#7dd3fc",
    fontSize: 22,
    fontWeight: "900",
  },
  useLocationButton: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.greenSoft,
    borderColor: "rgba(34,197,94,0.4)",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 4,
    marginBottom: 3,
  },
  useLocationText: {
    color: "#86efac",
    fontSize: 11,
    fontWeight: "900",
  },
  preferenceRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  preferenceChip: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 9,
    alignItems: "center",
    backgroundColor: "rgba(148,163,184,0.12)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.12)",
  },
  preferenceChipActive: {
    backgroundColor: COLORS.greenSoft,
    borderColor: "rgba(34,197,94,0.38)",
  },
  preferenceText: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "900",
  },
  preferenceTextActive: {
    color: "#86efac",
  },
  findButton: {
    backgroundColor: COLORS.green,
    borderRadius: 18,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 11,
  },
  findButtonText: {
    color: COLORS.black,
    fontSize: 16,
    fontWeight: "900",
  },
  savedStrip: {
    marginTop: 12,
  },
  savedChip: {
    backgroundColor: "rgba(15,23,42,0.82)",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  savedChipText: {
    color: COLORS.text,
    fontWeight: "800",
    fontSize: 12,
  },

  suggestionBox: {
    backgroundColor: "#06111f",
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: 16,
    marginTop: 8,
    marginBottom: 6,
    maxHeight: 230,
    overflow: "hidden",
    zIndex: 200,
    elevation: 12,
  },
  suggestionScroll: {
    maxHeight: 230,
  },
  suggestionItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  suggestionTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "900",
  },
  suggestionSub: {
    color: "#cbd5e1",
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  suggestionStatus: {
    color: "#cbd5e1",
    fontSize: 14,
    fontWeight: "800",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },

  compactSearchBar: {
    position: "absolute",
    top: 14,
    left: 14,
    right: 14,
    backgroundColor: COLORS.panel,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 14,
    zIndex: 90,
    elevation: 10,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
  },
  compactSearchMain: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
  },
  compactSearchHint: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 3,
  },

  hiddenRoutePill: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: PANEL_BOTTOM + 10,
    backgroundColor: COLORS.panel,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 80,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
  },
  hiddenRouteTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
  },
  hiddenRouteSub: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 2,
    fontWeight: "700",
  },
  hiddenRouteArrow: {
    color: COLORS.green,
    fontSize: 25,
    fontWeight: "900",
  },
  routeSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: PANEL_BOTTOM,
    backgroundColor: COLORS.panel,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 18,
    paddingTop: 10,
    zIndex: 80,
    borderWidth: 1,
    borderColor: "rgba(34,211,238,0.18)",
  },
  routeSheetCollapsed: {
    paddingBottom: 18,
  },
  routeSheetExpanded: {
    paddingBottom: 22,
  },
  sheetHandleArea: {
    alignItems: "center",
  },
  handle: {
    width: 50,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.32)",
    marginBottom: 8,
  },
  swipeHint: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 10,
  },
  routeLabelRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 9,
  },
  routeTitle: {
    color: COLORS.text,
    fontSize: 27,
    lineHeight: 33,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  routeSub: {
    color: "#cbd5e1",
    fontSize: 15,
    marginTop: 6,
    fontWeight: "700",
  },
  scoreRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: COLORS.green,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
    backgroundColor: COLORS.greenSoft,
  },
  scoreRingValue: {
    color: "#86efac",
    fontSize: 20,
    fontWeight: "900",
  },
  scoreRingLabel: {
    color: "#cbd5e1",
    fontSize: 10,
    fontWeight: "800",
  },
  metricRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  miniMetric: {
    flex: 1,
    backgroundColor: "rgba(30,41,59,0.82)",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  miniMetricValue: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  miniMetricLabel: {
    color: COLORS.muted,
    marginTop: 6,
    fontSize: 13,
    fontWeight: "800",
  },
  flowBox: {
    backgroundColor: "rgba(8,47,73,0.5)",
    borderWidth: 1,
    borderColor: "rgba(34,211,238,0.22)",
    borderRadius: 20,
    padding: 14,
    marginTop: 14,
  },
  flowTitle: {
    color: "#7dd3fc",
    fontSize: 17,
    fontWeight: "900",
  },
  flowText: {
    color: COLORS.text,
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
  },
  insightRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 10,
  },
  insightLabel: {
    color: COLORS.muted,
    fontWeight: "900",
    width: 78,
  },
  insightValue: {
    color: "#dbeafe",
    fontWeight: "800",
    flex: 1,
    textAlign: "right",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: COLORS.green,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
  },
  primaryButtonText: {
    color: COLORS.black,
    fontWeight: "900",
    fontSize: 16,
  },
  secondaryButton: {
    flex: 1,
    borderColor: COLORS.cyan,
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    backgroundColor: COLORS.cyanSoft,
  },
  secondaryButtonText: {
    color: "#7dd3fc",
    fontWeight: "900",
    fontSize: 15,
  },
  hideSheetButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  hideSheetText: {
    color: COLORS.muted,
    fontWeight: "900",
  },

  routeTopCard: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: COLORS.panel,
    borderRadius: 28,
    padding: 18,
    zIndex: 70,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
  },
  routeTopTitle: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  routeTopSub: {
    color: "#cbd5e1",
    fontSize: 16,
    marginTop: 6,
    fontWeight: "700",
  },
  routeLegend: {
    position: "absolute",
    top: 132,
    left: 16,
    backgroundColor: COLORS.panel,
    borderRadius: 18,
    padding: 14,
    gap: 8,
    zIndex: 70,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  legendLine: {
    width: 30,
    height: 5,
    borderRadius: 999,
  },
  legendText: {
    color: COLORS.text,
    fontWeight: "900",
    fontSize: 12,
  },
  routeHiddenPill: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: PANEL_BOTTOM + 10,
    backgroundColor: COLORS.panel,
    borderRadius: 24,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 80,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
  },
  routeCompareSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: PANEL_BOTTOM,
    backgroundColor: COLORS.panel,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 18,
    paddingTop: 10,
    zIndex: 80,
    borderWidth: 1,
    borderColor: "rgba(34,211,238,0.18)",
  },
  routeCompareSheetCollapsed: {
    paddingBottom: 16,
  },
  routeCompareSheetExpanded: {
    paddingBottom: 22,
  },
  routeCompareHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 10,
  },
  routeCompareTitle: {
    color: COLORS.text,
    fontSize: 25,
    fontWeight: "900",
  },
  routeCompareSub: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 3,
    fontWeight: "700",
  },
  routeCountPill: {
    backgroundColor: COLORS.green,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  routeCountText: {
    color: COLORS.black,
    fontWeight: "900",
  },
  compactRouteList: {
    gap: 10,
  },
  compactRouteCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  compactRouteCardActive: {
    backgroundColor: "#0c2f4a",
    borderColor: COLORS.cyan,
  },
  compactRouteLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  compactRouteDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#64748b",
  },
  compactRouteDotActive: {
    backgroundColor: COLORS.cyan,
  },
  compactRouteTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  compactRouteName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
    flex: 1,
  },
  compactRouteReason: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 3,
    fontWeight: "700",
  },
  bestPill: {
    backgroundColor: COLORS.green,
    color: COLORS.black,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: "hidden",
    fontSize: 11,
    fontWeight: "900",
  },
  selectedPill: {
    backgroundColor: "#7dd3fc",
    color: COLORS.black,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: "hidden",
    fontSize: 11,
    fontWeight: "900",
  },
  compactRouteStats: {
    alignItems: "flex-end",
    marginLeft: 10,
  },
  compactEta: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "900",
  },
  compactDistance: {
    color: COLORS.muted,
    fontWeight: "900",
    marginTop: 2,
  },
  routeActionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
  },
  routeBackButton: {
    flex: 1,
    borderColor: COLORS.cyan,
    borderWidth: 1,
    borderRadius: 18,
    alignItems: "center",
    paddingVertical: 14,
    backgroundColor: COLORS.cyanSoft,
  },
  routeBackText: {
    color: "#7dd3fc",
    fontWeight: "900",
    fontSize: 16,
  },
  routeUseButton: {
    flex: 1.6,
    backgroundColor: COLORS.green,
    borderRadius: 18,
    alignItems: "center",
    paddingVertical: 14,
  },
  routeUseText: {
    color: COLORS.black,
    fontWeight: "900",
    fontSize: 16,
  },

  driveTopBanner: {
    position: "absolute",
    top: 12,
    left: 14,
    right: 14,
    backgroundColor: "rgba(0,107,97,0.96)",
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    zIndex: 90,
    elevation: 12,
    borderWidth: 1,
    borderColor: "rgba(103,232,249,0.22)",
  },
  driveTurnIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  driveTurnIconText: {
    color: COLORS.white,
    fontSize: 38,
    fontWeight: "900",
  },
  driveDistanceText: {
    color: "#d1fae5",
    fontSize: 17,
    fontWeight: "900",
  },
  driveInstructionText: {
    color: COLORS.white,
    fontSize: 24,
    lineHeight: 29,
    fontWeight: "900",
    marginTop: 2,
  },
  driveAudioButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  driveAudioText: {
    fontSize: 23,
  },
  driveNextBanner: {
    position: "absolute",
    top: 130,
    left: 14,
    backgroundColor: "rgba(0,91,85,0.96)",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    maxWidth: width * 0.82,
    gap: 8,
    zIndex: 85,
    elevation: 10,
  },
  driveThenText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "900",
  },
  driveNextIcon: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: "900",
  },
  driveNextText: {
    color: "#d1fae5",
    fontSize: 14,
    fontWeight: "800",
    flexShrink: 1,
  },
  previewBadge: {
    position: "absolute",
    top: 192,
    left: 14,
    right: 14,
    backgroundColor: "rgba(15,23,42,0.9)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 9,
    zIndex: 80,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  previewBadgeText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  driveFloatingControls: {
    position: "absolute",
    right: 14,
    top: height * 0.36,
    gap: 10,
    alignItems: "flex-end",
    zIndex: 75,
  },
  driveCircleButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.96)",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 5,
  },
  driveCircleText: {
    color: COLORS.black,
    fontSize: 22,
    fontWeight: "900",
  },
  driveReportButton: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 10,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 5,
  },
  driveReportText: {
    color: COLORS.black,
    fontWeight: "900",
    fontSize: 14,
  },
  driveBottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.98)",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 10,
    paddingBottom: 14 + SAFE_BOTTOM,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 90,
  },
  driveExitButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2,
    borderColor: "#9ca3af",
    alignItems: "center",
    justifyContent: "center",
  },
  driveExitText: {
    color: "#111827",
    fontSize: 36,
    fontWeight: "900",
  },
  driveBottomCenter: {
    alignItems: "center",
    flex: 1,
  },
  driveBottomEta: {
    color: "#111827",
    fontSize: 30,
    fontWeight: "900",
  },
  driveBottomSub: {
    color: "#6b7280",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 0,
    paddingHorizontal: 10,
    maxWidth: width - 160,
  },
  driveRouteButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2,
    borderColor: "#9ca3af",
    alignItems: "center",
    justifyContent: "center",
  },
  driveRouteText: {
    color: "#111827",
    fontSize: 32,
    fontWeight: "900",
  },
  vehicleMarker: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.blue,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: COLORS.white,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  vehicleMarkerText: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: "900",
    transform: [{ rotate: "-90deg" }],
  },
  incidentMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.red,
    borderWidth: 2,
    borderColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  incidentMarkerText: {
    color: COLORS.white,
    fontWeight: "900",
    fontSize: 20,
  },

  bottomTabs: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: TAB_HEIGHT,
    backgroundColor: COLORS.panel,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 10,
    paddingBottom: SAFE_BOTTOM,
    zIndex: 100,
    borderWidth: 1,
    borderColor: "rgba(34,211,238,0.12)",
  },
  bottomTab: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 18,
    minWidth: 78,
    alignItems: "center",
  },
  bottomTabActive: {
    backgroundColor: COLORS.greenSoft,
  },
  bottomTabText: {
    color: COLORS.muted,
    fontSize: 16,
    fontWeight: "900",
  },
  bottomTabTextActive: {
    color: COLORS.green,
  },

  commandHero: {
    backgroundColor: COLORS.panel2,
    borderRadius: 28,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
  },
  pageKicker: {
    color: COLORS.cyan,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.3,
  },
  pageTitle: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: "900",
    marginTop: 6,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  commandText: {
    color: "#cbd5e1",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700",
  },
  opsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  opsTile: {
    width: (width - 44) / 2,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  opsTileLabel: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "900",
  },
  opsTileValue: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 7,
  },
  opsTileSub: {
    color: "#7dd3fc",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 5,
  },
  parkingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  parkingBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  parkingBadgeText: {
    fontWeight: "900",
    fontSize: 18,
  },
  parkingName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
  },
  parkingPercent: {
    fontSize: 20,
    fontWeight: "900",
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 8,
  },
  muted: {
    color: COLORS.muted,
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
    fontWeight: "700",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  metric: {
    flex: 1,
    backgroundColor: "#0b1626",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metricLabel: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "900",
  },
  metricValue: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 6,
  },
  selectedText: {
    color: "#7dd3fc",
    marginTop: 10,
    fontWeight: "900",
  },
  routeSummaryName: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 4,
  },
  dangerButton: {
    backgroundColor: COLORS.red,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 16,
  },
  dangerButtonText: {
    color: "#160303",
    fontWeight: "900",
    fontSize: 16,
  },
  emptyCard: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: PANEL_BOTTOM + 28,
    backgroundColor: COLORS.panel,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: "900",
  },
  emptyText: {
    color: COLORS.muted,
    marginTop: 8,
    fontSize: 15,
    fontWeight: "700",
  },
  primaryWide: {
    backgroundColor: COLORS.green,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 16,
  },

  modalShade: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.52)",
    justifyContent: "flex-end",
  },
  reportSheet: {
    backgroundColor: COLORS.panel2,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 18,
    paddingBottom: 30 + SAFE_BOTTOM,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
  },
  reportHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  reportTitle: {
    color: COLORS.text,
    fontSize: 25,
    fontWeight: "900",
  },
  reportClose: {
    color: "#cbd5e1",
    fontSize: 32,
    fontWeight: "700",
  },
  reportGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  reportItem: {
    width: "30%",
    alignItems: "center",
    marginBottom: 12,
  },
  reportIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(148,163,184,0.16)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reportIconText: {
    fontSize: 27,
  },
  reportLabel: {
    color: "#e5e7eb",
    fontWeight: "900",
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(3,7,18,0.62)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 300,
  },
  loadingText: {
    color: COLORS.text,
    marginTop: 10,
    fontWeight: "900",
  },
  errorToast: {
    position: "absolute",
    left: 16,
    right: 16,
    top: SAFE_TOP + 14,
    backgroundColor: COLORS.red,
    borderRadius: 16,
    padding: 14,
    zIndex: 400,
    elevation: 20,
  },
  errorText: {
    color: COLORS.white,
    fontWeight: "900",
    textAlign: "center",
  },
  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: TAB_HEIGHT + 10,
    backgroundColor: COLORS.panel2,
    borderRadius: 16,
    padding: 14,
    zIndex: 390,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
  },
  toastText: {
    color: COLORS.text,
    fontWeight: "900",
    textAlign: "center",
  },
});