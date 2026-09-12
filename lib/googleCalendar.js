import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

const SCOPES = ["https://www.googleapis.com/auth/calendar.events", "openid", "email"];

export function getOAuthClient(redirectUri) {
  return new google.auth.OAuth2(process.env.AUTH_GOOGLE_ID, process.env.AUTH_GOOGLE_SECRET, redirectUri);
}

export function getAuthUrl(client, state, email) {
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
    login_hint: email,
    hd: email?.split("@")[1],
  });
}

export async function verificarEmailToken(client, idToken, emailEsperado) {
  const ticket = await client.verifyIdToken({ idToken, audience: process.env.AUTH_GOOGLE_ID });
  const payload = ticket.getPayload();
  return payload?.email?.toLowerCase() === emailEsperado?.toLowerCase();
}

export async function revogarToken(client, token) {
  await client.revokeToken(token).catch((err) => console.error("Falha ao revogar token do Google:", err));
}

export async function getClientForAtendente(atendente) {
  const client = getOAuthClient();

  client.setCredentials({
    access_token: atendente.googleCredencial?.accessToken,
    refresh_token: atendente.googleCredencial?.refreshToken,
    expiry_date: atendente.googleCredencial?.tokenExpiry?.getTime(),
  });

  client.on("tokens", (tokens) => {
    prisma.googleCredencial
      .update({
        where: { atendenteId: atendente.id },
        data: {
          accessToken: tokens.access_token ?? atendente.googleCredencial?.accessToken,
          tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : atendente.googleCredencial?.tokenExpiry,
        },
      })
      .catch((err) => console.error("Falha ao persistir token renovado do Google Calendar:", err));
  });

  return client;
}

async function buscarAtendenteComCredencial(atendenteId) {
  return prisma.atendente.findUnique({
    where: { id: atendenteId },
    include: { googleCredencial: true },
  });
}

function montarEvento(agendamento) {
  const descricaoPartes = [agendamento.observacoes, agendamento.linkUmbler].filter(Boolean);

  return {
    summary: agendamento.cliente,
    description: descricaoPartes.join("\n\n") || undefined,
    start: { dateTime: agendamento.dataHoraInicio.toISOString(), timeZone: "America/Sao_Paulo" },
    end: { dateTime: agendamento.dataHoraFim.toISOString(), timeZone: "America/Sao_Paulo" },
  };
}

async function marcarDesconectado(atendenteId) {
  await prisma
    .$transaction([
      prisma.googleCredencial.deleteMany({ where: { atendenteId } }),
      prisma.atendente.update({ where: { id: atendenteId }, data: { googleCalendarConectado: false } }),
    ])
    .catch((err) => console.error("Falha ao marcar atendente como desconectado:", err));
}

async function executarComTratamento(atendenteId, acao) {
  try {
    return await acao();
  } catch (error) {
    if (error?.response?.data?.error === "invalid_grant") {
      await marcarDesconectado(atendenteId);
    } else {
      console.error("Erro ao sincronizar com Google Calendar:", error?.message ?? error);
    }
    return null;
  }
}

export async function criarEvento(atendenteId, agendamento) {
  const atendente = await buscarAtendenteComCredencial(atendenteId);
  if (!atendente?.googleCalendarConectado) return null;

  return executarComTratamento(atendente.id, async () => {
    const client = await getClientForAtendente(atendente);
    const calendar = google.calendar({ version: "v3", auth: client });
    const { data } = await calendar.events.insert({
      calendarId: "primary",
      requestBody: montarEvento(agendamento),
    });
    return data.id;
  });
}

export async function atualizarEvento(atendenteId, agendamento) {
  if (!agendamento.googleEventId) return null;
  const atendente = await buscarAtendenteComCredencial(atendenteId);
  if (!atendente?.googleCalendarConectado) return null;

  return executarComTratamento(atendente.id, async () => {
    const client = await getClientForAtendente(atendente);
    const calendar = google.calendar({ version: "v3", auth: client });
    await calendar.events.update({
      calendarId: "primary",
      eventId: agendamento.googleEventId,
      requestBody: montarEvento(agendamento),
    });
    return agendamento.googleEventId;
  });
}

export async function apagarEvento(atendenteId, googleEventId) {
  if (!googleEventId) return;
  const atendente = await buscarAtendenteComCredencial(atendenteId);
  if (!atendente?.googleCalendarConectado) return;

  await executarComTratamento(atendente.id, async () => {
    const client = await getClientForAtendente(atendente);
    const calendar = google.calendar({ version: "v3", auth: client });
    await calendar.events.delete({ calendarId: "primary", eventId: googleEventId });
  });
}
