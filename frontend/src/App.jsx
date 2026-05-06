import MapView from "./components/MapView";

function App() {
  return (
    <div style={{ padding: "24px", fontFamily: "Arial, sans-serif" }}>
      <h1>FlowSync Maps & Routing</h1>

      <p>
        This page shows the map, start point, destination, and a sample route.
      </p>

      <MapView />

      <div style={{ marginTop: "20px" }}>
        <h2>Route Recommendation</h2>
        <p><strong>Recommended Route:</strong> Downtown Route</p>
        <p><strong>Estimated Time:</strong> 18 minutes</p>
        <p><strong>Traffic Level:</strong> Medium</p>
      </div>
    </div>
  );
}

export default App;