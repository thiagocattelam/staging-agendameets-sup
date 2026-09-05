import { isAuthenticated } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

export async function GET(request) {
  if (!(await isAuthenticated(request))) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  const assuntos = await prisma.assunto.findMany({
    orderBy: { descricao: "asc" },
  });
  return Response.json(assuntos);
}

export async function POST(request) {
  if (!(await isAuthenticated(request))) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { descricao } = await request.json();

  if (!descricao?.trim()) {
    return Response.json({ error: "A descrição é obrigatória." }, { status: 400 });
  }

  const assunto = await prisma.assunto.create({
    data: { descricao },
  });
  return Response.json(assunto);
}
