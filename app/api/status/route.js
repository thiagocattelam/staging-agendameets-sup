import { isAuthenticated } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";

export async function GET(request) {
  if (!(await isAuthenticated(request))) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  const status = await prisma.status.findMany({
    orderBy: { descricao: "asc" },
  });
  return Response.json(status);
}
