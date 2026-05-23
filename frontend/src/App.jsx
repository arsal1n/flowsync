import { useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Popup,
  ZoomControl,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { getRecommendedRoute } from "./api";
import "./index.css";

const LOCATIONS = {
  "Dubai Mall": [25.1972, 55.2744],
  "Dubai Marina": [25.08, 55.14],
  "Downtown Dubai": [25.2048, 55.2708],
  "Business Bay": [25.185, 55.2636],
  "DXB Airport": [25.2532, 55.3657],
  Jumeirah: [25.2048, 55.2394],
  Sharjah: [25.3463, 55.4209],
  "Academic City": [25.125, 55.42],
};

const ROUTES = [
  {
    id: "route-a",
    name: "Route A - Sheikh Zayed Road",
    tag: "Fastest but crowded",
    eta: "22 min",
    distance: "14.5 km",
    congestion: 8,
    load: 82,
    score: 72.4,
    cityImpact: "+6%",
    status: "Heavy traffic",
    color: "#ff4d4d",
    reason: "Fastest route, but it adds pressure to an already overloaded corridor.",
    path: [
      [25.1972, 55.2744],
      [25.1905, 55.2474],
      [25.167, 55.217],
      [25.124, 55.18],
      [25.08, 55.14],
    ],
  },
  {
    id: "route-b",
    name: "Route B - Al Khail Road",
    tag: "FlowSync recommended",
    eta: "26 min",
    distance: "16.2 km",
    congestion: 4,
    load: 53,
    score: 86.73,
    cityImpact: "+18%",
    status: "Balanced traffic",
    color: "#00ff9d",
    recommended: true,
    reason:
      "Balances your travel time with lower congestion and better city-wide route distribution.",
    path: [
      [25.1972, 55.2744],
      [25.18, 55.288],
      [25.152, 55.275],
      [25.118, 55.218],
      [25.08, 55.14],
    ],
  },
  {
    id: "route-c",
    name: "Route C - Business Bay Side Streets",
    tag: "Low congestion",
    eta: "30 min",
    distance: "18.1 km",
    congestion: 3,
    load: 39,
    score: 78.2,
    cityImpact: "+14%",
    status: "Clear roads",
    color: "#13a8ff",
    reason:
      "Lower congestion and smoother flow, but slightly longer than the recommended route.",
    path: [
      [25.1972, 55.2744],
      [25.19, 55.3],
      [25.155, 55.315],
      [25.118, 55.25],
      [25.08, 55.14],
    ],
  },
];

const ALERTS = [
  { type: "traffic", label: "Slow traffic", position: [25.167, 55.217] },
  { type: "parking", label: "Parking pressure high", position: [25.188, 55.258] },
  { type: "report", label: "Crowd report", position: [25.128, 55.215] },
];

function App() {
  const [start, setStart] = useState("Dubai Mall");
  const [destination, setDestination] = useState("Dubai Marina");
  const [vehicleType, setVehicleType] = useState("car");
  const [preference, setPreference] = useState("balanced");
  const [selectedRouteId, setSelectedRouteId] = useState("route-b");
  const [isNavigationActive, setIsNavigationActive] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    "Backend connected. Ready to generate a FlowSync route."
  );
  const [loading, setLoading] = useState(false);

  const selectedRoute = useMemo(() => {
    return ROUTES.find((route) => route.id === selectedRouteId) || ROUTES[1];
  }, [selectedRouteId]);

  const mapCenter = useMemo(() => {
    const startPoint = LOCATIONS[start];
    const endPoint = LOCATIONS[destination];

    return [
      (startPoint[0] + endPoint[0]) / 2,
      (startPoint[1] + endPoint[1]) / 2,
    ];
  }, [start, destination]);

  async function handleFindRoute() {
    if (start === destination) {
      setStatusMessage("Start and destination cannot be the same.");
      return;
    }

    setLoading(true);
    setStatusMessage("FlowSync is checking routes, congestion, and city impact...");

    try {
      await getRecommendedRoute({
        start_location: start,
        destination,
        vehicle_type: vehicleType,
        route_preference: preference,
        user_role: "driver",
      });

      setSelectedRouteId("route-b");
      setStatusMessage("FlowSync found the best balanced route.");
    } catch (error) {
      console.error(error);
      setStatusMessage("Using smart demo route data while backend is unavailable.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">FS</div>
          <div>
            <h1>FlowSync DXB</h1>
            <p>Adaptive smart-city traffic intelligence</p>
          </div>
        </div>

        <div className="system-pill">
          <span className="pulse"></span>
          Backend Connected
        </div>

        <div className="driver-pill">driver@flowsync.local</div>
      </header>

      <main className="main-layout">
        <section className="map-workspace">
          <div className="planner-card">
            <div className="section-kicker">Live route planning</div>
            <h2>Where should FlowSync take you?</h2>

            <div className="search-grid">
              <label>
                Start
                <select value={start} onChange={(event) => setStart(event.target.value)}>
                  {Object.keys(LOCATIONS).map((location) => (
                    <option key={location}>{location}</option>
                  ))}
                </select>
              </label>

              <label>
                Destination
                <select
                  value={destination}
                  onChange={(event) => setDestination(event.target.value)}
                >
                  {Object.keys(LOCATIONS).map((location) => (
                    <option key={location}>{location}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="search-grid compact-grid">
              <label>
                Vehicle
                <select value={vehicleType} onChange={(event) => setVehicleType(event.target.value)}>
                  <option value="car">Car</option>
                  <option value="taxi">Taxi</option>
                  <option value="bus">Bus</option>
                  <option value="emergency">Emergency</option>
                </select>
              </label>
            </div>

            <div className="preference-row">
              {["balanced", "fastest", "eco", "low stress"].map((item) => (
                <button
                  key={item}
                  className={preference === item ? "active-chip" : ""}
                  onClick={() => setPreference(item)}
                  type="button"
                >
                  <strong>{item}</strong>
                  <span>
                    {item === "balanced" && "FlowSync smart choice"}
                    {item === "fastest" && "Lowest ETA"}
                    {item === "eco" && "Less fuel + CO₂"}
                    {item === "low stress" && "Avoid crowded roads"}
                  </span>
                </button>
              ))}
            </div>

            <button className="primary-action" onClick={handleFindRoute} disabled={loading}>
              {loading ? "Analyzing traffic..." : "Find FlowSync Route"}
            </button>

            <p className="status-text">{statusMessage}</p>
          </div>

          <div className="map-card">
            <div className="map-search-overlay">
              <div className="hamburger">☰</div>
              <div>
                <span>Search FlowSync Maps</span>
                <strong>
                  {start} → {destination}
                </strong>
              </div>
              <button type="button">⌕</button>
            </div>

            <div className="map-chips">
              <button className="selected">Routes</button>
              <button>Traffic</button>
              <button>Parking</button>
              <button>Alerts</button>
              <button>AI Flow</button>
            </div>

            <MapContainer
              key={`${start}-${destination}`}
              center={mapCenter}
              zoom={11}
              zoomControl={false}
              className="real-map"
            >
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <ZoomControl position="bottomright" />

              {ROUTES.map((route) => (
                <Polyline
                  key={route.id}
                  pathOptions={{
                    color: route.color,
                    weight: selectedRouteId === route.id ? 8 : 5,
                    opacity: selectedRouteId === route.id ? 0.95 : 0.55,
                  }}
                  positions={route.path}
                  eventHandlers={{
                    click: () => setSelectedRouteId(route.id),
                  }}
                />
              ))}

              <CircleMarker
                center={LOCATIONS[start]}
                radius={12}
                pathOptions={{ color: "#06111f", fillColor: "#00f5ff", fillOpacity: 1 }}
              >
                <Popup>Start: {start}</Popup>
              </CircleMarker>

              <CircleMarker
                center={LOCATIONS[destination]}
                radius={12}
                pathOptions={{ color: "#06111f", fillColor: "#00ff9d", fillOpacity: 1 }}
              >
                <Popup>Destination: {destination}</Popup>
              </CircleMarker>

              {ALERTS.map((alert) => (
                <CircleMarker
                  key={alert.label}
                  center={alert.position}
                  radius={9}
                  pathOptions={{
                    color: "#101827",
                    fillColor:
                      alert.type === "traffic"
                        ? "#ff4d4d"
                        : alert.type === "parking"
                        ? "#ffc857"
                        : "#9b5cff",
                    fillOpacity: 0.95,
                  }}
                >
                  <Popup>{alert.label}</Popup>
                </CircleMarker>
              ))}
            </MapContainer>

            <div className="floating-controls left">
              <button>＋</button>
              <button>−</button>
            </div>

            <div className="floating-controls right">
              <button>⌖</button>
              <button>▣</button>
              <button>⚠</button>
            </div>

            <div className="map-legend">
              <span><i className="red-dot"></i> overloaded</span>
              <span><i className="green-dot"></i> recommended</span>
              <span><i className="blue-dot"></i> alternative</span>
            </div>

            <div className="route-bottom-sheet">
              <div>
                <p>{selectedRoute.name}</p>
                <h3>{selectedRoute.eta} · {selectedRoute.distance}</h3>
                <span>{selectedRoute.status}</span>
              </div>

              <div className="sheet-metrics">
                <div>
                  <strong>{selectedRoute.score}</strong>
                  <span>FlowSync Score</span>
                </div>
                <div>
                  <strong>{selectedRoute.cityImpact}</strong>
                  <span>City Impact</span>
                </div>
              </div>

              <button
                className={isNavigationActive ? "danger-action" : "primary-action small"}
                onClick={() => setIsNavigationActive((current) => !current)}
              >
                {isNavigationActive ? "End Navigation" : "Start Navigation"}
              </button>
            </div>
          </div>

          <div className="route-options-card">
            <div className="route-heading">
              <div>
                <div className="section-kicker">Adaptive route distribution</div>
                <h2>Route options</h2>
              </div>

              <span className="mode-pill">mock + backend ready</span>
            </div>

            <div className="route-grid">
              {ROUTES.map((route) => (
                <button
                  key={route.id}
                  className={`route-card ${selectedRouteId === route.id ? "selected-route" : ""}`}
                  onClick={() => setSelectedRouteId(route.id)}
                  type="button"
                >
                  <div>
                    <h3>{route.name}</h3>
                    <p>{route.tag}</p>
                  </div>

                  <div className="route-card-main">
                    <strong>{route.eta}</strong>
                    <span>{route.distance}</span>
                  </div>

                  <div className="route-detail-row">
                    <span>Congestion {route.congestion}/10</span>
                    <span>Score {route.score}</span>
                  </div>

                  <div className="load-bar">
                    <span style={{ width: `${route.load}%`, background: route.color }}></span>
                  </div>

                  <small>Route load: {route.load}%</small>
                </button>
              ))}
            </div>
          </div>
        </section>

        <aside className="command-panel">
          <nav className="side-tabs">
            <button className="active">Routes</button>
            <button>Navigate</button>
            <button>Dashboard</button>
            <button>Parking</button>
            <button>Alerts</button>
            <button>Summary</button>
          </nav>

          <section className="recommend-card">
            <div className="section-kicker">Recommended route</div>
            <h2>{selectedRoute.name}</h2>
            <p>{selectedRoute.reason}</p>

            <div className="metric-grid">
              <div>
                <span>ETA</span>
                <strong>{selectedRoute.eta}</strong>
              </div>
              <div>
                <span>Distance</span>
                <strong>{selectedRoute.distance}</strong>
              </div>
              <div>
                <span>Congestion</span>
                <strong>{selectedRoute.congestion}/10</strong>
              </div>
              <div>
                <span>Route Score</span>
                <strong>{selectedRoute.score}</strong>
              </div>
            </div>

            <div className="database-box">
              <span>Database record</span>
              <strong>Request ID: 53</strong>
            </div>

            <button
              className={isNavigationActive ? "danger-action wide" : "primary-action wide"}
              onClick={() => setIsNavigationActive((current) => !current)}
            >
              {isNavigationActive ? "End Navigation" : "Start Navigation"}
            </button>
          </section>

          <section className="flow-card">
            <div className="section-kicker">FlowSync advantage</div>
            <h2>Why this is better than normal maps</h2>

            <div className="advantage-list">
              <div>
                <strong>01</strong>
                <p>Does not send every driver to the same fastest road.</p>
              </div>
              <div>
                <strong>02</strong>
                <p>Balances traffic load across multiple route corridors.</p>
              </div>
              <div>
                <strong>03</strong>
                <p>Shows city impact, route load, and congestion reduction.</p>
              </div>
            </div>
          </section>

          {isNavigationActive && (
            <section className="navigation-card">
              <div className="nav-arrow">↱</div>
              <div>
                <div className="section-kicker">Navigation active</div>
                <h2>Continue toward Al Khail Road</h2>
                <p>Next turn in 650 m · FlowSync is monitoring route load live.</p>
              </div>
            </section>
          )}
        </aside>
      </main>
    </div>
  );
}

export default App;
