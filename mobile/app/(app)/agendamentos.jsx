import { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, Pressable, RefreshControl, AppState } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../services/api";
import { useAlertaAgendamentos } from "../../hooks/useAlertaAgendamentos";
import { formatHoraSaoPaulo } from "../../utils/date";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export default function AgendamentosScreen() {
  const { token, atendente, signOut } = useAuth();
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!atendente) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiFetch("/api/agendamentos", {
        token,
        params: {
          atendenteId: atendente.id,
          inicio: startOfToday().toISOString(),
          fim: endOfToday().toISOString(),
        },
      });
      setAgendamentos(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, atendente]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") load();
    });
    return () => subscription.remove();
  }, [load]);

  useAlertaAgendamentos(agendamentos);

  if (!atendente) {
    return (
      <View style={[styles.container, styles.empty]}>
        <Text style={styles.title}>Conta sem acesso a agendamentos</Text>
        <Text style={styles.subtitle}>
          Seu e-mail Google fez login, mas não está cadastrado como atendente. Fale com o
          administrador do sistema.
        </Text>
        <Pressable onPress={signOut}>
          <Text style={styles.signOut}>Sair</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Olá, {atendente.nome}</Text>
        <Pressable onPress={signOut}>
          <Text style={styles.signOut}>Sair</Text>
        </Pressable>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={agendamentos}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={agendamentos.length === 0 && styles.emptyList}
        ListEmptyComponent={!loading && <Text>Nenhum agendamento hoje.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cliente}>{item.cliente}</Text>
            <Text style={styles.horario}>
              {formatHoraSaoPaulo(item.dataHoraInicio)}
            </Text>
            {item.status && (
              <View style={[styles.badge, { backgroundColor: item.status.corHex }]}>
                <Text style={styles.badgeText}>{item.status.descricao}</Text>
              </View>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, paddingHorizontal: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: "700" },
  subtitle: { textAlign: "center", color: "#4b5563", marginTop: 8, marginBottom: 24 },
  signOut: { color: "#dc2626" },
  error: { color: "#dc2626", marginBottom: 8 },
  empty: { alignItems: "center", justifyContent: "center" },
  emptyList: { flexGrow: 1, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: "#f3f4f6", borderRadius: 8, padding: 12, marginBottom: 8 },
  cliente: { fontSize: 16, fontWeight: "600" },
  horario: { color: "#4b5563", marginTop: 2 },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6,
  },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },
});
