import { prisma } from "@/lib/prisma";
import { verifyGoogleIdToken } from "@/lib/googleIdToken";
import { signMobileToken } from "@/lib/mobileAuth";
import { isAllowedEmailDomain } from "@/lib/emailDomain";

export async function POST(request) {
  const { idToken } = await request.json();

  if (!idToken) {
    return Response.json({ error: "idToken é obrigatório" }, { status: 400 });
  }

  let payload;
  try {
    payload = await verifyGoogleIdToken(idToken);
  } catch (err) {
    console.error("verifyGoogleIdToken falhou:", err);
    return Response.json({ error: "Token do Google inválido" }, { status: 401 });
  }

  if (!payload.email_verified) {
    return Response.json({ error: "E-mail do Google não verificado" }, { status: 401 });
  }

  if (!isAllowedEmailDomain(payload.email)) {
    return Response.json({ error: "Domínio de e-mail não permitido" }, { status: 403 });
  }

  const atendente = await prisma.atendente.findUnique({
    where: { email: payload.email },
  });

  const token = await signMobileToken({
    atendenteId: atendente?.id ?? null,
    email: payload.email,
  });

  return Response.json({
    token,
    atendente: atendente ? { id: atendente.id, nome: atendente.nome, email: atendente.email } : null,
  });
}
