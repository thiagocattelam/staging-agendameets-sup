import { isAuthenticated } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

export async function PUT(request, { params }) {
  if (!(await isAuthenticated(request))) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const { descricao } = await request.json();

  const assunto = await prisma.assunto.update({
    where: { id },
    data: { descricao },
  });
  return Response.json(assunto);
}

export async function DELETE(request, { params }) {
  if (!(await isAuthenticated(request))) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;

  await prisma.assunto.delete({ where: { id } });

  return new Response(null, { status: 204 });
}
