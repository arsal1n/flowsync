// frontend/src/components/RouteControls.jsx

import { useState } from "react";
import { geocode, getRoute } from "../services/routeService";

function RouteControls({ onRouteFound }) {
  const [startAddress, setStartAddress] = useState("");
  const [destAddress, setDestAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleFindRoute(event) {
    event.preventDefault();

    setError("");

    if (!startAddress.trim() || !destAddress.trim()) {
      setError("Please enter both start and destination.");
      return;
    }

    try {
      setLoading(true);

      const startCoords = await geocode(startAddress);
      const destCoords = await geocode(destAddress);

      const route = await getRoute(startCoords, destCoords);

      onRouteFound({
        startPoint: startCoords,
        destPoint: destCoords,
        routeLine: route.coordinates,
        route,
      });
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong while finding the route.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="route-controls">
      <h2>Find a Route</h2>

      <form onSubmit={handleFindRoute}>
        <div>
          <label htmlFor="startAddress">Start Location</label>
          <input
            id="startAddress"
            type="text"
            value={startAddress}
            onChange={(event) => setStartAddress(event.target.value)}
            placeholder="Example: Dubai Mall"
          />
        </div>

        <div>
          <label htmlFor="destAddress">Destination</label>
          <input
            id="destAddress"
            type="text"
            value={destAddress}
            onChange={(event) => setDestAddress(event.target.value)}
            placeholder="Example: Dubai Marina"
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Finding Route..." : "Find Route"}
        </button>
      </form>

      {error && <p className="error-message">{error}</p>}
    </div>
  );
}

export default RouteControls;