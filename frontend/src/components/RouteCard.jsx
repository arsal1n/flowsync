function RouteCard({ type, title, description, time, congestion }) {
  return (
    <div className={`route-card ${type}`}>
      <h3>{title}</h3>
      <p>{description}</p>
      <h2>{time}</h2>
      <span>Congestion: {congestion}</span>
    </div>
  );
}

export default RouteCard;