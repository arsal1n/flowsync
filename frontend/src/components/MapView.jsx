import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function MapView() {
  const startPoint = [25.2048, 55.2708];
  const destinationPoint = [25.1972, 55.2744];

  const routeLine = [
    startPoint,
    [25.2015, 55.272],
    destinationPoint,
  ];

  return (
    <div style={{ height: "500px", width: "100%", borderRadius: "16px", overflow: "hidden" }}>
      <MapContainer
        center={startPoint}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={startPoint}>
          <Popup>Start Location</Popup>
        </Marker>

        <Marker position={destinationPoint}>
          <Popup>Destination</Popup>
        </Marker>

        <Polyline positions={routeLine} />
      </MapContainer>
    </div>
  );
}

export default MapView;