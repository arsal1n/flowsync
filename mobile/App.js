import React, { useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "https://flowsync-ox5z.onrender.com";

export default function App() {
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState(null);
  const [bootstrap, setBootstrap] = useState(null);
  const [locations, setLocations] = useState([]);
  const [routeResult, setRouteResult] = useState(null);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("dubai");
  const [startLocation, setStartLocation] = useState("Dubai Mall");
  const [destination, setDestination] = useState("Dubai Marina");

  async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });

    const text = await response.text();

    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      throw new Error(data.detail || data.message || `HTTP ${response.status}`);
    }

    return data;
  }

  async function testBackend() {
    setLoading(true);
    setError("");

    try {
      const healthData = await apiRequest("/api/health");
      const bootstrapData = await apiRequest("/api/client/bootstrap");

      setHealth(healthData);
      setBootstrap(bootstrapData);
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  }

  async function searchLocations() {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest(`/api/locations/search?q=${encodeURIComponent(query)}`);

      const items =
        data.locations ||
        data.results ||
        data.data ||
        (Array.isArray(data) ? data : []);

      setLocations(items);
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  }

  async function recommendRoute() {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/api/routes/recommend", {
        method: "POST",
        body: JSON.stringify({
          start_location: startLocation,
          destination,
          vehicle_type: "car",
          route_preference: "balanced",
          user_role: "driver",
        }),
      });

      setRouteResult(data);
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  }

  const recommendedRoute =
    routeResult?.recommended_route ||
    routeResult?.recommendedRoute ||
    routeResult?.data?.recommended_route ||
    null;

  const allRoutes =
    routeResult?.all_routes ||
    routeResult?.routes ||
    routeResult?.data?.all_routes ||
    [];

  const turnSteps =
    recommendedRoute?.turn_by_turn_steps ||
    recommendedRoute?.steps ||
    [];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.logo}>FlowSync</Text>
          <Text style={styles.subtitle}>Smart Mobility Mobile Demo</Text>
          <Text style={styles.apiText}>{API_BASE_URL}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Backend Connection</Text>

          <TouchableOpacity style={styles.button} onPress={testBackend}>
            <Text style={styles.buttonText}>Test Backend</Text>
          </TouchableOpacity>

          {health && (
            <View style={styles.successBox}>
              <Text style={styles.successText}>Backend is reachable</Text>
              <Text style={styles.smallText}>
                Service: {health.service || health.message || "FlowSync API"}
              </Text>
            </View>
          )}

          {bootstrap && (
            <View style={styles.infoBox}>
              <Text style={styles.smallText}>
                Version: {bootstrap?.backend?.version || "available"}
              </Text>
              <Text style={styles.smallText}>
                Environment: {bootstrap?.backend?.environment || "unknown"}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Location Search</Text>

          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Search location"
            placeholderTextColor="#8ca3b8"
          />

          <TouchableOpacity style={styles.button} onPress={searchLocations}>
            <Text style={styles.buttonText}>Search Locations</Text>
          </TouchableOpacity>

          {locations.slice(0, 6).map((item, index) => (
            <TouchableOpacity
              key={`${item.location_id || item.id || index}`}
              style={styles.listItem}
              onPress={() => setDestination(item.name || destination)}
            >
              <Text style={styles.listTitle}>{item.name || "Location"}</Text>
              <Text style={styles.smallText}>
                {item.address || item.category || "Dubai"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Route Recommendation</Text>

          <Text style={styles.label}>Start</Text>
          <TextInput
            style={styles.input}
            value={startLocation}
            onChangeText={setStartLocation}
            placeholder="Start location"
            placeholderTextColor="#8ca3b8"
          />

          <Text style={styles.label}>Destination</Text>
          <TextInput
            style={styles.input}
            value={destination}
            onChangeText={setDestination}
            placeholder="Destination"
            placeholderTextColor="#8ca3b8"
          />

          <TouchableOpacity style={styles.button} onPress={recommendRoute}>
            <Text style={styles.buttonText}>Get Smart Route</Text>
          </TouchableOpacity>

          {recommendedRoute && (
            <View style={styles.routeBox}>
              <Text style={styles.routeTitle}>
                {recommendedRoute.route_name || recommendedRoute.name || "Recommended Route"}
              </Text>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>
                    {recommendedRoute.estimated_time || recommendedRoute.duration || "--"}
                  </Text>
                  <Text style={styles.statLabel}>minutes</Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={styles.statValue}>
                    {recommendedRoute.distance_km || "--"}
                  </Text>
                  <Text style={styles.statLabel}>km</Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={styles.statValue}>
                    {recommendedRoute.congestion_score ?? "--"}
                  </Text>
                  <Text style={styles.statLabel}>traffic</Text>
                </View>
              </View>

              <Text style={styles.smallText}>
                Provider: {routeResult?.routing_provider || "mock"}
              </Text>
              <Text style={styles.smallText}>
                Status: {routeResult?.provider_status || "mock_fallback"}
              </Text>
            </View>
          )}

          {allRoutes.length > 0 && (
            <View style={styles.infoBox}>
              <Text style={styles.sectionTitle}>Route Options</Text>
              {allRoutes.slice(0, 4).map((route, index) => (
                <View key={`${route.route_name || index}`} style={styles.routeOption}>
                  <Text style={styles.listTitle}>
                    {route.route_name || route.name || `Route ${index + 1}`}
                  </Text>
                  <Text style={styles.smallText}>
                    {route.estimated_time || "--"} min • {route.distance_km || "--"} km
                  </Text>
                </View>
              ))}
            </View>
          )}

          {turnSteps.length > 0 && (
            <View style={styles.infoBox}>
              <Text style={styles.sectionTitle}>Turn-by-Turn Steps</Text>
              {turnSteps.slice(0, 5).map((step, index) => (
                <View key={`${index}`} style={styles.stepItem}>
                  <Text style={styles.stepNumber}>{index + 1}</Text>
                  <Text style={styles.stepText}>
                    {step.instruction || step.text || JSON.stringify(step)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" />
            <Text style={styles.smallText}>Loading...</Text>
          </View>
        )}

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Text style={styles.footer}>
          Render free backend may sleep. First request can take around 50 seconds.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#07111f",
  },
  container: {
    padding: 18,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  logo: {
    color: "#ffffff",
    fontSize: 34,
    fontWeight: "800",
  },
  subtitle: {
    color: "#9fb4c8",
    marginTop: 4,
    fontSize: 15,
  },
  apiText: {
    color: "#5eead4",
    marginTop: 8,
    fontSize: 12,
  },
  card: {
    backgroundColor: "#101c2e",
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#1f334f",
  },
  cardTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 14,
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },
  label: {
    color: "#9fb4c8",
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: "#07111f",
    borderColor: "#1f334f",
    borderWidth: 1,
    borderRadius: 14,
    color: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#22c55e",
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 10,
  },
  buttonText: {
    color: "#03120a",
    fontWeight: "800",
    fontSize: 15,
  },
  successBox: {
    backgroundColor: "#052e1a",
    borderColor: "#16a34a",
    borderWidth: 1,
    padding: 12,
    borderRadius: 14,
    marginTop: 8,
  },
  successText: {
    color: "#86efac",
    fontWeight: "700",
  },
  infoBox: {
    backgroundColor: "#0b1626",
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
  },
  errorBox: {
    backgroundColor: "#3f1212",
    borderColor: "#ef4444",
    borderWidth: 1,
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  errorText: {
    color: "#fecaca",
  },
  loadingBox: {
    alignItems: "center",
    marginVertical: 12,
  },
  smallText: {
    color: "#9fb4c8",
    fontSize: 13,
    marginTop: 3,
  },
  listItem: {
    backgroundColor: "#0b1626",
    borderRadius: 14,
    padding: 12,
    marginTop: 8,
  },
  listTitle: {
    color: "#ffffff",
    fontWeight: "700",
  },
  routeBox: {
    backgroundColor: "#082f49",
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
  },
  routeTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#07111f",
    borderRadius: 14,
    padding: 10,
    alignItems: "center",
  },
  statValue: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 18,
  },
  statLabel: {
    color: "#9fb4c8",
    fontSize: 11,
    marginTop: 2,
  },
  routeOption: {
    borderBottomWidth: 1,
    borderBottomColor: "#1f334f",
    paddingVertical: 8,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  stepNumber: {
    backgroundColor: "#22c55e",
    color: "#03120a",
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: "center",
    fontWeight: "800",
    marginRight: 10,
    paddingTop: 2,
  },
  stepText: {
    color: "#dbeafe",
    flex: 1,
  },
  footer: {
    color: "#64748b",
    textAlign: "center",
    marginTop: 8,
    fontSize: 12,
  },
});
