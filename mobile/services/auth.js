import * as SecureStore from "expo-secure-store";
import { apiFetch } from "./api";

const TOKEN_KEY = "agendameets_token";
const ATENDENTE_KEY = "agendameets_atendente";

export async function loginWithGoogleIdToken(idToken) {
  const result = await apiFetch("/api/mobile/login", {
    method: "POST",
    body: { idToken },
  });

  await SecureStore.setItemAsync(TOKEN_KEY, result.token);
  if (result.atendente) {
    await SecureStore.setItemAsync(ATENDENTE_KEY, JSON.stringify(result.atendente));
  } else {
    await SecureStore.deleteItemAsync(ATENDENTE_KEY);
  }

  return result;
}

export async function getStoredSession() {
  const [token, atendenteJson] = await Promise.all([
    SecureStore.getItemAsync(TOKEN_KEY),
    SecureStore.getItemAsync(ATENDENTE_KEY),
  ]);

  if (!token) return null;

  return { token, atendente: atendenteJson ? JSON.parse(atendenteJson) : null };
}

export async function clearSession() {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(ATENDENTE_KEY),
  ]);
}
