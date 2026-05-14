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
  const [error, setError] = useState("");

  const [health, setHealth] = useState(null);
  const [locations, setLocations] = useState([]);
  const [routeResult, setRouteResult] = useState(null);

  const [query, setQuery] = useState("dubai");
  const [startLocation, setStartLocation] = useState("Dubai Mall");
  const [destination, setDestination] = useState("Dubai Marina");

  async function request(path, options = {}) {
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
      throw new Error(
        typeof data.detail === "string"
          ? data.detail
          : data.message || `Request failed with ${response.status}`
      );
    }

    return data;
  }

  async function testBackend() {
    setLoading(true);
    setError("");

    try {
      const data = await request("/api/health");
      setHealth(data);
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
      const data = await request(
        `/api/locations/search?q=${encodeURIComponent(query)}`
      );

      const results =
        data.locations ||
        data.results ||
        data.data ||
        (Array.isArray(data) ? data : []);

      setLocations(results);
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  }

  async function getRoute() {
    setLoading(true);
    setError("");

    try {
      const data = await request("/api/routes/recommend", {
        method: "POST",
        body: JSON.stringify({
          start_location: startLocation,
          destination: destination,
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

  const steps =
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
          <Text style={styles.api}>{API_BASE_URL}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Backend Connection</Text>

          <TouchableOpacity style={styles.button} onPress={testBackend}>
            <Text style={styles.buttonText}>Test Backend</Text>
          </TouchableOpacity>

          {health && (
            <View style={styles.successBox}>
              <Text style={styles.successTitle}>Backend is reachable</Text>
              <Text style={styles.muted}>
                {health.message || health.service || "FlowSync API online"}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Location Search</Text>

          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Search location"
            placeholderTextColor="#8aa0b8"
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
              <Text style={styles.muted}>
                {item.address || item.category || "Dubai"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Smart Route</Text>

          <Text style={styles.label}>Start Location</Text>
          <TextInput
            style={styles.input}
            value={startLocation}
            onChangeText={setStartLocation}
            placeholder="Start"
            placeholderTextColor="#8aa0b8"
          />

          <Text style={styles.label}>Destination</Text>
          <TextInput
            style={styles.input}
            value={destination}
            onChangeText={setDestination}
            placeholder="Destination"
            placeholderTextColor="#8aa0b8"
          />

          <TouchableOpacity style={styles.button} onPress={getRoute}>
            <Text style={styles.buttonText}>Get Smart Route</Text>
          </TouchableOpacity>

          {recommendedRoute && (
            <View style={styles.routeCard}>
              <Text style={styles.routeTitle}>
                {recommendedRoute.route_name ||
                  recommendedRoute.name ||
                  "Recommended Route"}
              </Text>

              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>
                    {recommendedRoute.estimated_time || "--"}
                  </Text>
                  <Text style={styles.statLabel}>minutes</Text>
                </View>

                <View style={styles.stat}>
                  <Text style={styles.statValue}>
                    {recommendedRoute.distance_km || "--"}
                  </Text>
                  <Text style={styles.statLabel}>km</Text>
                </View>

                <View style={styles.stat}>
                  <Text style={styles.statValue}>
                    {recommendedRoute.congestion_score ?? "--"}
                  </Text>
                  <Text style={styles.statLabel}>traffic</Text>
                </View>
              </View>

              <Text style={styles.muted}>
                Provider: {routeResult?.routing_provider || "mock"}
              </Text>
              <Text style={styles.muted}>
                Status: {routeResult?.provider_status || "mock_fallback"}
              </Text>
            </View>
          )}

          {allRoutes.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Route Options</Text>

              {allRoutes.slice(0, 4).map((route, index) => (
                <View key={`${route.route_name || index}`} style={styles.option}>
                  <Text style={styles.listTitle}>
                    {route.route_name || route.name || `Route ${index + 1}`}
                  </Text>
                  <Text style={styles.muted}>
                    {route.estimated_time || "--"} min •{" "}
                    {route.distance_km || "--"} km
                  </Text>
                </View>
              ))}
            </View>
          )}

          {steps.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Turn-by-Turn Preview</Text>

              {steps.slice(0, 5).map((step, index) => (
                <View key={`${index}`} style={styles.step}>
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
          <View style={styles.loading}>
            <ActivityIndicator size="large" />
            <Text style={styles.muted}>Loading...</Text>
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
    fontWeight: "900",
  },
  subtitle: {
    color: "#9fb4c8",
    marginTop: 4,
    fontSize: 15,
  },
  api: {
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
  title: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 14,
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
    fontWeight: "900",
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
  successTitle: {
    color: "#86efac",
    fontWeight: "800",
  },
  muted: {
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
    fontWeight: "800",
  },
  routeCard: {
    backgroundColor: "#082f49",
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
  },
  routeTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  stat: {
    flex: 1,
    backgroundColor: "#07111f",
    borderRadius: 14,
    padding: 10,
    alignItems: "center",
  },
  statValue: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 18,
  },
  statLabel: {
    color: "#9fb4c8",
    fontSize: 11,
    marginTop: 2,
  },
  section: {
    backgroundColor: "#0b1626",
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
  },
  option: {
    borderBottomWidth: 1,
    borderBottomColor: "#1f334f",
    paddingVertical: 8,
  },
  step: {
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
    fontWeight: "900",
    marginRight: 10,
    paddingTop: 2,
  },
  stepText: {
    color: "#dbeafe",
    flex: 1,
  },
  loading: {
    alignItems: "center",
    marginVertical: 12,
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
  footer: {
    color: "#64748b",
    textAlign: "center",
    marginTop: 8,
    fontSize: 12,
  },
});
