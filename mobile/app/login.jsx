import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { signInWithGoogle } from "../services/googleAuth";

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handlePress() {
    setLoading(true);
    setError(null);
    try {
      const idToken = await signInWithGoogle();
      if (!idToken) return;
      await signIn(idToken);
      router.replace("/(app)/agendamentos");
    } catch (e) {
      setError(e.message || "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AgendaMeets</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      <Pressable style={styles.button} disabled={loading} onPress={handlePress}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Entrar com Google</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 32 },
  button: {
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    minWidth: 220,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  error: { color: "#dc2626", textAlign: "center", marginBottom: 16 },
});
