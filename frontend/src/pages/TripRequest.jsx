function TripRequest() {
  return (
    <section id="trip" className="panel">
      <h2>New Trip Request</h2>

      <div className="form-grid">
        <input placeholder="Start Location e.g. Dubai Marina" />
        <input placeholder="Destination e.g. Downtown Dubai" />

        <select>
          <option>Car</option>
          <option>Taxi</option>
          <option>Bus</option>
        </select>

        <button className="primary-btn">Find FlowSync Route</button>
      </div>
    </section>
  );
}

export default TripRequest;