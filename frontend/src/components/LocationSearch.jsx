// frontend/src/components/LocationSearch.jsx

import { useEffect, useMemo, useState } from "react";
import { searchLocations } from "../services/backendRouteService";

const FALLBACK_DUBAI_LOCATIONS = [
  {
    id: "dubai-mall",
    name: "Dubai Mall",
    address: "Downtown Dubai, Dubai, UAE",
    lat: 25.1972,
    lng: 55.2744,
  },
  {
    id: "dubai-marina",
    name: "Dubai Marina",
    address: "Dubai Marina, Dubai, UAE",
    lat: 25.0800,
    lng: 55.1400,
  },
  {
    id: "downtown-dubai",
    name: "Downtown Dubai",
    address: "Downtown Dubai, Dubai, UAE",
    lat: 25.1929,
    lng: 55.2788,
  },
  {
    id: "business-bay",
    name: "Business Bay",
    address: "Business Bay, Dubai, UAE",
    lat: 25.1850,
    lng: 55.2636,
  },
  {
    id: "dxb-airport",
    name: "DXB Airport",
    address: "Dubai International Airport, Dubai, UAE",
    lat: 25.2532,
    lng: 55.3657,
  },
  {
    id: "jumeirah",
    name: "Jumeirah",
    address: "Jumeirah, Dubai, UAE",
    lat: 25.2048,
    lng: 55.2495,
  },
  {
    id: "sharjah",
    name: "Sharjah",
    address: "Sharjah, UAE",
    lat: 25.3463,
    lng: 55.4209,
  },
  {
    id: "academic-city",
    name: "Academic City",
    address: "Dubai International Academic City, Dubai, UAE",
    lat: 25.1270,
    lng: 55.4206,
  },
];

function normalizeLocation(location, index) {
  if (!location) {
    return null;
  }

  const name =
    location.name ||
    location.location_name ||
    location.display_name ||
    location.title ||
    `Location ${index + 1}`;

  const address =
    location.address ||
    location.full_address ||
    location.description ||
    location.display_name ||
    name;

  const lat = Number(location.lat ?? location.latitude);
  const lng = Number(location.lng ?? location.longitude ?? location.lon);

  return {
    id: location.id || location.location_id || `${name}-${index}`,
    name,
    address,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    raw: location,
  };
}

function normalizeSearchResponse(response) {
  if (!response) {
    return [];
  }

  if (Array.isArray(response)) {
    return response
      .map((location, index) => normalizeLocation(location, index))
      .filter(Boolean);
  }

  if (Array.isArray(response.locations)) {
    return response.locations
      .map((location, index) => normalizeLocation(location, index))
      .filter(Boolean);
  }

  if (Array.isArray(response.results)) {
    return response.results
      .map((location, index) => normalizeLocation(location, index))
      .filter(Boolean);
  }

  if (Array.isArray(response.data)) {
    return response.data
      .map((location, index) => normalizeLocation(location, index))
      .filter(Boolean);
  }

  return [];
}

function getFallbackSuggestions(query) {
  const value = query.trim().toLowerCase();

  if (!value) {
    return FALLBACK_DUBAI_LOCATIONS;
  }

  return FALLBACK_DUBAI_LOCATIONS.filter((location) => {
    return (
      location.name.toLowerCase().includes(value) ||
      location.address.toLowerCase().includes(value)
    );
  });
}

