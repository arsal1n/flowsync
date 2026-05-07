import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Popup,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./index.css";
import { getRecommendedRoute, getDashboardData, getTrips } from "./api";

const routeA = [
  [25.0800, 55.1400],
  [25.1200, 55.1900],
  [25.1972, 55.2744],
];

const routeB = [
  [25.0800, 55.1400],
  [25.1500, 55.2200],
  [25.1972, 55.2744],
];

const routeC = [
  [25.0800, 55.1400],
  [25.1700, 55.2500],
  [25.1972, 55.2744],
];

const routes = [
  {
    name: "Route A",
    time: "22 min",
    distance: "18.4 km",
    congestion: "High",
    score: 56,
    load: "92%",
    className: "danger",
    note: "Fastest but overloaded",
  },
  {
    name: "Route B",
    time: "26 min",
    distance: "20.1 km",
    congestion: "Balanced",
    score: 41,
    load: "61%",
    className: "recommended",
    note: "FlowSync recommended",
  },
  {
    name: "Route C",
    time: "30 min",
    distance: "22.7 km",
    congestion: "Low",
    score: 37,
    load: "38%",
    className: "safe",
    note: "Less congested",
  },
];

const savedPlaces = [
  { label: "Home", address: "Dubai Marina", icon: "🏠" },
  { label: "Work", address: "Business Bay", icon: "💼" },
  { label: "University", address: "Academic City", icon: "🎓" },
  { label: "Airport", address: "DXB Terminal 3", icon: "✈️" },
];

