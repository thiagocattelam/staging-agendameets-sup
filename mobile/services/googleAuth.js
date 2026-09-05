import { GoogleSignin } from "@react-native-google-signin/google-signin";

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});

export async function signInWithGoogle() {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();

  if (response.type !== "success") {
    return null;
  }

  const { idToken } = response.data;
  if (!idToken) {
    throw new Error("O Google não retornou um idToken.");
  }

  return idToken;
}

export async function signOutGoogle() {
  await GoogleSignin.signOut();
}
