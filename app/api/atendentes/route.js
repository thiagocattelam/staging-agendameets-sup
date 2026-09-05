import { isAuthenticated } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

export async function GET(request) {
  if (!(await isAuthenticated(request))) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  const atendentes = await prisma.atendente.findMany({
    orderBy: { nome: "asc" },
  });
  return Response.json(atendentes);
}

export async function POST(request) {
  if (!(await isAuthenticated(request))) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { nome, ativo, email, alertaMinutos } = await request.json();

  if (!nome?.trim()) {
    return Response.json({ error: "O nome é obrigatório." }, { status: 400 });
  }
  if (!email?.trim()) {
    return Response.json({ error: "O e-mail é obrigatório." }, { status: 400 });
  }
  const atendente = await prisma.atendente.create({
    data: { nome, ativo, email, alertaMinutos: alertaMinutos ?? 30 },
  });
  return Response.json(atendente);
}