function LocationSearch({
  startLocation = null,
  destinationLocation = null,
  onStartLocationSelect = null,
  onDestinationLocationSelect = null,
  onFindRoute = null,
}) {
  const [startQuery, setStartQuery] = useState(startLocation?.name || "");
  const [destinationQuery, setDestinationQuery] = useState(
    destinationLocation?.name || ""
  );

  const [activeField, setActiveField] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [searchStatus, setSearchStatus] = useState("idle");
  const [error, setError] = useState("");

  const activeQuery = useMemo(() => {
    if (activeField === "start") {
      return startQuery;
    }

    if (activeField === "destination") {
      return destinationQuery;
    }

    return "";
  }, [activeField, startQuery, destinationQuery]);

  useEffect(() => {
    if (!activeField) {
      setSuggestions([]);
      return;
    }

    const trimmedQuery = activeQuery.trim();

    if (trimmedQuery.length < 2) {
      setSuggestions(getFallbackSuggestions(trimmedQuery));
      return;
    }

    let cancelled = false;

    async function runSearch() {
      try {
        setSearchStatus("loading");
        setError("");

        const response = await searchLocations(trimmedQuery);
        const backendSuggestions = normalizeSearchResponse(response);

        if (cancelled) {
          return;
        }

        if (backendSuggestions.length > 0) {
          setSuggestions(backendSuggestions);
        } else {
          setSuggestions(getFallbackSuggestions(trimmedQuery));
        }

        setSearchStatus("success");
      } catch (searchError) {
        console.error(searchError);

        if (cancelled) {
          return;
        }

        setSuggestions(getFallbackSuggestions(trimmedQuery));
        setSearchStatus("fallback");
        setError("Using local Dubai suggestions until backend search is ready.");
      }
    }

    const timerId = setTimeout(runSearch, 350);

    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
  }, [activeField, activeQuery]);

  function handleSelectLocation(location) {
    if (activeField === "start") {
      setStartQuery(location.name);

      if (onStartLocationSelect) {
        onStartLocationSelect(location);
      }
    }

    if (activeField === "destination") {
      setDestinationQuery(location.name);

      if (onDestinationLocationSelect) {
        onDestinationLocationSelect(location);
      }
    }

    setActiveField(null);
    setSuggestions([]);
  }

  function handleFindRoute(event) {
    event.preventDefault();

    if (!startQuery.trim() || !destinationQuery.trim()) {
      setError("Please choose both a start location and destination.");
      return;
    }

    if (onFindRoute) {
      onFindRoute({
        start_location: startQuery.trim(),
        destination: destinationQuery.trim(),
        vehicle_type: "car",
        route_preference: "balanced",
        user_role: "driver",
      });
    }
  }

  function renderSuggestions(fieldName) {
    if (activeField !== fieldName || suggestions.length === 0) {
      return null;
    }

    return (
      <div className="location-suggestions">
        {suggestions.map((location, index) => (
          <button
            key={`${location.id}-${index}`}
            type="button"
            className="location-suggestion-item"
            onMouseDown={() => handleSelectLocation(location)}
          >
            <strong>{location.name}</strong>
            <span>{location.address}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="location-search-panel">
      <h2>Search Route</h2>

      <form onSubmit={handleFindRoute}>
        <div className="location-input-group">
          <label htmlFor="startLocationInput">Start Location</label>

          <input
            id="startLocationInput"
            type="text"
            value={startQuery}
            onFocus={() => setActiveField("start")}
            onChange={(event) => {
              setStartQuery(event.target.value);
              setActiveField("start");
            }}
            placeholder="Example: Dubai Mall"
            autoComplete="off"
          />

          {renderSuggestions("start")}
        </div>

        <div className="location-input-group">
          <label htmlFor="destinationLocationInput">Destination</label>

          <input
            id="destinationLocationInput"
            type="text"
            value={destinationQuery}
            onFocus={() => setActiveField("destination")}
            onChange={(event) => {
              setDestinationQuery(event.target.value);
              setActiveField("destination");
            }}
            placeholder="Example: Dubai Marina"
            autoComplete="off"
          />

          {renderSuggestions("destination")}
        </div>

        <button type="submit" className="primary-action-button">
          Find Route
        </button>
      </form>

      {searchStatus === "loading" && (
        <p className="search-status-message">Searching locations...</p>
      )}

      {error && <p className="error-message">{error}</p>}
    </div>
  );
}

export default LocationSearch;
