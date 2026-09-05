import { isAuthenticated } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
import { criarEvento } from "@/lib/googleCalendar";

export async function GET(request) {
  if (!(await isAuthenticated(request))) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const inicio = searchParams.get("inicio");
  const fim = searchParams.get("fim");
  const atendenteId = searchParams.get("atendenteId");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.max(1, parseInt(searchParams.get("pageSize") ?? "15", 10));

  const where = {};

  if (inicio && fim) {
    where.dataHoraInicio = {
      gte: new Date(inicio),
      lte: new Date(fim),
    };
  }

  if (atendenteId) {
    where.atendenteId = atendenteId;
  }

  const [data, total] = await Promise.all([
    prisma.agendamento.findMany({
      where,
      include: {
        atendente: true,
        assuntos: true,
        status: true,
      },
      orderBy: { dataHoraInicio: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.agendamento.count({ where }),
  ]);

  return Response.json({ data, total });
}

export async function POST(request) {
  if (!(await isAuthenticated(request))) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { dataHoraInicio, dataHoraFim, cliente, linkUmbler, observacoes, alertaMinutos, atendenteId, statusId, assuntoIds } =
    await request.json();

  const agendamento = await prisma.agendamento.create({
    data: {
      dataHoraInicio: new Date(dataHoraInicio),
      dataHoraFim: new Date(dataHoraFim),
      cliente,
      linkUmbler: linkUmbler || null,
      observacoes: observacoes || null,
      alertaMinutos: alertaMinutos ?? null,
      atendenteId,
      statusId,
      assuntos: { connect: assuntoIds.map((id) => ({ id })) },
    },
    include: { atendente: true },
  });

  const googleEventId = await criarEvento(agendamento.atendente, agendamento);
  if (googleEventId) {
    await prisma.agendamento.update({ where: { id: agendamento.id }, data: { googleEventId } });
  }

  return Response.json(agendamento, { status: 201 });
}
