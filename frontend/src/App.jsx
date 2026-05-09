import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./index.css";

import {
  loginUser,
  logout,
  getStoredUser,
  getRootStatus,
  getFinalStatus,
  searchLocations,
  getRecommendedRoute,
  startTrip,
  getLiveNavigation,
  updateTripProgress,
  endTrip,
  getTripSummary,
  getDashboardData,
  getLiveDashboard,
  getParkingPrediction,
  getDriverAlerts,
  getLiveFeed,
} from "./api";

const demoLocations = [
  {
    name: "Dubai Mall",
    address: "Downtown Dubai",
    latitude: 25.1972,
    longitude: 55.2744,
    category: "Mall",
  },
  {
    name: "Dubai Marina",
    address: "Dubai Marina",
    latitude: 25.0800,
    longitude: 55.1400,
    category: "District",
  },
  {
    name: "Downtown Dubai",
    address: "Burj Khalifa Area",
    latitude: 25.2048,
    longitude: 55.2708,
    category: "District",
  },
  {
    name: "Business Bay",
    address: "Business Bay",
    latitude: 25.1860,
    longitude: 55.2630,
    category: "Business",
  },
  {
    name: "DXB Airport",
    address: "Dubai International Airport",
    latitude: 25.2532,
    longitude: 55.3657,
    category: "Airport",
  },
  {
    name: "Jumeirah",
    address: "Jumeirah Beach Road",
    latitude: 25.2048,
    longitude: 55.2297,
    category: "Coastal",
  },
  {
    name: "Sharjah",
    address: "Sharjah City",
    latitude: 25.3463,
    longitude: 55.4209,
    category: "City",
  },
  {
    name: "Academic City",
    address: "Dubai Academic City",
    latitude: 25.1250,
    longitude: 55.4200,
    category: "Education",
  },
];

const fallbackSteps = [
  {
    instruction: "Start from Dubai Mall and head toward Financial Center Road.",
    distance: "1.2 km",
    duration: "3 min",
  },
  {
    instruction: "Merge toward Al Khail Road for balanced traffic flow.",
    distance: "7.5 km",
    duration: "12 min",
  },
  {
    instruction: "Continue toward Dubai Marina exit.",
    distance: "5.9 km",
    duration: "8 min",
  },
  {
    instruction: "Arrive at Dubai Marina.",
    distance: "1.6 km",
    duration: "3 min",
  },
];

const fallbackRoutes = [
  {
    route_name: "Route A - Sheikh Zayed Road",
    estimated_time: 22,
    distance_km: 18.4,
    congestion_score: 8,
    route_score: 56,
    assigned_users: 45,
    road_capacity: 70,
    route_type: "highway",
    coordinates: [
      [25.1972, 55.2744],
      [25.1600, 55.2300],
      [25.0800, 55.1400],
    ],
    turn_by_turn_steps: fallbackSteps,
    alerts: ["High congestion near Sheikh Zayed Road"],
    incidents: [],
  },
  {
    route_name: "Route B - Al Khail Road",
    estimated_time: 26,
    distance_km: 20.1,
    congestion_score: 4,
    route_score: 41,
    assigned_users: 26,
    road_capacity: 90,
    route_type: "arterial_road",
    coordinates: [
      [25.1972, 55.2744],
      [25.1500, 55.2200],
      [25.0800, 55.1400],
    ],
    turn_by_turn_steps: fallbackSteps,
    alerts: [],
    incidents: [],
  },
  {
    route_name: "Route C - Business Bay Side Streets",
    estimated_time: 30,
    distance_km: 22.7,
    congestion_score: 2,
    route_score: 37,
    assigned_users: 20,
    road_capacity: 60,
    route_type: "side_street",
    coordinates: [
      [25.1972, 55.2744],
      [25.1700, 55.2500],
      [25.0800, 55.1400],
    ],
    turn_by_turn_steps: fallbackSteps,
    alerts: ["Low traffic but longer travel distance"],
    incidents: [],
  },
];

const routePreferences = [
  { id: "balanced", label: "Balanced", detail: "FlowSync smart choice" },
  { id: "fastest", label: "Fastest", detail: "Lowest ETA" },
  { id: "eco", label: "Eco", detail: "Less fuel + CO₂" },
  { id: "low_stress", label: "Low Stress", detail: "Avoid overloaded roads" },
];

