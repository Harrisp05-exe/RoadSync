import { loginUser, registerUser } from "@/firebase-auth";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

export default function AuthScreen() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const cardTranslateY = useRef(new Animated.Value(18)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const primaryButtonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.spring(cardTranslateY, {
        toValue: 0,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, [mode, cardOpacity, cardTranslateY]);

  const heading = useMemo(
    () => (mode === "login" ? "Welcome back" : "Create account"),
    [mode],
  );

  const subtitle = useMemo(
    () =>
      mode === "login"
        ? "Log in to keep your trips in sync."
        : "Sign up and start planning your next trip.",
    [mode],
  );

  const submitLabel = useMemo(
    () => (mode === "login" ? "Log in" : "Sign up"),
    [mode],
  );

  const handleSubmit = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    setError("");

    if (!trimmedEmail) {
      setError("Please enter your email.");
      return;
    }

    if (!trimmedPassword) {
      setError("Please enter your password.");
      return;
    }

    if (mode === "signup") {
      const trimmedName = name.trim();
      if (!trimmedName) {
        setError("Please enter your name.");
        return;
      }

      setLoading(true);
      try {
        await registerUser(trimmedEmail, trimmedPassword, trimmedName);
        router.replace("/home");
      } catch (err: any) {
        setError(err.message || "Failed to create account. Please try again.");
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(true);
      try {
        await loginUser(trimmedEmail, trimmedPassword);
        router.replace("/home");
      } catch (err: any) {
        setError(err.message || "Invalid email or password.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <View style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.brand}>RoadSync</Text>

        <Animated.View
          style={[
            styles.card,
            {
              opacity: cardOpacity,
              transform: [{ translateY: cardTranslateY }],
            },
          ]}
        >
          <Text style={styles.heading}>{heading}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          {mode === "signup" && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Full name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Maya Smith"
                placeholderTextColor="#8997b1"
                style={styles.input}
              />
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#8997b1"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#8997b1"
              secureTextEntry
              style={styles.input}
            />
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
              onPress={() => router.replace("/home")}
              style={({ pressed }) => [
                styles.socialButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.socialBadge}>G</Text>
              <Text style={styles.socialButtonText}>Google</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Continue with Apple"
              onPress={() => router.replace("/home")}
              style={({ pressed }) => [
                styles.socialButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.socialBadge}></Text>
              <Text style={styles.socialButtonText}>Apple</Text>
            </Pressable>
          </View>

          <Animated.View style={{ transform: [{ scale: primaryButtonScale }] }}>
            <Pressable
              accessibilityRole="button"
              onPress={handleSubmit}
              disabled={loading}
              onPressIn={() => {
                Animated.spring(primaryButtonScale, {
                  toValue: 0.98,
                  friction: 7,
                  tension: 170,
                  useNativeDriver: true,
                }).start();
              }}
              onPressOut={() => {
                Animated.spring(primaryButtonScale, {
                  toValue: 1,
                  friction: 7,
                  tension: 170,
                  useNativeDriver: true,
                }).start();
              }}
              style={({ pressed }) => [
                styles.primaryButton,
                {
                  opacity: loading ? 0.6 : pressed ? 0.9 : 1,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>{submitLabel}</Text>
              )}
            </Pressable>
          </Animated.View>

          <Pressable
            onPress={() => setMode(mode === "login" ? "signup" : "login")}
          >
            <Text style={styles.toggleText}>
              {mode === "login"
                ? "Need an account? Sign up"
                : "Already have an account? Log in"}
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#edf2fb",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 32,
    backgroundColor: "#edf2fb",
  },
  brand: {
    color: "#102d63",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0.5,
    textAlign: "center",
    marginBottom: 22,
  },
  card: {
    backgroundColor: "#f8faff",
    borderWidth: 1,
    borderColor: "#e2e9f6",
    borderRadius: 24,
    padding: 22,
  },
  heading: {
    color: "#102d63",
    fontSize: 30,
    fontWeight: "900",
    marginBottom: 6,
  },
  subtitle: {
    color: "#53688d",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    color: "#3b4d73",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dfe7ff",
    borderRadius: 14,
    minHeight: 48,
    paddingHorizontal: 14,
    color: "#102d63",
    fontSize: 15,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#dfe7ff",
  },
  dividerText: {
    color: "#7585a4",
    fontSize: 12,
    fontWeight: "700",
    marginHorizontal: 10,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  socialRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  socialButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 48,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dfe7ff",
    borderRadius: 14,
  },
  socialBadge: {
    color: "#102d63",
    fontSize: 16,
    fontWeight: "800",
  },
  socialButtonText: {
    color: "#102d63",
    fontSize: 14,
    fontWeight: "700",
  },
  primaryButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#102d63",
    borderRadius: 16,
    minHeight: 52,
    marginTop: 10,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  toggleText: {
    color: "#102d63",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 16,
  },
  errorContainer: {
    backgroundColor: "#fee2e2",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
    padding: 12,
    marginVertical: 12,
  },
  errorText: {
    color: "#b42318",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  pressed: {
    opacity: 0.8,
  },
});
