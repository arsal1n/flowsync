import React, { useMemo, useState } from "react";
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

const DEMO_EMAIL = "driver@flowsync.local";
const DEMO_PASSWORD = "flowsync123";

function getNestedValue(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return null;
}


function findTokenDeep(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const tokenKeys = [
    "access_token",
    "accessToken",
    "token",
    "jwt",
    "auth_token",
    "authToken",
    "session_token",
    "sessionToken",
    "bearer_token",
    "bearerToken",
  ];

  for (const key of tokenKeys) {
    if (typeof value[key] === "string" && value[key].length > 5) {
      return value[key];
    }
  }

  for (const key of Object.keys(value)) {
    const nested = value[key];

    if (nested && typeof nested === "object") {
      const found = findTokenDeep(nested);

      if (found) {
        return found;
      }
    }
  }

  return null;
}

function normalizeArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value?.data)) {
    return value.data;
  }

  if (Array.isArray(value?.results)) {
    return value.results;
  }

  if (Array.isArray(value?.locations)) {
    return value.locations;
  }

  if (Array.isArray(value?.items)) {
    return value.items;
  }

  return [];
}

export default function App() {
  const [screen, setScreen] = useState("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [health, setHealth] = useState(null);
  const [bootstrap, setBootstrap] = useState(null);

  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);

  const [query, setQuery] = useState("dubai");
  const [locations, setLocations] = useState([]);

  const [startLocation, setStartLocation] = useState("Dubai Mall");
  const [destination, setDestination] = useState("Dubai Marina");
  const [routeResult, setRouteResult] = useState(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);

  const [sessionId, setSessionId] = useState("");
  const [requestId, setRequestId] = useState("");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [liveNavigation, setLiveNavigation] = useState(null);
  const [tripSummary, setTripSummary] = useState(null);

  const recommendedRoute = useMemo(() => {
    return (
      routeResult?.recommended_route ||
      routeResult?.recommendedRoute ||
      routeResult?.data?.recommended_route ||
      null
    );
  }, [routeResult]);

  const allRoutes = useMemo(() => {
    const routes =
      routeResult?.all_routes ||
      routeResult?.routes ||
      routeResult?.data?.all_routes ||
      [];

    if (Array.isArray(routes) && routes.length > 0) {
      return routes;
    }

    return recommendedRoute ? [recommendedRoute] : [];
  }, [routeResult, recommendedRoute]);

  const selectedRoute = allRoutes[selectedRouteIndex] || recommendedRoute;

  const turnSteps = useMemo(() => {
    return (
      selectedRoute?.turn_by_turn_steps ||
      selectedRoute?.steps ||
      selectedRoute?.route_steps ||
      []
    );
  }, [selectedRoute]);

  async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token && token !== "DEMO_LOCAL_TOKEN" ? { Authorization: `Bearer ${token}` } : {}),
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
      const message =
        typeof data.detail === "string"
          ? data.detail
          : data?.detail?.error?.message ||
            data?.message ||
            data?.error ||
            `Request failed with HTTP ${response.status}`;

      throw new Error(message);
    }

    return data;
  }

  async function runAction(action) {
    setLoading(true);
    setError("");

    try {
      await action();
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  }

  async function testBackend() {
    await runAction(async () => {
      const healthData = await apiRequest("/api/health");
      setHealth(healthData);

      const bootstrapData = await apiRequest("/api/client/bootstrap");
      setBootstrap(bootstrapData);
    });
  }

  async function login() {
    await runAction(async () => {
      const data = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const userData = data.user || data.data?.user || data.account || {
        email,
        role: "driver",
        name: "FlowSync Driver",
      };

      const nextToken =
        getNestedValue(
          data.access_token,
          data.accessToken,
          data.token,
          data.jwt,
          data.auth_token,
          data.authToken,
          data.session_token,
          data.sessionToken,
          data.data?.access_token,
          data.data?.accessToken,
          data.data?.token,
          data.data?.jwt,
          data.data?.auth_token,
          data.data?.authToken,
          data.data?.session_token,
          data.data?.sessionToken,
          data.session?.access_token,
          data.session?.accessToken,
          data.session?.token,
          data.auth?.access_token,
          data.auth?.accessToken,
          data.auth?.token
        ) || findTokenDeep(data);

      setUser(userData);

      if (nextToken) {
        setToken(nextToken);
        setScreen("dashboard");
        return;
      }

      setToken("DEMO_LOCAL_TOKEN");
      setScreen("dashboard");
      setError(
        "Login worked, but backend did not return a token. Continuing in demo mobile mode."
      );
    });
  }

  async function loadMe() {
    await runAction(async () => {
      const data = await apiRequest("/api/auth/me");
      setUser(data.user || data.data || data);
    });
  }

  async function searchLocations() {
    await runAction(async () => {
      const data = await apiRequest(
        `/api/locations/search?q=${encodeURIComponent(query)}`
      );

      setLocations(normalizeArray(data));
      setScreen("route");
    });
  }

  async function recommendRoute() {
    await runAction(async () => {
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
      setSelectedRouteIndex(0);

      const nextRequestId = getNestedValue(
        data.database_record?.request_id,
        data.request_id,
        data.data?.database_record?.request_id,
        data.data?.request_id
      );

      if (nextRequestId) {
        setRequestId(String(nextRequestId));
      }

      setScreen("route");
    });
  }

  async function startTrip() {
    await runAction(async () => {
      if (!selectedRoute) {
        throw new Error("Get a route before starting navigation.");
      }

      const routeName =
        selectedRoute.route_name || selectedRoute.name || "Recommended Route";

      const bodyOptions = [
        {
          request_id: requestId || routeResult?.database_record?.request_id || null,
          start_location: startLocation,
          destination,
          route_name: routeName,
          selected_route: selectedRoute,
          route: selectedRoute,
          current_step_index: 0,
        },
        {
          start_location: startLocation,
          destination,
          selected_route: routeName,
          route_name: routeName,
          route_steps: turnSteps,
          current_step_index: 0,
        },
        {
          start_location: startLocation,
          destination,
          route: selectedRoute,
          request_id: requestId || null,
        },
      ];

      let data = null;

      for (const body of bodyOptions) {
        try {
          data = await apiRequest("/api/trips/start", {
            method: "POST",
            body: JSON.stringify(body),
          });
          break;
        } catch {
          data = null;
        }
      }

      if (!data) {
        const localSessionId = `LOCAL-${Date.now()}`;
        const localRequestId = requestId || `LOCAL-REQ-${Date.now()}`;

        setSessionId(localSessionId);
        setRequestId(localRequestId);
        setCurrentStepIndex(0);
        setLiveNavigation({
          session_id: localSessionId,
          request_id: localRequestId,
          status: "local_demo",
          message:
            "Backend /api/trips/start returned HTTP 500, so mobile continued with local demo navigation.",
        });
        setScreen("navigation");
        setError(
          "Backend start trip failed with HTTP 500. Continuing in local demo navigation mode."
        );
        return;
      }

      const nextSessionId = getNestedValue(
        data.session_id,
        data.navigation_session?.session_id,
        data.session?.session_id,
        data.data?.session_id,
        data.data?.session?.session_id,
        data.data?.navigation_session?.session_id
      );

      const nextRequestId = getNestedValue(
        data.request_id,
        data.database_record?.request_id,
        data.data?.request_id,
        data.data?.database_record?.request_id,
        requestId
      );

      setSessionId(String(nextSessionId || `LOCAL-${Date.now()}`));
      setRequestId(String(nextRequestId || requestId || `LOCAL-REQ-${Date.now()}`));
      setCurrentStepIndex(0);
      setLiveNavigation(data);
      setScreen("navigation");
    });
  }

  async function refreshNavigation() {
    await runAction(async () => {
      if (!sessionId) {
        throw new Error("No active session yet.");
      }

      if (sessionId.startsWith("LOCAL-")) {
        setLiveNavigation({
          session_id: sessionId,
          request_id: requestId,
          status: "local_demo",
          current_step_index: currentStepIndex,
          message: "Local demo navigation is active.",
        });
        return;
      }

      const data = await apiRequest(`/api/live/navigation/${sessionId}`);
      setLiveNavigation(data);
    });
  }

  async function nextStep() {
    await runAction(async () => {
      if (!sessionId) {
        throw new Error("Start navigation first.");
      }

      const nextIndex = Math.min(
        currentStepIndex + 1,
        Math.max(turnSteps.length - 1, 0)
      );

      if (sessionId.startsWith("LOCAL-")) {
        setCurrentStepIndex(nextIndex);
        setLiveNavigation({
          session_id: sessionId,
          request_id: requestId,
          status: "local_demo",
          current_step_index: nextIndex,
          message: "Moved to next local demo navigation step.",
        });
        return;
      }

      const data = await apiRequest("/api/trips/progress", {
        method: "POST",
        body: JSON.stringify({
          session_id: sessionId,
          current_step_index: nextIndex,
        }),
      });

      setCurrentStepIndex(nextIndex);
      setLiveNavigation(data);
    });
  }

  async function endTrip() {
    await runAction(async () => {
      if (!sessionId) {
        throw new Error("No active session to end.");
      }

      if (sessionId.startsWith("LOCAL-")) {
        setTripSummary({
          status: "completed",
          message: "Local demo trip completed successfully.",
          session_id: sessionId,
          request_id: requestId,
          route_name:
            selectedRoute?.route_name || selectedRoute?.name || "Recommended Route",
        });
        setScreen("summary");
        return;
      }

      await apiRequest("/api/trips/end", {
        method: "POST",
        body: JSON.stringify({
          session_id: sessionId,
          status: "completed",
        }),
      });

      if (requestId) {
        try {
          const summary = await apiRequest(`/api/trips/${requestId}/summary`);
          setTripSummary(summary);
        } catch {
          setTripSummary({
            status: "completed",
            message: "Trip ended successfully.",
          });
        }
      } else {
        setTripSummary({
          status: "completed",
          message: "Trip ended successfully.",
        });
      }

      setScreen("summary");
    });
  }

  function logout() {
    setToken("");
    setUser(null);
    setSessionId("");
    setRequestId("");
    setLiveNavigation(null);
    setTripSummary(null);
    setScreen("login");
  }

  function renderTopNav() {
    if (!token) {
      return null;
    }

    return (
      <View style={styles.navRow}>
        <NavButton label="Home" active={screen === "dashboard"} onPress={() => setScreen("dashboard")} />
        <NavButton label="Route" active={screen === "route"} onPress={() => setScreen("route")} />
        <NavButton label="Nav" active={screen === "navigation"} onPress={() => setScreen("navigation")} />
        <NavButton label="Summary" active={screen === "summary"} onPress={() => setScreen("summary")} />
      </View>
    );
  }

  function renderLoginScreen() {
    return (
      <>
        <View style={styles.card}>
          <Text style={styles.title}>Backend Connection</Text>

          <TouchableOpacity style={styles.secondaryButton} onPress={testBackend}>
            <Text style={styles.secondaryButtonText}>Test Backend</Text>
          </TouchableOpacity>

          {health && (
            <View style={styles.successBox}>
              <Text style={styles.successTitle}>Backend is reachable</Text>
              <Text style={styles.muted}>
                {health.message || health.service || "FlowSync API online"}
              </Text>
            </View>
          )}

          {bootstrap && (
            <View style={styles.infoBox}>
              <Text style={styles.muted}>
                Version: {bootstrap?.backend?.version || "available"}
              </Text>
              <Text style={styles.muted}>
                Environment: {bootstrap?.backend?.environment || "production"}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Driver Login</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="driver@flowsync.local"
            placeholderTextColor="#8aa0b8"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="flowsync123"
            placeholderTextColor="#8aa0b8"
          />

          <TouchableOpacity style={styles.button} onPress={login}>
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>

          <Text style={styles.muted}>
            Demo account: driver@flowsync.local / flowsync123
          </Text>
        </View>
      </>
    );
  }

  function renderDashboardScreen() {
    return (
      <>
        <View style={styles.card}>
          <Text style={styles.title}>Dashboard</Text>

          <Text style={styles.heroTitle}>Welcome to FlowSync</Text>
          <Text style={styles.muted}>
            Smart mobility dashboard connected to deployed backend.
          </Text>

          <View style={styles.profileBox}>
            <Text style={styles.listTitle}>{user?.name || "FlowSync Driver"}</Text>
            <Text style={styles.muted}>{user?.email || email}</Text>
            <Text style={styles.muted}>Role: {user?.role || "driver"}</Text>
          </View>

          <TouchableOpacity style={styles.secondaryButton} onPress={loadMe}>
            <Text style={styles.secondaryButtonText}>Refresh Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={() => setScreen("route")}>
            <Text style={styles.buttonText}>Plan Route</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dangerButton} onPress={logout}>
            <Text style={styles.dangerButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Backend Status</Text>
          <Text style={styles.muted}>{API_BASE_URL}</Text>
          <Text style={styles.muted}>
            Render free backend may sleep. First request can take around 50 seconds.
          </Text>
        </View>
      </>
    );
  }

  function renderRouteScreen() {
    return (
      <>
        <View style={styles.card}>
          <Text style={styles.title}>Location Search</Text>

          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Search Dubai places"
            placeholderTextColor="#8aa0b8"
          />

          <TouchableOpacity style={styles.secondaryButton} onPress={searchLocations}>
            <Text style={styles.secondaryButtonText}>Search Locations</Text>
          </TouchableOpacity>

          {locations.slice(0, 6).map((item, index) => (
            <TouchableOpacity
              key={`${item.location_id || item.id || index}`}
              style={styles.listItem}
              onPress={() => {
                setDestination(item.name || destination);
              }}
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

          <TouchableOpacity style={styles.button} onPress={recommendRoute}>
            <Text style={styles.buttonText}>Get Smart Route</Text>
          </TouchableOpacity>

          {allRoutes.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Route Options</Text>

              {allRoutes.slice(0, 4).map((route, index) => (
                <TouchableOpacity
                  key={`${route.route_name || index}`}
                  style={[
                    styles.option,
                    selectedRouteIndex === index ? styles.selectedOption : null,
                  ]}
                  onPress={() => setSelectedRouteIndex(index)}
                >
                  <Text style={styles.listTitle}>
                    {route.route_name || route.name || `Route ${index + 1}`}
                  </Text>
                  <Text style={styles.muted}>
                    {route.estimated_time || "--"} min •{" "}
                    {route.distance_km || "--"} km • traffic{" "}
                    {route.congestion_score ?? "--"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {selectedRoute && (
            <View style={styles.routeCard}>
              <Text style={styles.routeTitle}>
                {selectedRoute.route_name || selectedRoute.name || "Recommended Route"}
              </Text>

              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>
                    {selectedRoute.estimated_time || "--"}
                  </Text>
                  <Text style={styles.statLabel}>minutes</Text>
                </View>

                <View style={styles.stat}>
                  <Text style={styles.statValue}>
                    {selectedRoute.distance_km || "--"}
                  </Text>
                  <Text style={styles.statLabel}>km</Text>
                </View>

                <View style={styles.stat}>
                  <Text style={styles.statValue}>
                    {selectedRoute.congestion_score ?? "--"}
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

              <TouchableOpacity style={styles.button} onPress={startTrip}>
                <Text style={styles.buttonText}>Start Navigation</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </>
    );
  }

  function renderNavigationScreen() {
    const currentStep = turnSteps[currentStepIndex];

    return (
      <>
        <View style={styles.card}>
          <Text style={styles.title}>Navigation</Text>

          {!sessionId ? (
            <>
              <Text style={styles.muted}>
                No active trip yet. Go to Route and start navigation.
              </Text>

              <TouchableOpacity style={styles.button} onPress={() => setScreen("route")}>
                <Text style={styles.buttonText}>Go to Route</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.successBox}>
                <Text style={styles.successTitle}>Trip Active</Text>
                <Text style={styles.muted}>Session: {sessionId}</Text>
                <Text style={styles.muted}>Request: {requestId || "available"}</Text>
              </View>

              <View style={styles.currentStepBox}>
                <Text style={styles.sectionTitle}>Current Instruction</Text>
                <Text style={styles.stepTextLarge}>
                  {currentStep?.instruction ||
                    currentStep?.text ||
                    "Continue on the recommended route."}
                </Text>
                <Text style={styles.muted}>
                  Step {currentStepIndex + 1} of {Math.max(turnSteps.length, 1)}
                </Text>
              </View>

              <TouchableOpacity style={styles.secondaryButton} onPress={refreshNavigation}>
                <Text style={styles.secondaryButtonText}>Refresh Live Navigation</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.button} onPress={nextStep}>
                <Text style={styles.buttonText}>Next Step</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.dangerButton} onPress={endTrip}>
                <Text style={styles.dangerButtonText}>End Trip</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {turnSteps.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.title}>Turn-by-Turn Steps</Text>

            {turnSteps.slice(0, 8).map((step, index) => (
              <View
                key={`${index}`}
                style={[
                  styles.step,
                  index === currentStepIndex ? styles.activeStep : null,
                ]}
              >
                <Text style={styles.stepNumber}>{index + 1}</Text>
                <Text style={styles.stepText}>
                  {step.instruction || step.text || JSON.stringify(step)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {liveNavigation && (
          <View style={styles.card}>
            <Text style={styles.title}>Live Update</Text>
            <Text style={styles.muted}>
              Latest navigation data received from backend.
            </Text>
          </View>
        )}
      </>
    );
  }

  function renderSummaryScreen() {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Trip Summary</Text>

        {tripSummary ? (
          <>
            <View style={styles.successBox}>
              <Text style={styles.successTitle}>Trip Completed</Text>
              <Text style={styles.muted}>
                {tripSummary.message || tripSummary.status || "Summary ready"}
              </Text>
            </View>

            <Text style={styles.muted}>
              Request ID: {requestId || "not available"}
            </Text>

            <Text style={styles.muted}>
              Route: {selectedRoute?.route_name || selectedRoute?.name || "Recommended Route"}
            </Text>

            <Text style={styles.muted}>
              Provider: {routeResult?.routing_provider || "mock"}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.muted}>
              No completed trip summary yet. Start and end a trip first.
            </Text>

            <TouchableOpacity style={styles.button} onPress={() => setScreen("route")}>
              <Text style={styles.buttonText}>Plan Route</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.logo}>FlowSync</Text>
          <Text style={styles.subtitle}>Smart Mobility Mobile</Text>
          <Text style={styles.api}>{API_BASE_URL}</Text>
        </View>

        {renderTopNav()}

        {screen === "login" && renderLoginScreen()}
        {screen === "dashboard" && renderDashboardScreen()}
        {screen === "route" && renderRouteScreen()}
        {screen === "navigation" && renderNavigationScreen()}
        {screen === "summary" && renderSummaryScreen()}

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
          Provider may show mock_fallback until real map/traffic keys are connected.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function NavButton({ label, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.navButton, active ? styles.navButtonActive : null]}
      onPress={onPress}
    >
      <Text style={[styles.navButtonText, active ? styles.navButtonTextActive : null]}>
        {label}
      </Text>
    </TouchableOpacity>
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
    marginBottom: 18,
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
  navRow: {
    flexDirection: "row",
    backgroundColor: "#0b1626",
    borderRadius: 16,
    padding: 6,
    marginBottom: 16,
  },
  navButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  navButtonActive: {
    backgroundColor: "#22c55e",
  },
  navButtonText: {
    color: "#9fb4c8",
    fontWeight: "800",
    fontSize: 12,
  },
  navButtonTextActive: {
    color: "#03120a",
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
  heroTitle: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 6,
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
    marginTop: 8,
    marginBottom: 8,
  },
  buttonText: {
    color: "#03120a",
    fontWeight: "900",
    fontSize: 15,
  },
  secondaryButton: {
    backgroundColor: "#0ea5e9",
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  secondaryButtonText: {
    color: "#02131f",
    fontWeight: "900",
    fontSize: 15,
  },
  dangerButton: {
    backgroundColor: "#ef4444",
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  dangerButtonText: {
    color: "#2b0505",
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
  infoBox: {
    backgroundColor: "#0b1626",
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
  },
  profileBox: {
    backgroundColor: "#0b1626",
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
    marginBottom: 8,
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
    marginBottom: 12,
  },
  stat: {
    flex: 1,
    backgroundColor: "#07111f",
    borderRadius: 14,
    padding: 10,
    alignItems: "center",
    marginRight: 8,
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
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  selectedOption: {
    backgroundColor: "#123458",
  },
  currentStepBox: {
    backgroundColor: "#082f49",
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    marginBottom: 8,
  },
  step: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
    padding: 8,
    borderRadius: 12,
  },
  activeStep: {
    backgroundColor: "#123458",
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
  stepTextLarge: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 26,
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


