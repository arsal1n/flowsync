import "./index.css";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import TripRequest from "./pages/TripRequest";
import Analytics from "./pages/Analytics";
import RouteCard from "./components/RouteCard";

function App() {
  return (
    <div className="app">
      <Navbar />

      <Dashboard />

      <TripRequest />

      <section id="routes" className="routes">
        <RouteCard
          type="danger"
          title="Route A"
          description="Fastest but crowded"
          time="22 min"
          congestion="High"
        />

        <RouteCard
          type="recommended"
          title="Route B"
          description="Recommended by FlowSync"
          time="26 min"
          congestion="Balanced"
        />

        <RouteCard
          type="safe"
          title="Route C"
          description="Longer but less congested"
          time="30 min"
          congestion="Low"
        />
      </section>

      <Analytics />
    </div>
  );
}

export default App;