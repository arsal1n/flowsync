// frontend/src/utils/routePolylineUtils.js

import {
  normalizeCoordinates,
  SELECTED_ROUTE_COLOR,
  ALTERNATIVE_ROUTE_COLOR,
  getCongestionColor,
} from "./mapUtils";

/**
 * Decodes an encoded polyline string into Leaflet format:
 * [
 *   [lat, lng],
 *   [lat, lng]
 * ]
 *
 * This is prepared in case the backend returns recommended_route.polyline
 * as an encoded string.
 */
export function decodePolyline(encodedPolyline) {
  if (!encodedPolyline || typeof encodedPolyline !== "string") {
    return [];
  }

  const coordinates = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encodedPolyline.length) {
    let shift = 0;
    let result = 0;
    let byte = null;

    do {
      byte = encodedPolyline.charCodeAt(index) - 63;
      index += 1;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      byte = encodedPolyline.charCodeAt(index) - 63;
      index += 1;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    coordinates.push([lat / 100000, lng / 100000]);
  }

  return coordinates;
}

/**
 * Gets route coordinates from whichever backend field exists.
 *
 * Preferred:
 * recommended_route.coordinates
 *
 * Backup:
 * recommended_route.polyline
 */
export function getRouteLineFromRoute(route) {
  if (!route) {
    return [];
  }

  if (Array.isArray(route.coordinates) && route.coordinates.length > 0) {
    return normalizeCoordinates(route.coordinates);
  }

  if (typeof route.polyline === "string" && route.polyline.length > 0) {
    return decodePolyline(route.polyline);
  }

  if (Array.isArray(route.polyline) && route.polyline.length > 0) {
    return normalizeCoordinates(route.polyline);
  }

  return [];
}

/**
 * Gets all route options from the backend response.
 *
 * Backend can return:
 * response.recommended_route
 * response.all_routes
 */
export function getRouteOptionsFromResponse(routeResponse) {
  if (!routeResponse) {
    return [];
  }

  const allRoutes = Array.isArray(routeResponse.all_routes)
    ? routeResponse.all_routes
    : [];

  const recommendedRoute = routeResponse.recommended_route;

  if (allRoutes.length > 0) {
    return allRoutes;
  }

  if (recommendedRoute) {
    return [recommendedRoute];
  }

  return [];
}

/**
 * Finds the recommended route from the backend response.
 */
export function getRecommendedRoute(routeResponse) {
  if (!routeResponse) {
    return null;
  }

  if (routeResponse.recommended_route) {
    return routeResponse.recommended_route;
  }

  const allRoutes = getRouteOptionsFromResponse(routeResponse);

  if (allRoutes.length > 0) {
    return allRoutes[0];
  }

  return null;
}

/**
 * Checks whether two routes are probably the same route.
 */
export function isSameRoute(routeA, routeB) {
  if (!routeA || !routeB) {
    return false;
  }

  const routeAName = routeA.route_name || routeA.name;
  const routeBName = routeB.route_name || routeB.name;

  if (routeAName && routeBName) {
    return routeAName === routeBName;
  }

  return routeA === routeB;
}

/**
 * Returns styling for selected and alternative route lines.
 */
export function getRouteLineStyle(route, selectedRoute) {
  const selected = isSameRoute(route, selectedRoute);

  return {
    color: selected
      ? getCongestionColor(route?.congestion_score)
      : ALTERNATIVE_ROUTE_COLOR,
    weight: selected ? 6 : 4,
    opacity: selected ? 0.95 : 0.45,
  };
}

/**
 * Returns the selected route color.
 */
export function getSelectedRouteColor(route) {
  if (!route) {
    return SELECTED_ROUTE_COLOR;
  }

  return getCongestionColor(route.congestion_score);
}

/**
 * Converts backend route options into map-ready route line objects.
 */
export function buildMapRouteLines(routeOptions, selectedRoute) {
  if (!Array.isArray(routeOptions)) {
    return [];
  }

  return routeOptions
    .map((route) => {
      const positions = getRouteLineFromRoute(route);

      if (positions.length === 0) {
        return null;
      }

      return {
        route,
        positions,
        style: getRouteLineStyle(route, selectedRoute),
      };
    })
    .filter((routeLine) => routeLine !== null);
}
