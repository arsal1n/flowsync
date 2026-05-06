import MapView from "../components/MapView";
import RouteInfo from "../components/RouteInfo";
import { sampleRoute } from "../data/sampleRoute";

function MapPage() {
  return (
    <div style={{ padding: "24px", fontFamily: "Arial, sans-serif" }}>
      <h1>FlowSync Maps & Routing</h1>

      <p>
        This page shows the map, start point, destination, and a sample route.
      </p>

      <MapView />

      <RouteInfo route={sampleRoute} />
    </div>
  );
}

export default MapPage;