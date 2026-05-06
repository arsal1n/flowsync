// frontend/src/components/RouteInfo.jsx

function RouteInfo({ route }) {
  if (!route) {
    return (
      <div className="route-info">
        <h2>Route Recommendation</h2>
        <p>No route selected yet.</p>
      </div>
    );
  }

  return (
    <div className="route-info">
      <h2>Route Recommendation</h2>

      <p>
        <strong>Recommended Route:</strong> {route.route_name}
      </p>

      <p>
        <strong>Estimated Time:</strong> {route.estimated_time} minutes
      </p>

      <p>
        <strong>Distance:</strong> {route.distance_km} km
      </p>

      <p>
        <strong>Congestion Score:</strong> {route.congestion_score}
      </p>

      <p>
        <strong>Assigned Users:</strong> {route.assigned_users}
      </p>

      <p>
        <strong>Route Score:</strong> {route.route_score}
      </p>
    </div>
  );
}

export default RouteInfo;
