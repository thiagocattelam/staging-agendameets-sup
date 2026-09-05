import { createRemoteJWKSet, jwtVerify } from "jose";

const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

function getAllowedAudiences() {
  return (process.env.AUTH_GOOGLE_MOBILE_CLIENT_ID ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export async function verifyGoogleIdToken(idToken) {
  const audience = getAllowedAudiences();
  if (audience.length === 0) {
    throw new Error("AUTH_GOOGLE_MOBILE_CLIENT_ID não configurado");
  }

  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    issuer: GOOGLE_ISSUERS,
    audience,
  });
  return payload;
}
