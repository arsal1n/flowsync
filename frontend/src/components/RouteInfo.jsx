function RouteInfo({ route }) {
  return (
    <div style={{ marginTop: "20px" }}>
      <h2>Route Recommendation</h2>

      <p>
        <strong>Recommended Route:</strong> {route.routeName}
      </p>

      <p>
        <strong>Estimated Time:</strong> {route.estimatedTime}
      </p>

      <p>
        <strong>Traffic Level:</strong> {route.trafficLevel}
      </p>
    </div>
  );
}

export default RouteInfo;