const parkingZones = [
  { zone: "A", availability: "82%", difficulty: "Low", walk: "3 min", status: "high" },
  { zone: "B", availability: "48%", difficulty: "Medium", walk: "5 min", status: "medium" },
  { zone: "C", availability: "17%", difficulty: "High", walk: "1 min", status: "low" },
];

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return isLoggedIn ? (
    <MobileDashboard onLogout={() => setIsLoggedIn(false)} />
  ) : (
    <LoginPage onLogin={() => setIsLoggedIn(true)} />
  );
}

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("trisha@flowsync.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleLogin(event) {
    event.preventDefault();

    if (email.toLowerCase() === "trisha@flowsync.com" && password === "1234") {
      setError("");
      onLogin();
    } else {
      setError("Login failed. Please check your email or password and retry.");
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <div className="brand-mark">FS</div>
        <p className="eyebrow">Smart Mobility for UAE</p>
        <h1>FlowSync DXB</h1>
        <p className="auth-subtitle">
          Login to access adaptive route distribution, AI parking intelligence,
          and real-time mobility insights.
        </p>

        <form onSubmit={handleLogin} className="auth-form">
          <label>Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email"
          />

          <label>Password</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            type="password"
          />

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-btn">
            Login to Dashboard
          </button>
        </form>

        <div className="demo-box">
          <strong>Demo Login</strong>
          <span>trisha@flowsync.com / 1234</span>
        </div>
      </section>

      <section className="auth-preview">
        <div className="phone-mini">
          <div className="mini-map">
            <span className="route-line one"></span>
            <span className="route-line two"></span>
            <span className="route-line three"></span>
            <div className="mini-card">
              <b>Route B</b>
              <span>Recommended • 26 min</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function MobileDashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState("home");
  const [searchText, setSearchText] = useState("");
  const [routeResult, setRouteResult] = useState(null);
  const [apiSource, setApiSource] = useState("checking");
  const [dashboardData, setDashboardData] = useState(null);
  const [trips, setTrips] = useState([]);

  useEffect(() => {
    let isMounted = true;

    async function loadBackendData() {
      const tripRequest = {
        start_location: "Dubai Mall",
        destination: "Dubai Marina",
        vehicle_type: "car",
      };

      const routeData = await getRecommendedRoute(tripRequest);
      const dashboard = await getDashboardData();
      const recentTrips = await getTrips();

      if (!isMounted) return;

      setRouteResult(routeData);
      setApiSource(routeData.source);
      setDashboardData(dashboard.data);
      setTrips(recentTrips.data || []);
    }

    loadBackendData();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="mobile-stage">
      <section className="phone-shell">
        <div className="phone-status">
          <span>9:41</span>
          <span>5G ◉</span>
        </div>

        <header className="app-header">
          <button className="icon-btn">☰</button>
          <div>
            <h2>FlowSync DXB</h2>
            <p>City-wide traffic equilibrium</p>
          </div>
          <button className="icon-btn" onClick={onLogout}>⏻</button>
        </header>

        <section className="map-panel">
          <MapContainer
            center={[25.135, 55.22]}
            zoom={11}
            scrollWheelZoom={false}
            className="mobile-map"
          >
            <TileLayer
              attribution="&copy; OpenStreetMap"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <Polyline positions={routeA} pathOptions={{ color: "#ff3b30", weight: 4 }} />
            <Polyline positions={routeB} pathOptions={{ color: "#00ff88", weight: 7 }} />
            <Polyline positions={routeC} pathOptions={{ color: "#00e5ff", weight: 4 }} />

            <CircleMarker
              center={[25.0800, 55.1400]}
              radius={8}
              pathOptions={{ color: "white", fillColor: "white", fillOpacity: 1 }}
            >
              <Popup>Start: Dubai Marina</Popup>
            </CircleMarker>

            <CircleMarker
              center={[25.1972, 55.2744]}
              radius={9}
              pathOptions={{ color: "#ffe600", fillColor: "#ffe600", fillOpacity: 1 }}
            >
              <Popup>Destination: Downtown Dubai</Popup>
            </CircleMarker>
          </MapContainer>

          <div className="navigation-bubble">
            <span>↱</span>
            <div>
              <strong>200m ahead</strong>
              <p>Then turn left</p>
            </div>
          </div>

          <div className="speed-card">
            <strong>0</strong>
            <span>km/h</span>
          </div>

          <div className="destination-chip">
            <span>⌖</span>
            <div>
              <strong>Downtown Dubai</strong>
              <p>26 min • 20.1 km</p>
            </div>
          </div>
        </section>

        <section className="search-card">
          <span>🔍</span>
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Where to?"
          />
          <button>🎙️</button>
        </section>

        <section className="feature-strip">
          <div>
            <strong>85%</strong>
            <span>Balance</span>
          </div>
          <div>
            <strong>18%</strong>
            <span>Less traffic</span>
          </div>
          <div>
            <strong>12.5L</strong>
            <span>Fuel saved</span>
          </div>
        </section>

        <section className="content-sheet">
          {activeTab === "home" && (
  <HomeScreen routeResult={routeResult} apiSource={apiSource} />
)}

{activeTab === "routes" && (
  <RoutesScreen routeResult={routeResult} apiSource={apiSource} />
)}

{activeTab === "parking" && <ParkingScreen />}

{activeTab === "insights" && (
  <InsightsScreen dashboardData={dashboardData} trips={trips} />
)}

{activeTab === "saved" && <SavedScreen />}
        </section>

        <nav className="bottom-nav">
          <button
            className={activeTab === "home" ? "active" : ""}
            onClick={() => setActiveTab("home")}
          >
            🧭
            <span>Home</span>
          </button>

          <button
            className={activeTab === "routes" ? "active" : ""}
            onClick={() => setActiveTab("routes")}
          >
            🛣️
            <span>Routes</span>
          </button>

          <button
            className={activeTab === "parking" ? "active" : ""}
            onClick={() => setActiveTab("parking")}
          >
            🅿️
            <span>Parking</span>
          </button>

          <button
            className={activeTab === "insights" ? "active" : ""}
            onClick={() => setActiveTab("insights")}
          >
            📊
            <span>Insights</span>
          </button>

          <button
            className={activeTab === "saved" ? "active" : ""}
            onClick={() => setActiveTab("saved")}
          >
            ⭐
            <span>Saved</span>
          </button>
        </nav>
      </section>
    </main>
  );
}

function HomeScreen({ routeResult, apiSource }) {
  const selectedRoute =
    routeResult?.routes?.find(
      (route) => route.name === routeResult.recommended_route
    ) || routes[1];

  const sourceLabel =
    apiSource === "backend"
      ? "Backend Connected"
      : apiSource === "checking"
      ? "Checking API"
      : "Mock Data";

  return (
    <>
      <div className="sheet-header">
        <div>
          <p className="eyebrow">Adaptive Route Distribution</p>
          <h3>{selectedRoute.name} selected for balanced city flow</h3>
        </div>

        <span className={apiSource === "backend" ? "status-pill" : "future-pill"}>
          {sourceLabel}
        </span>
      </div>

      <div className="primary-route-card">
        <div>
          <h4>Dubai Mall → Dubai Marina</h4>
          <p>
            {routeResult?.reason ||
              "Recommended route balances traffic instead of sending everyone to the fastest road."}
          </p>
        </div>
        <strong>{selectedRoute.time}</strong>
      </div>

      <div className="quick-grid">
        <SmartCard
          title="API Status"
          value={sourceLabel}
          detail={
            apiSource === "backend"
              ? "Live FastAPI response received"
              : "Using fallback route data"
          }
        />

        <SmartCard
          title="Selected route"
          value={selectedRoute.name}
          detail={`Congestion: ${selectedRoute.congestion}`}
        />

        <SmartCard
          title="FlowSync score"
          value={selectedRoute.score}
          detail="Lower score means better traffic balance"
        />

        <SmartCard
          title="Eco estimate"
          value="1.8 kg"
          detail="CO₂ avoided today"
        />
      </div>
    </>
  );
}

function RoutesScreen() {
  return (
    <>
      <div className="sheet-header">
        <div>
          <p className="eyebrow">FlowSync Engine</p>
          <h3>Multiple route options</h3>
        </div>
        <span className="status-pill">AI Score</span>
      </div>

      <div className="route-list">
        {routes.map((route) => (
          <div key={route.name} className={`route-option ${route.className}`}>
            <div>
              <h4>{route.name}</h4>
              <p>{route.note}</p>
              <span>{route.distance} • Congestion: {route.congestion}</span>
            </div>
            <div className="route-score">
              <strong>{route.time}</strong>
              <small>Score {route.score}</small>
            </div>
          </div>
        ))}
      </div>

      <button className="action-btn">Start Navigation</button>
    </>
  );
}

function ParkingScreen() {
  return (
    <>
      <div className="sheet-header">
        <div>
          <p className="eyebrow">AI Parking Prediction</p>
          <h3>Parking near destination</h3>
        </div>
        <span className="future-pill">Prototype</span>
      </div>

      <div className="parking-list">
        {parkingZones.map((zone) => (
          <div key={zone.zone} className={`parking-card ${zone.status}`}>
            <div className="zone-badge">{zone.zone}</div>
            <div>
              <h4>Parking Zone {zone.zone}</h4>
              <p>{zone.availability} availability • {zone.walk} walk</p>
            </div>
            <span>{zone.difficulty}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function InsightsScreen() {
  return (
    <>
      <div className="sheet-header">
        <div>
          <p className="eyebrow">Analytics Dashboard</p>
          <h3>Mobility intelligence</h3>
        </div>
        <span className="status-pill">Admin</span>
      </div>

      <div className="analytics-grid">
        <SmartCard title="Traffic density" value="High" detail="Sheikh Zayed Road" />
        <SmartCard title="Route efficiency" value="87%" detail="Compared to normal route" />
        <SmartCard title="Peak-hour load" value="6:15 PM" detail="Predicted congestion spike" />
        <SmartCard title="Fuel optimization" value="12.5 L" detail="Estimated daily saving" />
      </div>
    </>
  );
}

function SavedScreen() {
  return (
    <>
      <div className="sheet-header">
        <div>
          <p className="eyebrow">Saved Places</p>
          <h3>Quick navigation</h3>
        </div>
      </div>

      <div className="saved-list">
        {savedPlaces.map((place) => (
          <div key={place.label} className="saved-place">
            <span>{place.icon}</span>
            <div>
              <strong>{place.label}</strong>
              <p>{place.address}</p>
            </div>
            <button>Go</button>
          </div>
        ))}
      </div>
    </>
  );
}

function SmartCard({ title, value, detail }) {
  return (
    <div className="smart-card">
      <p>{title}</p>
      <strong>{value}</strong>
      <span>{detail}</span>
    </div>
  );
}

export default App;