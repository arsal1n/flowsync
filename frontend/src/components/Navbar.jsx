function Navbar() {
  return (
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
  );
}

export default Navbar;