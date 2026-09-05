import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { loginWithGoogleIdToken, getStoredSession, clearSession } from "../services/auth";
import { signOutGoogle } from "../services/googleAuth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [atendente, setAtendente] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getStoredSession()
      .then((session) => {
        if (session) {
          setToken(session.token);
          setAtendente(session.atendente);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const signIn = useCallback(async (idToken) => {
    const result = await loginWithGoogleIdToken(idToken);
    setToken(result.token);
    setAtendente(result.atendente);
    return result;
  }, []);

  const signOut = useCallback(async () => {
    await clearSession();
    await signOutGoogle().catch(() => {});
    setToken(null);
    setAtendente(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, atendente, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return ctx;
}
