import "./index.css";

function App() {
  return (
    <div className="app">
      <nav className="navbar">
        <div>
          <h2>FlowSync DXB</h2>
          <p>Smart Mobility for UAE</p>
        </div>

        <div className="nav-links">
          <a href="#dashboard">Dashboard</a>
          <a href="#trip">New Trip</a>
          <a href="#routes">Routes</a>
          <a href="#analytics">Analytics</a>
        </div>
      </nav>

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

      <section id="routes" className="routes">
        <div className="route-card danger">
          <h3>Route A</h3>
          <p>Fastest but crowded</p>
          <h2>22 min</h2>
          <span>Congestion: High</span>
        </div>

        <div className="route-card recommended">
          <h3>Route B</h3>
          <p>Recommended by FlowSync</p>
          <h2>26 min</h2>
          <span>Congestion: Balanced</span>
        </div>

        <div className="route-card safe">
          <h3>Route C</h3>
          <p>Longer but less congested</p>
          <h2>30 min</h2>
          <span>Congestion: Low</span>
        </div>
      </section>

      <section id="analytics" className="panel">
        <h2>Analytics Dashboard</h2>

        <div className="analytics-row">
          <div>
            <p>Route A Users</p>
            <h3>45</h3>
          </div>
          <div>
            <p>Route B Users</p>
            <h3>52</h3>
          </div>
          <div>
            <p>Route C Users</p>
            <h3>27</h3>
          </div>
        </div>
      </section>
    </div>
  );
}

export default App;