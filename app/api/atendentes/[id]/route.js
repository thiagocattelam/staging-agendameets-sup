import { isAuthenticated } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

export async function PUT(request, { params }) {
  if (!(await isAuthenticated(request))) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const { nome, ativo, email, alertaMinutos } = await request.json();

  const atendente = await prisma.atendente.update({
    where: { id },
    data: { nome, ativo, email: email || null, alertaMinutos: alertaMinutos ?? null },
  });
  return Response.json(atendente);
}

export async function DELETE(request, { params }) {
  if (!(await isAuthenticated(request))) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;

  await prisma.atendente.delete({ where: { id } });

  return new Response(null, { status: 204 });
}
