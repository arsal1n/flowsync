import { useState } from "react";
import { getRecommendedRoute } from "../api";

function TripRequest() {
  const [formData, setFormData] = useState({
    startLocation: "",
    destination: "",
    vehicleType: "Car",
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData({
      ...formData,
      [name]: value,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!formData.startLocation || !formData.destination) {
      alert("Please enter both start location and destination.");
      return;
    }

    setLoading(true);

    const routeResult = await getRecommendedRoute(formData);

    setResult(routeResult);
    setLoading(false);
  }

  return (
    <section id="trip" className="panel">
      <h2>New Trip Request</h2>

      <form className="form-grid" onSubmit={handleSubmit}>
        <input
          name="startLocation"
          value={formData.startLocation}
          onChange={handleChange}
          placeholder="Start Location e.g. Dubai Marina"
        />

        <input
          name="destination"
          value={formData.destination}
          onChange={handleChange}
          placeholder="Destination e.g. Downtown Dubai"
        />

        <select
          name="vehicleType"
          value={formData.vehicleType}
          onChange={handleChange}
        >
          <option>Car</option>
          <option>Taxi</option>
          <option>Bus</option>
        </select>

        <button className="primary-btn" type="submit">
          {loading ? "Finding Route..." : "Find FlowSync Route"}
        </button>
      </form>

      {result && (
        <div className="recommendation-box">
          <h3>Recommended Route: {result.recommended_route}</h3>
          <p>{result.reason}</p>

          <div className="result-grid">
            {result.routes.map((route) => (
              <div
                key={route.name}
                className={
                  route.name === result.recommended_route
                    ? "mini-route selected-route"
                    : "mini-route"
                }
              >
                <h4>{route.name}</h4>
                <p>Estimated Time: {route.estimated_time} min</p>
                <p>Congestion Score: {route.congestion_score}/10</p>
                <p>Assigned Users: {route.assigned_users}</p>
                <strong>Route Score: {route.route_score}</strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default TripRequest;