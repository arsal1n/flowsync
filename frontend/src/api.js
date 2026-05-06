export async function getRecommendedRoute(tripData) {
  console.log("Trip request sent:", tripData);

  return {
    recommended_route: "Route B",
    reason: "Balanced route with lower congestion and moderate travel time",
    routes: [
      {
        name: "Route A",
        estimated_time: 22,
        congestion_score: 8,
        assigned_users: 45,
        route_score: 56,
      },
      {
        name: "Route B",
        estimated_time: 26,
        congestion_score: 4,
        assigned_users: 52,
        route_score: 41,
      },
      {
        name: "Route C",
        estimated_time: 30,
        congestion_score: 2,
        assigned_users: 27,
        route_score: 37,
      },
    ],
  };
}