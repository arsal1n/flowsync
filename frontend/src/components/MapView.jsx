import { MapContainer, TileLayer, Polyline, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function MapView() {
  const routeA = [
    [25.0800, 55.1400],
    [25.1200, 55.1900],
    [25.1972, 55.2744],
  ];

  const routeB = [
    [25.0800, 55.1400],
    [25.1500, 55.2200],
    [25.1972, 55.2744],
  ];

  const routeC = [
    [25.0800, 55.1400],
    [25.1700, 55.2500],
    [25.1972, 55.2744],
  ];

  return (
    <section className="panel map-section">
      <div className="section-header">
        <div>
          <h2>Dubai Route Map</h2>
          <p>Visual preview of multiple route options and FlowSync recommendation.</p>
        </div>

        <span className="map-badge">Recommended: Route B</span>
      </div>

      <div className="map-wrapper">
        <MapContainer
          center={[25.135, 55.22]}
          zoom={11}
          scrollWheelZoom={false}
          className="map-container"
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <Polyline positions={routeA} pathOptions={{ color: "red", weight: 4 }} />
          <Polyline positions={routeB} pathOptions={{ color: "lime", weight: 6 }} />
          <Polyline positions={routeC} pathOptions={{ color: "cyan", weight: 4 }} />

          <CircleMarker
            center={[25.0800, 55.1400]}
            radius={8}
            pathOptions={{ color: "white", fillColor: "white", fillOpacity: 1 }}
          >
            <Popup>Start: Dubai Marina</Popup>
          </CircleMarker>

          <CircleMarker
            center={[25.1972, 55.2744]}
            radius={8}
            pathOptions={{ color: "yellow", fillColor: "yellow", fillOpacity: 1 }}
          >
            <Popup>Destination: Downtown Dubai</Popup>
          </CircleMarker>
        </MapContainer>
      </div>

      <div className="map-legend">
        <span><b className="red-dot"></b> Route A - crowded</span>
        <span><b className="green-dot"></b> Route B - recommended</span>
        <span><b className="blue-dot"></b> Route C - less congested</span>
      </div>
    </section>
  );
}

export default MapView;