function App() {
  const [user, setUser] = useState(getStoredUser());

  function handleLogout() {
    logout();
    setUser(null);
  }

  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  return <SmartMobilityApp user={user} onLogout={handleLogout} />;
}

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("driver@flowsync.local");
  const [password, setPassword] = useState("flowsync123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await loginUser(email, password);
      onLogin(result.user);
    } catch (err) {
      setError(err.message || "Login failed. Please retry.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-card">
        <div className="brand-icon">FS</div>
        <p className="eyebrow">Smart Mobility for UAE</p>
        <h1>FlowSync DXB</h1>
        <p className="login-copy">
          Sign in to access adaptive route distribution, live navigation,
          parking prediction, and smart city mobility intelligence.
        </p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>Email</label>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="driver@flowsync.local"
          />

          <label>Password</label>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            placeholder="flowsync123"
          />

          {error && <div className="error-box">{error}</div>}

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Login to FlowSync"}
          </button>
        </form>

        <div className="demo-login">
          <strong>Demo driver account</strong>
          <span>driver@flowsync.local / flowsync123</span>
        </div>
      </section>

      <section className="login-visual">
        <div className="phone-preview">
          <div className="preview-map">
            <span className="preview-route route-red"></span>
            <span className="preview-route route-green"></span>
            <span className="preview-route route-blue"></span>
            <div className="preview-route-card">
              <strong>Route B selected</strong>
              <span>26 min • balanced load</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function SmartMobilityApp({ user, onLogout }) {
  const [apiState, setApiState] = useState("checking");
  const [systemStatus, setSystemStatus] = useState(null);

  const [startQuery, setStartQuery] = useState("Dubai Mall");
  const [destinationQuery, setDestinationQuery] = useState("Dubai Marina");
  const [startLocation, setStartLocation] = useState(demoLocations[0]);
  const [destinationLocation, setDestinationLocation] = useState(demoLocations[1]);
  const [routePreference, setRoutePreference] = useState("balanced");

  const [routeResponse, setRouteResponse] = useState(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState("");

  const [dashboardData, setDashboardData] = useState(null);
  const [parkingData, setParkingData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [liveFeed, setLiveFeed] = useState([]);

  const [navigationSession, setNavigationSession] = useState(null);
  const [liveNavigation, setLiveNavigation] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [tripSummary, setTripSummary] = useState(null);
  const [activePanel, setActivePanel] = useState("routes");

  const normalizedRoute = useMemo(() => {
    return normalizeRouteResponse(
      routeResponse,
      startLocation,
      destinationLocation
    );
  }, [routeResponse, startLocation, destinationLocation]);

  const selectedRoute =
    normalizedRoute.routes[selectedRouteIndex] || normalizedRoute.routes[0];

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (!navigationSession?.session_id) return;

    const timer = setInterval(async () => {
      try {
        const data = await getLiveNavigation(navigationSession.session_id);
        setLiveNavigation(data);

        const backendIndex =
          data.current_step_index ??
          data.currentStepIndex ??
          data.current_step?.index;

        if (Number.isInteger(backendIndex)) {
          setCurrentStepIndex(backendIndex);
        }
      } catch (error) {
        console.log("Live navigation polling failed:", error.message);
      }
    }, 3000);

    return () => clearInterval(timer);
  }, [navigationSession?.session_id]);

  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const liveDashboard = await getLiveDashboard();
        setDashboardData((previous) => ({
          ...(previous || {}),
          ...(liveDashboard || {}),
        }));
      } catch {
        // keep existing dashboard values
      }
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  async function loadInitialData() {
    try {
      const [root, finalStatus, dashboard, parking, driverAlerts, feed] =
        await Promise.allSettled([
          getRootStatus(),
          getFinalStatus(),
          getDashboardData(),
          getParkingPrediction(destinationQuery),
          getDriverAlerts(),
          getLiveFeed(),
        ]);

      if (root.status === "fulfilled") {
        setSystemStatus(root.value);
        setApiState("connected");
      }

      if (finalStatus.status === "fulfilled") {
        setSystemStatus((previous) => ({
          ...(previous || {}),
          final_status: finalStatus.value,
        }));
      }

      if (dashboard.status === "fulfilled") {
        setDashboardData(dashboard.value);
      }

      if (parking.status === "fulfilled") {
        setParkingData(parking.value);
      }

      if (driverAlerts.status === "fulfilled") {
        setAlerts(normalizeAlerts(driverAlerts.value));
      }

      if (feed.status === "fulfilled") {
        setLiveFeed(normalizeAlerts(feed.value));
      }

      await handleRecommendRoute({
        silent: true,
        start: startQuery,
        destination: destinationQuery,
        preference: routePreference,
      });
    } catch (error) {
      setApiState("error");
      console.log("Initial app load failed:", error.message);
    }
  }

  async function handleRecommendRoute(options = {}) {
    const start = options.start || startQuery;
    const destination = options.destination || destinationQuery;
    const preference = options.preference || routePreference;

    setRouteLoading(true);
    setRouteError("");

    try {
      const data = await getRecommendedRoute({
        start_location: start,
        destination,
        vehicle_type: "car",
        route_preference: preference,
        user_role: user.role || "driver",
      });

      setRouteResponse(data);
      setSelectedRouteIndex(0);
      setTripSummary(null);
      setApiState("connected");

      const parking = await getParkingPrediction(destination);
      setParkingData(parking);

      if (!options.silent) {
        setActivePanel("routes");
      }
    } catch (error) {
      setRouteError(error.message || "Route recommendation failed.");
      setApiState("error");
    } finally {
      setRouteLoading(false);
    }
  }

  async function handleStartNavigation() {
    if (!selectedRoute) return;

    try {
      const requestId =
        routeResponse?.database_record?.request_id ||
        routeResponse?.databaseRecord?.request_id ||
        routeResponse?.request_id;

      const result = await startTrip({
        start_location: startQuery,
        destination: destinationQuery,
        vehicle_type: "car",
        route_preference: routePreference,
        user_role: user.role || "driver",
        user_id: user.user_id || "demo-driver",
        request_id: requestId,
      });

      const session = result.session || result;
      const sessionId =
        session.session_id ||
        session.id ||
        result.session_id ||
        result.navigation_session_id;

      if (!sessionId) {
        throw new Error("Trip started but no session ID was returned.");
      }

      setNavigationSession({
        ...session,
        session_id: sessionId,
        request_id: requestId,
      });

      setCurrentStepIndex(0);
      setLiveNavigation(null);
      setTripSummary(null);
      setActivePanel("navigation");
    } catch (error) {
      setRouteError(error.message || "Could not start navigation.");
    }
  }

  async function handleNextStep() {
    if (!navigationSession?.session_id || !selectedRoute?.steps?.length) return;

    const nextIndex = Math.min(
      currentStepIndex + 1,
      selectedRoute.steps.length - 1
    );

    try {
      await updateTripProgress(navigationSession.session_id, nextIndex);
      setCurrentStepIndex(nextIndex);
    } catch (error) {
      console.log("Progress update failed:", error.message);
      setCurrentStepIndex(nextIndex);
    }
  }

  async function handleEndTrip() {
    if (!navigationSession?.session_id) return;

    try {
      await endTrip(navigationSession.session_id, "completed");

      const requestId =
        navigationSession.request_id ||
        routeResponse?.database_record?.request_id ||
        routeResponse?.request_id;

      if (requestId) {
        const summary = await getTripSummary(requestId);
        setTripSummary(summary);
      }

      setNavigationSession(null);
      setActivePanel("summary");
    } catch (error) {
      setRouteError(error.message || "Could not end trip.");
    }
  }

  function handleDestinationSelect(location) {
    setDestinationLocation(location);
    setDestinationQuery(location.name);

    setTimeout(() => {
      handleRecommendRoute({
        start: startQuery,
        destination: location.name,
        preference: routePreference,
      });
    }, 100);
  }

  function handleStartSelect(location) {
    setStartLocation(location);
    setStartQuery(location.name);
  }

  const mapCenter = selectedRoute?.coordinates?.[0] || [25.135, 55.22];

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-icon small">FS</div>
          <div>
            <h1>FlowSync DXB</h1>
            <p>Adaptive smart-city traffic intelligence</p>
          </div>
        </div>

        <ApiStatusBadge apiState={apiState} systemStatus={systemStatus} />

        <div className="user-block">
          <span>{user.email}</span>
          <button onClick={onLogout}>Logout</button>
        </div>
      </header>

      <section className="command-center">
        <div className="map-zone">
          <section className="search-panel">
            <div>
              <p className="eyebrow">Live route planning</p>
              <h2>Where should FlowSync take you?</h2>
            </div>

            <div className="search-grid">
              <LocationSearch
                label="Start"
                value={startQuery}
                onTextChange={setStartQuery}
                onSelect={handleStartSelect}
              />

              <LocationSearch
                label="Destination"
                value={destinationQuery}
                onTextChange={setDestinationQuery}
                onSelect={handleDestinationSelect}
              />
            </div>

            <div className="preference-row">
              {routePreferences.map((preference) => (
                <button
                  key={preference.id}
                  className={
                    routePreference === preference.id
                      ? "chip active"
                      : "chip"
                  }
                  onClick={() => setRoutePreference(preference.id)}
                >
                  <strong>{preference.label}</strong>
                  <span>{preference.detail}</span>
                </button>
              ))}
            </div>

            <button
              className="primary-button wide"
              onClick={() => handleRecommendRoute()}
              disabled={routeLoading}
            >
              {routeLoading ? "Calculating smart route..." : "Find FlowSync Route"}
            </button>

            {routeError && <div className="error-box">{routeError}</div>}
          </section>

          <InteractiveMap
            center={mapCenter}
            routes={normalizedRoute.routes}
            selectedRouteIndex={selectedRouteIndex}
            startLocation={startLocation}
            destinationLocation={destinationLocation}
            onSelectRoute={setSelectedRouteIndex}
          />

          <RouteCards
            routes={normalizedRoute.routes}
            selectedRouteIndex={selectedRouteIndex}
            onSelectRoute={setSelectedRouteIndex}
            routingProvider={routeResponse?.routing_provider}
            providerStatus={routeResponse?.provider_status}
            onStartNavigation={handleStartNavigation}
            navigationActive={Boolean(navigationSession)}
          />
        </div>

        <aside className="insight-zone">
          <PanelTabs activePanel={activePanel} setActivePanel={setActivePanel} />

          {activePanel === "routes" && (
            <RouteDetailPanel
              route={selectedRoute}
              routeResponse={routeResponse}
              onStartNavigation={handleStartNavigation}
            />
          )}

          {activePanel === "navigation" && (
            <NavigationPanel
              route={selectedRoute}
              session={navigationSession}
              liveNavigation={liveNavigation}
              currentStepIndex={currentStepIndex}
              onNextStep={handleNextStep}
              onEndTrip={handleEndTrip}
            />
          )}

          {activePanel === "dashboard" && (
            <DashboardPanel data={dashboardData} />
          )}

          {activePanel === "parking" && (
            <ParkingPanel data={parkingData} destination={destinationQuery} />
          )}

          {activePanel === "alerts" && (
            <AlertsPanel alerts={[...alerts, ...liveFeed]} />
          )}

          {activePanel === "summary" && <TripSummary summary={tripSummary} />}
        </aside>
      </section>
    </main>
  );
}

