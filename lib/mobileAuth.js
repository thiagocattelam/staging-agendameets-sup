import { SignJWT, jwtVerify } from "jose";

const ISSUER = "agendameets-mobile";
const AUDIENCE = "agendameets-mobile-app";
const EXPIRATION = "30d";

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET não configurado");
  }
  return new TextEncoder().encode(secret);
}

export async function signMobileToken({ atendenteId, email }) {
  return new SignJWT({ atendenteId, email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime(EXPIRATION)
    .sign(getSecretKey());
}

export async function verifyMobileToken(token) {
  const { payload } = await jwtVerify(token, getSecretKey(), {
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  return payload;
}
