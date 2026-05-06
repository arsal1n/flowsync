// frontend/src/components/MapView.jsx

import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";

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
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {startPoint && <Marker position={startPoint} />}

        {destPoint && <Marker position={destPoint} />}

        {routeLine && routeLine.length > 0 && (
          <Polyline positions={routeLine} />
        )}
      </MapContainer>
    </div>
  );
}

export default MapView;