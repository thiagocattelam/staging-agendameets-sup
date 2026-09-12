import { prisma } from "@/lib/prisma";

const ELEGIVEL_DESDE = new Date("2026-07-11T02:00:40.000Z");

function inicioDoDiaSaoPaulo(data) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [{ value: ano }, , { value: mes }, , { value: dia }] =
    formatter.formatToParts(data);
  return new Date(`${ano}-${mes}-${dia}T00:00:00-03:00`);
}

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Não autorizado", { status: 401 });
  }

  const [confirmado, realizado] = await Promise.all([
    prisma.status.findFirst({
      where: { descricao: { equals: "Confirmado", mode: "insensitive" } },
    }),
    prisma.status.findFirst({
      where: { descricao: { equals: "Realizado", mode: "insensitive" } },
    }),
  ]);

  if (!confirmado || !realizado) {
    return Response.json(
      { error: "Status Confirmado/Realizado não cadastrado" },
      { status: 500 },
    );
  }

  const resultado = await prisma.agendamento.updateMany({
    where: {
      statusId: confirmado.id,
      dataHoraInicio: { lt: inicioDoDiaSaoPaulo(new Date()) },
      createdAt: { gte: ELEGIVEL_DESDE },
    },
    data: { statusId: realizado.id },
  });

  return Response.json({ migrados: resultado.count, elegivelDesde: ELEGIVEL_DESDE });
}