function LocationSearch({ label, value, onTextChange, onSelect }) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);

      try {
        const response = await searchLocations(trimmed);
        const results = normalizeLocations(response);

        if (results.length > 0) {
          setSuggestions(results);
        } else {
          setSuggestions(getLocalLocationMatches(trimmed));
        }
      } catch {
        setSuggestions(getLocalLocationMatches(trimmed));
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  function handleChange(event) {
    const nextValue = event.target.value;
    setQuery(nextValue);
    onTextChange(nextValue);
    setOpen(true);
  }

  function handleSelect(location) {
    setQuery(location.name);
    setOpen(false);
    onSelect(location);
  }

  return (
    <div className="location-search">
      <label>{label}</label>
      <input
        value={query}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
        placeholder={`Search ${label.toLowerCase()}`}
      />

      {open && (suggestions.length > 0 || loading) && (
        <div className="suggestions">
          {loading && <div className="suggestion muted">Searching...</div>}

          {suggestions.map((location) => (
            <button
              key={`${location.name}-${location.address}`}
              className="suggestion"
              onClick={() => handleSelect(location)}
            >
              <strong>{location.name}</strong>
              <span>
                {location.address || location.category || "Dubai location"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function InteractiveMap({
  center,
  routes,
  selectedRouteIndex,
  startLocation,
  destinationLocation,
  onSelectRoute,
}) {
  const startPoint = getPointFromLocation(startLocation) || [25.1972, 55.2744];
  const destinationPoint =
    getPointFromLocation(destinationLocation) || [25.0800, 55.1400];

  return (
    <section className="map-card">
      <MapContainer
        center={center}
        zoom={11}
        scrollWheelZoom={true}
        className="smart-map"
      >
        <MapRecenter center={center} />

        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {routes.map((route, index) => (
          <Polyline
            key={route.route_name}
            positions={route.coordinates}
            pathOptions={{
              color:
                index === selectedRouteIndex
                  ? "#00ff88"
                  : index === 0
                  ? "#ff4d4d"
                  : "#00d9ff",
              weight: index === selectedRouteIndex ? 7 : 4,
              opacity: index === selectedRouteIndex ? 0.95 : 0.45,
            }}
            eventHandlers={{
              click: () => onSelectRoute(index),
            }}
          />
        ))}

        <CircleMarker
          center={startPoint}
          radius={9}
          pathOptions={{
            color: "#ffffff",
            fillColor: "#ffffff",
            fillOpacity: 1,
          }}
        >
          <Popup>Start: {startLocation?.name || "Start"}</Popup>
        </CircleMarker>

        <CircleMarker
          center={destinationPoint}
          radius={10}
          pathOptions={{
            color: "#ffe600",
            fillColor: "#ffe600",
            fillOpacity: 1,
          }}
        >
          <Popup>Destination: {destinationLocation?.name || "Destination"}</Popup>
        </CircleMarker>
      </MapContainer>

      <div className="map-overlay top">
        <strong>{routes[selectedRouteIndex]?.route_name || "Route selected"}</strong>
        <span>
          {routes[selectedRouteIndex]?.estimated_time || "N/A"} min •{" "}
          {routes[selectedRouteIndex]?.distance_km || "N/A"} km
        </span>
      </div>

      <div className="map-overlay bottom">
        <span className="legend red"></span> overloaded
        <span className="legend green"></span> recommended
        <span className="legend blue"></span> alternative
      </div>
    </section>
  );
}

function MapRecenter({ center }) {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.flyTo(center, 12, { duration: 0.8 });
    }
  }, [center, map]);

  return null;
}

function RouteCards({
  routes,
  selectedRouteIndex,
  onSelectRoute,
  routingProvider,
  providerStatus,
  onStartNavigation,
  navigationActive,
}) {
  return (
    <section className="route-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Adaptive Route Distribution</p>
          <h3>Route options</h3>
        </div>
        <span className="provider-badge">
          {routingProvider || "FlowSync Engine"} • {providerStatus || "ready"}
        </span>
      </div>

      <div className="route-grid">
        {routes.map((route, index) => (
          <button
            key={route.route_name}
            className={
              index === selectedRouteIndex
                ? "route-card selected"
                : "route-card"
            }
            onClick={() => onSelectRoute(index)}
          >
            <div>
              <strong>{route.route_name}</strong>
              <span>{route.route_type || "smart route"}</span>
            </div>

            <div className="route-stats">
              <b>{route.estimated_time} min</b>
              <span>{route.distance_km} km</span>
            </div>

            <div className="mini-metrics">
              <span>Congestion {route.congestion_score}/10</span>
              <span>Score {route.route_score}</span>
              <span>Users {route.assigned_users ?? 0}</span>
            </div>
          </button>
        ))}
      </div>

      <button
        className="primary-button wide"
        onClick={onStartNavigation}
        disabled={navigationActive}
      >
        {navigationActive ? "Navigation Active" : "Start Navigation"}
      </button>
    </section>
  );
}

function RouteDetailPanel({ route, routeResponse, onStartNavigation }) {
  if (!route) return null;

  return (
    <div className="side-panel">
      <p className="eyebrow">Recommended route</p>
      <h2>{route.route_name}</h2>
      <p className="panel-copy">
        {routeResponse?.reason ||
          "FlowSync selected this route based on congestion, road capacity, assigned users, and fairness scoring."}
      </p>

      <div className="metric-grid">
        <Metric label="ETA" value={`${route.estimated_time} min`} />
        <Metric label="Distance" value={`${route.distance_km} km`} />
        <Metric label="Congestion" value={`${route.congestion_score}/10`} />
        <Metric label="Route Score" value={route.route_score} />
      </div>

      <div className="info-box">
        <strong>Database record</strong>
        <span>
          Request ID:{" "}
          {routeResponse?.database_record?.request_id ||
            routeResponse?.request_id ||
            "pending"}
        </span>
      </div>

      <button className="primary-button wide" onClick={onStartNavigation}>
        Start Navigation
      </button>
    </div>
  );
}

function NavigationPanel({
  route,
  session,
  liveNavigation,
  currentStepIndex,
  onNextStep,
  onEndTrip,
}) {
  if (!session) {
    return (
      <div className="side-panel">
        <p className="eyebrow">Navigation</p>
        <h2>No active trip</h2>
        <p className="panel-copy">
          Select a route and start navigation to begin live trip tracking.
        </p>
      </div>
    );
  }

  const steps = route?.steps || fallbackSteps;
  const activeStep = steps[currentStepIndex] || steps[0];

  return (
    <div className="side-panel">
      <p className="eyebrow">Live Navigation</p>
      <h2>{activeStep?.instruction || "Continue on selected route"}</h2>

      <div className="navigation-status">
        <span>Session: {session.session_id}</span>
        <span>Status: {liveNavigation?.session_status || "active"}</span>
      </div>

      <div className="progress-bar">
        <div
          style={{
            width: `${Math.min(
              100,
              ((currentStepIndex + 1) / steps.length) * 100
            )}%`,
          }}
        ></div>
      </div>

      <div className="steps-list">
        {steps.map((step, index) => (
          <div
            key={`${step.instruction}-${index}`}
            className={index === currentStepIndex ? "step active" : "step"}
          >
            <span>{index + 1}</span>
            <div>
              <strong>{step.instruction}</strong>
              <small>
                {step.distance || "—"} • {step.duration || "—"}
              </small>
            </div>
          </div>
        ))}
      </div>

      <div className="button-row">
        <button className="secondary-button" onClick={onNextStep}>
          Next Step
        </button>
        <button className="danger-button" onClick={onEndTrip}>
          End Trip
        </button>
      </div>
    </div>
  );
}

function DashboardPanel({ data }) {
  const totalTrips = readMetric(data, [
    "total_trips",
    "total_trip_requests",
    "trip_requests",
  ]);

  const activeTrips = readMetric(data, [
    "active_trips",
    "active_sessions",
    "active_navigation_sessions",
  ]);

  const congestionReduction = readMetric(data, [
    "estimated_congestion_reduction",
    "congestion_reduction",
  ]);

  const fuelSaved = readMetric(data, [
    "fuel_saved",
    "fuel_saved_estimate",
    "fuel_saved_liters",
  ]);

  return (
    <div className="side-panel">
      <p className="eyebrow">City dashboard</p>
      <h2>Live mobility intelligence</h2>

      <div className="metric-grid">
        <Metric label="Total Trips" value={totalTrips || "Live"} />
        <Metric label="Active Trips" value={activeTrips || "Tracking"} />
        <Metric label="Congestion Cut" value={congestionReduction || "18%"} />
        <Metric label="Fuel Saved" value={fuelSaved || "12.5 L"} />
      </div>

      <div className="info-box">
        <strong>Dashboard source</strong>
        <span>GET /api/dashboard and GET /api/live/dashboard</span>
      </div>
    </div>
  );
}

function ParkingPanel({ data, destination }) {
  const zone =
    data?.best_parking_zone ||
    data?.zone_name ||
    data?.parking_zone ||
    "Parking Zone A";

  const availability =
    data?.availability_probability ||
    data?.availability ||
    data?.probability ||
    "82%";

  const wait =
    data?.estimated_wait_time ||
    data?.wait_time ||
    "3 min";

  const walk =
    data?.walking_distance ||
    data?.walk ||
    "3 min walk";

  return (
    <div className="side-panel">
      <p className="eyebrow">AI Parking Prediction</p>
      <h2>{zone}</h2>
      <p className="panel-copy">
        Parking prediction near {destination}. FlowSync uses parking availability
        and walking distance to reduce circling traffic.
      </p>

      <div className="metric-grid">
        <Metric label="Availability" value={availability} />
        <Metric label="Wait Time" value={wait} />
        <Metric label="Walk" value={walk} />
        <Metric label="Difficulty" value={data?.difficulty_score || "Low"} />
      </div>
    </div>
  );
}

function AlertsPanel({ alerts }) {
  const displayAlerts = alerts.length > 0 ? alerts : normalizeAlerts(null);

  return (
    <div className="side-panel">
      <p className="eyebrow">Driver Alerts</p>
      <h2>Road intelligence feed</h2>

      <div className="alert-list">
        {displayAlerts.map((alert, index) => (
          <div key={`${alert.message}-${index}`} className="alert-card">
            <span>{alert.severity || "info"}</span>
            <strong>{alert.alert_type || alert.type || "traffic"}</strong>
            <p>{alert.message || "Traffic update available."}</p>
            <small>{alert.zone || alert.area || "Dubai"} • {alert.time || "Now"}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function TripSummary({ summary }) {
  return (
    <div className="side-panel">
      <p className="eyebrow">Trip Summary</p>
      <h2>{summary ? "Trip completed" : "No summary yet"}</h2>

      {summary ? (
        <div className="metric-grid">
          <Metric
            label="Status"
            value={summary.status || summary.trip_status || "completed"}
          />
          <Metric
            label="Time Saved"
            value={summary.time_saved || summary.estimated_time_saved || "7 min"}
          />
          <Metric
            label="Fuel Saved"
            value={summary.fuel_saved || "1.2 L"}
          />
          <Metric
            label="CO₂ Saved"
            value={summary.co2_saved || "1.8 kg"}
          />
        </div>
      ) : (
        <p className="panel-copy">
          End an active trip to generate a backend trip summary.
        </p>
      )}
    </div>
  );
}

function PanelTabs({ activePanel, setActivePanel }) {
  const tabs = [
    ["routes", "Routes"],
    ["navigation", "Navigate"],
    ["dashboard", "Dashboard"],
    ["parking", "Parking"],
    ["alerts", "Alerts"],
    ["summary", "Summary"],
  ];

  return (
    <div className="panel-tabs">
      {tabs.map(([id, label]) => (
        <button
          key={id}
          className={activePanel === id ? "active" : ""}
          onClick={() => setActivePanel(id)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value ?? "—"}</strong>
    </div>
  );
}

function ApiStatusBadge({ apiState, systemStatus }) {
  const connected = apiState === "connected";

  return (
    <div className={connected ? "api-badge connected" : "api-badge"}>
      <strong>{connected ? "Backend Connected" : "Checking Backend"}</strong>
      <span>
        {systemStatus?.version
          ? `v${systemStatus.version}`
          : systemStatus?.database || "FastAPI"}
      </span>
    </div>
  );
}

function normalizeRouteResponse(response, startLocation, destinationLocation) {
  const recommended = response?.recommended_route || fallbackRoutes[1];

  const rawRoutes =
    response?.all_routes?.length > 0
      ? response.all_routes
      : response?.routes?.length > 0
      ? response.routes
      : [recommended, ...fallbackRoutes.filter((route) => route !== recommended)];

  const recommendedName =
    recommended.route_name ||
    recommended.name ||
    "Route B - Al Khail Road";

  const startPoint = getPointFromLocation(startLocation) || [25.1972, 55.2744];
  const destinationPoint =
    getPointFromLocation(destinationLocation) || [25.0800, 55.1400];

  const routes = rawRoutes.slice(0, 4).map((route, index) => {
    const fallback = fallbackRoutes[index] || fallbackRoutes[1];

    const routeName =
      route.route_name ||
      route.name ||
      fallback.route_name ||
      `Route ${index + 1}`;

    const coordinates = normalizeCoordinates(
      route.coordinates || route.polyline,
      fallback.coordinates || [startPoint, destinationPoint]
    );

    return {
      route_name: routeName,
      estimated_time:
        route.estimated_time ||
        route.time ||
        route.travel_time ||
        fallback.estimated_time,
      distance_km:
        route.distance_km ||
        route.distance ||
        fallback.distance_km,
      congestion_score:
        route.congestion_score ??
        route.congestion_level ??
        fallback.congestion_score,
      route_score:
        route.route_score ??
        route.score ??
        fallback.route_score,
      assigned_users:
        route.assigned_users ??
        fallback.assigned_users ??
        0,
      road_capacity:
        route.road_capacity ??
        fallback.road_capacity ??
        0,
      route_type:
        route.route_type ||
        fallback.route_type ||
        "smart_route",
      coordinates,
      alerts: route.alerts || fallback.alerts || [],
      incidents: route.incidents || fallback.incidents || [],
      steps: normalizeSteps(
        route.turn_by_turn_steps ||
          route.steps ||
          fallback.turn_by_turn_steps ||
          fallbackSteps
      ),
      recommended: routeName === recommendedName,
    };
  });

  const recommendedIndex = routes.findIndex(
    (route) => route.route_name === recommendedName
  );

  if (recommendedIndex > 0) {
    const [recommendedRoute] = routes.splice(recommendedIndex, 1);
    routes.unshift(recommendedRoute);
  }

  return { routes };
}

function normalizeCoordinates(value, fallback) {
  if (!value) return fallback;

  if (typeof value === "string") {
    return fallback;
  }

  if (!Array.isArray(value)) {
    return fallback;
  }

  const coordinates = value
    .map((point) => {
      if (Array.isArray(point) && point.length >= 2) {
        return [Number(point[0]), Number(point[1])];
      }

      const lat = point.latitude ?? point.lat;
      const lng = point.longitude ?? point.lng ?? point.lon;

      if (lat !== undefined && lng !== undefined) {
        return [Number(lat), Number(lng)];
      }

      return null;
    })
    .filter(Boolean);

  return coordinates.length >= 2 ? coordinates : fallback;
}

function normalizeSteps(steps) {
  if (!Array.isArray(steps) || steps.length === 0) {
    return fallbackSteps;
  }

  return steps.map((step, index) => {
    if (typeof step === "string") {
      return {
        instruction: step,
        distance: "—",
        duration: "—",
      };
    }

    return {
      instruction:
        step.instruction ||
        step.message ||
        step.description ||
        `Continue to step ${index + 1}`,
      distance: step.distance || step.distance_km || "—",
      duration: step.duration || step.estimated_time || "—",
    };
  });
}

function normalizeLocations(response) {
  const raw =
    response?.results ||
    response?.locations ||
    response?.data ||
    response ||
    [];

  if (!Array.isArray(raw)) return [];

  return raw.map((item) => ({
    name: item.name || item.location_name || item.title || "Unknown location",
    address: item.address || item.area || item.description || "Dubai",
    latitude: item.latitude ?? item.lat,
    longitude: item.longitude ?? item.lng ?? item.lon,
    category: item.category || item.type || "location",
  }));
}

function normalizeAlerts(response) {
  const raw =
    response?.alerts ||
    response?.driver_alerts ||
    response?.items ||
    response?.data ||
    response ||
    [];

  if (!Array.isArray(raw) || raw.length === 0) {
    return [
      {
        alert_type: "congestion",
        message: "Heavy congestion reported near Business Bay.",
        zone: "Business Bay",
        severity: "medium",
        time: "Now",
      },
    ];
  }

  return raw;
}

function getLocalLocationMatches(query) {
  const lower = query.toLowerCase();

  return demoLocations.filter((location) => {
    return (
      location.name.toLowerCase().includes(lower) ||
      location.address.toLowerCase().includes(lower) ||
      location.category.toLowerCase().includes(lower)
    );
  });
}

function getPointFromLocation(location) {
  if (!location) return null;

  const lat = location.latitude ?? location.lat;
  const lng = location.longitude ?? location.lng ?? location.lon;

  if (lat === undefined || lng === undefined) {
    const fallback = demoLocations.find(
      (item) => item.name.toLowerCase() === location.name?.toLowerCase()
    );

    if (fallback) {
      return [fallback.latitude, fallback.longitude];
    }

    return null;
  }

  return [Number(lat), Number(lng)];
}

function readMetric(data, keys) {
  if (!data) return null;

  for (const key of keys) {
    if (data[key] !== undefined && data[key] !== null) {
      return data[key];
    }
  }

  if (data.dashboard) {
    return readMetric(data.dashboard, keys);
  }

  if (data.stats) {
    return readMetric(data.stats, keys);
  }

  return null;
}

export default App;