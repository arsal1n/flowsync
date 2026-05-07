// frontend/src/services/routeService.js

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org/search";
const OSRM_BASE_URL = "https://router.project-osrm.org/route/v1/driving";

/**
 * Converts an address into coordinates using OpenStreetMap Nominatim.
 * Returns: [lat, lng]
 */
export async function geocode(address) {
  if (!address || address.trim() === "") {
    throw new Error("Address is required");
  }

  const searchQuery = `${address}, Dubai, UAE`;

  const url = `${NOMINATIM_BASE_URL}?format=json&q=${encodeURIComponent(
    searchQuery
  )}&limit=1`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Failed to geocode address");
  }

  const data = await response.json();

  if (!data || data.length === 0) {
    throw new Error(`No location found for: ${address}`);
  }

  const location = data[0];

  return [parseFloat(location.lat), parseFloat(location.lon)];
}

/**
 * Gets a driving route between two coordinates using OSRM.
 * Input: [lat, lng]
 * Returns route data using backend snake_case shape.
 */
export async function getRoute(startCoords, destCoords) {
  if (!startCoords || !destCoords) {
    throw new Error("Start and destination coordinates are required");
  }

  const [startLat, startLng] = startCoords;
  const [destLat, destLng] = destCoords;

  const url = `${OSRM_BASE_URL}/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Failed to fetch route");
  }

  const data = await response.json();

  if (!data.routes || data.routes.length === 0) {
    throw new Error("No route found");
  }

  const route = data.routes[0];

  const coordinates = route.geometry.coordinates.map(([lng, lat]) => [
    lat,
    lng,
  ]);

  return {
    route_name: "Recommended Route",
    estimated_time: Math.round(route.duration / 60),
    distance_km: parseFloat((route.distance / 1000).toFixed(2)),
    congestion_score: 0,
    assigned_users: 0,
    route_score: 0,
    coordinates,
  };
}
