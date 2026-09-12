import { isAuthenticated } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
import { criarEvento, atualizarEvento, apagarEvento } from "@/lib/googleCalendar";

export async function PUT(request, { params }) {
  if (!(await isAuthenticated(request))) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const { dataHoraInicio, dataHoraFim, cliente, linkUmbler, observacoes, alertaMinutos, atendenteId, statusId, assuntoIds } =
    await request.json();

  const anterior = await prisma.agendamento.findUnique({
    where: { id },
  });

  const agendamento = await prisma.agendamento.update({
    where: { id },
    data: {
      dataHoraInicio: new Date(dataHoraInicio),
      dataHoraFim: new Date(dataHoraFim),
      cliente,
      linkUmbler: linkUmbler || null,
      observacoes: observacoes || null,
      alertaMinutos: alertaMinutos ?? null,
      atendenteId,
      statusId,
      assuntos: { set: assuntoIds.map((id) => ({ id })) },
    },
    include: { atendente: true },
  });

  const trocouAtendente = anterior && anterior.atendenteId !== agendamento.atendenteId;

  if (trocouAtendente) {
    await apagarEvento(anterior.atendenteId, anterior.googleEventId);
    const googleEventId = await criarEvento(agendamento.atendenteId, agendamento);
    await prisma.agendamento.update({ where: { id }, data: { googleEventId } });
  } else if (agendamento.googleEventId) {
    await atualizarEvento(agendamento.atendenteId, agendamento);
  } else {
    const googleEventId = await criarEvento(agendamento.atendenteId, agendamento);
    if (googleEventId) {
      await prisma.agendamento.update({ where: { id }, data: { googleEventId } });
    }
  }

  return Response.json(agendamento);
}

export async function DELETE(request, { params }) {
  if (!(await isAuthenticated(request))) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;

  const agendamento = await prisma.agendamento.findUnique({
    where: { id },
  });

  if (agendamento) {
    await apagarEvento(agendamento.atendenteId, agendamento.googleEventId);
  }

  await prisma.agendamento.delete({ where: { id } });

  return new Response(null, { status: 204 });
}
