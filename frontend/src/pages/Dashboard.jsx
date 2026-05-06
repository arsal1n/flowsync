function Dashboard() {
  return (
    <>
      <section className="hero">
        <div>
          <p className="tag">Adaptive Route Distribution</p>
          <h1>Balance Dubai traffic with smarter route assignment.</h1>
          <p className="hero-text">
            FlowSync does not send every driver to the same fastest route.
            It distributes vehicles across multiple optimal routes to reduce
            congestion, time loss, fuel waste, and emissions.
          </p>
          <button className="primary-btn">Find FlowSync Route</button>
        </div>

        <div className="hero-card">
          <h3>Live Traffic Balance</h3>
          <div className="score">85%</div>
          <p>Congestion optimization probability</p>
        </div>
      </section>

      <section id="dashboard" className="grid">
        <div className="card">
          <h3>Total Trips</h3>
          <h2>124</h2>
          <p>Trip requests processed today</p>
        </div>

        <div className="card">
          <h3>Congestion Reduced</h3>
          <h2>18%</h2>
          <p>Estimated city flow improvement</p>
        </div>

        <div className="card">
          <h3>Avg Time Saved</h3>
          <h2>7 min</h2>
          <p>Per driver on assigned route</p>
        </div>

        <div className="card">
          <h3>Fuel Saved</h3>
          <h2>12.5 L</h2>
          <p>Estimated daily reduction</p>
        </div>
      </section>
    </>
  );
}

export default Dashboard;