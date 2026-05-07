// frontend/src/components/MapView.jsx

import L from "leaflet";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const startIcon = L.divIcon({
  className: "custom-start-marker",
  html: `
    <div style="
      background-color: #22c55e;
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      font-weight: bold;
    ">
      <span style="transform: rotate(45deg);">S</span>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const destIcon = L.divIcon({
  className: "custom-dest-marker",
  html: `
    <div style="
      background-color: #ef4444;
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      font-weight: bold;
    ">
      <span style="transform: rotate(45deg);">D</span>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

function MapView({ startPoint, destPoint, routeLine }) {
  const defaultCenter = [25.2048, 55.2708]; // Dubai

  const mapCenter = startPoint || defaultCenter;

  return (
    <div className="map-container">
      <MapContainer
        center={mapCenter}
        zoom={12}
        style={{ height: "400px", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {startPoint && <Marker position={startPoint} icon={startIcon} />}

        {destPoint && <Marker position={destPoint} icon={destIcon} />}

        {routeLine && routeLine.length > 0 && (
          <Polyline positions={routeLine} />
        )}
      </MapContainer>
    </div>
  );
}

export default MapView;