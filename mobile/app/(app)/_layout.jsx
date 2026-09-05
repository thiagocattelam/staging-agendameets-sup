import { Redirect, Stack } from "expo-router";
import { useAuth } from "../../context/AuthContext";

export default function AppLayout() {
  const { token, isLoading } = useAuth();

  if (isLoading) return null;
  if (!token) return <Redirect href="/login" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
