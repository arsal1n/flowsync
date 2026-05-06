import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { sampleRoute } from "../data/sampleRoute";

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
  return (
    <div style={{ height: "500px", width: "100%", borderRadius: "16px", overflow: "hidden" }}>
      <MapContainer
        center={sampleRoute.startPoint}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={sampleRoute.startPoint}>
          <Popup>Start Location</Popup>
        </Marker>

        <Marker position={sampleRoute.destinationPoint}>
          <Popup>Destination</Popup>
        </Marker>

        <Polyline positions={sampleRoute.routeLine} />
      </MapContainer>
    </div>
  );
}

export default MapView;